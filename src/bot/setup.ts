import fs from "fs";
// @ts-ignore
import cliui from "cliui";
const ui = cliui({ width: 140 });
import chalk from "chalk";
import JSBI from "jsbi";
import * as ora from "ora";
import bs58 from "bs58";
import { Jupiter } from "@jup-ag/core";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";

import { loadConfigFile } from "../utils";
import { intro, listenHotkeys } from "./ui";
import { cache, Token } from "./cache";
import { logExit, handleExit } from "./exit";

export const setup = async (): Promise<{
	jupiter: Jupiter;
	tokenA: Token;
	tokenB: Token;
}> => {
	let jupiter, tokenA, tokenB, tokens, wallet, spinner;
	try {
		// listen for hotkeys
		listenHotkeys();
		await intro();

		// load config file and store it in cache
		// @ts-ignore
		cache.config = loadConfigFile({ showSpinner: true });

		spinner = ora
			.default({
				text: "Loading tokens...",
				//@ts-ignore

				discardStdin: false,
				color: "magenta",
			})
			.start();

		// read tokens.json file
		try {
			// @ts-ignore
			tokens = JSON.parse(fs.readFileSync("./temp/tokens.json"));
			// find tokens full Object
			tokenA = tokens.find(
				(t: { address: {} }) => t.address === cache.config.tokenA.address
			);

			if (cache.config.tradingStrategy !== "arbitrage")
				tokenB = tokens.find(
					(t: { address: {} }) => t.address === cache.config.tokenB.address
				);
		} catch (error) {
			spinner.text = chalk.black.bgRedBright(
				`\n	Loading tokens failed!\n	Please try to run the Wizard first using ${chalk.bold(
					"`yarn start`"
				)}\n`
			);
			throw error;
		}

		// check wallet private key
		try {
			spinner.text = "Checking wallet...";
			if (
				!process.env.SOLANA_WALLET_PRIVATE_KEY ||
				(process.env.SOLANA_WALLET_PUBLIC_KEY &&
					process.env.SOLANA_WALLET_PUBLIC_KEY?.length !== 88)
			) {
				throw new Error("Wallet check failed!");
			} else {
				wallet = Keypair.fromSecretKey(
					bs58.decode(process.env.SOLANA_WALLET_PRIVATE_KEY)
				);
			}
		} catch (error) {
			spinner.text = chalk.black.bgRedBright(
				`\n	Wallet check failed! \n	Please make sure that ${chalk.bold(
					"SOLANA_WALLET_PRIVATE_KEY "
				)}\n	inside ${chalk.bold(".env")} file is correct \n`
			);
			throw error;
		}

		spinner.text = "Setting up connection ...";
		// connect to RPC
		const connection = new Connection(cache.config.rpc[0]);

		spinner.text = "Loading Jupiter SDK...";

		jupiter = await Jupiter.load({
			connection, // @ts-ignore
			cluster: cache.config.network,
			user: wallet,
			restrictIntermediateTokens: true,
			wrapUnwrapSOL: cache.wrapUnwrapSOL,
		});

		cache.isSetupDone = true;
		spinner.succeed("Setup done!");
	} catch (error: any) {
		if (error?.code === "ENOTFOUND") {
			if (spinner) {
				spinner.text = chalk.black.bgRedBright(
					`
					Most likely something is wrong with the Connection!
					Please make sure that ${chalk.bold("RPC ")} inside ${chalk.bold(
						"config.json"
					)} file is correct
					and the RPC is running
					`
				);
			}
		}
		if (spinner)
			spinner.fail(
				chalk.bold.redBright(`Setting up failed!\n 	${spinner.text}`)
			);
		logExit({ error, code: 1 });
		process.exitCode = 1;
		handleExit();
	}
	// @ts-ignore
	return { jupiter, tokenA, tokenB };
};

export const getInitialOutAmountWithSlippage = async (
	jupiter: Jupiter,
	inputToken: Token,
	outputToken: Token,
	amountToTrade: number
) => {
	if (!jupiter) return;
	let spinner;
	try {
		spinner = ora
			.default({
				text: "Computing routes...",
				//@ts-ignore
				discardStdin: false,
				color: "magenta",
			})
			.start();

		// compute routes for the first time
		const routes = await jupiter.computeRoutes({
			inputMint: new PublicKey(inputToken.address),
			outputMint: new PublicKey(outputToken.address),
			amount: JSBI.BigInt(amountToTrade),
			slippageBps: 0,
			forceFetch: true,
		});

		if (!routes?.routesInfos) {
			const errorMessage: string =
				"No initial routes found! It's likely something is wrong with the connection or RPC.";
			spinner.fail(chalk.bold.redBright(errorMessage));
			throw new Error(errorMessage);
		}

		if (routes?.routesInfos?.length === 0) {
			const errorMessage: string = "No initial routes found in the response";
			spinner.fail(chalk.bold.redBright(errorMessage));
			throw new Error(errorMessage);
		}
		spinner.succeed("Routes computed!");
		return routes?.routesInfos[0].otherAmountThreshold;
	} catch (error) {
		if (spinner)
			spinner.fail(chalk.bold.redBright("Computing routes failed!\n"));
		handleExit();
		logExit({ error, code: 1 });
		process.exitCode = 1;
	}
};

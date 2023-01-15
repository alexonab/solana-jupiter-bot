const fs = require("fs");
const chalk = require("chalk");
const ora = require("ora-classic");
const bs58 = require("bs58");
const { Prism } = require("@prism-hq/prism-ag")
const { Connection, Keypair, PublicKey } = require("@solana/web3.js");
const { Wallet } = require("@project-serum/anchor");

const { logExit } = require("./exit");
const { loadConfigFile } = require("../utils");
const { intro, listenHotkeys } = require("./ui");
const cache = require("./cache");

const setup = async () => {
	let spinner, tokens, tokenA, tokenB, wallet;
	try {
		// listen for hotkeys
		listenHotkeys();
		await intro();

		// load config file and store it in cache
		cache.config = loadConfigFile({ showSpinner: true });

		spinner = ora({
			text: "Loading tokens...",
			discardStdin: false,
			color: "magenta",
		}).start();

		// read tokens.json file
		try {
			tokens = JSON.parse(fs.readFileSync("./temp/tokens.json"));
			// find tokens full Object
			tokenA = tokens.find((t) => t.address === cache.config.tokenA.address);

			if (cache.config.tradingStrategy !== "arbitrage")
				tokenB = tokens.find((t) => t.address === cache.config.tokenB.address);
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
				// let wallet = new NodeWallet(new Keypair());
				wallet = new Wallet(Keypair.fromSecretKey(
					bs58.decode(process.env.SOLANA_WALLET_PRIVATE_KEY)
				));
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

		spinner.text = "Loading Prism SDK...";

		// default slippage
		const slippage =
			typeof cache.config.slippage === "number" ? cache.config.slippage : 1;
		
		prism = await Prism.init({
			user: wallet,
			slippage: slippage * 100,
			connection: connection,
		});

		// set initial & current & last balance for tokenA
		cache.initialBalance.tokenA = cache.config.tradeSize.value;

		cache.isSetupDone = true;
		spinner.succeed("Setup done!");

		return { prism, tokenA, tokenB };
	} catch (error) {
		if (spinner)
			spinner.fail(
				chalk.bold.redBright(`Setting up failed!\n 	${spinner.text}`)
			);
		logExit(1, error);
		process.exitCode = 1;
	}
};

const getInitialOutAmount = async (
	prism,
	inputToken,
	outputToken,
	amountToTrade
) => {
	let spinner;
	try {
		spinner = ora({
			text: "Computing routes...",
			discardStdin: false,
			color: "magenta",
		}).start();

		// compute routes for the first time
		await prism.loadRoutes(inputToken.address, outputToken.address);
		routes = prism.getRoutes(cache.config.tradeSize.value);

		if (routes?.length > 0) spinner.succeed("Routes computed!");
		else spinner.fail("No routes found. Something is wrong!");
		
		return routes[0].amountOut;
	} catch (error) {
		if (spinner)
			spinner.fail(chalk.bold.redBright("Computing routes failed!\n"));
		logExit(1, error);
		process.exitCode = 1;
	}
};

module.exports = {
	setup,
	getInitialOutAmount,
};

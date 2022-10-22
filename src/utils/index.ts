import chalk from "chalk";
import fs from "fs";
import * as ora from "ora";
import { TCache } from "../bot/cache";
import { logExit } from "../bot/exit";

const createTempDir = () => !fs.existsSync("./temp") && fs.mkdirSync("./temp");

const storeItInTempAsJSON = (filename: string, data: {} | []) =>
	fs.writeFileSync(`./temp/${filename}.json`, JSON.stringify(data, null, 2));
// @ts-ignore
const createConfigFile = (config) => {
	const configSpinner = ora
		.default({
			text: "Creating config...",
			//@ts-ignore
			discardStdin: false,
		})
		.start();

	const configValues = {
		network: config.network.value,
		rpc: config.rpc.value,
		tradingStrategy: config.strategy.value,
		tokenA: config.tokens.value.tokenA,
		tokenB: config.tokens.value.tokenB,
		slippage: config.slippage.value,
		minPercProfit: config.profit.value,
		minInterval: parseInt(config.advanced.value.minInterval),
		tradeSize: {
			value: parseFloat(config["trading size"].value.value),
			strategy: config["trading size"].value.strategy,
		},
		ui: {
			defaultColor: "cyan",
		},
		storeFailedTxInHistory: true,
	};

	fs.writeFileSync("./config.json", JSON.stringify(configValues, null, 2), {});
	configSpinner.succeed("Config created!");
};
// @ts-ignore
const verifyConfig = (config) => {
	let result = true;
	// @ts-ignore
	const badConfig = [];
	Object.entries(config).forEach(([key, value]) => {
		// @ts-ignore
		const isSet = value.isSet;
		const isSectionSet =
			isSet instanceof Object
				? Object.values(isSet).every((value) => value === true)
				: isSet;

		if (!isSectionSet) {
			result = false;
			badConfig.push(key);
		}
	});
	// @ts-ignore
	return { result, badConfig };
};

const loadConfigFile = ({ showSpinner = false }) => {
	let config = {};
	let spinner;
	if (showSpinner) {
		spinner = ora
			.default({
				text: "Loading config...",
				//@ts-ignore
				discardStdin: false,
			})
			.start();
	}

	if (fs.existsSync("./config.json")) {
		// @ts-ignore
		config = JSON.parse(fs.readFileSync("./config.json"));
		spinner?.succeed("Config loaded!");
		return config;
	}

	spinner?.fail(chalk.redBright("Loading config failed!\n"));
	throw new Error("\nNo config.json file found!\n");
};

const calculateProfit = (oldVal: number, newVal: number): number =>
	((newVal - oldVal) / oldVal) * 100;

const toDecimal = (number: number, decimals: number): string =>
	// @ts-ignore
	parseFloat(number / 10 ** decimals).toFixed(decimals);

const toNumber = (number: number, decimals: number): number =>
	number * 10 ** decimals;

/**
 * It calculates the number of iterations per minute and updates the cache.
 */
const updateIterationsPerMin = (cache: TCache) => {
	const iterationTimer =
		(performance.now() - cache.iterationPerMinute.start) / 1000;

	if (iterationTimer >= 60) {
		cache.iterationPerMinute.value = Number(
			cache.iterationPerMinute.counter.toFixed()
		);
		cache.iterationPerMinute.start = performance.now();
		cache.iterationPerMinute.counter = 0;
	} else cache.iterationPerMinute.counter++;
};
// @ts-ignore
const checkRoutesResponse = (routes) => {
	if (Object.prototype.hasOwnProperty.call(routes, "routesInfos")) {
		if (routes.routesInfos.length === 0) {
			logExit({
				error: {
					name: "No routes found",
					message: "No routes found or something is wrong with RPC / Jupiter! ",
				},
				code: 1,
			});
			process.exit(1);
		}
	} else {
		logExit({
			error: {
				name: "Connection Error",
				message: "Something is wrong with RPC / Jupiter! ",
			},
		});
		process.exit(1);
	}
};

const checkForEnvFile = () => {
	if (!fs.existsSync("./.env")) {
		logExit({
			error: { name: ".env Error", message: "No .env file found! " },
		});
		process.exit(1);
	}
};

export {
	createTempDir,
	storeItInTempAsJSON,
	createConfigFile,
	loadConfigFile,
	verifyConfig,
	calculateProfit,
	toDecimal,
	toNumber,
	updateIterationsPerMin,
	checkRoutesResponse,
	checkForEnvFile,
};

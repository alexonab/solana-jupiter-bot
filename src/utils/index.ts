// const chalk = require("chalk");
import chalk from "chalk";
// const fs = require("fs");
import fs from "fs";
// const ora = require("ora-classic");
// import ora from "ora";
import * as ora from "ora";

// const { logExit } = require("../bot/exit");
import { logExit } from "../bot/exit";

const createTempDir = () => !fs.existsSync("./temp") && fs.mkdirSync("./temp");

// @ts-ignore
const storeItInTempAsJSON = (filename, data) =>
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

/**
 * It loads the config file and returns the config object
 * @returns The config object
 */
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
// @ts-ignore
const calculateProfit = (oldVal, newVal) => ((newVal - oldVal) / oldVal) * 100;
// @ts-ignore
const toDecimal = (number, decimals) =>
	// @ts-ignore
	parseFloat(number / 10 ** decimals).toFixed(decimals);
// @ts-ignore
const toNumber = (number, decimals) => number * 10 ** decimals;

/**
 * It calculates the number of iterations per minute and updates the cache.
 */
// @ts-ignore
const updateIterationsPerMin = (cache) => {
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
	// @ts-ignore
	if (Object.hasOwn(routes, "routesInfos")) {
		if (routes.routesInfos.length === 0) {
			logExit(1, {
				message: "No routes found or something is wrong with RPC / Jupiter! ",
			});
			process.exit(1);
		}
	} else {
		logExit(1, {
			message: "Something is wrong with RPC / Jupiter! ",
		});
		process.exit(1);
	}
};

const checkForEnvFile = () => {
	if (!fs.existsSync("./.env")) {
		logExit(1, {
			message: "No .env file found! ",
		});
		process.exit(1);
	}
};

// module.exports = {
// 	createTempDir,
// 	storeItInTempAsJSON,
// 	createConfigFile,
// 	loadConfigFile,
// 	verifyConfig,
// 	calculateProfit,
// 	toDecimal,
// 	toNumber,
// 	updateIterationsPerMin,
// 	checkRoutesResponse,
// 	checkForEnvFile,
// };

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

console.clear();

import dotenv from "dotenv";
dotenv.config();

import { toNumber } from "../utils";
import { handleExit, logExit } from "./exit";
import { cache, Token } from "./cache";
import { setup, getInitialOutAmountWithSlippage } from "./setup";
import { arbitrageStrategy } from "./strategies/arbitrageStrategy";
import { pingpongStrategy } from "./strategies/pingpongStrategy";
import JSBI from "jsbi";
import { Jupiter } from "@jup-ag/core";
const watcher = async (jupiter: Jupiter, tokenA: Token, tokenB: Token) => {
	if (
		!cache.swappingRightNow &&
		// @ts-ignore
		Object.keys(cache.queue).length < cache.queueThrottle
	) {
		if (cache.config.tradingStrategy === "pingpong") {
			await pingpongStrategy(jupiter, tokenA, tokenB);
		}
		if (cache.config.tradingStrategy === "arbitrage") {
			// @ts-ignore
			await arbitrageStrategy(jupiter, tokenA, tokenB);
		}
	}
};

const run = async () => {
	try {
		// set everything up
		// @ts-ignore
		const { jupiter, tokenA, tokenB } = await setup();

		if (cache.config.tradingStrategy === "pingpong") {
			// set initial & current & last balance for tokenA
			cache.initialBalance.tokenA = toNumber(
				cache.config.tradeSize.value,
				tokenA.decimals
			);
			cache.currentBalance.tokenA = cache.initialBalance.tokenA;
			cache.lastBalance.tokenA = cache.initialBalance.tokenA;

			// set initial & last balance for tokenB
			cache.initialBalance.tokenB = JSBI.toNumber(
				await getInitialOutAmountWithSlippage(
					jupiter,
					tokenA,
					tokenB,
					cache.initialBalance.tokenA
				)
			);
			cache.lastBalance.tokenB = cache.initialBalance.tokenB;
		} else if (cache.config.tradingStrategy === "arbitrage") {
			// set initial & current & last balance for tokenA
			cache.initialBalance.tokenA = toNumber(
				cache.config.tradeSize.value,
				tokenA.decimals
			);
			cache.currentBalance.tokenA = cache.initialBalance.tokenA;
			cache.lastBalance.tokenA = cache.initialBalance.tokenA;
		}

		// @ts-ignore
		global.botInterval = setInterval(
			() => watcher(jupiter, tokenA, tokenB),
			cache.config.minInterval
		);
	} catch (error) {
		// @ts-ignore
		logExit(error);
		process.exitCode = 1;
	}
};

run();

// handle exit
process.on("exit", handleExit);

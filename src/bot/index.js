console.clear();

require("dotenv").config();

const { toNumber } = require("../utils");
const { handleExit, logExit } = require("./exit");
const cache = require("./cache");
const { setup, getInitialOutAmountWithSlippage } = require("./setup");
const { arbitrageStrategy } = require("./strategies/arbitrageStrategy");
const { pingpongStrategy } = require("./strategies/pingpongStrategy");

const watcher = async (jupiter, tokenA, tokenB) => {
	if (
		!cache.swappingRightNow &&
		Object.keys(cache.queue).length < cache.queueThrottle
	) {
		if (cache.config.tradingStrategy === "pingpong") {
			await pingpongStrategy(jupiter, tokenA, tokenB);
		}
		if (cache.config.tradingStrategy === "arbitrage") {
			await arbitrageStrategy(jupiter, tokenA, tokenB);
		}
	}
};

const run = async () => {
	try {
		// set everything up
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
			cache.initialBalance.tokenB = await getInitialOutAmountWithSlippage(
				jupiter,
				tokenA,
				tokenB,
				cache.initialBalance.tokenA
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

		global.botInterval = setInterval(
			() => watcher(jupiter, tokenA, tokenB),
			cache.config.minInterval
		);
	} catch (error) {
		logExit(error);
		process.exitCode = 1;
	}
};

run();

// handle exit
process.on("exit", handleExit);

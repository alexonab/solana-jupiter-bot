const ui = require("cliui")({ width: 140 });
const ch = require("chalk");
const moment = require("moment");
const chart = require("asciichart");

const { toDecimal } = require("../../utils");
const cache = require("../cache");
const JSBI = require("jsbi");

const formatStatusMessage = () => {
	let statusMessage = " ";
	let statusPerformance;
	if (cache.swappingRightNow) {
		statusPerformance = performance.now() - cache.performanceOfTxStart;
		statusMessage = ch.bold[
			statusPerformance < 45000
				? "greenBright"
				: statusPerformance < 60000
				? "yellowBright"
				: "redBright"
		](`SWAPPING ... ${(statusPerformance / 1000).toFixed(2)} s`);
	}
	if (cache.fetchingResultsFromSolscan) {
		statusPerformance =
			performance.now() - cache.fetchingResultsFromSolscanStart;
		statusMessage = ch.bold[
			statusPerformance < 45000
				? "greenBright"
				: statusPerformance < 90000
				? "yellowBright"
				: "redBright"
		](`FETCHING RESULT ... ${(statusPerformance / 1000).toFixed(2)} s`);
	}

	return statusMessage;
};

const formatInputAmount = (route, inputToken) => {
	return `IN:  ${ch.yellowBright(
		toDecimal(JSBI.toNumber(route.inAmount), inputToken.decimals)
	)} ${ch[cache.ui.defaultColor](inputToken.symbol)}`;
};

const formatOutAmount = (simulatedProfit, route, outputToken) => {
	return `OUT: ${ch[simulatedProfit > 0 ? "greenBright" : "red"](
		toDecimal(JSBI.toNumber(route.outAmount), outputToken.decimals)
	)} ${ch[cache.ui.defaultColor](outputToken.symbol)}`;
};

const formatSimulatedProfit = (simulatedProfit) => {
	return `PROFIT: ${ch[simulatedProfit > 0 ? "greenBright" : "red"](
		simulatedProfit.toFixed(2)
	)} % ${ch.gray(`(${cache?.config?.minPercProfit})`)}`;
};

const formatMinOutAmount = (route, outputToken) => {
	return `MIN. OUT: ${ch.magentaBright(
		toDecimal(JSBI.toNumber(route.otherAmountThreshold), outputToken.decimals)
	)}`;
};

const formatPerformance = (performanceOfRouteComp, minimal = false) => {
	const performanceOfRouteCompColor =
		performanceOfRouteComp < 1000 ? cache.ui.defaultColor : "redBright";

	const performanceOfIteration = ch.grey(
		`+${cache.performanceOfIteration.toFixed()} ms`
	);

	return `${minimal ? "L" : "LOOKUP (ROUTE)"}: ${ch.bold[
		performanceOfRouteCompColor
	](performanceOfRouteComp.toFixed())} ms ${performanceOfIteration}`;
};

function printToConsole({
	date,
	i,
	performanceOfRouteComp,
	inputToken,
	outputToken,
	tokenA,
	tokenB,
	route,
	simulatedProfit,
}) {
	try {
		// check swap / fetch result status
		let statusMessage = formatStatusMessage();

		if (cache.ui.allowClear) {
			if (cache.ui.minimalMode) {
				const divider = ch.gray(" | ");
				let log = "";
				log += ch.gray(date.toLocaleString()) + divider;
				log +=
					`I: ${
						i % 2 === 0
							? ch[cache.ui.defaultColor].bold(i)
							: ch[cache.ui.defaultColor](i)
					} | ${ch.bold[cache.ui.defaultColor](
						cache.iterationPerMinute.value
					)} i/min` + divider;
				log += formatPerformance(performanceOfRouteComp, true) + divider;
				log += formatInputAmount(route, inputToken) + divider;
				log += formatOutAmount(simulatedProfit, route, outputToken) + divider;
				log += formatSimulatedProfit(simulatedProfit) + divider;
				log +=
					`${ch[cache.currentProfit.tokenA > 0 ? "greenBright" : "redBright"](
						cache.currentProfit.tokenA.toFixed(2)
					)} %` + divider;
				log +=
					`${ch[cache.currentProfit.tokenB > 0 ? "greenBright" : "redBright"](
						cache.currentProfit.tokenB.toFixed(2)
					)} %` + divider;
				log += formatStatusMessage();
				console.log(log);
			} else {
				// update max profitability spotted chart
				if (cache.ui.showProfitChart) {
					let spottetMaxTemp =
						cache.chart.spottedMax[cache.sideBuy ? "buy" : "sell"];
					spottetMaxTemp.shift();
					spottetMaxTemp.push(
						simulatedProfit === Infinity
							? 0
							: parseFloat(simulatedProfit.toFixed(2))
					);
					cache.chart.spottedMax.buy = spottetMaxTemp;
				}

				// update performance chart
				if (cache.ui.showPerformanceOfRouteCompChart) {
					let performanceTemp = cache.chart.performanceOfRouteComp;
					performanceTemp.shift();
					performanceTemp.push(parseInt(performanceOfRouteComp.toFixed()));
					cache.chart.performanceOfRouteComp = performanceTemp;
				}

				// refresh console before print
				console.clear();
				ui.resetOutput();

				// show HOTKEYS HELP
				if (cache.ui.showHelp) {
					ui.div(
						ch.gray("[H] - show/hide help"),
						ch.gray("[CTRL]+[C] - exit"),
						ch.gray("[I] - incognito RPC")
					);
					ui.div(
						ch.gray("[L] - show/hide latency chart"),
						ch.gray("[P] - show/hide profit chart"),
						ch.gray("[T] - show/hide trade history")
					);
					ui.div(
						ch.gray("[E] - force execution"),
						ch.gray("[R] - revert back swap"),
						ch.gray("[S] - simulation mode switch")
					);
					ui.div(" ");
				}

				ui.div(
					{
						text: `TIMESTAMP: ${ch[cache.ui.defaultColor](
							date.toLocaleString()
						)}`,
					},
					{
						text: `I: ${
							i % 2 === 0
								? ch[cache.ui.defaultColor].bold(i)
								: ch[cache.ui.defaultColor](i)
						} | ${ch.bold[cache.ui.defaultColor](
							cache.iterationPerMinute.value
						)} i/min`,
					},
					{
						text: `RPC: ${ch[cache.ui.defaultColor](
							cache.ui.hideRpc
								? `${cache.config.rpc[0].slice(
										0,
										5
								  )}...${cache.config.rpc[0].slice(-5)}`
								: cache.config.rpc[0]
						)}`,
					}
				);

				ui.div(
					{
						text: `STARTED: ${ch[cache.ui.defaultColor](
							moment(cache.startTime).fromNow()
						)}`,
					},
					{
						text: formatPerformance(performanceOfRouteComp),
					},
					{
						text: `MIN INTERVAL: ${ch[cache.ui.defaultColor](
							cache.config.minInterval
						)} ms QUEUE: ${ch[cache.ui.defaultColor](
							Object.keys(cache.queue).length
						)}/${ch[cache.ui.defaultColor](cache.queueThrottle)}`,
					}
				);

				ui.div(
					" ",
					" ",
					Object.values(cache.queue)
						.map(
							(v) => `${ch[v === 0 ? "green" : v < 0 ? "yellow" : "red"]("●")}`
						)
						.join(" ")
				);

				if (cache.ui.showPerformanceOfRouteCompChart)
					ui.div(
						chart.plot(cache.chart.performanceOfRouteComp, {
							padding: " ".repeat(10),
							height: 5,
						})
					);

				ui.div("");
				ui.div(ch.gray("-".repeat(140)));

				ui.div(
					`${
						cache.tradingEnabled
							? "TRADING"
							: ch.bold.magentaBright("SIMULATION")
					}: ${ch.bold[cache.ui.defaultColor](inputToken.symbol)} ${
						cache.config.tradingStrategy === "arbitrage"
							? ""
							: `-> ${ch.bold[cache.ui.defaultColor](outputToken.symbol)}`
					}`,
					`ROUTES: ${ch.bold.yellowBright(
						cache.availableRoutes[cache.sideBuy ? "buy" : "sell"]
					)}`,
					`STRATEGY: ${ch.bold[cache.ui.defaultColor](
						cache.config.tradingStrategy
					)}`,
					{
						text: statusMessage,
					}
				);
				ui.div("");

				ui.div("BUY", "SELL", " ", " ");

				ui.div(
					{
						text: `SUCCESS : ${ch.bold.green(cache.tradeCounter.buy.success)}`,
					},
					{
						text: `SUCCESS: ${ch.bold.green(cache.tradeCounter.sell.success)}`,
					},
					{
						text: " ",
					},
					{
						text: " ",
					}
				);
				ui.div(
					{
						text: `FAIL: ${ch.bold.red(cache.tradeCounter.buy.fail)}`,
					},
					{
						text: `FAIL: ${ch.bold.red(cache.tradeCounter.sell.fail)}`,
					},
					{
						text: " ",
					},
					{
						text: " ",
					}
				);
				ui.div("");

				ui.div(
					{
						text: formatInputAmount(route, inputToken),
					},
					{
						text: " ",
					},
					{
						text: `SLIPPAGE: ${ch.magentaBright(
							`${
								cache.config.slippage === "profitOrKill"
									? "ProfitOrKill"
									: cache.config.slippage + " %"
							}`
						)}`,
					},
					{
						text: " ",
					},
					{
						text: " ",
					}
				);

				ui.div(
					{
						text: formatOutAmount(simulatedProfit, route, outputToken),
					},
					{
						text: " ",
					},
					{
						text: formatMinOutAmount(route, outputToken),
					},
					{
						text: `W/UNWRAP SOL: ${ch[cache.ui.defaultColor](
							cache.wrapUnwrapSOL ? "on" : "off"
						)}`,
					},
					{
						text: " ",
					}
				);

				ui.div(
					{
						text: formatSimulatedProfit(simulatedProfit),
					},
					{
						text: " ",
					},
					{
						text: " ",
					},
					{
						text: " ",
					},
					{
						text: " ",
					}
				);

				ui.div(" ");

				ui.div(
					"CURRENT BALANCE",
					"LAST BALANCE",
					"INIT BALANCE",
					"PROFIT",
					" "
				);

				ui.div(
					`${ch[cache.currentBalance.tokenA > 0 ? "yellowBright" : "gray"](
						toDecimal(cache.currentBalance.tokenA, tokenA.decimals)
					)} ${ch[cache.ui.defaultColor](tokenA.symbol)}`,

					`${ch[cache.lastBalance.tokenA > 0 ? "yellowBright" : "gray"](
						toDecimal(cache.lastBalance.tokenA, tokenA.decimals)
					)} ${ch[cache.ui.defaultColor](tokenA.symbol)}`,

					`${ch[cache.initialBalance.tokenA > 0 ? "yellowBright" : "gray"](
						toDecimal(cache.initialBalance.tokenA, tokenA.decimals)
					)} ${ch[cache.ui.defaultColor](tokenA.symbol)}`,

					`${ch[cache.currentProfit.tokenA > 0 ? "greenBright" : "redBright"](
						cache.currentProfit.tokenA.toFixed(2)
					)} %`,
					" "
				);

				const here = 0;
				console.log("🚀 ~ file: printToConsole.js ~ line 375 ~ here", here);
				// const test = (cache?.currentBalance?.tokenB);

				ui.div(
					`${ch[cache.currentBalance.tokenB > 0 ? "yellowBright" : "gray"](
						toDecimal(cache.currentBalance.tokenB, tokenB.decimals)
					)} ${ch[cache.ui.defaultColor](tokenB.symbol)}`,

					`${ch[cache.lastBalance.tokenB > 0 ? "yellowBright" : "gray"](
						toDecimal(cache.lastBalance.tokenB, tokenB.decimals)
					)} ${ch[cache.ui.defaultColor](tokenB.symbol)}`,

					`${ch[cache.initialBalance.tokenB > 0 ? "yellowBright" : "gray"](
						toDecimal(cache.initialBalance.tokenB, tokenB.decimals)
					)} ${ch[cache.ui.defaultColor](tokenB.symbol)}`,

					`${ch[cache.currentProfit.tokenB > 0 ? "greenBright" : "redBright"](
						cache.currentProfit.tokenB.toFixed(2)
					)} %`,
					" "
				);

				ui.div(ch.gray("-".repeat(140)));
				ui.div("");

				if (cache.ui.showProfitChart) {
					ui.div(
						chart.plot(cache.chart.spottedMax[cache.sideBuy ? "buy" : "sell"], {
							padding: " ".repeat(10),
							height: 4,
							colors: [simulatedProfit > 0 ? chart.lightgreen : chart.lightred],
						})
					);

					ui.div("");
				}

				ui.div(
					{
						text: `MAX (BUY): ${ch[cache.ui.defaultColor](
							cache.maxProfitSpotted.buy.toFixed(2)
						)} %`,
					},
					{
						text: `MAX (SELL): ${ch[cache.ui.defaultColor](
							cache.maxProfitSpotted.sell.toFixed(2)
						)} %`,
					},
					{ text: " " }
				);

				ui.div("");
				ui.div(ch.gray("-".repeat(140)));
				ui.div("");

				if (cache.ui.showTradeHistory) {
					ui.div(
						{ text: `TIMESTAMP` },
						{ text: `SIDE` },
						{ text: `IN` },
						{ text: `OUT` },
						{ text: `PROFIT` },
						{ text: `EXP. OUT` },
						{ text: `EXP. PROFIT` },
						{ text: `ERROR` }
					);

					ui.div(" ");

					if (cache?.tradeHistory?.length > 0) {
						const tableData = [...cache.tradeHistory].slice(-5);
						tableData.map((entry) =>
							ui.div(
								{ text: `${entry.date}`, border: true },
								{ text: `${entry.buy ? "BUY" : "SELL"}`, border: true },
								{ text: `${entry.inAmount} ${entry.inputToken}`, border: true },
								{
									text: `${entry.outAmount} ${entry.outputToken}`,
									border: true,
								},
								{
									text: `${
										ch[
											entry.profit > 0
												? "greenBright"
												: entry.profit < 0
												? "redBright"
												: "cyanBright"
										](isNaN(entry.profit) ? "0" : entry.profit.toFixed(2)) +
										" %"
									}`,
									border: true,
								},
								{
									text: `${entry.expectedOutAmount} ${entry.outputToken}`,
									border: true,
								},
								{
									text: `${entry.expectedProfit.toFixed(2)} %`,
									border: true,
								},
								{
									text: `${entry.error ? ch.bold.redBright(entry.error) : "-"}`,
									border: true,
								}
							)
						);
					}
				}
				ui.div("");

				// print UI
				console.log(ui.toString());
			}
		}
	} catch (error) {
		console.log(error);
	}
}

module.exports = printToConsole;

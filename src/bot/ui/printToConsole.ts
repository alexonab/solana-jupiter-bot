// const ui = require("cliui")({ width: 140 });
// @ts-ignore
import cliui from "cliui";
const ui = cliui({ width: 140 });
// const ch = require("chalk");
import ch from "chalk";

// const moment = require("moment");
import moment from "moment";
// const chart = require("asciichart");
// @ts-ignore
import chart from "asciichart";

const { toDecimal } = require("../../utils");
// const cache = require("../cache");
import { cache } from "../cache";
// const JSBI = require("jsbi");
import JSBI from "jsbi";

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
// @ts-ignore
const formatInputAmount = (route, inputToken) => {
	return `IN:  ${ch.yellowBright(
		toDecimal(JSBI.toNumber(route.inAmount), inputToken.decimals)
		//@ts-ignore
	)} ${ch[cache.ui.defaultColor](inputToken.symbol)}`;
};
// @ts-ignore
const formatOutAmount = (simulatedProfit, route, outputToken) => {
	return `OUT: ${ch[simulatedProfit > 0 ? "greenBright" : "red"](
		toDecimal(JSBI.toNumber(route.outAmount), outputToken.decimals)
		//@ts-ignore
	)} ${ch[cache.ui.defaultColor](outputToken.symbol)}`;
};
// @ts-ignore
const formatSimulatedProfit = (simulatedProfit) => {
	return `PROFIT: ${ch[simulatedProfit > 0 ? "greenBright" : "red"](
		simulatedProfit.toFixed(2)
	)} % ${ch.gray(`(${cache?.config?.minPercProfit})`)}`;
};
// @ts-ignore
const formatMinOutAmount = (route, outputToken) => {
	return `MIN. OUT: ${ch.magentaBright(
		toDecimal(JSBI.toNumber(route.otherAmountThreshold), outputToken.decimals)
	)}`;
};
// @ts-ignore
const formatPerformance = (performanceOfRouteComp, minimal = false) => {
	const performanceOfRouteCompColor =
		performanceOfRouteComp < 1000 ? cache.ui.defaultColor : "redBright";

	const performanceOfIteration = ch.grey(
		`+${cache.performanceOfIteration.toFixed()} ms`
	);
	//@ts-ignore

	return `${minimal ? "L" : "LOOKUP (ROUTE)"}: ${ch.bold[
		performanceOfRouteCompColor
	](performanceOfRouteComp.toFixed())} ms ${performanceOfIteration}`;
};

export const printToConsole = ({
	// @ts-ignore
	date,
	// @ts-ignore
	i,
	// @ts-ignore
	performanceOfRouteComp,
	// @ts-ignore
	inputToken,
	// @ts-ignore
	outputToken,
	// @ts-ignore
	tokenA,
	// @ts-ignore
	tokenB,
	// @ts-ignore
	route,
	// @ts-ignore
	simulatedProfit,
}): void => {
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
							? //@ts-ignore
							  ch[cache.ui.defaultColor].bold(i)
							: //@ts-ignore
							  ch[cache.ui.defaultColor](i)
						//@ts-ignore
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
						//@ts-ignore
						text: `TIMESTAMP: ${ch[cache.ui.defaultColor](
							date.toLocaleString()
						)}`,
					},
					{
						text: `I: ${
							i % 2 === 0
								? //@ts-ignore
								  ch[cache.ui.defaultColor].bold(i)
								: //@ts-ignore
								  ch[cache.ui.defaultColor](i)
							//@ts-ignore
						} | ${ch.bold[cache.ui.defaultColor](
							cache.iterationPerMinute.value
						)} i/min`,
					},
					{
						//@ts-ignore
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
						//@ts-ignore
						text: `STARTED: ${ch[cache.ui.defaultColor](
							moment(cache.startTime).fromNow()
						)}`,
					},
					{
						text: formatPerformance(performanceOfRouteComp),
					},
					{
						//@ts-ignore
						text: `MIN INTERVAL: ${ch[cache.ui.defaultColor](
							cache.config.minInterval
							//@ts-ignore
						)} ms QUEUE: ${ch[cache.ui.defaultColor](
							Object.keys(cache.queue).length
							//@ts-ignore
						)}/${ch[cache.ui.defaultColor](cache.queueThrottle)}`,
					}
				);

				ui.div(
					" ",
					" ",
					Object.values(cache.queue)
						.map(
							// @ts-ignore
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
						//@ts-ignore
					}: ${ch.bold[cache.ui.defaultColor](inputToken.symbol)} ${
						cache.config.tradingStrategy === "arbitrage"
							? ""
							: //@ts-ignore
							  `-> ${ch.bold[cache.ui.defaultColor](outputToken.symbol)}`
					}`,
					`ROUTES: ${ch.bold.yellowBright(
						cache.availableRoutes[cache.sideBuy ? "buy" : "sell"]
					)}`,
					//@ts-ignore
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
						//@ts-ignore
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
						//@ts-ignore
					)} ${ch[cache.ui.defaultColor](tokenA.symbol)}`,

					`${ch[cache.lastBalance.tokenA > 0 ? "yellowBright" : "gray"](
						toDecimal(cache.lastBalance.tokenA, tokenA.decimals)
						//@ts-ignore
					)} ${ch[cache.ui.defaultColor](tokenA.symbol)}`,

					`${ch[cache.initialBalance.tokenA > 0 ? "yellowBright" : "gray"](
						toDecimal(cache.initialBalance.tokenA, tokenA.decimals)
						//@ts-ignore
					)} ${ch[cache.ui.defaultColor](tokenA.symbol)}`,

					`${ch[cache.currentProfit.tokenA > 0 ? "greenBright" : "redBright"](
						cache.currentProfit.tokenA.toFixed(2)
					)} %`,
					" "
				);

				const here = 0;
				// const test = (cache?.currentBalance?.tokenB);

				ui.div(
					`${ch[cache.currentBalance.tokenB > 0 ? "yellowBright" : "gray"](
						toDecimal(cache.currentBalance.tokenB, tokenB.decimals)
						//@ts-ignore
					)} ${ch[cache.ui.defaultColor](tokenB.symbol)}`,

					`${ch[cache.lastBalance.tokenB > 0 ? "yellowBright" : "gray"](
						toDecimal(cache.lastBalance.tokenB, tokenB.decimals)
						//@ts-ignore
					)} ${ch[cache.ui.defaultColor](tokenB.symbol)}`,

					`${ch[cache.initialBalance.tokenB > 0 ? "yellowBright" : "gray"](
						toDecimal(cache.initialBalance.tokenB, tokenB.decimals)
						//@ts-ignore
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
						//@ts-ignore
						text: `MAX (BUY): ${ch[cache.ui.defaultColor](
							cache.maxProfitSpotted.buy.toFixed(2)
						)} %`,
					},
					{
						//@ts-ignore
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
								//@ts-ignore
								{ text: `${entry.date}`, border: true },
								//@ts-ignore
								{ text: `${entry.buy ? "BUY" : "SELL"}`, border: true },
								//@ts-ignore
								{ text: `${entry.inAmount} ${entry.inputToken}`, border: true },
								{
									//@ts-ignore
									text: `${entry.outAmount} ${entry.outputToken}`,
									border: true,
								},
								{
									text: `${
										ch[
											//@ts-ignore
											entry.profit > 0
												? "greenBright"
												: //@ts-ignore
												entry.profit < 0
												? "redBright"
												: "cyanBright"
											//@ts-ignore
										](isNaN(entry.profit) ? "0" : entry.profit.toFixed(2)) +
										" %"
									}`,
									border: true,
								},
								{
									//@ts-ignore
									text: `${entry.expectedOutAmount} ${entry.outputToken}`,
									border: true,
								},
								{
									//@ts-ignore
									text: `${entry.expectedProfit.toFixed(2)} %`,
									border: true,
								},
								{
									//@ts-ignore
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
};

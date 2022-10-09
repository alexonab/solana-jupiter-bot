export interface Config {
	network: string;
	rpc: string[];
	tradingStrategy: string;
	tokenA: Token;
	tokenB: Token;
	slippage: string;
	minPercProfit: string;
	minInterval: number;
	tradeSize: TradeSize;
	ui: UI;
	storeFailedTxInHistory: boolean;
}

export interface Token {
	chainId: number;
	address: string;
	symbol: string;
	name: string;
	decimals: number;
	logoURI: string;
	tags: string[];
}

export interface TradeSize {
	value: number;
	strategy: string;
}

export interface UI {
	defaultColor: string;
}

export interface TCache {
	config: Config;
	startTime?: Date;
	queue?: {};
	queueThrottle?: number;
	sideBuy: boolean;
	iteration: number;
	performanceOfTxStart: number;
	performanceOfIteration: number;
	iterationPerMinute: any;
	initialBalance: { tokenA: number; tokenB: number };
	currentBalance: { tokenA: number; tokenB: number };
	currentProfit: { tokenA: number; tokenB: number };
	lastBalance: { tokenA: number; tokenB: number };
	profit: { tokenA: number; tokenB: number };
	maxProfitSpotted: { buy: number; sell: number };
	tradeCounter: {
		buy: { success: number; fail: number };
		sell: { success: number; fail: number };
	};
	ui: {
		defaultColor: string;
		showPerformanceOfRouteCompChart: boolean;
		showProfitChart: boolean;
		showTradeHistory: boolean;
		hideRpc: boolean;
		showHelp: boolean;
		allowClear: boolean;
		minimalMode: boolean;
	};
	chart: {
		spottedMax: { buy: any[]; sell: any[] };
		performanceOfRouteComp: any[];
	};
	hotkeys: { e: boolean; r: boolean };
	tradingEnabled: boolean;
	wrapUnwrapSOL: boolean;
	swappingRightNow: boolean;
	fetchingResultsFromSolscan: boolean;
	fetchingResultsFromSolscanStart: number;
	tradeHistory: never[];
	availableRoutes: { buy: number; sell: number };
	isSetupDone: boolean;
}

// global cache
export const cache: TCache = {
	config: <Config>{},
	startTime: new Date(),
	queue: {},
	queueThrottle: 1,
	sideBuy: true,
	iteration: 0,
	performanceOfTxStart: 0,
	performanceOfIteration: 0,
	iterationPerMinute: {
		start: performance.now(),
		value: 0,
		counter: 0,
	},
	initialBalance: {
		tokenA: 0,
		tokenB: 0,
	},

	currentBalance: {
		tokenA: 0,
		tokenB: 0,
	},
	currentProfit: {
		tokenA: 0,
		tokenB: 0,
	},
	lastBalance: {
		tokenA: 0,
		tokenB: 0,
	},
	profit: {
		tokenA: 0,
		tokenB: 0,
	},
	maxProfitSpotted: {
		buy: 0,
		sell: 0,
	},
	tradeCounter: {
		buy: { success: 0, fail: 0 },
		sell: { success: 0, fail: 0 },
	},
	ui: {
		defaultColor: process.env.UI_COLOR ?? "cyan",
		showPerformanceOfRouteCompChart: false,
		showProfitChart: true,
		showTradeHistory: true,
		hideRpc: false,
		showHelp: true,
		allowClear: true,
		minimalMode: false,
	},
	chart: {
		spottedMax: {
			buy: new Array(120).fill(0),
			sell: new Array(120).fill(0),
		},
		performanceOfRouteComp: new Array(120).fill(0),
	},
	hotkeys: {
		e: false,
		r: false,
	},
	tradingEnabled:
		process.env.TRADING_ENABLED === undefined
			? true
			: process.env.TRADING_ENABLED === "true",
	wrapUnwrapSOL:
		process.env.WRAP_UNWRAP_SOL === undefined
			? true
			: process.env.WRAP_UNWRAP_SOL === "true",
	swappingRightNow: false,
	fetchingResultsFromSolscan: false,
	fetchingResultsFromSolscanStart: 0,
	tradeHistory: [],

	availableRoutes: {
		buy: 0,
		sell: 0,
	},
	isSetupDone: false,
};

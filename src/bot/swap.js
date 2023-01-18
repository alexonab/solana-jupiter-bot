const { calculateProfit, toDecimal, storeItInTempAsJSON } = require("../utils");
const cache = require("./cache");
const { getSwapResultFromSolscanParser } = require("../services/solscan");
const { TransactionMessage, Keypair, VersionedTransaction, sendAndConfirmTransaction } = require("@solana/web3.js");
const base58 = require("bs58");
const { Connection, PublicKey } = require("@solana/web3.js/lib/index.cjs");
const { Token, TOKEN_PROGRAM_ID } = require('@solana/spl-token')
const JSBI = require('jsbi')

const swap = async (jupiter, route, route2, tokenA, tokenB) => {
	try {
		const performanceOfTxStart = performance.now();
		cache.performanceOfTxStart = performanceOfTxStart;

		const { execute } = await jupiter.exchange({
			routeInfo: route,
		});
		const result = await execute();


		if (process.env.DEBUG) storeItInTempAsJSON("routeInfoBeforeSwap", route);

		var {
			setupTransaction,	
			swapTransaction,
			cleanupTransaction,
			addressLookupTableAccounts
		} = await jupiter.exchange({
			routeInfo: route,
		});
		
		let instructions = []
		let luts = []

		await Promise.all(
			[
				setupTransaction,	
				swapTransaction,
				cleanupTransaction
			]
				.filter(Boolean)
				.map(
				async (transaction) => {
					let DecompileArgs = {
						addressLookupTableAccounts:
						addressLookupTableAccounts,
					  };
					  let decompiled = TransactionMessage.decompile(
						// @ts-ignore
						transaction.message,
						DecompileArgs
					  );
					  let c = 0 
					  for (var abc of decompiled.instructions){
						if (c != 0){
							instructions.push(abc)
						}
						c++
					  }

					luts.push(...addressLookupTableAccounts)


					}
				)
		)

		var {
			setupTransaction,	
			swapTransaction,
			cleanupTransaction,
			addressLookupTableAccounts
		} = await jupiter.exchange({
			routeInfo: route2,
		});

		await Promise.all(
			[
				setupTransaction,	
				swapTransaction,
				cleanupTransaction
			]
				.filter(Boolean)
				.map(
				async (transaction) => {
					let DecompileArgs = {
						addressLookupTableAccounts:
						addressLookupTableAccounts,
					  };
					  let decompiled = TransactionMessage.decompile(
						// @ts-ignore
						transaction.message,
						DecompileArgs
					  );
					  let c = 0 
					  for (var abc of decompiled.instructions){
						if (c != 0){
							instructions.push(abc)
						}
						c++
					  }

					luts.push(...addressLookupTableAccounts)


					}
				)
		)
		const payer = Keypair.fromSecretKey(
				base58.decode(process.env.SOLANA_WALLET_PRIVATE_KEY)
			)
		const connection = new Connection(cache.config.rpc[0]);
		
		const atas = (await connection.getTokenAccountsByOwner(payer.publicKey,{mint: new PublicKey(tokenA.address)})).value
		console.log(await connection.getTokenAccountsByOwner(payer.publicKey,{mint: new PublicKey(tokenA.address)}));
		let t = 0;
		var theata 
		for (var ata of atas){
			t+=Number((await connection.getTokenAccountBalance(ata.pubkey)).value.amount)
			console.log((await connection.getTokenAccountBalance(ata.pubkey).value))
			//console.log('t:',t, ata.pubkey, payer.publicKey)
			theata = ata 
		}
		console.log('t:', t)
		instructions.push(Token.createTransferInstruction (
			new PublicKey(TOKEN_PROGRAM_ID),
			theata.pubkey,
			theata.pubkey,
			payer.publicKey,
			[],
			t
		  )
		)
		
		const messageV00 = new TransactionMessage({
			payerKey: payer.publicKey,
			recentBlockhash: await (
				await connection.getLatestBlockhash()
			).blockhash,
			instructions,
		}).compileToV0Message(luts);

		const transaction = new VersionedTransaction(
			messageV00
		);

		await transaction.sign([payer]);
		
		result =  await sendAndConfirmTransaction(connection, transaction, {skipPreflight: false})

		if (process.env.DEBUG) storeItInTempAsJSON("result", result);

		const performanceOfTx = performance.now() - performanceOfTxStart;

		return [result, performanceOfTx];
	} catch (error) {
		console.log("Swap error: ", error);
	}
};
exports.swap = swap;

const failedSwapHandler = (tradeEntry) => {
	// update counter
	cache.tradeCounter[cache.sideBuy ? "buy" : "sell"].fail++;

	// update trade history
	cache.config.storeFailedTxInHistory;

	// update trade history
	let tempHistory = cache.tradeHistory;
	tempHistory.push(tradeEntry);
	cache.tradeHistory = tempHistory;
};
exports.failedSwapHandler = failedSwapHandler;

const successSwapHandler = async (tx, tradeEntry, tokenA, tokenB) => {
	if (process.env.DEBUG) storeItInTempAsJSON(`txResultFromSDK_${tx?.txid}`, tx);

	// update counter
	cache.tradeCounter[cache.sideBuy ? "buy" : "sell"].success++;

	if (cache.config.tradingStrategy === "pingpong") {
		// update balance
		if (cache.sideBuy) {
			cache.lastBalance.tokenA = cache.currentBalance.tokenA;
			cache.currentBalance.tokenA = 0;
			cache.currentBalance.tokenB = tx.outputAmount;
		} else {
			cache.lastBalance.tokenB = cache.currentBalance.tokenB;
			cache.currentBalance.tokenB = 0;
			cache.currentBalance.tokenA = tx.outputAmount;
		}

		// update profit
		if (cache.sideBuy) {
			cache.currentProfit.tokenA = 0;
			cache.currentProfit.tokenB = calculateProfit(
				cache.initialBalance.tokenB,
				cache.currentBalance.tokenB
			);
		} else {
			cache.currentProfit.tokenB = 0;
			cache.currentProfit.tokenA = calculateProfit(
				cache.initialBalance.tokenA,
				cache.currentBalance.tokenA
			);
		}

		// update trade history
		let tempHistory = cache.tradeHistory;

		tradeEntry.inAmount = toDecimal(
			tx.inputAmount,
			cache.sideBuy ? tokenA.decimals : tokenB.decimals
		);
		tradeEntry.outAmount = toDecimal(
			tx.outputAmount,
			cache.sideBuy ? tokenB.decimals : tokenA.decimals
		);

		tradeEntry.profit = calculateProfit(
			cache.lastBalance[cache.sideBuy ? "tokenB" : "tokenA"],
			tx.outputAmount
		);
		tempHistory.push(tradeEntry);
		cache.tradeHistory = tempHistory;
	}
	if (cache.config.tradingStrategy === "arbitrage") {
		/** check real amounts on solscan because Jupiter SDK returns wrong amounts
		 *  when we trading TokenA <> TokenA (arbitrage)
		 */
		const [inAmountFromSolscanParser, outAmountFromSolscanParser] =
			await getSwapResultFromSolscanParser(tx?.txid);

		if (inAmountFromSolscanParser === -1)
			throw new Error(
				`Solscan inputAmount error\n	https://solscan.io/tx/${tx.txid}`
			);
		if (outAmountFromSolscanParser === -1)
			throw new Error(
				`Solscan outputAmount error\n	https://solscan.io/tx/${tx.txid}`
			);

		cache.lastBalance.tokenA = cache.currentBalance.tokenA;
		cache.currentBalance.tokenA =
			cache.lastBalance.tokenA +
			(outAmountFromSolscanParser - inAmountFromSolscanParser);

		// update trade history
		let tempHistory = cache.tradeHistory;

		tradeEntry.inAmount = toDecimal(inAmountFromSolscanParser, tokenA.decimals);
		tradeEntry.outAmount = toDecimal(
			outAmountFromSolscanParser,
			tokenA.decimals
		);

		tradeEntry.profit = calculateProfit(
			tradeEntry.inAmount,
			tradeEntry.outAmount
		);
		tempHistory.push(tradeEntry);
		cache.tradeHistory = tempHistory;

		const prevProfit = cache.currentProfit.tokenA;

		// total profit
		cache.currentProfit.tokenA = prevProfit + tradeEntry.profit;
	}
};
exports.successSwapHandler = successSwapHandler;

/* eslint-disable no-console */
import dotenv from 'dotenv';
dotenv.config();

import { Interface, Result } from '@ethersproject/abi';
import { DummyDexHelper, IDexHelper } from '../../dex-helper/index';
import { Network, SwapSide } from '../../constants';
import { BI_POWS } from '../../bigint-constants';
import { SpiritSwapV3 } from './algebra';
import {
  checkPoolPrices,
  checkPoolsLiquidity,
  checkConstantPoolPrices,
} from '../../../tests/utils';
import { Tokens } from '../../../tests/constants-e2e';
import { Address } from '@paraswap/core';

function getReaderCalldata(
  exchangeAddress: string,
  readerIface: Interface,
  amounts: bigint[],
  funcName: string,
  tokenIn: Address,
  tokenOut: Address,
) {
  return amounts.map(amount => ({
    target: exchangeAddress,
    callData: readerIface.encodeFunctionData(funcName, [
      tokenIn,
      tokenOut,
      amount,
      0n,
    ]),
  }));
}

function decodeReaderResult(
  results: Result,
  readerIface: Interface,
  funcName: string,
) {
  return results.map(result => {
    const parsed = readerIface.decodeFunctionResult(funcName, result);
    return BigInt(parsed[0]._hex);
  });
}

async function checkOnChainPricing(
  algebra: SpiritSwapV3,
  dexHelper: IDexHelper,
  funcName: string,
  blockNumber: number,
  prices: bigint[],
  tokenIn: Address,
  tokenOut: Address,
  amounts: bigint[],
) {
  const exchangeAddress = algebra.config.quoter;

  const readerIface = algebra.quoterIface;

	console.log("OH")
  const readerCallData = getReaderCalldata(
    exchangeAddress,
    readerIface,
    amounts.slice(1),
    funcName,
    tokenIn,
    tokenOut,
  );
  console.log("PRINT OU PAAS ", readerCallData)
  const readerResult = (
    await dexHelper.multiContract.methods
      .aggregate(readerCallData)
      .call({}, blockNumber)
  ).returnData;
  console.log("PAPI")

  const expectedPrices = [0n].concat(
    decodeReaderResult(readerResult, readerIface, funcName),
  );
  console.log("PAASiuio ")

  expect(prices).toEqual(expectedPrices);
}

async function testPricingOnNetwork(
  algebra: SpiritSwapV3,
  network: Network,
  dexKey: string,
  dexHelper: IDexHelper,
  blockNumber: number,
  srcTokenSymbol: string,
  destTokenSymbol: string,
  side: SwapSide,
  amounts: bigint[],
  funcNameToCheck: string,
) {
  const networkTokens = Tokens[network];

  const pools = await algebra.getPoolIdentifiers(
    networkTokens[srcTokenSymbol],
    networkTokens[destTokenSymbol],
    side,
    blockNumber,
  );
  console.log(
    `${srcTokenSymbol} <> ${destTokenSymbol} Pool Identifiers: `,
    pools,
  );

  expect(pools.length).toBeGreaterThan(0);

  const poolPrices = await algebra.getPricesVolume(
    networkTokens[srcTokenSymbol],
    networkTokens[destTokenSymbol],
    amounts,
    side,
    blockNumber,
    pools,
  );
  console.log(
    `${srcTokenSymbol} <> ${destTokenSymbol} Pool Prices: `,
    poolPrices,
  );

  expect(poolPrices).not.toBeNull();
  if (algebra.hasConstantPriceLargeAmounts) {
    checkConstantPoolPrices(poolPrices!, amounts, dexKey);
  } else {
    checkPoolPrices(poolPrices!, amounts, side, dexKey);
	}
	
	console.log("YEYEYE")

  // Check if onchain pricing equals to calculated ones
  await checkOnChainPricing(
    algebra,
    dexHelper,
    funcNameToCheck,
    blockNumber,
    poolPrices![0].prices,
    networkTokens[srcTokenSymbol].address,
    networkTokens[destTokenSymbol].address,
    amounts,
  );
}

describe('SpiritSwapV3', function () {
  const dexKey = 'SpiritSwapV3';
  let blockNumber: number;
  let algebra: SpiritSwapV3;

  describe('Fantom', () => {
    const network = Network.FANTOM;
    const dexHelper = new DummyDexHelper(network);

    const tokens = Tokens[network];

    describe('WFTM => USDC', () => {
      const srcTokenSymbol = 'WFTM';
      const destTokenSymbol = 'LZUSDC';

      const amountsForSell = [
        0n,
        10n * BI_POWS[tokens[srcTokenSymbol].decimals],
        20n * BI_POWS[tokens[srcTokenSymbol].decimals],
        30n * BI_POWS[tokens[srcTokenSymbol].decimals],
        40n * BI_POWS[tokens[srcTokenSymbol].decimals],
        50n * BI_POWS[tokens[srcTokenSymbol].decimals],
        60n * BI_POWS[tokens[srcTokenSymbol].decimals],
        70n * BI_POWS[tokens[srcTokenSymbol].decimals],
        80n * BI_POWS[tokens[srcTokenSymbol].decimals],
        90n * BI_POWS[tokens[srcTokenSymbol].decimals],
        100n * BI_POWS[tokens[srcTokenSymbol].decimals],
      ];

      const amountsForBuy = [
        0n,
        1n * BI_POWS[tokens[destTokenSymbol].decimals],
        2n * BI_POWS[tokens[destTokenSymbol].decimals],
        3n * BI_POWS[tokens[destTokenSymbol].decimals],
        4n * BI_POWS[tokens[destTokenSymbol].decimals],
        5n * BI_POWS[tokens[destTokenSymbol].decimals],
        6n * BI_POWS[tokens[destTokenSymbol].decimals],
        7n * BI_POWS[tokens[destTokenSymbol].decimals],
        8n * BI_POWS[tokens[destTokenSymbol].decimals],
        9n * BI_POWS[tokens[destTokenSymbol].decimals],
        10n * BI_POWS[tokens[destTokenSymbol].decimals],
      ];

      beforeAll(async () => {
        blockNumber = await dexHelper.web3Provider.eth.getBlockNumber();
        algebra = new SpiritSwapV3(network, dexKey, dexHelper);
        if (algebra.initializePricing) {
          await algebra.initializePricing(blockNumber);
        }
      });

      it('getPoolIdentifiers and getPricesVolume SELL', async function () {
        await testPricingOnNetwork(
          algebra,
          network,
          dexKey,
          dexHelper,
          blockNumber,
          srcTokenSymbol,
          destTokenSymbol,
          SwapSide.SELL,
          amountsForSell,
          'quoteExactInputSingle',
        );
      });

      it('getPoolIdentifiers and getPricesVolume BUY', async function () {
        await testPricingOnNetwork(
          algebra,
          network,
          dexKey,
          dexHelper,
          blockNumber,
          srcTokenSymbol,
          destTokenSymbol,
          SwapSide.BUY,
          amountsForBuy,
          'quoteExactOutputSingle',
        );
      });

      it('getTopPoolsForToken', async function () {
        // We have to check without calling initializePricing, because
        // pool-tracker is not calling that function
        const newAlgebra = new SpiritSwapV3(network, dexKey, dexHelper);
        const poolLiquidity = await newAlgebra.getTopPoolsForToken(
          tokens[srcTokenSymbol].address,
          10,
        );
        console.log(`${srcTokenSymbol} Top Pools:`, poolLiquidity);

        if (!newAlgebra.hasConstantPriceLargeAmounts) {
          checkPoolsLiquidity(
            poolLiquidity,
            Tokens[network][srcTokenSymbol].address,
            dexKey,
          );
        }
      });
    });

    describe('WFTM => USDC', () => {
      const srcTokenSymbol = 'WFTM';
      const destTokenSymbol = 'LZUSDC';

      const amountsForSell = [
        0n,
        10n * BI_POWS[tokens[srcTokenSymbol].decimals],
        20n * BI_POWS[tokens[srcTokenSymbol].decimals],
        30n * BI_POWS[tokens[srcTokenSymbol].decimals],
        40n * BI_POWS[tokens[srcTokenSymbol].decimals],
        50n * BI_POWS[tokens[srcTokenSymbol].decimals],
        60n * BI_POWS[tokens[srcTokenSymbol].decimals],
        70n * BI_POWS[tokens[srcTokenSymbol].decimals],
        80n * BI_POWS[tokens[srcTokenSymbol].decimals],
        90n * BI_POWS[tokens[srcTokenSymbol].decimals],
        100n * BI_POWS[tokens[srcTokenSymbol].decimals],
      ];

      const amountsForBuy = [
        0n,
        1n * BI_POWS[tokens[destTokenSymbol].decimals],
        2n * BI_POWS[tokens[destTokenSymbol].decimals],
        3n * BI_POWS[tokens[destTokenSymbol].decimals],
        4n * BI_POWS[tokens[destTokenSymbol].decimals],
        5n * BI_POWS[tokens[destTokenSymbol].decimals],
        6n * BI_POWS[tokens[destTokenSymbol].decimals],
        7n * BI_POWS[tokens[destTokenSymbol].decimals],
        8n * BI_POWS[tokens[destTokenSymbol].decimals],
        9n * BI_POWS[tokens[destTokenSymbol].decimals],
        10n * BI_POWS[tokens[destTokenSymbol].decimals],
      ];

      beforeAll(async () => {
        blockNumber = await dexHelper.web3Provider.eth.getBlockNumber();
        algebra = new SpiritSwapV3(network, dexKey, dexHelper);
        if (algebra.initializePricing) {
          await algebra.initializePricing(blockNumber);
        }
      });

      it('getPoolIdentifiers and getPricesVolume SELL', async function () {
        await testPricingOnNetwork(
          algebra,
          network,
          dexKey,
          dexHelper,
          blockNumber,
          srcTokenSymbol,
          destTokenSymbol,
          SwapSide.SELL,
          amountsForSell,
          'quoteExactInputSingle',
        );
      });

      it('getPoolIdentifiers and getPricesVolume BUY', async function () {
        await testPricingOnNetwork(
          algebra,
          network,
          dexKey,
          dexHelper,
          blockNumber,
          srcTokenSymbol,
          destTokenSymbol,
          SwapSide.BUY,
          amountsForBuy,
          'quoteExactOutputSingle',
        );
      });

      it('getTopPoolsForToken', async function () {
        // We have to check without calling initializePricing, because
        // pool-tracker is not calling that function
        const newAlgebra = new SpiritSwapV3(network, dexKey, dexHelper);
        const poolLiquidity = await newAlgebra.getTopPoolsForToken(
          tokens[srcTokenSymbol].address,
          10,
        );
        console.log(`${srcTokenSymbol} Top Pools:`, poolLiquidity);

        if (!newAlgebra.hasConstantPriceLargeAmounts) {
          checkPoolsLiquidity(
            poolLiquidity,
            Tokens[network][srcTokenSymbol].address,
            dexKey,
          );
        }
      });
    });
  });
});

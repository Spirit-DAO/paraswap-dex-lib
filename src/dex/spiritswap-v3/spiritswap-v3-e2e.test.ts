import dotenv from 'dotenv';
dotenv.config();

import { testE2E } from '../../../tests/utils-e2e';
import {
  Tokens,
  Holders,
  NativeTokenSymbols,
} from '../../../tests/constants-e2e';
import { Network, ContractMethod, SwapSide } from '../../constants';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { generateConfig } from '../../config';

function testForNetwork(
  network: Network,
  dexKey: string,
  tokenASymbol: string,
  tokenBSymbol: string,
  tokenAAmount: string,
  tokenBAmount: string,
  nativeTokenAmount: string,
  slippage?: number | undefined,
) {
  const provider = new StaticJsonRpcProvider(
    generateConfig(network).privateHttpProvider,
    network,
  );
  const tokens = Tokens[network];
  const holders = Holders[network];
  const nativeTokenSymbol = NativeTokenSymbols[network];

  const sideToContractMethods = new Map([
    [
      SwapSide.SELL,
      [
        ContractMethod.simpleSwap,
        ContractMethod.multiSwap,
        ContractMethod.megaSwap,
        ContractMethod.directUniV3Swap,
      ],
    ],
    [
      SwapSide.BUY,
      [
        ContractMethod.simpleBuy,
        ContractMethod.buy,
        ContractMethod.directUniV3Buy,
      ],
    ],
  ]);

  describe(`${network}`, () => {
    sideToContractMethods.forEach((contractMethods, side) =>
      describe(`${side}`, () => {
        contractMethods.forEach((contractMethod: ContractMethod) => {
          describe(`${contractMethod}`, () => {
            it(`${nativeTokenSymbol} -> ${tokenASymbol}`, async () => {
              await testE2E(
                tokens[nativeTokenSymbol],
                tokens[tokenASymbol],
                holders[nativeTokenSymbol],
                side === SwapSide.SELL ? nativeTokenAmount : tokenAAmount,
                side,
                dexKey,
                contractMethod,
                network,
                provider,
                undefined,
                undefined,
                undefined,
                slippage,
              );
            });
            it(`${tokenASymbol} -> ${nativeTokenSymbol}`, async () => {
              await testE2E(
                tokens[tokenASymbol],
                tokens[nativeTokenSymbol],
                holders[tokenASymbol],
                side === SwapSide.SELL ? tokenAAmount : nativeTokenAmount,
                side,
                dexKey,
                contractMethod,
                network,
                provider,
                undefined,
                undefined,
                undefined,
                slippage,
              );
            });
            it(`${tokenASymbol} -> ${tokenBSymbol}`, async () => {
              await testE2E(
                tokens[tokenASymbol],
                tokens[tokenBSymbol],
                holders[tokenASymbol],
                side === SwapSide.SELL ? tokenAAmount : tokenBAmount,
                side,
                dexKey,
                contractMethod,
                network,
                provider,
                undefined,
                undefined,
                undefined,
                slippage,
              );
            });
          });
        });
      }),
    );
  });
}

describe('SpiritswapV3 E2E', () => {
  describe('SpiritswapV3', () => {
    const dexKey = 'SpiritSwapV3';

    describe('SpiritswapV3 MAINNET', () => {
      const network = Network.FANTOM;
      const tokens = Tokens[network];
      const holders = Holders[network];
      const provider = new StaticJsonRpcProvider(
        generateConfig(network).privateHttpProvider,
        network,
      );

      it('BUY SPIRIT -> LZUSDC', async () => {
        await testE2E(
          tokens['SPIRIT'],
          tokens['LZUSDC'],
          holders['SPIRIT'],
          '100000000000',
          SwapSide.BUY,
          dexKey,
          ContractMethod.simpleBuy,
          network,
          provider,
        );
      });
      it('SELL WFTM -> SPIRIT', async () => {
        await testE2E(
          tokens['WFTM'],
          tokens['SPIRIT'],
          holders['WFTM'],
          '1000000000000000000',
          SwapSide.SELL,
          dexKey,
          ContractMethod.simpleSwap,
          network,
          provider,
        );
      });

      it('directSwap SELL WFTM -> USDC', async () => {
        await testE2E(
          tokens['WFTM'],
          tokens['USDC'],
          holders['WFTM'],
          '1000000000000000000',
          SwapSide.SELL,
          dexKey,
          ContractMethod.directUniV3Swap,
          network,
          provider,
        );
      });
    });
  });
});

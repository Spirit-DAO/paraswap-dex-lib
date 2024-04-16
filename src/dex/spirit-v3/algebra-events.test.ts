/* eslint-disable no-console */
import dotenv from 'dotenv';
dotenv.config();

import _ from 'lodash';
import { AlgebraConfig } from './config';
import { Network } from '../../constants';
import { DummyDexHelper } from '../../dex-helper/index';
import { testEventSubscriber } from '../../../tests/utils-events';
import { PoolState } from './types';
import { Interface } from '@ethersproject/abi';
import ERC20ABI from '../../abi/erc20.json';
import StateMulticallABI from '../../abi/algebra/AlgebraStateMulticall.abi.json';
import { AbiItem } from 'web3-utils';
import { AlgebraEventPool } from './algebra-pool';

jest.setTimeout(300 * 1000);
const dexKey = 'SpiritSwapV3';
const network = Network.FANTOM;
const config = AlgebraConfig[dexKey][network];

async function fetchPoolStateFromContract(
  algebraPool: AlgebraEventPool,
  blockNumber: number,
  poolAddress: string,
): Promise<PoolState> {
  const message = `Algebra: ${poolAddress} blockNumber ${blockNumber}`;
  console.log(`Fetching state ${message}`);
  // Be careful to not request state prior to contract deployment
  // Otherwise need to use manual state sourcing from multicall
  // We had that mechanism, but removed it with this commit
  // You can restore it, but better just to find block after state multicall
  // deployment
	let state = await algebraPool.generateState(blockNumber);
  console.log(`Done ${message}`);
  return state;
}
// To make this test to pass, you need to increase till 1500
describe('SpiritSwapV3 Event Edge Case', function () {
  const poolAddress = '0x8a6bb521d5903EA2A617c38d1253dDED79AC5deF';
  const token0 = '0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83';
  const token1 = '0x5Cc61A78F164885776AA610fb0FE1257df78E59B';
  const dexKey = 'SpiritSwapV3';
  const network = Network.FANTOM;
  const config = AlgebraConfig[dexKey][network];

  const blockNumbers: { [eventName: string]: number[] } = {
	  ['Mint']: [79168449, 79447603,79447634, 79447763],
	  ['Burn']: [79211828],
	  ['Collect']: [79212090],
  };

  describe('AlgebraEventPool', function () {
    Object.keys(blockNumbers).forEach((event: string) => {
      blockNumbers[event].forEach((blockNumber: number) => {
        it(`${event}:${blockNumber} - should return correct state`, async function () {
          const dexHelper = new DummyDexHelper(network);
          // await dexHelper.init();

          const logger = dexHelper.getLogger(dexKey);

          const algebraPool = new AlgebraEventPool(
            dexHelper,
            dexKey,
            new dexHelper.web3Provider.eth.Contract(
              StateMulticallABI as AbiItem[],
              config.algebraStateMulticall,
            ),
            new Interface(ERC20ABI),
            config.factory,
            token0,
            token1,
            logger,
            undefined,
            config.initHash,
            config.deployer,
          );

          // It is done in generateState. But here have to make it manually
          algebraPool.poolAddress = poolAddress.toLowerCase();
          algebraPool.addressesSubscribed[0] = poolAddress;

          await testEventSubscriber(
            algebraPool as any,
            algebraPool.addressesSubscribed,
            (_blockNumber: number) =>
              fetchPoolStateFromContract(
                algebraPool,
                _blockNumber,
                poolAddress,
              ),
            blockNumber,
            `${dexKey}_${poolAddress}`,
            dexHelper.provider,
          );
        });
      });
    });
  });
});

describe('Algebra Event', function () {
	const poolAddress = '0x8a6bb521d5903EA2A617c38d1253dDED79AC5deF';
	const token0 = '0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83';
	const token1 = '0x5Cc61A78F164885776AA610fb0FE1257df78E59B';

  const blockNumbers: { [eventName: string]: number[] } = {
	['Mint']: [79168449, 79447603,79447634, 79447763],
	['Burn']: [79211828],
	['Collect']: [79212090],
  };

  describe('AlgebraEventPool', function () {
    Object.keys(blockNumbers).forEach((event: string) => {
      blockNumbers[event].forEach((blockNumber: number) => {
        it(`${event}:${blockNumber} - should return correct state`, async function () {
          const dexHelper = new DummyDexHelper(network);
          // await dexHelper.init();

          const logger = dexHelper.getLogger(dexKey);

          const algebraPool = new AlgebraEventPool(
            dexHelper,
            dexKey,
            new dexHelper.web3Provider.eth.Contract(
              StateMulticallABI as AbiItem[],
              config.algebraStateMulticall,
            ),
            new Interface(ERC20ABI),
            config.factory,
            token0,
            token1,
            logger,
            undefined,
            config.initHash,
            config.deployer,
          );

          // It is done in generateState. But here have to make it manually
          algebraPool.poolAddress = poolAddress.toLowerCase();
          algebraPool.addressesSubscribed[0] = poolAddress;

          await testEventSubscriber(
            algebraPool as any,
            algebraPool.addressesSubscribed,
            (_blockNumber: number) =>
              fetchPoolStateFromContract(
                algebraPool,
                _blockNumber,
                poolAddress,
              ),
            blockNumber,
            `${dexKey}_${poolAddress}`,
            dexHelper.provider,
          );
        });
      });
    });
  });
});

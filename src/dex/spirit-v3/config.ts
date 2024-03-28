import { DexParams } from './types';
import { DexConfigMap, AdapterMappings } from '../../types';
import { Network, SwapSide } from '../../constants';

export const AlgebraConfig: DexConfigMap<DexParams> = {
  SpiritSwapV3: {
    [Network.FANTOM]: {
      factory: '0xa521e2b5655afbb2297225dcc10456bcff0681cd',
      quoter: '0xC816E3c6380679aB78147895A623556c41A319fF',
      router: '0x6E59632793B7EC7Ba94ede114A5F4aF713A63854',
      deployer: '0xc6bae1ab8cb18abd737a35998f42fcacbcc9f39b',
      algebraStateMulticall: '0x5E39c5482261B3Fa25d4d7DD473216CaBEA4bAC3',
      uniswapMulticall: '0x639C95D1A0e03654b415abD4e87dbA0a79C92697',
      chunksCount: 10,
      forceRPC: true,
      initRetryFrequency: 10,
      initHash: `0xf96d2474815c32e070cd63233f06af5413efc5dcb430aee4ff18cc29007c562d`,
      subgraphURL:
        'https://api.studio.thegraph.com/query/62790/spiritv3-test/version/latest',
    },
	[Network.FANTOM_TEST]: {
		factory: '0x18de7Ef8dAC22F86b2599183075554eA54660067',
		quoter: '0x36906aD7567c19cC542e940F4fA892e1A8E7cC95',
		router: '0x47126C98C8b29651Df1b8A9110B01221cA67E4Be',
		deployer: '0x51eB841042ea07662ee021Ff1317587fD4E4227b',
		algebraStateMulticall: '0x96C2f6DC0600118E12f383aE270BbB381cf827Ce',
		uniswapMulticall: '0xdbA9D0e1D89F29b8D635d267e24052d737368745',
		chunksCount: 1,
		forceRPC: true,
		initRetryFrequency: 10,
		initHash: `0xf96d2474815c32e070cd63233f06af5413efc5dcb430aee4ff18cc29007c562d`,
		subgraphURL:
		  'https://api.studio.thegraph.com/query/62790/spiritv3-test/version/latest',
	  },
  },
};

export const Adapters: Record<number, AdapterMappings> = {
	[Network.FANTOM]: {
	  [SwapSide.SELL]: [{ name: 'FantomAdapter01', index: 11 }],
	  [SwapSide.BUY]: [{ name: 'FantomBuyAdapter', index: 3 }],
	},
  };
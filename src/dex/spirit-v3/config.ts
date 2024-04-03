import { DexParams } from './types';
import { DexConfigMap, AdapterMappings } from '../../types';
import { Network, SwapSide } from '../../constants';

export const AlgebraConfig: DexConfigMap<DexParams> = {
  SpiritSwapV3: {
    [Network.FANTOM]: {
      factory: '0xb860200BD68dc39cEAfd6ebb82883f189f4CdA76',
      quoter: '0x0b1019859C10FC7018081f29580724455Fe9FeE0',
      router: '0x2e6b9c8D4a0972F87f21437A3AC7E4a1810f5438',
      deployer: '0x98AF00a67F5cC0b362Da34283D7d32817F6c9A29',
      algebraStateMulticall: '0x1742e72F2e08827F73F3ce98d6c5D72BfC62C5aD',
      uniswapMulticall: '0x737EAd42CE0859C1CB056d162D1DE6dEBB41b4A6',
      chunksCount: 10,
      forceRPC: true,
      initRetryFrequency: 10,
      initHash: `0xf96d2474815c32e070cd63233f06af5413efc5dcb430aee4ff18cc29007c562d`,
      subgraphURL:
        'https://api.studio.thegraph.com/query/62790/spiritv3-subgraph/version/latest',
    },
	[Network.FANTOM_TEST]: {
		factory: '0x1Dc3f68E5D202EE465E3893dCB719D1321bf06f4',
		quoter: '0xF3B7f194b6145FCcC2b9005bB21A573660B17534',
		router: '0x84476610d5a8e008cde7eBC798869b0E0a95f97f',
		deployer: '0x127343e86C9498f7d9f6F9AA77b1e45c5f363e1E',
		algebraStateMulticall: '0x034Bc31C5efC9c0267b991abC4cAe1Aa29209B28',
		uniswapMulticall: '0xdbA9D0e1D89F29b8D635d267e24052d737368745',
		chunksCount: 1,
		forceRPC: true,
		initRetryFrequency: 10,
		initHash: `0xf96d2474815c32e070cd63233f06af5413efc5dcb430aee4ff18cc29007c562d`,
		subgraphURL:
		  'https://api.studio.thegraph.com/proxy/62790/spiritv3-test/0.0.9',
	  },
  },
};

export const Adapters: Record<number, AdapterMappings> = {
	[Network.FANTOM]: {
	  [SwapSide.SELL]: [{ name: 'FantomAdapter01', index: 11 }],
	  [SwapSide.BUY]: [{ name: 'FantomBuyAdapter', index: 3 }],
	},
  };
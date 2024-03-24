import { DexParams } from './types';
import { DexConfigMap, AdapterMappings } from '../../types';
import { Network, SwapSide } from '../../constants';
import { Address } from '../../types';

const SUPPORTED_FEES = [10000n, 3000n, 500n, 100n];

// Pools that will be initialized on app startup
// They are added for testing
export const PoolsToPreload: DexConfigMap<
  { token0: Address; token1: Address }[]
> = {
  SpiritSwapV3: {
    [Network.FANTOM]: [
      {
        token0: '0x5Cc61A78F164885776AA610fb0FE1257df78E59B'.toLowerCase(), //SPIRIT
        token1: '0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83'.toLowerCase(), //WFTM
      },
      {
        token0: '0x28a92dde19D9989F39A49905d7C9C2FAc7799bDf'.toLowerCase(), //USDC
        token1: '0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83'.toLowerCase(), //WFTM
      },
    ],
  },
};

export const SpiritswapV3Config: DexConfigMap<DexParams> = {
  SpiritSwapV3: {
    [Network.FANTOM]: {
      factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
      quoter: '0x191Fd01deD8CA57C62fb19DCAbe6381653D6c60e',
      router: '0x6E59632793B7EC7Ba94ede114A5F4aF713A63854',
      poolDeloyer: '0xc6bae1ab8cb18abd737a35998f42fcacbcc9f39b',
      supportedFees: SUPPORTED_FEES,
      stateMulticall: '0x30F6B9b6485ff0B67E881f5ac80D3F1c70A4B23d',
      uniswapMulticall: '0x639C95D1A0e03654b415abD4e87dbA0a79C92697',
      chunksCount: 10,
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

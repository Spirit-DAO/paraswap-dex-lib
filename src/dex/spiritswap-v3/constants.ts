export const UNISWAPV3_TICK_GAS_COST = 24_000; // Ceiled
export const UNISWAPV3_TICK_BASE_OVERHEAD = 75_000;
export const UNISWAPV3_POOL_SEARCH_OVERHEAD = 10_000;

// This is used for price calculation. If out of scope, return 0n
export const TICK_BITMAP_TO_USE = 4n;

// This is used to check if the state is still valid.
export const TICK_BITMAP_BUFFER = 8n;

export const MAX_PRICING_COMPUTATION_STEPS_ALLOWED = 128;

export const UNISWAPV3_EFFICIENCY_FACTOR = 3;

export const ZERO_TICK_INFO = {
  liquidityGross: 0n,
  liquidityNet: 0n,
  tickCumulativeOutside: 0n,
  secondsPerLiquidityOutsideX128: 0n,
  secondsOutside: 0n,
  liquidityTotal: 0n,
  nextTick: 0n,
  prevTick: 0n,
  liquidityDelta: 0n,
  outerFeeGrowth0Token: 0n,
  outerFeeGrowth1Token: 0n,
};

export const ZERO_ORACLE_OBSERVATION = {
  blockTimestamp: 0n,
  tickCumulative: 0n,
  secondsPerLiquidityCumulativeX128: 0n,
  initialized: false,
};

export const OUT_OF_RANGE_ERROR_POSTFIX = `INVALID_TICK_BIT_MAP_RANGES`;

export const DEFAULT_POOL_INIT_CODE_HASH = `0xf96d2474815c32e070cd63233f06af5413efc5dcb430aee4ff18cc29007c562d`;

export const MAX_LIQUIDITY_PER_TICK = 191757638537527648490752896198553n;

export enum DirectMethods {
  directSell = 'directUniV3Swap',
  directBuy = 'directUniV3Buy',
}

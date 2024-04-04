import { Network } from '../../constants';

/// THIS FILE CONTAINS OVERRIDES OF UniswapV3's constant file

export const TICK_BITMAP_TO_USE = 400n;

export const TICK_BITMAP_BUFFER = 800n;

export const TICK_BITMAP_TO_USE_BY_CHAIN: Record<number, bigint> = {
  [Network.ZKEVM]: 10n,
};

export const TICK_BITMAP_BUFFER_BY_CHAIN: Record<number, bigint> = {
  [Network.ZKEVM]: 4n,
};

export const MAX_PRICING_COMPUTATION_STEPS_ALLOWED = 4096;

export const ZERO_TICK_INFO = {
  liquidityTotal: 0n,
  liquidityDelta: 0n,
  outerFeeGrowth0Token: 0n,
	outerFeeGrowth1Token: 0n,
	prevTick: 0n,
	nextTick: 0n,
};

export const ZERO_ORACLE_OBSERVATION = {
  blockTimestamp: 0n,
  tickCumulative: 0n,
  secondsPerLiquidityCumulativeX128: 0n,
  initialized: false,
};

export const OUT_OF_RANGE_ERROR_POSTFIX = `INVALID_TICK_BIT_MAP_RANGES`;

export enum DirectMethods {
  directSell = 'directUniV3Swap',
  directBuy = 'directUniV3Buy',
}

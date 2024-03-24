import { PoolState, TickInfo } from '../types';
import { LiquidityMath } from './LiquidityMath';
import { _require } from '../../../utils';
import { NumberAsString } from '@paraswap/core';
import { MAX_LIQUIDITY_PER_TICK, ZERO_TICK_INFO } from '../constants';

export class Tick {
  static update(
    state: Pick<PoolState, 'ticks'>,
    tick: bigint,
    currentTick: bigint,
    liquidityDelta: bigint,
    totalFeeGrowth0Token: bigint,
    totalFeeGrowth1Token: bigint,
    upper: boolean,
  ): boolean {
    let info = state.ticks[Number(tick)];

    if (info === undefined) {
      info = { ...ZERO_TICK_INFO };
      state.ticks[Number(tick)] = info;
    }

    const liquidityTotalBefore = info.liquidityTotal;
    const liquidityTotalAfter = LiquidityMath.addDelta(
      liquidityTotalBefore,
      liquidityDelta,
    );

    _require(
      liquidityTotalAfter <= MAX_LIQUIDITY_PER_TICK,
      'LO',
      { liquidityTotalAfter, MAX_LIQUIDITY_PER_TICK },
      'liquidityTotalAfter <= MAX_LIQUIDITY_PER_TICK',
    );

    const liquidityDeltaBefore = info.liquidityDelta;
    // when the lower (upper) tick is crossed left to right (right to left), liquidity must be added (removed)

    info.liquidityDelta = upper
      ? liquidityDeltaBefore - liquidityDelta
      : liquidityDeltaBefore + liquidityDelta;

    info.liquidityTotal = liquidityTotalAfter;

    let flipped = liquidityTotalAfter == 0n;
    if (liquidityTotalBefore == 0n) {
      flipped = !flipped;
      // by convention, we assume that all growth before a tick was initialized happened _below_ the tick
      if (tick <= currentTick) {
        info.outerFeeGrowth0Token = totalFeeGrowth0Token;
        info.outerFeeGrowth1Token = totalFeeGrowth1Token;
      }
    }

    return flipped;
  }

  static clear(state: Pick<PoolState, 'ticks'>, tick: bigint) {
    delete state.ticks[Number(tick)];
  }

  static cross(
    ticks: Record<NumberAsString, TickInfo>,
    tick: bigint,
    feeGrowth0: bigint,
    feeGrowth1: bigint,
  ): [bigint, bigint, bigint] {
    const info = ticks[Number(tick)];

    info.outerFeeGrowth1Token = feeGrowth1 - info.outerFeeGrowth1Token;
    info.outerFeeGrowth0Token = feeGrowth0 - info.outerFeeGrowth0Token;

    return [info.liquidityDelta, info.prevTick, info.nextTick];
  }
}

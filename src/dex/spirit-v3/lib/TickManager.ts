import { IAlgebraPoolState, PoolState, TickInfo } from '../types';
import { LiquidityMath } from '../../uniswap-v3/contract-math/LiquidityMath';
import { _require } from '../../../utils';
import { NumberAsString } from '@paraswap/core';
import { ZERO_TICK_INFO } from '../constants';

export class TickManager {
  static update(
    state: Pick<IAlgebraPoolState, 'ticks'>,
    tick: bigint,
    tickCurrent: bigint,
    liquidityDelta: bigint,
    totalFeeGrowth0Token: bigint,
    totalFeeGrowth1Token: bigint,
    upper: boolean,
    maxLiquidity: bigint,
  ): boolean {
    let info = state.ticks[Number(tick)];

    if (info === undefined) {
      info = { ...ZERO_TICK_INFO };
      state.ticks[Number(tick)] = info;
    }

    // uint128 liquidityTotalBefore = data.liquidityTotal;
    // uint128 liquidityTotalAfter = LiquidityMath.addDelta(liquidityTotalBefore, liquidityDelta);
    // require(liquidityTotalAfter < Constants.MAX_LIQUIDITY_PER_TICK + 1, 'LO');
    const liquidityTotalBefore = info.liquidityTotal;
    const liquidityTotalAfter = LiquidityMath.addDelta(
      liquidityTotalBefore,
      liquidityDelta,
    );
    _require(
      liquidityTotalAfter <= maxLiquidity,
      'LO',
      { liquidityTotalAfter, maxLiquidity },
      'liquidityTotalAfter <= maxLiquidity',
    );

    // int128 liquidityDeltaBefore = data.liquidityDelta;
    const liquidityDeltaBefore = info.liquidityDelta;

    // // when the lower (upper) tick is crossed left to right (right to left), liquidity must be added (removed)
    // data.liquidityDelta = upper
    //   ? int256(liquidityDeltaBefore).sub(liquidityDelta).toInt128()
    //   : int256(liquidityDeltaBefore).add(liquidityDelta).toInt128();
    //
    // data.liquidityTotal = liquidityTotalAfter;
    info.liquidityDelta = upper
      ? BigInt.asIntN(
          128,
          BigInt.asIntN(256, liquidityDeltaBefore) - liquidityDelta,
        )
      : BigInt.asIntN(
          128,
          BigInt.asIntN(256, liquidityDeltaBefore) + liquidityDelta,
        );
    info.liquidityTotal = liquidityTotalAfter;

    // flipped = (liquidityTotalAfter == 0);
    // if (liquidityTotalBefore == 0) {
    //   flipped = !flipped;
    //   // by convention, we assume that all growth before a tick was initialized happened _below_ the tick
    //   if (tick <= currentTick) {
    //     data.outerFeeGrowth0Token = totalFeeGrowth0Token;
    //     data.outerFeeGrowth1Token = totalFeeGrowth1Token;
    //     data.outerSecondsPerLiquidity = secondsPerLiquidityCumulative;
    //     data.outerTickCumulative = tickCumulative;
    //     data.outerSecondsSpent = time;
    //   }
    //   data.initialized = true;
    // }

    let flipped = liquidityTotalAfter === 0n;
    if (liquidityTotalBefore === 0n) {
      flipped = !flipped;
      if (tick <= tickCurrent) {
        /*         info.secondsPerLiquidityOutsideX128 = secondsPerLiquidityCumulativeX128;
			info.tickCumulativeOutside = tickCumulative;
			info.secondsOutside = time; */
        info.outerFeeGrowth0Token = totalFeeGrowth0Token;
        info.outerFeeGrowth1Token = totalFeeGrowth1Token;
      }
    }

    // data.liquidityTotal = liquidityTotalAfter;
    // info.liquidityGross = liquidityGrossAfter;

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
    const data = ticks[Number(tick)];
    data.outerFeeGrowth0Token = feeGrowth0 - data.outerFeeGrowth0Token;
    data.outerFeeGrowth1Token = feeGrowth1 - data.outerFeeGrowth1Token;
    return [data.liquidityDelta, data.prevTick, data.nextTick];
  }
}

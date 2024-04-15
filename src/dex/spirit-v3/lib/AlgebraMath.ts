import { DeepReadonly } from 'ts-essentials';
import { PoolState, StepComputations } from '../types';
import { NumberAsString, SwapSide } from '@paraswap/core';
import { OutputResult } from '../../uniswap-v3/types';
import { Tick } from '../../uniswap-v3/contract-math/Tick';
import { SqrtPriceMath } from '../../uniswap-v3/contract-math/SqrtPriceMath';
import { TickMath } from '../../uniswap-v3/contract-math/TickMath';
import { LiquidityMath } from '../../uniswap-v3/contract-math/LiquidityMath';
import { _require, int256, uint32 } from '../../../utils';
import { Constants } from './Constants';
import { BI_MAX_INT } from '../../../bigint-constants';
import { TickInfo } from '..//types';
import _ from 'lodash';
import {
  PriceComputationState,
} from '../../uniswap-v3/contract-math/uniswap-v3-math';
import { OUT_OF_RANGE_ERROR_POSTFIX } from '../../uniswap-v3/constants';
import { TickManager } from './TickManager';
import { TickTable } from './TickTable';
import { MAX_PRICING_COMPUTATION_STEPS_ALLOWED } from '../constants';
import { SwapMath } from '../../uniswap-v3/contract-math/SwapMath';
import { NEGATIVE_ONE } from '@cryptoalgebra/integral-sdk';

type UpdatePositionCache = {
  price: bigint;
  tick: bigint;
};

export type PriceComputationCache = {
  liquidityStart: bigint;
  blockTimestamp: bigint;
  feeProtocol: bigint;
  totalFeeGrowthInput: bigint;
  totalFeeGrowthOutput: bigint;
  computedLatestObservation: boolean;
  tickCount: number;
};

export function _updatePriceComputationObjects<
  T extends PriceComputationState | PriceComputationCache,
>(toUpdate: T, updateBy: T) {
  for (const k of Object.keys(updateBy) as (keyof T)[]) {
    toUpdate[k] = updateBy[k];
  }
}

interface SwapCalculationCache {
  communityFee: bigint; // The community fee of the selling token, uint256 to minimize casts
  amountRequiredInitial: bigint; // The initial value of the exact input\output amount
  amountCalculated: bigint; // The additive amount of total output\input calculated trough the swap
  exactInput: boolean; // Whether the exact input or output is specified
  fee: bigint; // The current dynamic fee
  startTick: bigint; // The tick at the start of a swap
	isFirstCycleState: boolean;
	totalFeeGrowthInput: bigint;
}

const isPoolV1_9 = (
  poolState: PoolState,
): poolState is PoolState =>
  'feeZto' in poolState.globalState && 'feeOtz' in poolState.globalState;

// % START OF COPY PASTA FROM UNISWAPV3 %
function _priceComputationCycles(
  networkId: number,
  poolState: DeepReadonly<PoolState>,
  ticksCopy: Record<NumberAsString, TickInfo>,
  state: PriceComputationState,
  cache: PriceComputationCache,
  sqrtPriceLimitX96: bigint,
  zeroForOne: boolean,
  exactInput: boolean,
): [
  // result
  PriceComputationState,
  // Latest calculated full cycle state we can use for bigger amounts
  {
    latestFullCycleState: PriceComputationState;
    latestFullCycleCache: PriceComputationCache;
  },
] {
  const latestFullCycleState: PriceComputationState = { ...state };

  if (cache.tickCount == 0) {
    cache.tickCount = 1;
  }
  const latestFullCycleCache: PriceComputationCache = { ...cache };

  // We save tick before any change. Later we use this to restore
  // state before last step
  let lastTicksCopy: { index: number; tick: TickInfo } | undefined;

  let i = 0;
  for (
    ;
    state.amountSpecifiedRemaining !== 0n &&
    state.sqrtPriceX96 !== sqrtPriceLimitX96;
    ++i
  ) {
    if (
      latestFullCycleCache.tickCount + i >
      MAX_PRICING_COMPUTATION_STEPS_ALLOWED
    ) {
      state.amountSpecifiedRemaining = 0n;
      state.amountCalculated = 0n;
      break;
    }

    const step = {
      sqrtPriceStartX96: 0n,
      tickNext: 0n,
      initialized: false,
      sqrtPriceNextX96: 0n,
      amountIn: 0n,
      amountOut: 0n,
      feeAmount: 0n,
    };

    step.sqrtPriceStartX96 = state.sqrtPriceX96;

    try {
      [step.tickNext, step.initialized] =
        TickTable.nextInitializedTickWithinOneWord(
          networkId,
          poolState,
          state.tick,
          zeroForOne,
          true,
          poolState.areTicksCompressed ? poolState.tickSpacing : undefined,
        );
    } catch (e) {
      if (
        e instanceof Error &&
        e.message.endsWith(OUT_OF_RANGE_ERROR_POSTFIX)
      ) {
        state.amountSpecifiedRemaining = 0n;
        state.amountCalculated = 0n;
        break;
      }
      throw e;
    }

    if (step.tickNext < TickMath.MIN_TICK) {
      step.tickNext = TickMath.MIN_TICK;
    } else if (step.tickNext > TickMath.MAX_TICK) {
      step.tickNext = TickMath.MAX_TICK;
    }

	  step.sqrtPriceNextX96 = TickMath.getSqrtRatioAtTick(step.tickNext);
	  
	  console.log('fees', poolState.globalState.lastFee)

    const swapStepResult = SwapMath.computeSwapStep(
      state.sqrtPriceX96,
      (
        zeroForOne
          ? step.sqrtPriceNextX96 < sqrtPriceLimitX96
          : step.sqrtPriceNextX96 > sqrtPriceLimitX96
      )
        ? sqrtPriceLimitX96
        : step.sqrtPriceNextX96,
      state.liquidity,
      state.amountSpecifiedRemaining,
      poolState.globalState.lastFee
    );

    state.sqrtPriceX96 = swapStepResult.sqrtRatioNextX96;
    step.amountIn = swapStepResult.amountIn;
    step.amountOut = swapStepResult.amountOut;
    step.feeAmount = swapStepResult.feeAmount;

    if (exactInput) {
      state.amountSpecifiedRemaining -= step.amountIn + step.feeAmount;
      state.amountCalculated = state.amountCalculated - step.amountOut;
    } else {
      state.amountSpecifiedRemaining += step.amountOut;
      state.amountCalculated =
        state.amountCalculated + step.amountIn + step.feeAmount;
    }

    /*  if (cache.feeProtocol > 0n) {
      const delta = step.feeAmount / cache.feeProtocol;
      step.feeAmount -= delta;
      state.protocolFee += delta;
	  } */
	  
    if (cache.feeProtocol > 0n) {
		  //console.log('cache.feeProtocol', step.feeAmount, cache.feeProtocol);
      const delta =
        (step.feeAmount * cache.feeProtocol) / 1000n;
      step.feeAmount -= delta;
      state.protocolFee += delta;
	  }

    if (state.sqrtPriceX96 === step.sqrtPriceNextX96) {
      if (step.initialized) {
        // skip oracle related logic
        if (state.amountSpecifiedRemaining === 0n) {
          const castTickNext = Number(step.tickNext);
          lastTicksCopy = {
            index: castTickNext,
            tick: { ...ticksCopy[castTickNext] },
          };
        }
        let liquidityNet: bigint;
        if (zeroForOne) {
          [liquidityNet,,] = TickManager.cross(
            ticksCopy,
            step.tickNext,
            cache.totalFeeGrowthInput,
            cache.totalFeeGrowthOutput
          );
          
        } else {
          [liquidityNet,,] = TickManager.cross(
            ticksCopy,
            step.tickNext,
            cache.totalFeeGrowthInput,
            cache.totalFeeGrowthOutput
          );
        }
        if (zeroForOne) liquidityNet = -liquidityNet;

        state.liquidity = LiquidityMath.addDelta(state.liquidity, liquidityNet);
      }

      state.tick = zeroForOne ? step.tickNext - 1n : step.tickNext;
    } else if (state.sqrtPriceX96 != step.sqrtPriceStartX96) {
      state.tick = TickMath.getTickAtSqrtRatio(state.sqrtPriceX96);
    }

    if (state.amountSpecifiedRemaining !== 0n) {
      _updatePriceComputationObjects(latestFullCycleState, state);
      _updatePriceComputationObjects(latestFullCycleCache, cache);
      // If it last cycle, check if ticks were changed and then restore previous state
      // for next calculations
    } else if (lastTicksCopy !== undefined) {
      ticksCopy[lastTicksCopy.index] = lastTicksCopy.tick;
    }
  }

  if (i > 1) {
    latestFullCycleCache.tickCount += i - 1;
  }

  if (state.amountSpecifiedRemaining !== 0n) {
    state.amountSpecifiedRemaining = 0n;
    state.amountCalculated = 0n;
  }

  return [state, { latestFullCycleState, latestFullCycleCache }];
}

class AlgebraMathClass {
  queryOutputs(
    networkId: number,
    poolState: DeepReadonly<PoolState>,
    amounts: bigint[],
    zeroForOne: boolean,
    side: SwapSide,
  ): OutputResult {
    const slot0Start = poolState.globalState;

    const isSell = side === SwapSide.SELL;

    // While calculating, ticks are changing, so to not change the actual state,
    // we use copy
    const ticksCopy = _.cloneDeep(poolState.ticks);

    const sqrtPriceLimitX96 = zeroForOne
      ? TickMath.MIN_SQRT_RATIO + 1n
      : TickMath.MAX_SQRT_RATIO - 1n;

    const cache: PriceComputationCache = {
      liquidityStart: poolState.liquidity,
      blockTimestamp: this._blockTimestamp(poolState),
      feeProtocol: slot0Start.communityFee,
      totalFeeGrowthInput: 0n,
      totalFeeGrowthOutput: 0n,
      computedLatestObservation: false,
      tickCount: 0,
    };

    const state: PriceComputationState = {
      // Will be overwritten later
      amountSpecifiedRemaining: 0n,
      amountCalculated: 0n,
      sqrtPriceX96: slot0Start.price,
      tick: slot0Start.tick,
      protocolFee: 0n,
      liquidity: cache.liquidityStart,
      isFirstCycleState: true,
    };

    let isOutOfRange = false;
    let previousAmount = 0n;

    const outputs = new Array(amounts.length);
    const tickCounts = new Array(amounts.length);
    for (const [i, amount] of amounts.entries()) {
      if (amount === 0n) {
        outputs[i] = 0n;
        tickCounts[i] = 0;
        continue;
      }

      const amountSpecified = isSell
        ? BigInt.asIntN(256, amount)
        : -BigInt.asIntN(256, amount);

      if (state.isFirstCycleState) {
        // Set first non zero amount
        state.amountSpecifiedRemaining = amountSpecified;
        state.isFirstCycleState = false;
      } else {
        state.amountSpecifiedRemaining =
          amountSpecified - (previousAmount - state.amountSpecifiedRemaining);
      }

      const exactInput = amountSpecified > 0n;

      _require(
        zeroForOne
          ? sqrtPriceLimitX96 < slot0Start.price &&
              sqrtPriceLimitX96 > TickMath.MIN_SQRT_RATIO
          : sqrtPriceLimitX96 > slot0Start.price &&
              sqrtPriceLimitX96 < TickMath.MAX_SQRT_RATIO,
        'SPL',
        { zeroForOne, sqrtPriceLimitX96, slot0Start },
        'zeroForOne ? sqrtPriceLimitX96 < slot0Start.sqrtPriceX96 && sqrtPriceLimitX96 > TickMath.MIN_SQRT_RATIO : sqrtPriceLimitX96 > slot0Start.sqrtPriceX96 && sqrtPriceLimitX96 < TickMath.MAX_SQRT_RATIO',
      );

      if (!isOutOfRange) {
        const [finalState, { latestFullCycleState, latestFullCycleCache }] =
          _priceComputationCycles(
            networkId,
            poolState,
            ticksCopy,
            state,
            cache,
            sqrtPriceLimitX96,
            zeroForOne,
            exactInput,
          );
        if (
          finalState.amountSpecifiedRemaining === 0n &&
          finalState.amountCalculated === 0n
        ) {
          isOutOfRange = true;
          outputs[i] = 0n;
          tickCounts[i] = 0;
          continue;
        }

        // We use it on next step to correct state.amountSpecifiedRemaining
        previousAmount = amountSpecified;

        // First extract calculated values
        const [amount0, amount1] =
          zeroForOne === exactInput
            ? [
                amountSpecified - finalState.amountSpecifiedRemaining,
                finalState.amountCalculated,
              ]
            : [
                finalState.amountCalculated,
                amountSpecified - finalState.amountSpecifiedRemaining,
              ];

        // Update for next amount
        _updatePriceComputationObjects(state, latestFullCycleState);
        _updatePriceComputationObjects(cache, latestFullCycleCache);

        if (isSell) {
          outputs[i] = BigInt.asUintN(256, -(zeroForOne ? amount1 : amount0));
          tickCounts[i] = latestFullCycleCache.tickCount;
          continue;
        } else {
          outputs[i] = zeroForOne
            ? BigInt.asUintN(256, amount0)
            : BigInt.asUintN(256, amount1);
          tickCounts[i] = latestFullCycleCache.tickCount;
          continue;
        }
      } else {
        outputs[i] = 0n;
        tickCounts[i] = 0;
      }
    }
    return {
      outputs,
      tickCounts,
    };
  }
  // % END OF COPY PASTA FROM UNISWAPV3 %

  // same as uniswapV3Pool: line 328 -> 369
  _getAmountsForLiquidity(
    bottomTick: bigint,
    topTick: bigint,
    liquidityDelta: bigint,
    currentTick: bigint,
    currentPrice: bigint,
  ) {
    let amount0 = 0n;
    let amount1 = 0n;
    let globalLiquidityDelta = 0n;
    // If current tick is less than the provided bottom one then only the token0 has to be provided
    if (currentTick < bottomTick) {
      amount0 = SqrtPriceMath._getAmount0DeltaO(
        TickMath.getSqrtRatioAtTick(bottomTick),
        TickMath.getSqrtRatioAtTick(topTick),
        liquidityDelta,
      );
    } else if (currentTick < topTick) {
      amount0 = SqrtPriceMath._getAmount0DeltaO(
        currentPrice,
        TickMath.getSqrtRatioAtTick(topTick),
        liquidityDelta,
      );
      amount1 = SqrtPriceMath._getAmount1DeltaO(
        TickMath.getSqrtRatioAtTick(bottomTick),
        currentPrice,
        liquidityDelta,
      );

      globalLiquidityDelta = liquidityDelta;
    }
    // If current tick is greater than the provided top one then only the token1 has to be provided
    else {
      amount1 = SqrtPriceMath._getAmount1DeltaO(
        TickMath.getSqrtRatioAtTick(bottomTick),
        TickMath.getSqrtRatioAtTick(topTick),
        liquidityDelta,
      );
    }

    return [amount0, amount1, globalLiquidityDelta];
  }

  _updatePositionTicksAndFees(
    networkId: number,
    state: PoolState,
    bottomTick: bigint,
    topTick: bigint,
    liquidityDelta: bigint,
  ) {
    const { globalState, liquidity } = state;
    let toggledBottom: boolean = false;
    let toggledTop: boolean = false;
    const cache: UpdatePositionCache = {
      price: globalState.price,
      tick: globalState.tick,
    };
    // skip position logic
    // skip fee logic

    if (liquidityDelta !== 0n) {
      const time = this._blockTimestamp(state);

      if (
        TickManager.update(
          state,
          bottomTick,
          cache.tick,
          liquidityDelta,
          0n, // secondsPerLiquidityCumulative, play no role in pricing
          0n, // tickCumulative, play no role in pricing
          false, // isTopTick,
          state.maxLiquidityPerTick,
        )
      ) {
        toggledBottom = true;
        TickTable.toggleTick(
          networkId,
          state,
          bottomTick,
          state.areTicksCompressed ? state.tickSpacing : undefined,
        );
      }
      if (
        TickManager.update(
          state,
          topTick,
          cache.tick,
          liquidityDelta,
          0n, // secondsPerLiquidityCumulative, play no role in pricing
          0n, // tickCumulative, play no role in pricing
          true, // isTopTick
          state.maxLiquidityPerTick,
        )
      ) {
        toggledTop = true;
        TickTable.toggleTick(
          networkId,
          state,
          topTick,
          state.areTicksCompressed ? state.tickSpacing : undefined,
        );
      }
    }

    // skip fee && position related stuffs

    // same as UniswapV3Pool.sol line 327 ->   if (params.liquidityDelta != 0) {
    if (liquidityDelta !== 0n) {
      // if liquidityDelta is negative and the tick was toggled, it means that it should not be initialized anymore, so we delete it
      if (liquidityDelta < 0) {
        if (toggledBottom) TickManager.clear(state, bottomTick);
        if (toggledTop) TickManager.clear(state, topTick);
      }
      // same as UniswapV3Pool.sol line 331 ? -> amount0 = SqrtPriceMath.getAmount0Delta(
      // skip amount0 and amount1 as already read from event
      const [, , globalLiquidityDelta] = this._getAmountsForLiquidity(
        bottomTick,
        topTick,
        liquidityDelta,
        cache.tick,
        cache.price,
      );
      if (globalLiquidityDelta != 0n) {
        let liquidityBefore = liquidity;

        // skip oracle logic

        // same as UniswapV3Pool line 361 ->  liquidity = LiquidityMath.addDelta(liquidityBefore, params.liquidityDelta);
        state.liquidity = LiquidityMath.addDelta(
          liquidityBefore,
          liquidityDelta,
        );
      }
    }
  }

  _calculateSwap(
    networkId: number,
    poolState: PoolState,
    zeroToOne: boolean,
    sqrtPriceLimitX96: bigint,
    newTick: bigint,
    newLiquidity: bigint,
  ): [bigint, bigint, bigint, bigint, bigint, bigint] {
    const { globalState, liquidity } = poolState;
    if (zeroToOne) {
      _require(sqrtPriceLimitX96 > TickMath.MIN_SQRT_RATIO, 'RATIO_MIN');
      _require(sqrtPriceLimitX96 < globalState.price, 'RATIO_CURRENT');
    } else {
      _require(sqrtPriceLimitX96 < TickMath.MAX_SQRT_RATIO, 'RATIO_MAX');
      _require(sqrtPriceLimitX96 > globalState.price, 'RATIO_CURRENT');
    }

    let cache: SwapCalculationCache = {
      amountCalculated: 0n,
      amountRequiredInitial: BI_MAX_INT, // similarly to what we did for uniswap
      communityFee: 0n,
      exactInput: false,
      fee: 0n,
      startTick: 0n,
		  isFirstCycleState: true,
		  totalFeeGrowthInput: 0n,
    };

    let communityFeeAmount = 0n;

    // load from one storage slot
    let currentPrice = globalState.price;
    let currentTick = globalState.tick;
	  cache.fee = poolState.globalState.lastFee
	  cache.communityFee = poolState.globalState.communityFee;
    let lastfees = globalState.lastFee;

    let amountRequired = cache.amountRequiredInitial; // to revalidate

    _require(amountRequired != 0n, 'AS');
    [cache.amountRequiredInitial, cache.exactInput] = [
      amountRequired,
      amountRequired > 0,
    ];

    let currentLiquidity = liquidity;
	  cache.communityFee = lastfees;

    /* if (zeroToOne) {
      require(limitSqrtPrice < currentPrice && limitSqrtPrice > TickMath.MIN_SQRT_RATIO, 'SPL');

      cache.totalFeeGrowth = totalFeeGrowth0Token;
    } else {
      require(limitSqrtPrice > currentPrice && limitSqrtPrice < TickMath.MAX_SQRT_RATIO, 'SPL')
      cache.totalFeeGrowth = totalFeeGrowth1Token;
    } */

    cache.startTick = currentTick;
    cache.totalFeeGrowthInput

    const step: StepComputations = {
      sqrtPriceStartX96: 0n,
      tickNext: 0n,
      initialized: true,
      sqrtPriceNextX96: 0n,
      amountIn: 0n,
      amountOut: 0n,
      feeAmount: 0n,
    };

    while (
      true
    ) {
      step.sqrtPriceStartX96 = currentPrice;

      // because each iteration of the while loop rounds, we can't optimize this code (relative to the smart contract)
      // by simply traversing to the next available tick, we instead need to exactly replicate
      // tickBitmap.nextInitializedTickWithinOneWord
      [step.tickNext, step.initialized] = TickTable.nextInitializedTickWithinOneWord(
        networkId,
        poolState,
        currentTick,
        zeroToOne,
        false,
        poolState.areTicksCompressed ? poolState.tickSpacing : undefined,
      );

      if (step.tickNext < TickMath.MIN_TICK) {
        step.tickNext = TickMath.MIN_TICK;
      } else if (step.tickNext > TickMath.MAX_TICK) {
        step.tickNext = TickMath.MAX_TICK;
      }

      step.sqrtPriceNextX96 = TickMath.getSqrtRatioAtTick(step.tickNext);

      const result = SwapMath.computeSwapStep(
        currentPrice,
        (
          zeroToOne
            ? step.sqrtPriceNextX96 < sqrtPriceLimitX96
            : step.sqrtPriceNextX96 > sqrtPriceLimitX96
        )
          ? sqrtPriceLimitX96
          : step.sqrtPriceNextX96,
        currentLiquidity,
        amountRequired,
        cache.fee,
      );

      [currentPrice, step.amountIn, step.amountOut, step.feeAmount] = [
        result.sqrtRatioNextX96,
        result.amountIn,
        result.amountOut,
        result.feeAmount,
      ];

      if (cache.exactInput) {
        amountRequired -= int256(step.amountIn + step.feeAmount)
        cache.amountCalculated = cache.amountCalculated - int256(step.amountOut)
      } else {
        amountRequired += int256(step.amountOut);
        cache.amountCalculated += cache.amountCalculated + int256(step.amountIn + step.feeAmount);
      }
      
      if (currentPrice == step.sqrtPriceNextX96) {
        // if the tick is initialized, run the tick transition
        if (step.initialized) {
          let liquidityDelta = poolState.ticks[Number(step.tickNext)].liquidityDelta;
          // if we're moving leftward, we interpret liquidityNet as the opposite sign
          // safe because liquidityNet cannot be type(int128).min
          if (zeroToOne)
          liquidityDelta = liquidityDelta * BigInt(NEGATIVE_ONE.toString());

          currentLiquidity = LiquidityMath.addDelta(
            currentLiquidity,
            liquidityDelta,
          );
        }

        currentTick = zeroToOne ? step.tickNext - 1n : step.tickNext;
      } else if (currentPrice != step.sqrtPriceStartX96) {
        // recompute unless we're on a lower tick boundary (i.e. already transitioned ticks), and haven't moved
        currentTick = TickMath.getTickAtSqrtRatio(currentPrice);
        break;
      }

      if (
        amountRequired == 0n ||
        currentPrice == sqrtPriceLimitX96 ||
        currentTick === newTick // deviation from contract
      ) {
        break;
      }
    }

    _require(
      currentPrice === sqrtPriceLimitX96 && currentTick === newTick,
      'LOGIC ERROR: calculated (currentPrice,currentTick) and (newSqrtPriceX96, newTick) from event should always be equal at the end',
      { currentPrice, sqrtPriceLimitX96, currentTick, newTick },
      'currentPrice === newSqrtPriceX96 && currentTick === newTick',
    );

    let [amount0, amount1] =
      zeroToOne == cache.exactInput // the amount to provide could be less then initially specified (e.g. reached limit)
        ? [cache.amountRequiredInitial - amountRequired, cache.amountCalculated] // the amount to get could be less then initially specified (e.g. reached limit)
        : [
            cache.amountCalculated,
            cache.amountRequiredInitial - amountRequired,
          ];

    // validate that amount0 and amount 1 are same here

    // ignore fee update logic during trade simulation as won't impact pricing too much
    [globalState.price, globalState.tick] = [currentPrice, currentTick];

    poolState.liquidity = currentLiquidity;

    // no need to update fees

    if (poolState.liquidity !== newLiquidity)
      // prefer assert ?
      poolState.liquidity = newLiquidity;

    return [
      amount0,
      amount1,
      currentPrice,
      currentTick,
      currentLiquidity,
      communityFeeAmount,
    ];
  }

  _blockTimestamp(state: Pick<PoolState, 'blockTimestamp'>) {
    return uint32(state.blockTimestamp);
  }
}

export const AlgebraMath = new AlgebraMathClass();

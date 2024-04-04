import { IAlgebraPoolState } from '../types';
import { LiquidityMath } from '../../uniswap-v3/contract-math/LiquidityMath';
import { _require } from '../../../utils';
import { NumberAsString } from '@paraswap/core';
import { ZERO_TICK_INFO } from '../constants';
import { PoolState, TickInfo } from '../types';
import { TickMath } from '../../uniswap-v3/contract-math/TickMath';
import { TickTable } from './TickTable';

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
		feeGrowth1: bigint
	  ): [bigint, bigint, bigint] {
		const info = ticks[Number(tick)];
		info.outerFeeGrowth0Token = feeGrowth0 - info.outerFeeGrowth0Token;
		info.outerFeeGrowth1Token = feeGrowth1 - info.outerFeeGrowth1Token;
		return [info.liquidityDelta, info.prevTick, info.nextTick];
  }

  static removeTick(
    ticks: Record<NumberAsString, TickInfo>,
    tick: bigint,
  ): [bigint, bigint] {
    const info = ticks[Number(tick)];
    const prevTick = info.prevTick;
    const nextTick = info.nextTick;
    delete ticks[Number(tick)];

    if (tick === TickMath.MIN_TICK || tick === TickMath.MAX_TICK) {
      ticks[Number(tick)].prevTick = prevTick
      ticks[Number(tick)].nextTick = nextTick;
    } else {
      if (prevTick === nextTick) throw new Error('tickIsNotInitialized');
      ticks[Number(prevTick)].nextTick = nextTick;
      ticks[Number(nextTick)].prevTick = prevTick;
    }
    return [prevTick, nextTick];
  }

  static insertTick(
    ticks: Record<NumberAsString, TickInfo>,
    tick: bigint,
    prevTick: bigint,
    nextTick: bigint,
  ) {
    ticks[Number(tick)] = {
      liquidityTotal: 0n,
      liquidityDelta: 0n,
      outerFeeGrowth0Token: 0n,
      outerFeeGrowth1Token: 0n,
      prevTick,
      nextTick,
    };
    ticks[Number(prevTick)].nextTick = tick;
    ticks[Number(nextTick)].prevTick = tick;
  }

  static _firstActiveBitInNode(treeLevel: Record<NumberAsString, bigint>, nodeIndex: bigint): bigint {
    return TickManager._nextActiveBitInWord(treeLevel[Number(nodeIndex)], nodeIndex << 8n)[0];
  }

  static _nextActiveBitInWord(word: bigint, bitIndex: bigint): [bigint, boolean] {
    const bitIndexInWord = bitIndex & 0xFFn;
    const row = word >> BigInt(bitIndexInWord);
    if (row === 0n) return [bitIndex | 255n, false];
    return [bitIndex + (row & -row), true];
  }

  static _nextActiveBitInSameNode(
    treeLevel: Record<NumberAsString, bigint>,
    bitIndex: bigint,
  ): [bigint, bigint, boolean] {
    const nodeIndex = bitIndex >> 8n;
    const [nextBitIndex, initialized] = TickManager._nextActiveBitInWord(treeLevel[Number(nodeIndex)], bitIndex);
    return [nodeIndex, nextBitIndex, initialized];
  }

  static getNextTick(
    leafs: Record<NumberAsString, bigint>,
    secondLayer: Record<NumberAsString, bigint>,
    treeRoot: bigint,
    tick: bigint,
  ): bigint {
    tick++;
    const nodeIndex = ((tick >> 8n) + 1n);
    console.log("data", treeRoot);
    if ((treeRoot & (1n << nodeIndex)) !== 0n) {
      let initialized: boolean;
      let nextTick: bigint;
      let index: bigint;
      [index, nextTick, initialized] = TickManager._nextActiveBitInSameNode(leafs, tick);
      if (initialized) return nextTick;

      [index, nextTick, initialized] = TickManager._nextActiveBitInSameNode(secondLayer, index + 1n);
      if (initialized) return nextTick;
    }

    let nextTick: bigint;
    let initialized: boolean;
    [nextTick, initialized] = TickManager._nextActiveBitInWord(treeRoot, nodeIndex + 1n);
    if (!initialized) return TickMath.MAX_TICK;
    nextTick = TickManager._firstActiveBitInNode(secondLayer, nextTick);
    return TickManager._firstActiveBitInNode(leafs, nextTick - 1n);
  }

  static _toggleBitInNode(treeLevel: Record<NumberAsString, bigint>, bitIndex: bigint): [boolean, bigint] {
    const nodeIndex = bitIndex >> 8n;
    const node = treeLevel[Number(nodeIndex)];
    const toggledNode = node === 0n;
    treeLevel[Number(nodeIndex)] = node ^ (1n << (bitIndex & 0xFFn));
    return [toggledNode, nodeIndex];
  }

  static toggleTick(
    leafs: Record<NumberAsString, bigint>,
    secondLayer: Record<NumberAsString, bigint>,
    treeRoot: bigint,
    tick: bigint,
  ): bigint {
    let newTreeRoot = treeRoot;
    let [toggledNode, nodeIndex] = TickManager._toggleBitInNode(leafs, tick);
    if (toggledNode) {
      [toggledNode, nodeIndex] = TickManager._toggleBitInNode(secondLayer, nodeIndex + 1n);
      if (toggledNode) {
        newTreeRoot ^= 1n << BigInt(nodeIndex);
      }
    }
    return newTreeRoot;
  }

  static _addOrRemoveTick(
    state: IAlgebraPoolState,
    tick: bigint,
    currentTick: bigint,
    oldTickTreeRoot: bigint,
    prevInitializedTick: bigint,
    nextInitializedTick: bigint,
    remove: boolean,
  ): [bigint, bigint, bigint] {
    if (remove) {
      const [prevTick, nextTick] = TickManager.removeTick(state.ticks, tick);
      if (prevInitializedTick === tick) prevInitializedTick = prevTick;
      else if (nextInitializedTick === tick) nextInitializedTick = nextTick;
    } else {
      let prevTick: bigint;
      let nextTick: bigint;
      if (prevInitializedTick < tick && nextInitializedTick > tick) {
        [prevTick, nextTick] = [prevInitializedTick, nextInitializedTick]; // we know next and prev ticks
        if (tick > currentTick) nextInitializedTick = tick;
        else prevInitializedTick = tick;
      } else {
        nextTick = TickManager.getNextTick(state.tickTable, state.tickTreeSecondLayer, oldTickTreeRoot, tick);
        prevTick = state.ticks[Number(nextTick)].prevTick;
      }
      TickManager.insertTick(state.ticks, tick, prevTick, nextTick);
    }

    const newTickTreeRoot =  TickManager.toggleTick(state.tickTable, state.tickTreeSecondLayer, oldTickTreeRoot, tick);
    return [prevInitializedTick, nextInitializedTick, newTickTreeRoot];
  }


  static _addOrRemoveTicks(
    state: IAlgebraPoolState,
    bottomTick: bigint,
    topTick: bigint, 
    toggleBottom: boolean,
    toggleTop: boolean,
    currentTick: bigint,
    remove: boolean,
  ) {
    const prevInitializedTick = state.prevTick;
    const nextInitializedTick = state.nextTick;
    const oldTickTreeRoot = state.newTreeRoot || 0n;

    let newPrevTick = prevInitializedTick;
    let newNextTick = nextInitializedTick;
    let newTreeRoot = oldTickTreeRoot;

    if (toggleBottom) {
      [newPrevTick, newNextTick, newTreeRoot] = TickManager._addOrRemoveTick(state, bottomTick, currentTick, newTreeRoot, newPrevTick, newNextTick, remove);
    }
    if (toggleTop) {
      [newPrevTick, newNextTick, newTreeRoot] = TickManager._addOrRemoveTick(state, topTick, currentTick, newTreeRoot, newPrevTick, newNextTick, remove);
    }
    if (prevInitializedTick !== newPrevTick || nextInitializedTick !== newNextTick || newTreeRoot !== oldTickTreeRoot) {
      state.prevTick = newPrevTick;
      state.nextTick = newNextTick;
      state.newTreeRoot = newTreeRoot;
    }
  }
}

import { BigNumber } from 'ethers';
import { Address, NumberAsString } from '../../types';

type GlobalState = {
  price: bigint; // The square root of the current price in Q64.96 format
  tick: bigint; // The current tick
  lastFee: bigint; // The last fee collected
  pluginConfig: bigint; // The current plugin config as bitmap. Each bit is responsible for enabling/disabling the hooks, the last bit turns on/off dynamic fees logic
  communityFee: bigint; // The community fee represented as a percent of all collected fee in thousandths (1e-3)
  feeZto: bigint; // The current fee in hundredths of a bip, i.e. 1e-6
  feeOtz: bigint; // The current fee in hundredths of a bip, i.e. 1e-6
};

export type TickInfo = {
  liquidityTotal: bigint;
  liquidityDelta: bigint;
  outerFeeGrowth0Token: bigint;
	outerFeeGrowth1Token: bigint;
	prevTick: bigint;
  nextTick: bigint;
};

export type PoolState = {
  pool: string;
  blockTimestamp: bigint;
  tickSpacing: bigint;
  globalState: GlobalState; // eq slot0
  liquidity: bigint;
  maxLiquidityPerTick: bigint;
  //tickBitmap: Record<NumberAsString, bigint>; // actually called tickTable in contract-
  ticks: Record<NumberAsString, TickInfo>; // although variable names are different in contracts but matches UniswapV3 TickInfo struct 1:1
  tickTable: Record<NumberAsString, bigint>; // actually called ticks in contract
  tickTreeSecondLayer: Record<NumberAsString, bigint>; // actually called tickTableSecondLayer in contract
  isValid: boolean;
  startTickBitmap: bigint;
  balance0: bigint;
  balance1: bigint;
  areTicksCompressed: boolean;
  prevTick: bigint;
  nextTick: bigint;
  newTreeRoot: bigint;
};

export interface StepComputations {
  sqrtPriceStartX96: bigint;
  tickNext: bigint;
  initialized: boolean;
  sqrtPriceNextX96: bigint;
  amountIn: bigint;
  amountOut: bigint;
  feeAmount: bigint;
}

export type FactoryState = Record<string, never>;

export type AlgebraData = {
  path: {
    tokenIn: Address;
    tokenOut: Address;
  }[];
  feeOnTransfer: boolean;
  isApproved?: boolean;
};

export type AlgebraDataWithFee = {
  tokenIn: Address;
  tokenOut: Address;
};

export enum AlgebraFunctions {
  exactInput = 'exactInput',
  exactOutput = 'exactOutput',
  exactInputWithFeeToken = 'exactInputSingleSupportingFeeOnTransferTokens',
}

export type DexParams = {
  router: Address;
  quoter: Address;
  factory: Address;
  algebraStateMulticall: Address;
  uniswapMulticall: Address;
  chunksCount: number;
  initRetryFrequency: number;
  deployer: Address;
  subgraphURL: string;
  initHash: string;
  forceRPC?: boolean;
  forceManualStateGenerate?: boolean;
};

export type IAlgebraPoolState = PoolState;

export type TickBitMapMappingsWithBigNumber = {
  index: number;
  value: BigNumber;
};

export type TickInfoWithBigNumber = {
  initialized: boolean;
  liquidityGross: BigNumber;
  liquidityNet: BigNumber;
  secondsOutside: number;
  secondsPerLiquidityOutsideX128: BigNumber;
  tickCumulativeOutside: BigNumber;
};

export type TickInfoMappingsWithBigNumber = {
  index: number;
  value: TickInfoWithBigNumber;
};

export type DecodedGlobalState = {
  price: BigNumber;
  tick: number;
  lastFee: number;
  pluginConfig: number;
  communityFee: number;
  feeZto: number;
  feeOtz: number;
  timepointIndex: number;
  unlocked: Boolean;
};

export type DecodedStateMultiCallResultWithRelativeBitmaps = {
  pool: Address;
  blockTimestamp: BigNumber;
  globalState: DecodedGlobalState;
  liquidity: BigNumber;
  tickSpacing: number;
  maxLiquidityPerTick: BigNumber;
  tickBitmap: TickBitMapMappingsWithBigNumber[];
  ticks: TickInfoMappingsWithBigNumber[];
};

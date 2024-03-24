import { BigNumber, BytesLike } from 'ethers';
import { NumberAsString } from '../../types';
import { Address } from '../../types';
import { AbiItem } from 'web3-utils';
import { MultiResult } from '../../lib/multi-wrapper';
import { SpiritswapV3EventPool } from './spiritswap-v3-pool';

export type OracleObservation = {
  blockTimestamp: bigint;
  tickCumulative: bigint;
  initialized: boolean;
};

export type OracleObservationCandidates = {
  beforeOrAt: OracleObservation;
  atOrAfter: OracleObservation;
};

export type TickInfo = {
  liquidityTotal: bigint;
  liquidityDelta: bigint;
  prevTick: bigint;
  nextTick: bigint;
  outerFeeGrowth0Token: bigint;
  outerFeeGrowth1Token: bigint;
};

export type Slot0 = {
  sqrtPriceX96: bigint;
  tick: bigint;
  observationIndex: number;
  observationCardinality: number;
  observationCardinalityNext: number;
  feeProtocol: bigint;
};

export type PoolState = {
  pool: string;
  blockTimestamp: bigint;
  tickSpacing: bigint;
  slot0: Slot0;
  liquidity: bigint;
  maxLiquidityPerTick: bigint;
  tickBitmap: Record<NumberAsString, bigint>;
  ticks: Record<NumberAsString, TickInfo>;
  observations: Record<number, OracleObservation>;
  isValid: boolean;
  startTickBitmap: bigint;
  lowestKnownTick: bigint;
  highestKnownTick: bigint;
  balance0: bigint;
  balance1: bigint;
  totalFeeGrowth0Token: bigint;
  totalFeeGrowth1Token: bigint;
};

export type FactoryState = Record<string, never>;

export type SpiritswapV3Data = {
  path: {
    tokenIn: Address;
    tokenOut: Address;
    fee: NumberAsString;
    currentFee?: NumberAsString;
  }[];
  isApproved?: boolean;
};

export type DecodeStateMultiCallFunc = (
  result: MultiResult<BytesLike> | BytesLike,
) => DecodedStateMultiCallResultWithRelativeBitmaps;

export type DexParams = {
  router: Address;
  quoter: Address;
  factory: Address;
  poolDeloyer: Address;
  stateMulticall: Address;
  uniswapMulticall: Address;
  supportedFees: bigint[];
  chunksCount: number;
  initRetryFrequency: number;
  deployer?: Address;
  subgraphURL: string;
  initHash: string;
  stateMultiCallAbi?: AbiItem[];
  eventPoolImplementation?: typeof SpiritswapV3EventPool;
  decodeStateMultiCallResultWithRelativeBitmaps?: DecodeStateMultiCallFunc;
};

export type SpiritswapV3SimpleSwapSellParam = {
  path: string;
  recipient: Address;
  deadline: string;
  amountIn: NumberAsString;
  amountOutMinimum: NumberAsString;
};

export type SpiritswapV3SimpleSwapBuyParam = {
  path: string;
  recipient: Address;
  deadline: string;
  amountOut: NumberAsString;
  amountInMaximum: NumberAsString;
};

export type SpiritswapV3SimpleSwapParams =
  | SpiritswapV3SimpleSwapSellParam
  | SpiritswapV3SimpleSwapBuyParam;

export type SpiritswapV3Param = [
  fromToken: Address,
  toToken: Address,
  exchange: Address,
  fromAmount: NumberAsString,
  toAmount: NumberAsString,
  expectedAmount: NumberAsString,
  feePercent: NumberAsString,
  deadline: NumberAsString,
  partner: Address,
  isApproved: boolean,
  beneficiary: Address,
  path: string,
  permit: string,
  uuid: string,
];

export enum SpiritswapV3Functions {
  exactInput = 'exactInput',
  exactOutput = 'exactOutput',
}

export type TickInfoMappings = {
  index: number;
  value: TickInfo;
};

export type TickBitMapMappings = {
  index: number;
  value: bigint;
};

export type OutputResult = {
  outputs: bigint[];
  tickCounts: number[];
};

// Just rewrote every type with BigNumber basically

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

export type DecodedStateMultiCallResultWithRelativeBitmaps = {
  pool: Address;
  blockTimestamp: BigNumber;
  slot0: {
    feeProtocol: number;
    observationCardinality: number;
    observationCardinalityNext: number;
    observationIndex: number;
    sqrtPriceX96: BigNumber;
    tick: number;
    unlocked: boolean;
  };
  liquidity: BigNumber;
  tickSpacing: number;
  maxLiquidityPerTick: BigNumber;
  observation: {
    blockTimestamp: number;
    initialized: boolean;
    secondsPerLiquidityCumulativeX128: BigNumber;
    tickCumulative: BigNumber;
  };
  tickBitmap: TickBitMapMappingsWithBigNumber[];
  ticks: TickInfoMappingsWithBigNumber[];
  tick: bigint;
};

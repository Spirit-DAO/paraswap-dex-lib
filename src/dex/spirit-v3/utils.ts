import { BigNumber, BytesLike, ethers } from 'ethers';
import { assert } from 'ts-essentials';
import { extractSuccessAndValue } from '../../lib/decoders';
import { MultiResult } from '../../lib/multi-wrapper';
import {
  DecodedGlobalState,
  DecodedStateMultiCallResultWithRelativeBitmaps,
  TickInfoWithBigNumber,
} from './types';

export function decodeStateMultiCallResultWithRelativeBitmaps(
  result: MultiResult<BytesLike> | BytesLike,
): DecodedStateMultiCallResultWithRelativeBitmaps {
  const [isSuccess, toDecode] = extractSuccessAndValue(result);

  assert(
    isSuccess && toDecode !== '0x',
    `decodeStateMultiCallResultWithRelativeBitmaps failed to get decodable result: ${result}`,
  );

  const decoded = ethers.utils.defaultAbiCoder.decode(
    [
      // I don't want to pass here any interface, so I just use it in ethers format
      `
        tuple(
          address pool,
          uint256 blockTimestamp,
          tuple(
            uint160 price,
			int24 tick,
			uint16 lastFee,
			uint8 pluginConfig,
			uint16 communityFee,
			uint16 feeZto,
			uint16 feeOtz,
			uint16 timepointIndex,
			bool unlocked
          ) globalState,
          uint128 liquidity,
          int24 tickSpacing,
          uint128 maxLiquidityPerTick,
          tuple(
            bool initialized,
			uint32 blockTimestamp,
			int56 tickCumulative,
			uint88 volatilityCumulative,
			int24 tick,
			int24 averageTick,
			uint16 windowStartIndex
          ) timepoints,
          tuple(
            int16 index,
            uint256 value,
          )[] tickBitmap,
          tuple(
            int24 index,
            tuple(
				uint256 liquidityTotal,
				int128 liquidityDelta,
				int24 prevTick,
				int24 nextTick,
				uint256 outerFeeGrowth0Token,
				uint256 outerFeeGrowth1Token
            ) value,
          )[] ticks
        )
      `,
    ],
    toDecode,
  )[0];
  // This conversion is not precise, because when we decode, we have more values
  // But I typed only the ones that are used later
  return decoded as DecodedStateMultiCallResultWithRelativeBitmaps;
}

// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

interface IUniswapV3Pool {
    function slot0()
        external
        view
        returns (
            uint160 sqrtPriceX96,
            int24 tick,
            uint16 observationIndex,
            uint16 observationCardinality,
            uint16 observationCardinalityNext,
            uint8 feeProtocol,
            bool unlocked
        );
}

contract TestWethUsdtUniswapV3Pool is IUniswapV3Pool {
    function slot0()
        external
        pure
        returns (
            uint160 sqrtPriceX96,
            int24 tick,
            uint16 observationIndex,
            uint16 observationCardinality,
            uint16 observationCardinalityNext,
            uint8 feeProtocol,
            bool unlocked
        )
    {
        return (4467232491834074285419943, -195677, 0, 1, 1, 0, true);
    }
}

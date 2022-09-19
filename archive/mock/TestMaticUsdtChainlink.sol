// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "./AggregatorV3Interface.sol";

contract TestMaticUsdtChainlink is AggregatorV3Interface {
    function latestRoundData()
        external
        pure
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (0, 232782100, 0, 0, 0);
    }
}

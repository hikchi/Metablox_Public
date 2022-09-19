// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

// sample address: 0x2d261153481BBEF9B50DF8Ca0A29B5eA0E11e3c0 (mumbai)
// sample address: 0xC720493F7a5AFb51f2035BDE0A2F9e52EE01D6aA (local)
contract TestGetPrice {
    using SafeMath for uint256;

    function getPriceFronUniswap(address poolAddress)
        external
        view
        returns (uint256 price)
    {
        IUniswapV3Pool pool = IUniswapV3Pool(poolAddress);
        (uint160 sqrtPriceX96, , , , , , ) = pool.slot0();
        return
            uint256(sqrtPriceX96).mul(uint256(sqrtPriceX96)).mul(1e18) >>
            (96 * 2);
    }

    function getLatestPrice(address feedAddress) public view returns (int256) {
        AggregatorV3Interface priceFeed = AggregatorV3Interface(feedAddress);
        (
            uint80 roundID,
            int256 price,
            uint256 startedAt,
            uint256 timeStamp,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();
        return price;
    }
    
    function getLatestPrice_(address feedAddress) public view returns (uint256) {
        AggregatorV3Interface priceFeed = AggregatorV3Interface(feedAddress);
        (
            uint80 roundID,
            int256 price,
            uint256 startedAt,
            uint256 timeStamp,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();
        return uint256(price);
    }
}

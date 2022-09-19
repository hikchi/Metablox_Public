// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract PropertyTier is Ownable {
    // phase => tier => price
    mapping(uint256 => uint256[]) public bloxBasePrice;

    event SetBloxBasePrice(address indexed sender, uint _phase, uint[] _prices, uint _ts);

    constructor() {
        defaultSetBloxBasePrice();
    }

    function defaultSetBloxBasePrice() private {
        // phase 1
        bloxBasePrice[1] = [100, 200, 300, 400, 500];
        // phase 2
        bloxBasePrice[2] = [150, 300, 450, 600, 750];
        // phase 3
        bloxBasePrice[3] = [225, 450, 675, 900, 1125];
        // phase 4
        bloxBasePrice[4] = [338, 675, 1013, 1350, 1688];
        // phase 5
        bloxBasePrice[5] = [506, 1013, 1519, 2025, 2531];
        // phase 6
        bloxBasePrice[6] = [759, 1519, 2278, 3038, 3797];
        // phase 7
        bloxBasePrice[7] = [1139, 2278, 3417, 4556, 5695];
        // phase 8
        bloxBasePrice[8] = [1709, 3417, 5126, 6834, 8543];
        // phase 9
        bloxBasePrice[9] = [2563, 5126, 7689, 10252, 12814];
        // phase 10
        bloxBasePrice[10] = [3844, 7689, 11533, 15377, 19222];
    }

    function getBloxBasePrice(uint256 phase, uint256 tier)
        public
        view
        returns (uint256)
    {
        return bloxBasePrice[phase][tier];
    }

    function ownerSetBloxBasePrice(uint256 phase, uint256[] memory prices)
        external
        onlyOwner
    {
      require(prices.length == 5, "invalid length of price array");
      require(phase >= 1 && phase <= 10, "invalid phase");
      bloxBasePrice[phase] = prices;

      emit SetBloxBasePrice(msg.sender, phase, prices, block.timestamp);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

interface IMetabloxEverywhere {
    function register(
        string memory _country,
        string memory _state,
        string memory _city
    ) external;

    /* custodial batch mint */
    function custodialBatchMint(
        string memory _country,
        string memory _state,
        string memory _city,
        address _user,
        uint256[] memory _bloxNumbers
    ) external;

    /* public batch mint */
    function publicBatchMint(
        string memory _country,
        string memory _state,
        string memory _city,
        uint256[] memory _bloxNumbers,
        uint8[] memory _propertyTiers,
        address _buyWith,
        uint256[] memory _erc20TokenAmounts,
        uint256 _tolerance
    ) external;

    /* switch on and off of a blox */
    function capBlox(
        string memory _country,
        string memory _state,
        string memory _city,
        uint256[] memory _bloxNumbers,
        bool _flag
    ) external;
}

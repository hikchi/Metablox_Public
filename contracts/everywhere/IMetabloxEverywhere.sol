// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

interface IMetabloxEverywhere {
    function register(
        string memory _country,
        string memory _state,
        string memory _city
    ) external;

    /* custodial mint */
    function custodialMint(
        string memory _country,
        string memory _state,
        string memory _city,
        address _user,
        uint256 _bloxNumber
    ) external;

    /* custodial batch mint */

    function custodialBatchMint(
        string memory _country,
        string memory _state,
        string memory _city,
        address _user,
        uint256[] memory _bloxNumbers
    ) external;

    /* public mint */
    function publicMint(
        string memory _country,
        string memory _state,
        string memory _city,
        uint256 _bloxNumber,
        uint8 _propertyTier,
        address _buyWith,
        uint256 _erc20TokenAmount,
        uint256 _tolerance
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

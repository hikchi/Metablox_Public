// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Context.sol";
import "../ERC3664.sol";

/**
 * @dev Implementation of the {ERC3664Synthetic} interface.
 */
contract ERC3664CrossSynthetic is Context, ERC3664 {
    struct SynthesizedToken {
        address token;
        address owner;
        uint256 id;
    }

    // mainToken => SynthesizedToken
    mapping(uint256 => SynthesizedToken[]) public synthesizedTokens;

    // subToken => mainToken => address
    mapping(uint256 => mapping(uint256 => address)) public subTokens;

    constructor () ERC3664() {}

    function recordSynthesized(
        uint256 tokenId,
        address subToken,
        uint256 subId
    ) public {
        synthesizedTokens[tokenId].push(SynthesizedToken(subToken, _msgSender(), subId));
        subTokens[subId][tokenId] = subToken;
    }

    function getSynthesizedTokens(uint256 tokenId) public view returns (SynthesizedToken[] memory) {
        return synthesizedTokens[tokenId];
    }

    function tokenAttributes(uint256 tokenId) internal view returns (string memory) {
        bytes memory data = "";
        uint256[] memory attrs = attributesOf(tokenId);
        for (uint i = 0; i < attrs.length; i++) {
            if (data.length > 0) {
                data = abi.encodePacked(data, ',');
            }
            data = abi.encodePacked(data, '{"trait_type":"', symbol(attrs[i]), '","value":"', textOf(tokenId, attrs[i]), '"}');
        }
        data = abi.encodePacked(data, getSubAttributes(tokenId));

        return string(data);
    }

    function getSubAttributes(uint256 tokenId) internal view returns (bytes memory) {
        bytes memory data = "";
        SynthesizedToken[] memory sTokens = synthesizedTokens[tokenId];
        for (uint i = 0; i < sTokens.length; i++) {
            if (data.length > 0) {
                data = abi.encodePacked(data, ',');
            }
            data = abi.encodePacked(data, tokenAttributes(sTokens[i].id));
        }
        return data;
    }
}

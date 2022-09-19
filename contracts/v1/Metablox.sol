// contracts/GameItems.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// contract MetabloxGameLogic is Metablox {}

contract Metablox is ERC721URIStorage, Ownable {
    using SafeMath for uint256;

    /**
     * @dev Emitted a event when a Blox has been created.
     */
    event NewBlox(
        uint256 bloxId,
        uint256 bloxNumber,
        string name,
        uint256 tier,
        uint256 level,
        uint16 generation
    );

    uint256 public _owned_supply = 0;
    uint256 public our_total_supply;

    uint256 public phase = 1;
    uint256[] price_tiers;
    mapping(uint256 => uint256) price;

    IERC20 public usdt;

    struct Blox {
        uint256 bloxNumber;
        string name;
        uint256 tier;
        uint256 level;
        uint16 generation;
    }
    Blox[] public bloxs;
    mapping(address => Blox) bloxToOwner;

    constructor(uint256 total) ERC721("Metablox", "Blox") {
        our_total_supply = total;
        setPriceTiers();
    }

    /**
     * @dev Set the initial five tier prices to make people buy Blox with the setted price.
     */
    function setPriceTiers() private {
        price_tiers.push(100);
        price_tiers.push(200);
        price_tiers.push(300);
        price_tiers.push(400);
        price_tiers.push(500);
    }

    /**
     * @dev This function will used by the owner for the airdrop and give the reserved Blox to the early palyer.
     */
    function mintUniqueTokenTo(
        address player,
        string memory tokenURI,
        uint256 _bloxNumber,
        string memory _name,
        uint256 _tier,
        uint256 _level,
        uint16 _generation
    ) public onlyOwner returns (uint256) {
        uint256 _tokenId = _owned_supply;
        _mint(player, _tokenId);
        _setTokenURI(_tokenId, tokenURI);
        emit NewBlox(_tokenId, _bloxNumber, _name, _tier, _level, _generation);

        _owned_supply = _owned_supply.add(1);

        return _tokenId;
    }

    /**
     * @dev Upgrade a phase when a Region owned Blox hit a certain percentage
     * This function is following Metablox battleplan, see: https://docs.google.com/spreadsheets/d/1hSFxNm0ef1GpStqTRNnhx7gkHUcfXW_85Wk-Qg8jGCM/edit#gid=1176706991
     */
    function UpgradePhase() public onlyOwner {
        if (our_total_supply.mul(phase).div(10) == _owned_supply) {
            phase = phase.add(1);
            uint256 exp = uint256(10).div(5)**phase;

            for (uint256 i = 0; i < price_tiers.length; i++)
                price_tiers[i] = price_tiers[i].mul(exp);
        }
    }

    /**
     * @dev We have a five tier price for each tier Blox, and the price will be updated when the % of region owned by people
     *
     * Returns the current price tiers
     */
    function lookupPrice() public view returns (uint256[] memory) {
        return price_tiers;
    }

    /**
     * @dev We mint a token when a user buy a brand new Blox
     */
    function mintWithUSDT(
        string memory tokenURI,
        uint256 _amount,
        uint256 _bloxNumber,
        string memory _name,
        uint256 _tier,
        uint256 _level,
        uint16 _generation
    ) public {
        usdt.transferFrom(msg.sender, address(this), _amount);
        mintUniqueTokenTo(
            msg.sender,
            tokenURI,
            _bloxNumber,
            _name,
            _tier,
            _level,
            _generation
        );
    }

    /**
     * @dev This function is used to handle the Blox price since we exponetial the price of a Blox.
     *
     * Returns the round up nunber
     */
    function roundUp(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a.mod(b) == 0 ? 0 : 1;
        return a.sub(b).add(c);
    }

    /**
     * @dev This function let the Blox owner change their rooting memory
     */
    function setRootingMemeory(uint256 _tokenId, string memory tokenURI)
        public
    {
        require(msg.sender == ownerOf(_tokenId), "Not the token owner");
        _setTokenURI(_tokenId, tokenURI);
    }
}

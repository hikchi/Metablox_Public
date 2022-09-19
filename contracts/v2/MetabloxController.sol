// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "./MetabloxMemories.sol";
import "../storage/PropertyLevel.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MetabloxController is Ownable {
    IERC721 public bloxContract;
    MetabloxMemories private metabloxMemories;
    PropertyLevel private propertyLevel;

    // ERC3664 id for memory slot
    uint public memorySlotAttributeId;

    constructor(
        address _bloxContractAddress,
        address _memoryAddress,
        address _propertyLevelAddress
    ) {
        bloxContract = IERC721(_bloxContractAddress);
        metabloxMemories = MetabloxMemories(_memoryAddress);
        propertyLevel = PropertyLevel(_propertyLevelAddress);
    }

    modifier onlyBloxOwner(uint256 _bloxId, address _user) {
        require(
            bloxContract.ownerOf(_bloxId) == _user,
            "only blox owner can do this"
        );
        _;
    }

    function addBloxMemory(uint256 _bloxId, bytes memory _arweaveHash)
        external
        onlyBloxOwner(_bloxId, msg.sender)
    {
        address _caller = msg.sender;
        uint _memorySlot = propertyLevel.balanceOf(_bloxId, memorySlotAttributeId);
        metabloxMemories.addBloxMemory(_caller, _bloxId, _arweaveHash, _memorySlot);
    }

    function ownerAddBloxMemory(
        address _user,
        uint256 _bloxId,
        bytes memory _arweaveHash
    ) external onlyOwner onlyBloxOwner(_bloxId, _user) {
        uint _memorySlot = propertyLevel.balanceOf(_bloxId, memorySlotAttributeId);
        metabloxMemories.addBloxMemory(_user, _bloxId, _arweaveHash, _memorySlot);
    }

    function modifyBloxMemory(uint256 _bloxId, uint256 _memoryIndex)
        external
        onlyBloxOwner(_bloxId, msg.sender)
    {
        address _caller = msg.sender;
        metabloxMemories.modifyBloxMemory(_caller, _bloxId, _memoryIndex);
    }

    function ownerModifyBloxMemory(
        address _user,
        uint256 _bloxId,
        uint256 _memoryIndex
    ) external onlyOwner onlyBloxOwner(_bloxId, _user) {
        metabloxMemories.modifyBloxMemory(_user, _bloxId, _memoryIndex);
    }

    // for adding amount based on attributes in battle plan
    // owner should send attribute id along with amount to be add into this function
    function levelUp(address _user, uint256 _bloxId, uint[] calldata _attrIds, uint[] calldata _attrAmounts, bytes[] calldata _texts)
        external
        onlyOwner
        onlyBloxOwner(_bloxId, _user)
    {
        propertyLevel.batchAttach(_bloxId, _attrIds, _attrAmounts, _texts);
    }

    function setMemorySlotAttributeId(uint _id) external onlyOwner {
        memorySlotAttributeId = _id;
    }
}

// contracts/GameItems.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "@openzeppelin/contracts/access/Ownable.sol";


contract MetabloxMemory is Ownable {
    IERC721 public bloxContract;

    struct BloxMemory {
        bool existed;
        address owner;
        uint256 ownerIndex;
        uint256 globalIndex;
        uint256 createdTime;
        uint256 updatedTime;
    }

    event BloxMemoryAdded(
        address indexed _caller,
        uint256 _bloxId,
        bytes memoryHash,
        uint256 timestamp
    );

    event BloxMemoryModified(
        address indexed _caller,
        uint256 _bloxId,
        bytes memoryHash,
        uint256 timestamp
    );

    constructor() {}

    modifier onlyBloxOwner(uint256 _bloxId, address _caller) {
        require(
            bloxContract.ownerOf(_bloxId) == _caller,
            "only blox owner can do this"
        );
        _;
    }

    modifier memoryExisted(uint256 _bloxId, bytes memory _arweaveHash) {
        require(
            !bloxMemoryMetadata[_bloxId][_arweaveHash].existed,
            "existed memory hash of the blox"
        );
        _;
    }

    // blox id -> all memory hashes capped by memory slot
    mapping(uint256 => bytes[]) public bloxTotalMemoryHashes;
    // blox id -> memory hash -> existed
    mapping(uint256 => mapping(bytes => BloxMemory)) public bloxMemoryMetadata;
    // the address owning Bloxes
    mapping(uint256 => mapping(address => bytes[])) public bloxMemoryHistories;

    /**
     * @dev This function let the recent Blox owner add the memory
     */
    function addBloxMemory(address _caller, uint256 _bloxId, bytes memory _arweaveHash, uint _memorySlot)
        external
        onlyBloxOwner(_bloxId, _caller)
        memoryExisted(_bloxId, _arweaveHash)
    {
        require(
            bloxTotalMemoryHashes[_bloxId].length < _memorySlot,
            "exceed memory slot" 
        );

        uint256 _ts = block.number;
        bloxTotalMemoryHashes[_bloxId].push(_arweaveHash);
        bloxMemoryHistories[_bloxId][_caller].push(_arweaveHash);

        bloxMemoryMetadata[_bloxId][_arweaveHash] = BloxMemory({
            existed: true,
            owner: _caller,
            ownerIndex: bloxMemoryHistories[_bloxId][_caller].length - 1,
            globalIndex: bloxTotalMemoryHashes[_bloxId].length - 1,
            createdTime: _ts,
            updatedTime: _ts
        });

        emit BloxMemoryAdded(_caller, _bloxId, _arweaveHash, _ts);
    }

    /**
     * @dev This function let the recent Blox owner modify the memory
     */
    function modifyBloxMemory(address _caller,  uint256 _bloxId, uint256 _memoryIndex)
        external
        onlyBloxOwner(_bloxId, _caller)
    {
        require(
            _memoryIndex >= 0 &&
                _memoryIndex < bloxMemoryHistories[_bloxId][_caller].length,
            "the number of index should not be greater then the numebr you've added"
        );
        // check if the memory is existing
        bytes memory _memoryHash = bloxMemoryHistories[_bloxId][_caller][
            _memoryIndex
        ];
        require(
            bloxMemoryMetadata[_bloxId][_memoryHash].existed,
            "memory hash must be existed"
        );

        // to-do: check the column that can be modified
        uint256 _ts = block.number;
        bloxMemoryMetadata[_bloxId][_memoryHash].updatedTime = _ts;
        // emit event
        emit BloxMemoryModified(_caller, _bloxId, _memoryHash, _ts);
    }

    function getMemoryHashesByBloxId(uint _bloxId) public view returns (bytes[] memory) {
        return bloxTotalMemoryHashes[_bloxId];
    }

    function getMemoryHashesByAddress(uint _bloxId, address _user) public view returns (bytes[] memory) {
        return bloxMemoryHistories[_bloxId][_user];
    }

    function setBloxContract(address _bloxContractAddress) external onlyOwner {
        bloxContract = IERC721(_bloxContractAddress);
    }
}

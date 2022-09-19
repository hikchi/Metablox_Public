// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721RoyaltyUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

import "../storage/PropertyTier.sol";
import "../storage/PropertyLevel.sol";

import "./IMetabloxEverywhere.sol";
import "./MetabloxMemory.sol";

/// @title MetaBlox Everywhere
/// @author Kevin, Chung
/// @notice MetaBlox Everywhere
contract MetabloxEverywhere is
    ERC721RoyaltyUpgradeable,
    ERC721EnumerableUpgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable
{
    /* libs */
    using SafeERC20 for ERC20;
    using SafeMath for uint8;
    using SafeMath for uint16;
    using SafeMath for uint256;
    using Strings for uint256;
    using CountersUpgradeable for CountersUpgradeable.Counter;

    CountersUpgradeable.Counter private _tokenIdCounter;

    /* Blox structure */
    struct Blox {
        /* metadata */
        string country;
        string state;
        string city;
        uint16 bloxSupply;
        uint16 bloxSupplyWithLandmark;
        string uriSuffix;
        uint16[] bloxNumbers;
        // mappings
        mapping(uint16 => address) owners;
        mapping(uint16 => bool) cappedBlox;
        mapping(uint16 => bool) isLandmark;
        // mint limitations
        bool allBloxesSold;
        uint8 maxPublicMint;
        uint8 maxCustodialMint;
        // authorizies
        address minter;
        address capper;
        address paymentTokenBeneficiary;
        address royaltyBeneficiary;
        // some contracts for all the functinoalities
        address propertyLevelContract;
        address memoryContract;
        // consider using universal one
        // address propertyTierContract;

        // some members for GP.
        bool enabledGP;
        uint8 currPhase;
        uint8 remainingGP;
        uint256 lastBlockNum;
        // [WIP] Miscs
        bool enabledPublicMint;
    }

    struct TokenToBlox {
        uint256 bloxIndex;
        uint16 bloxNumber;
    }

    /* Blox registry */
    // country -> state -> city -> blox index
    mapping(string => mapping(string => mapping(string => uint256))) bloxRegistryIndex;
    // token id -> blox index -> blox number
    mapping(uint256 => TokenToBlox) tokenToBloxRegistry;
    // main struct array for Blox
    Blox[] internal bloxRegistry;

    /* chainlink registration table */
    mapping(string => address) paymentTokenRegistry;
    mapping(string => address) priceFeedRegistry;

    string public contractUri;
    string public baseURI;
    /* tolerances */
    uint256 constant BASE_TOLERANCE = 1e4; // tolerance decimals: 4
    uint256 constant TOLERANCE_PADDING = 1e22; // 100 matic
    /* public params */
    address public propertyTierContractAddress;
    /* private params */
    /// @custom:oz-upgrades-unsafe-allow constructor
    // constructor() initializer {}
    event NewCityRegistered(string _country, string _state, string _city);

    event NewBloxMinted(
        address indexed _user,
        uint256 indexed tokenId,
        uint256 indexed _bloxNumber,
        string _country,
        string _state,
        string _city
    );

    event EnteringGracePeriod(
        address indexed _addr,
        uint256 _gracePeriod,
        uint256 _timestamp
    );
    event ReleasingGracePeriod(
        address indexed _addr,
        uint256 _gracePeriod,
        uint256 _timestamp
    );

    function initialize(
        address _propertyTierContractAddress,
        address[] memory _tokenRelatedAddresses
    ) public initializer {
        __ERC721_init("Metablox", "Blox");
        __ERC721Enumerable_init();
        __ERC721Royalty_init();
        __Ownable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        // initialize Metablox Everwhere contract
        __Blox_init(_propertyTierContractAddress, _tokenRelatedAddresses);
    }

    function __Blox_init(
        address _propertyTierContractAddress,
        address[] memory _tokenRelatedAddresses
    ) internal {
        propertyTierContractAddress = _propertyTierContractAddress;

        paymentTokenRegistry["USDT"] = address(_tokenRelatedAddresses[0]);
        paymentTokenRegistry["WETH"] = address(_tokenRelatedAddresses[1]);
        paymentTokenRegistry["WMATIC"] = address(_tokenRelatedAddresses[2]);
        priceFeedRegistry["WETH"] = address(_tokenRelatedAddresses[3]);
        priceFeedRegistry["MATIC"] = address(_tokenRelatedAddresses[4]);
    }

    function getBlox(
        string memory _country,
        string memory _state,
        string memory _city
    ) private view returns (Blox storage) {
        uint256 _i = bloxRegistryIndex[_country][_state][_city];
        return bloxRegistry[_i];
    }

    modifier onlyCapper(
        string memory _country,
        string memory _state,
        string memory _city
    ) {
        Blox storage _blox = getBlox(_country, _state, _city);
        address _capper = _blox.capper;
        require(_capper == _msgSender(), "caller is not the capper");
        _;
    }

    modifier onlyMinter(
        string memory _country,
        string memory _state,
        string memory _city
    ) {
        Blox storage _blox = getBlox(_country, _state, _city);
        address _minter = _blox.minter;
        require(_minter == _msgSender(), "caller is not the minter: ");
        _;
    }

    function register(
        string memory _country,
        string memory _state,
        string memory _city,
        string memory _uriSuffix,
        address[] memory _authorities
    ) external onlyOwner {
        // add blox into index mapping
        bloxRegistryIndex[_country][_state][_city] = bloxRegistry.length;
        // push into Blox array
        bloxRegistry.push();
        uint256 _index = bloxRegistryIndex[_country][_state][_city];
        initBlox(_index, _country, _state, _city, _uriSuffix, _authorities);
        // fire event
        emit NewCityRegistered(_country, _state, _city);
    }

    function initBlox(
        uint256 _index,
        string memory _country,
        string memory _state,
        string memory _city,
        string memory _uriSuffix,
        address[] memory _authorities
    ) private {
        // init a blank Blox
        Blox storage _blox = bloxRegistry[_index];
        // set primary info
        _blox.country = _country;
        _blox.state = _state;
        _blox.city = _city;
        // misc
        _blox.allBloxesSold = true;
        _blox.propertyLevelContract = address(new PropertyLevel());
        _blox.memoryContract = address(new MetabloxMemory());
        // set role
        _blox.minter = _authorities[0];
        _blox.capper = _authorities[1];
        _blox.paymentTokenBeneficiary = _authorities[2];
        _blox.royaltyBeneficiary = _authorities[3];
        // set defaulte mint amount
        _blox.maxCustodialMint = 20;
        _blox.maxPublicMint = 5;
        // uri suffix
        _blox.uriSuffix = _uriSuffix;
    }

    function capBlox(
        string memory _country,
        string memory _state,
        string memory _city,
        uint16[] memory _bloxNumbers,
        bool _flag
    ) external onlyCapper(_country, _state, _city) {
        Blox storage _blox = getBlox(_country, _state, _city);

        for (uint256 i = 0; i < _bloxNumbers.length; i++) {
            // to-do: exist function for structure
            // require(!_exists(_bloxNumber), "the blox has been minted");
            _blox.cappedBlox[_bloxNumbers[i]] = _flag;
        }
    }

    function setBloxSupply(
        string memory _country,
        string memory _state,
        string memory _city,
        uint16 _bloxSupply
    ) external onlyOwner {
        Blox storage _blox = getBlox(_country, _state, _city);
        _blox.bloxSupply = _bloxSupply;
    }

    function setBloxSupplyWithLandmark(
        string memory _country,
        string memory _state,
        string memory _city,
        uint16 _bloxSupplyWithLandmark
    ) external onlyOwner {
        Blox storage _blox = getBlox(_country, _state, _city);
        _blox.bloxSupplyWithLandmark = _bloxSupplyWithLandmark;
    }

    function initBloxPropertyLevel(
        address _propertyLevelContract,
        uint256 _bloxNumber
    ) private {
        uint256[] memory _attrIds = new uint256[](4);
        _attrIds[0] = 1;
        _attrIds[1] = 2;
        _attrIds[2] = 3;
        _attrIds[3] = 4;

        uint256[] memory _attrAmounts = new uint256[](4);
        _attrAmounts[0] = 1;
        _attrAmounts[1] = 0;
        _attrAmounts[2] = 1;
        _attrAmounts[3] = 300;

        bytes[] memory _texts = new bytes[](4);

        PropertyLevel(_propertyLevelContract).batchAttach(
            _bloxNumber,
            _attrIds,
            _attrAmounts,
            _texts
        );
    }

    // custodial mint
    function custodialMint(
        Blox storage _blox,
        address _user,
        uint16 _bloxNumber
    ) private {
        // check if Blox is all sold
        require(!_blox.allBloxesSold, "Bloxes are all sold");
        // check if Blox doesn't exist
        require(_blox.owners[_bloxNumber] != address(0), "Blox already minted");
        // get current token id, and add one
        uint256 _tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        // assign owner to correspond Blox
        _blox.owners[_bloxNumber] = _user;
        _blox.bloxNumbers.push(_bloxNumber);
        // associate token id with blox index and number
        tokenToBloxRegistry[_tokenId] = TokenToBlox({
            bloxIndex: bloxRegistryIndex[_blox.country][_blox.state][
                _blox.city
            ],
            bloxNumber: _bloxNumber
        });
        // mint token
        _safeMint(_user, _tokenId);
        // check if it's all sold
        if (_blox.bloxNumbers.length == _blox.bloxSupplyWithLandmark) {
            _blox.allBloxesSold = true;
        }
        // property level initialization
        initBloxPropertyLevel(_blox.propertyLevelContract, _bloxNumber);
        // check if the blox are all sold out
        gracePeriodCheck(_blox, _user);
        // fire event
        emit NewBloxMinted(
            _user,
            _tokenId,
            block.number,
            _blox.country,
            _blox.state,
            _blox.city
        );
    }

    // reservation batch mint
    function custodialBatchMint(
        string memory _country,
        string memory _state,
        string memory _city,
        address _user,
        uint16[] memory _bloxNumbers
    ) external onlyMinter(_country, _state, _city) whenNotPaused {
        Blox storage _blox = getBlox(_country, _state, _city);
        // check blox length availability
        require(
            _bloxNumbers.length <= _blox.maxCustodialMint &&
                _bloxNumbers.length > 0,
            "exceed maximum mint amount"
        );
        // check if the mint amount exceeds max blox supply
        uint256 _supply = _blox.bloxNumbers.length;
        require(
            _supply + _bloxNumbers.length <= _blox.bloxSupply,
            "exceed maximum blox supply"
        );
        // mint execution
        for (uint256 i = 0; i < _bloxNumbers.length; i++) {
            custodialMint(_blox, _user, _bloxNumbers[i]);
        }
    }

    // public mint
    function publicMint(
        Blox storage _blox,
        uint16 _bloxNumber,
        uint8 _propertyTier,
        address _buyWith,
        uint256 _erc20TokenAmount,
        uint256 _tolerance
    ) private {
        // check if bloxes are all sold out
        require(!_blox.allBloxesSold, "Bloxes are all sold");
        // check if Blox doesn't exist
        require(_blox.owners[_bloxNumber] != address(0), "Blox already minted");
        // check if the blox id is available in between of 1 to total supply
        require(
            _bloxNumber <= _blox.bloxSupplyWithLandmark && _bloxNumber >= 1,
            "invalid Blox number"
        );
        // check if the blox is capped by third party payment
        require(!_blox.cappedBlox[_bloxNumber], "the Blox is capped");
        // check if it's not a landmark
        require(!_blox.isLandmark[_bloxNumber], "the Blox is a Landmark");
        // get user
        address _user = _msgSender();
        // assign owner to correspond Blox
        _blox.owners[_bloxNumber] = _user;
        _blox.bloxNumbers.push(_bloxNumber);
        // get current token id, and add one
        uint256 _tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        // associate token id with blox number
        tokenToBloxRegistry[_tokenId] = TokenToBlox({
            bloxIndex: bloxRegistryIndex[_blox.country][_blox.state][
                _blox.city
            ],
            bloxNumber: _bloxNumber
        });
        // mint token
        _safeMint(_user, _tokenId);
        // mint and set blox properties
        initBloxPropertyLevel(_blox.propertyLevelContract, _bloxNumber);
        // check if the blox are all sold out
        if (_blox.bloxNumbers.length == _blox.bloxSupplyWithLandmark) {
            _blox.allBloxesSold = true;
        }

        if (_buyWith == paymentTokenRegistry["USDT"]) {
            ERC20 USDT = ERC20(paymentTokenRegistry["USDT"]);
            USDT.safeTransferFrom(
                _user,
                _blox.paymentTokenBeneficiary,
                getPhasePrice(
                    _blox.currPhase,
                    _blox.remainingGP,
                    _propertyTier
                ) * 10**USDT.decimals()
            );
        } else if (_buyWith == paymentTokenRegistry["WETH"]) {
            ERC20 WETH = ERC20(paymentTokenRegistry["WETH"]);
            require(
                isAbleToMintWith(
                    priceFeedRegistry["WETH"],
                    _erc20TokenAmount,
                    _tolerance * 10**(18 - WETH.decimals()),
                    _propertyTier,
                    _blox.currPhase,
                    _blox.remainingGP
                ),
                "unable to mint with WETH"
            );
            WETH.safeTransferFrom(
                _user,
                _blox.paymentTokenBeneficiary,
                _erc20TokenAmount
            );
        } else if (_buyWith == paymentTokenRegistry["WMATIC"]) {
            require(
                isAbleToMintWith(
                    priceFeedRegistry["MATIC"],
                    _erc20TokenAmount,
                    _tolerance,
                    _propertyTier,
                    _blox.currPhase,
                    _blox.remainingGP
                ),
                "unable to mint with MATIC"
            );
        } else {
            revert("unsupported token to mint Bloxes");
        }

        gracePeriodCheck(_blox, _user);
        emit NewBloxMinted(
            _user,
            _tokenId,
            block.number,
            _blox.country,
            _blox.state,
            _blox.city
        );
    }

    // reservation batch mint
    function publicBatchMint(
        string memory _country,
        string memory _state,
        string memory _city,
        uint16[] memory _bloxNumbers,
        uint8[] memory _propertyTiers,
        address _buyWith,
        uint256[] memory _erc20TokenAmounts,
        uint256 _tolerance
    ) external payable nonReentrant whenNotPaused {
        Blox storage _blox = getBlox(_country, _state, _city);
        // check public mint flipper
        require(_blox.enabledPublicMint, "public mint disabled temporarily");
        // check blox length availability
        require(
            _bloxNumbers.length == _propertyTiers.length &&
                _propertyTiers.length == _erc20TokenAmounts.length,
            "unmatched length of array"
        );
        require(
            _bloxNumbers.length <= _blox.maxPublicMint &&
                _bloxNumbers.length > 0,
            "exceed maximum mint amount"
        );
        // check if the mint amount exceeds max blox supply
        uint256 _supply = _blox.bloxNumbers.length;
        require(
            _supply + _bloxNumbers.length <= _blox.bloxSupplyWithLandmark,
            "exceed maximum blox supply"
        );
        // matic special examination
        if (_buyWith == paymentTokenRegistry["WMATIC"]) {
            uint256 _totalMaticAmount = 0;
            for (uint256 i = 0; i < _erc20TokenAmounts.length; i++) {
                _totalMaticAmount += _erc20TokenAmounts[i];
            }
            require(
                msg.value >= _totalMaticAmount,
                "insufficient matic amount to mint bloxes"
            );
        }

        // public mint execution
        for (uint256 i = 0; i < _bloxNumbers.length; i++) {
            publicMint(
                _blox,
                _bloxNumbers[i],
                _propertyTiers[i],
                _buyWith,
                _erc20TokenAmounts[i],
                _tolerance
            );
        }
    }

    /**
     * @dev Check if the amount user sends is in range of tolerance so that user can mint a new blox
     *
     * Logic:
     *
     * - get price of ERC20 token in USDT from Chainlink and save with new amount in USDT
     * - get price range from tolerance
     * - check if the new USDT amount is between the price range
     * - transfer ERC20 token from user's account to Blox's account
     * - mint Blox to user
     */
    function isAbleToMintWith(
        address priceFeedAddress,
        uint256 tokenAmount,
        uint256 tolerance,
        uint8 propertyTier,
        uint8 _currPhase,
        uint256 _remainingGP
    ) private view returns (bool) {
        // chainlink: 18 + 8 = 0 + 4 + 22
        uint256 bloxPriceInUsdt = getPhasePrice(
            _currPhase,
            _remainingGP,
            propertyTier
        );
        uint256 usdtPrice = getUsdtPrice(priceFeedAddress);
        if (
            (tokenAmount * usdtPrice) >
            bloxPriceInUsdt * (BASE_TOLERANCE + tolerance) * TOLERANCE_PADDING
        ) revert("exceed tolerance range");
        if (
            (tokenAmount * usdtPrice) <
            bloxPriceInUsdt * (BASE_TOLERANCE - tolerance) * TOLERANCE_PADDING
        ) revert("under tolerance range");

        return true;
    }

    function gracePeriodCheck(Blox storage _blox, address _user) private {
        // if the reserved supply hit a specific ratio
        // grace period activates
        if (_blox.currPhase >= 10) {
            return;
        }

        if (!_blox.enabledGP) {
            return;
        }
        uint256 _supply = _blox.bloxNumbers.length;
        if (_supply % getBloxSupplyDivBy10(_supply) == 0) {
            _blox.currPhase = _blox.currPhase + 1;
            _blox.remainingGP = _blox.remainingGP + 1;
            emit EnteringGracePeriod(_user, _blox.remainingGP, block.number);
        }
    }

    function getUsdtPrice(address poolAddress) internal view returns (uint256) {
        AggregatorV3Interface priceFeed = AggregatorV3Interface(poolAddress);
        (
            uint80 roundID,
            int256 price,
            uint256 startedAt,
            uint256 timeStamp,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();
        return uint256(price);
    }

    function getPhasePrice(
        uint8 _currPhase,
        uint256 _remainingGP,
        uint8 propertyTier
    ) public view returns (uint256) {
        bool _canSub;
        uint256 _phase;
        uint256 _propertyTier;
        (_canSub, _phase) = _currPhase.trySub(_remainingGP);
        (_canSub, _propertyTier) = propertyTier.trySub(1);

        require(
            _canSub,
            "phase or property tier overflow when getting base price"
        );

        return
            PropertyTier(propertyTierContractAddress).getBloxBasePrice(
                _phase,
                _propertyTier
            );
    }

    function getBloxSupplyDivBy10(uint256 _bloxSupply)
        internal
        pure
        returns (uint256)
    {
        (bool _canDiv, uint256 _divided) = _bloxSupply.tryDiv(10);
        require(_canDiv, "when getting divided supply");
        return _divided;
    }

    function addNewPriceFeed(string memory tokenName, address priceFeedAddress)
        external
        onlyOwner
    {
        require(
            priceFeedRegistry[tokenName] == address(0),
            "existing price feed"
        );
        priceFeedRegistry[tokenName] = priceFeedAddress;
    }

    function updatePriceFeed(string memory tokenName, address priceFeedAddress)
        external
        onlyOwner
    {
        require(
            priceFeedRegistry[tokenName] != address(0),
            "non-existing price feed"
        );
        priceFeedRegistry[tokenName] = priceFeedAddress;
    }

    function isApprovedForAll(address _owner, address _operator)
        public
        view
        override(ERC721Upgradeable)
        returns (bool isOperator)
    {
        // if OpenSea's ERC721 Proxy Address is detected, auto-return true
        if (_operator == address(0x58807baD0B376efc12F5AD86aAc70E78ed67deaE)) {
            return true;
        }

        // otherwise, use the default ERC721.isApprovedForAll()
        return super.isApprovedForAll(_owner, _operator);
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyOwner
    {}

    // The following functions are overrides required by Solidity.

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override(ERC721Upgradeable, ERC721EnumerableUpgradeable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721Upgradeable)
        returns (string memory)
    {
        super.tokenURI(tokenId);
        return
            bytes(baseURI).length > 0
                ? string(
                    abi.encodePacked(
                        baseURI,
                        bloxRegistry[tokenToBloxRegistry[tokenId].bloxIndex]
                            .uriSuffix,
                        tokenId.toString()
                    )
                )
                : "";
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721EnumerableUpgradeable, ERC721RoyaltyUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function withdraw() external {
        payable(owner()).transfer(address(this).balance);
    }

    // royalties for Bloxes
    function setDefaultRoyalty(address receiver, uint96 feeNumerator)
        external
        onlyOwner
    {
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    function deleteDefaultRoyalty() external onlyOwner {
        _deleteDefaultRoyalty();
    }

    function setTokenRoyalty(
        uint256 tokenId,
        address receiver,
        uint96 feeNumerator
    ) external onlyOwner {
        _setTokenRoyalty(tokenId, receiver, feeNumerator);
    }

    function setContractURI(string memory _contractUri) external onlyOwner {
        contractUri = _contractUri;
    }

    function contractURI() public view returns (string memory) {
        return contractUri;
    }

    function setLandmarkNumber(
        string memory _country,
        string memory _state,
        string memory _city,
        uint16[] memory _bloxNumbers,
        bool _flag
    ) external onlyOwner {
        Blox storage _blox = getBlox(_country, _state, _city);
        for (uint256 i = 0; i < _bloxNumbers.length; i++) {
            require(
                _bloxNumbers[i] <= _blox.bloxSupplyWithLandmark,
                "exceeding landmark index"
            );
            _blox.isLandmark[_bloxNumbers[i]] = _flag;
        }
    }

    function getAuthorities(
        string memory _country,
        string memory _state,
        string memory _city
    )
        public
        view
        returns (
            address _minter,
            address _capper,
            address _paymentTokenBeneficiary,
            address _royaltyBeneficiary
        )
    {
        Blox storage _blox = bloxRegistry[
            bloxRegistryIndex[_country][_state][_city]
        ];
        _minter = _blox.minter;
        _capper = _blox.capper;
        _paymentTokenBeneficiary = _blox.paymentTokenBeneficiary;
        _royaltyBeneficiary = _blox.royaltyBeneficiary;
    }

    function getMintLimitation(
        string memory _country,
        string memory _state,
        string memory _city
    )
        public
        view
        returns (
            bool _allBloxesSold,
            uint256 _maxPublicMint,
            uint256 _maxCustodialMintAmount
        )
    {
        Blox storage _blox = bloxRegistry[
            bloxRegistryIndex[_country][_state][_city]
        ];
        _allBloxesSold = _blox.allBloxesSold;
        _maxPublicMint = _blox.maxPublicMint;
        _maxCustodialMintAmount = _blox.maxCustodialMint;
    }

    // baseURi overrider
    function _baseURI() internal view virtual override returns (string memory) {
        return baseURI;
    }

    function setBaseURI(string memory _newBaseURI) external onlyOwner {
        baseURI = _newBaseURI;
    }

    function setMinter(
        string memory _country,
        string memory _state,
        string memory _city,
        address _minter
    ) external onlyOwner {
        Blox storage _blox = getBlox(_country, _state, _city);
        _blox.minter = _minter;
    }

    function setCapper(
        string memory _country,
        string memory _state,
        string memory _city,
        address _capper
    ) external onlyOwner {
        Blox storage _blox = getBlox(_country, _state, _city);
        _blox.capper = _capper;
    }

    function _burn(uint256 tokenId)
        internal
        override(ERC721Upgradeable, ERC721RoyaltyUpgradeable)
    {
        super._burn(tokenId);
    }
}

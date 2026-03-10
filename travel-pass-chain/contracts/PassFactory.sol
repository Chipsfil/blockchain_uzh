// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "./interfaces/IUsageRegistry.sol";

/**
 * @title PassFactory
 * @notice ERC-721 token that represents a multi-modal travel pass.  Each token
 *         encodes a specific *pass type* (product) that defines a validity
 *         period, a geographic zone, transferability rules, and a set of
 *         entitlements (e.g. "N bus rides", "unlimited bikes for 48 h").
 *
 *         When a new token is minted the contract initializes the
 *         entitlement balances inside the companion UsageRegistry contract.
 *
 *         Non-transferable passes (soulbound) are supported: if the pass type
 *         has `transferable == false`, the ERC-721 _update hook will revert on
 *         any transfer attempt (except minting and burning).
 */
contract PassFactory is ERC721, Ownable {
    // ──────────────────────────────────────────────
    //  Data structures
    // ──────────────────────────────────────────────

    struct PassType {
        string   name;              // e.g. "Zurich CityPass 48 h"
        string   description;       // human-readable description
        string   zone;              // geographic zone, e.g. "Zurich Zone 110"
        string   imageURI;          // IPFS / HTTP link to NFT image
        uint64   durationSeconds;   // validity window after minting
        bytes32[] entitlementIds;   // keccak labels (encoded bytes32)
        uint256[] maxUnits;         // max uses per entitlement (0 = unlimited)
        bool     transferable;      // false → soulbound
        bool     active;            // can new passes still be minted?
    }

    /// @notice Reference to the UsageRegistry where entitlement balances live.
    IUsageRegistry public usageRegistry;

    /// @notice Address of the PassMarketplace contract authorized to mint
    address public marketplace;

    uint256 public nextPassTypeId = 1;
    uint256 public nextTokenId    = 1;

    mapping(uint256 => PassType) private _passTypes;

    /// @notice tokenId → passTypeId
    mapping(uint256 => uint256) public passTypeOfToken;

    /// @notice tokenId → activation timestamp
    mapping(uint256 => uint64) public validFrom;

    /// @notice tokenId → expiry timestamp
    mapping(uint256 => uint64) public validUntil;

    // ──────────────────────────────────────────────
    //  Events
    // ──────────────────────────────────────────────

    event UsageRegistryUpdated(address indexed newRegistry);
    event MarketplaceUpdated(address indexed newMarketplace);

    event PassTypeCreated(
        uint256 indexed passTypeId,
        string  name,
        string  zone,
        uint64  durationSeconds,
        bool    transferable
    );
    event PassTypeSuspended(uint256 indexed passTypeId);
    event PassTypeReactivated(uint256 indexed passTypeId);

    event PassMinted(
        uint256 indexed tokenId,
        address indexed to,
        uint256 indexed passTypeId,
        uint64  validFrom,
        uint64  validUntil
    );

    // ──────────────────────────────────────────────
    //  Constructor
    // ──────────────────────────────────────────────

    constructor(address initialOwner)
        ERC721("City Travel Pass", "CTP")
        Ownable(initialOwner)
    {}

    // ──────────────────────────────────────────────
    //  Admin – wiring
    // ──────────────────────────────────────────────

    /**
     * @notice Point this factory at a deployed UsageRegistry.
     *         Must be called before any mintPass().
     */
    function setUsageRegistry(address registry) external onlyOwner {
        require(registry != address(0), "Zero address");
        usageRegistry = IUsageRegistry(registry);
        emit UsageRegistryUpdated(registry);
    }

    /**
     * @notice Set the PassMarketplace contract address authorized to mint passes.
     */
    function setMarketplace(address marketplaceAddress) external onlyOwner {
        marketplace = marketplaceAddress;
        emit MarketplaceUpdated(marketplaceAddress);
    }

    // ──────────────────────────────────────────────
    //  Admin – pass-type management
    // ──────────────────────────────────────────────

    /**
     * @notice Define a new pass product.
     * @param name_            Display name.
     * @param description_     What the pass includes (free text).
     * @param zone_            Geographic zone string.
     * @param imageURI_        Link to NFT image (IPFS or HTTPS).
     * @param durationSeconds_ How long the pass is valid after minting.
     * @param transferable_    Whether the NFT can be transferred / resold.
     * @param entitlementIds_  Array of bytes32 labels.
     * @param maxUnits_        Corresponding max uses (0 = unlimited).
     */
    function createPassType(
        string   calldata name_,
        string   calldata description_,
        string   calldata zone_,
        string   calldata imageURI_,
        uint64   durationSeconds_,
        bool     transferable_,
        bytes32[] calldata entitlementIds_,
        uint256[] calldata maxUnits_
    ) external onlyOwner returns (uint256 passTypeId) {
        require(entitlementIds_.length == maxUnits_.length, "Length mismatch");
        require(durationSeconds_ > 0, "Duration must be > 0");
        require(bytes(name_).length > 0, "Empty name");

        passTypeId = nextPassTypeId++;

        PassType storage pt = _passTypes[passTypeId];
        pt.name            = name_;
        pt.description     = description_;
        pt.zone            = zone_;
        pt.imageURI        = imageURI_;
        pt.durationSeconds = durationSeconds_;
        pt.transferable    = transferable_;
        pt.active          = true;

        // Copy entitlement arrays into storage
        for (uint256 i = 0; i < entitlementIds_.length; i++) {
            pt.entitlementIds.push(entitlementIds_[i]);
            pt.maxUnits.push(maxUnits_[i]);
        }

        emit PassTypeCreated(
            passTypeId, name_, zone_, durationSeconds_, transferable_
        );
    }

    /**
     * @notice Suspend or reactivate a pass type.  Suspended types cannot be
    /**
     * @notice Suspend or reactivate a pass type.  Suspended types cannot be
     *         minted but existing passes remain valid.
     */
    function setPassTypeActive(uint256 passTypeId, bool active)
        external
        onlyOwner
    {
        require(_passTypes[passTypeId].durationSeconds != 0, "Unknown type");
        _passTypes[passTypeId].active = active;
        if (active) emit PassTypeReactivated(passTypeId);
        else        emit PassTypeSuspended(passTypeId);
    }

    // ──────────────────────────────────────────────
    //  Admin – minting
    // ──────────────────────────────────────────────

    /**
     * @notice Mint a new travel-pass NFT to `to` using `passTypeId`.
     *         Entitlements are initialised in the UsageRegistry automatically.
     *         Can be called by owner or authorized marketplace.
     */
    function mintPass(address to, uint256 passTypeId)
        external
        returns (uint256 tokenId)
    {
        require(
            msg.sender == owner() || msg.sender == marketplace,
            "Not authorized"
        );
        PassType storage pt = _passTypes[passTypeId];
        require(pt.active, "Inactive type");
        require(
            address(usageRegistry) != address(0),
            "UsageRegistry not set"
        );

        tokenId = nextTokenId++;
        _safeMint(to, tokenId);
        passTypeOfToken[tokenId] = passTypeId;

        uint64 start = uint64(block.timestamp);
        uint64 end   = start + pt.durationSeconds;
        validFrom[tokenId]  = start;
        validUntil[tokenId] = end;

        // Delegate entitlement storage to UsageRegistry
        usageRegistry.initEntitlements(
            tokenId,
            pt.entitlementIds,
            pt.maxUnits
        );

        emit PassMinted(tokenId, to, passTypeId, start, end);
    }

    // ──────────────────────────────────────────────
    //  View functions
    // ──────────────────────────────────────────────

    /**
     * @notice Full pass-type definition (for admin/UI).
     */
    function getPassType(uint256 passTypeId)
        external
        view
        returns (
            string   memory name_,
            string   memory description_,
            string   memory zone_,
            string   memory imageURI_,
            uint64   durationSeconds_,
            bool     transferable_,
            bool     active_,
            bytes32[] memory entitlementIds_,
            uint256[] memory maxUnits_
        )
    {
        PassType storage pt = _passTypes[passTypeId];
        require(pt.durationSeconds != 0, "Unknown type");
        return (
            pt.name,
            pt.description,
            pt.zone,
            pt.imageURI,
            pt.durationSeconds,
            pt.transferable,
            pt.active,
            pt.entitlementIds,
            pt.maxUnits
        );
    }

    /**
     * @notice Token-level info (pass type, validity window, zone).
     */
    function getPassInfo(uint256 tokenId)
        external
        view
        returns (
            uint256 passTypeId,
            uint64  validFrom_,
            uint64  validUntil_,
            string memory zone_
        )
    {
        require(_ownerOf(tokenId) != address(0), "Invalid token");
        passTypeId  = passTypeOfToken[tokenId];
        validFrom_  = validFrom[tokenId];
        validUntil_ = validUntil[tokenId];
        zone_       = _passTypes[passTypeId].zone;
    }

    /**
     * @notice Whether a pass token is currently within its validity window.
     */
    function isPassValid(uint256 tokenId)
        external
        view
        returns (bool)
    {
        if (_ownerOf(tokenId) == address(0)) return false;
        return
            block.timestamp >= validFrom[tokenId] &&
            block.timestamp <= validUntil[tokenId];
    }

    /**
     * @notice Return the entitlement IDs and max-unit arrays for a pass type.
     */
    function getPassTypeEntitlements(uint256 passTypeId)
        external
        view
        returns (bytes32[] memory, uint256[] memory)
    {
        PassType storage pt = _passTypes[passTypeId];
        require(pt.durationSeconds != 0, "Unknown type");
        return (pt.entitlementIds, pt.maxUnits);
    }

    // ──────────────────────────────────────────────
    //  Transfer control (soulbound support)
    // ──────────────────────────────────────────────

    /**
     * @dev Override the ERC-721 _update hook.  If the pass type is marked
     *      non-transferable, block all transfers except mint (from == 0) and
     *      burn (to == 0).
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);

        // Allow minting and burning; block transfers for soulbound passes
        if (from != address(0) && to != address(0)) {
            uint256 ptId = passTypeOfToken[tokenId];
            require(
                _passTypes[ptId].transferable,
                "Non-transferable pass"
            );
        }

        return super._update(to, tokenId, auth);
    }

    /**
     * @notice Returns dynamically generated metadata JSON as a base64-encoded data URI.
     *         The metadata includes name, description, image, and attributes from on-chain data.
     */
    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        require(_ownerOf(tokenId) != address(0), "Invalid token");
        uint256 ptId = passTypeOfToken[tokenId];
        PassType storage pt = _passTypes[ptId];

        // Build JSON metadata dynamically
        string memory json = string(
            abi.encodePacked(
                '{',
                '"name":"', pt.name, '",',
                '"description":"', pt.description, '",',
                '"image":"', pt.imageURI, '",',
                '"attributes":[',
                    '{"trait_type":"Zone","value":"', pt.zone, '"},',
                    '{"trait_type":"Duration","value":"', Strings.toString(pt.durationSeconds / 3600), ' hours"},',
                    '{"trait_type":"Valid From","display_type":"date","value":', Strings.toString(validFrom[tokenId]), '},',
                    '{"trait_type":"Valid Until","display_type":"date","value":', Strings.toString(validUntil[tokenId]), '},',
                    '{"trait_type":"Transferable","value":"', pt.transferable ? 'Yes' : 'No', '"},',
                    '{"trait_type":"Token ID","value":', Strings.toString(tokenId), '}',
                ']',
                '}'
            )
        );

        // Encode as base64 data URI
        return string(
            abi.encodePacked(
                "data:application/json;base64,",
                Base64.encode(bytes(json))
            )
        );
    }
}

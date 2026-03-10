// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IProviderRegistry.sol";
import "./interfaces/IPassFactory.sol";

/**
 * @title UsageRegistry
 * @notice Tracks the consumption of entitlements for every travel-pass NFT.
 *
 *         When a pass is minted by PassFactory, initEntitlements() is called to
 *         store the initial balances.  Authorized providers (verified via
 *         ProviderRegistry) then call consumeEntitlement() whenever the
 *         traveler uses a service (bus ride, bike unlock, museum entry, etc.).
 *
 *         A full on-chain usage log is maintained per token so that off-chain
 *         analytics and auditing tools can reconstruct the history.
 *
 *         "Unlimited" entitlements are represented by a maxUnits value of 0.
 *         They can be consumed any number of times without decrementing.
 */
contract UsageRegistry is Ownable {
    // ──────────────────────────────────────────────
    //  Data structures
    // ──────────────────────────────────────────────

    struct UsageEntry {
        uint64  timestamp;       // block.timestamp of consumption
        bytes32 entitlementId;   // which entitlement was used
        uint256 amount;          // how many units consumed
        address provider;        // who consumed it
    }

    /// @notice Reference contracts
    IPassFactory       public passFactory;
    IProviderRegistry  public providerRegistry;

    /// @notice tokenId → entitlementId → initial max units (0 = unlimited)
    mapping(uint256 => mapping(bytes32 => uint256)) private _maxUnits;

    /// @notice tokenId → entitlementId → remaining units
    mapping(uint256 => mapping(bytes32 => uint256)) private _remainingUnits;

    /// @notice tokenId → entitlementId → exists in this token
    mapping(uint256 => mapping(bytes32 => bool))    private _hasEntitlement;

    /// @notice tokenId → ordered list of entitlement IDs (for enumeration)
    mapping(uint256 => bytes32[]) private _tokenEntitlementIds;

    /// @notice tokenId → chronological usage log
    mapping(uint256 => UsageEntry[]) private _usageLogs;

    // ──────────────────────────────────────────────
    //  Events
    // ──────────────────────────────────────────────

    event PassFactoryUpdated(address indexed newFactory);
    event ProviderRegistryUpdated(address indexed newRegistry);

    event EntitlementsInitialized(
        uint256 indexed tokenId,
        uint256 entitlementCount
    );

    event EntitlementConsumed(
        uint256 indexed tokenId,
        bytes32 indexed entitlementId,
        address indexed provider,
        uint256 amount,
        uint256 remaining
    );

    // ──────────────────────────────────────────────
    //  Constructor
    // ──────────────────────────────────────────────

    constructor(address initialOwner) Ownable(initialOwner) {}

    // ──────────────────────────────────────────────
    //  Modifiers
    // ──────────────────────────────────────────────

    modifier onlyPassFactory() {
        require(
            msg.sender == address(passFactory),
            "Only PassFactory"
        );
        _;
    }

    modifier onlyAuthorizedProvider() {
        require(
            address(providerRegistry) != address(0),
            "ProviderRegistry not set"
        );
        require(
            providerRegistry.isAuthorized(msg.sender),
            "Not authorized provider"
        );
        _;
    }

    // ──────────────────────────────────────────────
    //  Admin – wiring
    // ──────────────────────────────────────────────

    function setPassFactory(address factory) external onlyOwner {
        require(factory != address(0), "Zero address");
        passFactory = IPassFactory(factory);
        emit PassFactoryUpdated(factory);
    }

    function setProviderRegistry(address registry) external onlyOwner {
        require(registry != address(0), "Zero address");
        providerRegistry = IProviderRegistry(registry);
        emit ProviderRegistryUpdated(registry);
    }

    // ──────────────────────────────────────────────
    //  Initialization (called by PassFactory on mint)
    // ──────────────────────────────────────────────

    /**
     * @notice Store entitlement balances for a freshly minted token.
     *         Can only be called once per tokenId and only by PassFactory.
     */
    function initEntitlements(
        uint256   tokenId,
        bytes32[] calldata entitlementIds,
        uint256[] calldata maxUnits
    ) external onlyPassFactory {
        require(
            entitlementIds.length == maxUnits.length,
            "Length mismatch"
        );
        require(
            _tokenEntitlementIds[tokenId].length == 0,
            "Already initialized"
        );

        for (uint256 i = 0; i < entitlementIds.length; i++) {
            bytes32 eid = entitlementIds[i];
            _tokenEntitlementIds[tokenId].push(eid);
            _maxUnits[tokenId][eid]       = maxUnits[i];
            _remainingUnits[tokenId][eid] = maxUnits[i];
            _hasEntitlement[tokenId][eid] = true;
        }

        emit EntitlementsInitialized(tokenId, entitlementIds.length);
    }

    // ──────────────────────────────────────────────
    //  Provider – consumption
    // ──────────────────────────────────────────────

    /**
     * @notice Consume `amount` units of `entitlementId` from token `tokenId`.
     *
     *         Requirements:
     *         - Caller is an authorized provider.
     *         - Pass is still valid (not expired).
     *         - The entitlement exists on this token.
     *         - Enough units remain (or entitlement is unlimited).
     *
     *         For unlimited entitlements (maxUnits == 0) the remaining counter
     *         stays at 0 and the call always succeeds.
     */
    function consumeEntitlement(
        uint256 tokenId,
        bytes32 entitlementId,
        uint256 amount
    ) external onlyAuthorizedProvider {
        require(amount > 0, "Amount must be > 0");
        require(
            passFactory.isPassValid(tokenId),
            "Pass invalid or expired"
        );
        require(
            _hasEntitlement[tokenId][entitlementId],
            "Entitlement not in pass"
        );

        uint256 maxU = _maxUnits[tokenId][entitlementId];

        if (maxU != 0) {
            // Limited entitlement – decrement
            uint256 remaining = _remainingUnits[tokenId][entitlementId];
            require(remaining >= amount, "Not enough units");
            _remainingUnits[tokenId][entitlementId] = remaining - amount;
        }
        // Unlimited (maxU == 0): remaining stays 0, always accepted

        uint256 newRemaining = _remainingUnits[tokenId][entitlementId];

        // Append to the on-chain usage log
        _usageLogs[tokenId].push(
            UsageEntry({
                timestamp:     uint64(block.timestamp),
                entitlementId: entitlementId,
                amount:        amount,
                provider:      msg.sender
            })
        );

        emit EntitlementConsumed(
            tokenId,
            entitlementId,
            msg.sender,
            amount,
            newRemaining
        );
    }

    // ──────────────────────────────────────────────
    //  View functions
    // ──────────────────────────────────────────────

    /// @notice Remaining units for one entitlement on a token.
    function getRemainingUnits(
        uint256 tokenId,
        bytes32 entitlementId
    ) external view returns (uint256) {
        return _remainingUnits[tokenId][entitlementId];
    }

    /// @notice Initial max units for one entitlement (0 = unlimited).
    function getMaxUnits(
        uint256 tokenId,
        bytes32 entitlementId
    ) external view returns (uint256) {
        return _maxUnits[tokenId][entitlementId];
    }

    /**
     * @notice All entitlements for a token with their max and remaining values.
     */
    function getAllRemainingUnits(uint256 tokenId)
        external
        view
        returns (
            bytes32[] memory entitlementIds_,
            uint256[] memory max_,
            uint256[] memory remaining_
        )
    {
        entitlementIds_ = _tokenEntitlementIds[tokenId];
        uint256 len = entitlementIds_.length;

        max_       = new uint256[](len);
        remaining_ = new uint256[](len);

        for (uint256 i = 0; i < len; i++) {
            bytes32 eid  = entitlementIds_[i];
            max_[i]       = _maxUnits[tokenId][eid];
            remaining_[i] = _remainingUnits[tokenId][eid];
        }
    }

    /// @notice Number of usage-log entries for a token.
    function getUsageLogCount(uint256 tokenId)
        external
        view
        returns (uint256)
    {
        return _usageLogs[tokenId].length;
    }

    /**
     * @notice Paginated access to the usage log.
     * @param tokenId  The pass token.
     * @param offset   Start index (0-based).
     * @param limit    Maximum entries to return.
     */
    function getUsageLog(
        uint256 tokenId,
        uint256 offset,
        uint256 limit
    ) external view returns (UsageEntry[] memory entries) {
        UsageEntry[] storage log = _usageLogs[tokenId];
        uint256 total = log.length;

        if (offset >= total) return new UsageEntry[](0);

        uint256 end = offset + limit;
        if (end > total) end = total;
        uint256 count = end - offset;

        entries = new UsageEntry[](count);
        for (uint256 i = 0; i < count; i++) {
            entries[i] = log[offset + i];
        }
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ProviderRegistry
 * @notice Maintains a registry of authorized service providers (bus operators,
 *         bike-sharing companies, museums, etc.) that are allowed to consume
 *         entitlements from travel-pass NFTs.
 *
 *         Only the contract owner (city authority / admin) can register or
 *         revoke providers.  The UsageRegistry queries this contract via the
 *         IProviderRegistry interface to gate access to consumeEntitlement().
 */
contract ProviderRegistry is Ownable {
    // ──────────────────────────────────────────────
    //  Data structures
    // ──────────────────────────────────────────────

    struct Provider {
        string  name;           // Human-readable name, e.g. "Zurich Bikes AG"
        string  serviceType;    // Category: "bus", "bike", "museum", "train" …
        bool    active;         // Whether the provider can currently consume
        uint256 registeredAt;   // Block timestamp of first registration
    }

    /// @dev provider address → Provider struct
    mapping(address => Provider) private _providers;

    /// @dev ordered list of all provider addresses ever registered
    address[] private _providerList;

    // ──────────────────────────────────────────────
    //  Events
    // ──────────────────────────────────────────────

    event ProviderRegistered(
        address indexed provider,
        string  name,
        string  serviceType
    );
    event ProviderRevoked(address indexed provider);
    event ProviderReactivated(address indexed provider);

    // ──────────────────────────────────────────────
    //  Constructor
    // ──────────────────────────────────────────────

    constructor(address initialOwner) Ownable(initialOwner) {}

    // ──────────────────────────────────────────────
    //  Admin functions
    // ──────────────────────────────────────────────

    /**
     * @notice Register a new provider or update an inactive one.
     * @param provider  Ethereum address of the provider's hot wallet.
     * @param name      Human-readable display name.
     * @param serviceType  Service category string.
     */
    function registerProvider(
        address provider,
        string calldata name,
        string calldata serviceType
    ) external onlyOwner {
        require(provider != address(0), "Zero address");
        require(bytes(name).length > 0, "Empty name");

        // First-time registration → append to the enumeration list
        if (_providers[provider].registeredAt == 0) {
            _providerList.push(provider);
        }

        _providers[provider] = Provider({
            name: name,
            serviceType: serviceType,
            active: true,
            registeredAt: block.timestamp
        });

        emit ProviderRegistered(provider, name, serviceType);
    }

    /**
     * @notice Revoke an active provider (they can no longer consume
     *         entitlements until reactivated).
     */
    function revokeProvider(address provider) external onlyOwner {
        require(_providers[provider].active, "Not active");
        _providers[provider].active = false;
        emit ProviderRevoked(provider);
    }

    /**
     * @notice Re-enable a previously revoked provider.
     */
    function reactivateProvider(address provider) external onlyOwner {
        require(_providers[provider].registeredAt > 0, "Not registered");
        require(!_providers[provider].active, "Already active");
        _providers[provider].active = true;
        emit ProviderReactivated(provider);
    }

    // ──────────────────────────────────────────────
    //  View functions
    // ──────────────────────────────────────────────

    /// @notice Returns true if the address is an active, authorized provider.
    function isAuthorized(address provider) external view returns (bool) {
        return _providers[provider].active;
    }

    /// @notice Full provider details.
    function getProvider(address provider)
        external
        view
        returns (
            string memory name,
            string memory serviceType,
            bool    active,
            uint256 registeredAt
        )
    {
        Provider storage p = _providers[provider];
        return (p.name, p.serviceType, p.active, p.registeredAt);
    }

    /// @notice Total number of unique provider addresses ever registered.
    function getProviderCount() external view returns (uint256) {
        return _providerList.length;
    }

    /// @notice Provider address at a given index (for off-chain enumeration).
    function getProviderAt(uint256 index) external view returns (address) {
        require(index < _providerList.length, "Index out of bounds");
        return _providerList[index];
    }
}

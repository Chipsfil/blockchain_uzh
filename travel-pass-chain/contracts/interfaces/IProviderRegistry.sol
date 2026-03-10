// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/**
 * @title IProviderRegistry
 * @notice Interface for the ProviderRegistry contract, used by UsageRegistry
 *         to verify that a caller is an authorized service provider.
 */
interface IProviderRegistry {
    function isAuthorized(address provider) external view returns (bool);

    function getProvider(address provider)
        external
        view
        returns (
            string memory name,
            string memory serviceType,
            bool active,
            uint256 registeredAt
        );
}

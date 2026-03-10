// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/**
 * @title IUsageRegistry
 * @notice Interface for the UsageRegistry contract, called by PassFactory
 *         when a new pass is minted to initialize its entitlements.
 */
interface IUsageRegistry {
    function initEntitlements(
        uint256 tokenId,
        bytes32[] calldata entitlementIds,
        uint256[] calldata maxUnits
    ) external;
}

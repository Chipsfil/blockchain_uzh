// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/**
 * @title IPassFactory
 * @notice Interface for the PassFactory (ERC-721) contract, used by
 *         UsageRegistry to check token validity and ownership.
 */
interface IPassFactory {
    function ownerOf(uint256 tokenId) external view returns (address);

    function isPassValid(uint256 tokenId) external view returns (bool);

    function getPassInfo(uint256 tokenId)
        external
        view
        returns (
            uint256 passTypeId,
            uint64  validFrom_,
            uint64  validUntil_,
            string memory zone_
        );

    function passTypeOfToken(uint256 tokenId) external view returns (uint256);

    function mintPass(address to, uint256 passTypeId) external returns (uint256);

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
        );
}

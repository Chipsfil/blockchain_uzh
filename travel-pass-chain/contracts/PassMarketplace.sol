// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IPassFactory.sol";

/**
 * @title PassMarketplace
 * @notice Allows travelers to purchase travel passes with ETH.
 *         When a traveler buys a pass, the marketplace calls PassFactory.mintPass()
 *         on behalf of the buyer and forwards the payment to the contract owner (admin).
 *
 *         The admin can set prices for each pass type and activate/deactivate sales.
 */
contract PassMarketplace is Ownable, ReentrancyGuard {
    // ──────────────────────────────────────────────
    //  State Variables
    // ──────────────────────────────────────────────

    /// @notice Reference to the PassFactory contract
    IPassFactory public passFactory;

    /// @notice Mapping from passTypeId to price in wei
    mapping(uint256 => uint256) public passPrices;

    /// @notice Mapping from passTypeId to whether it's available for sale
    mapping(uint256 => bool) public passAvailableForSale;

    /// @notice Total revenue collected
    uint256 public totalRevenue;

    // ──────────────────────────────────────────────
    //  Events
    // ──────────────────────────────────────────────

    event PassFactoryUpdated(address indexed newFactory);
    event PassPriceSet(uint256 indexed passTypeId, uint256 price);
    event PassSaleStatusChanged(uint256 indexed passTypeId, bool available);
    event PassPurchased(
        address indexed buyer,
        uint256 indexed tokenId,
        uint256 indexed passTypeId,
        uint256 price
    );
    event RevenueWithdrawn(address indexed to, uint256 amount);

    // ──────────────────────────────────────────────
    //  Constructor
    // ──────────────────────────────────────────────

    constructor(address initialOwner, address passFactoryAddress)
        Ownable(initialOwner)
    {
        require(passFactoryAddress != address(0), "Zero address");
        passFactory = IPassFactory(passFactoryAddress);
        emit PassFactoryUpdated(passFactoryAddress);
    }

    // ──────────────────────────────────────────────
    //  Admin Functions
    // ──────────────────────────────────────────────

    /**
     * @notice Update the PassFactory contract address
     * @param newFactory Address of the new PassFactory
     */
    function setPassFactory(address newFactory) external onlyOwner {
        require(newFactory != address(0), "Zero address");
        passFactory = IPassFactory(newFactory);
        emit PassFactoryUpdated(newFactory);
    }

    /**
     * @notice Set the price for a specific pass type
     * @param passTypeId The ID of the pass type
     * @param price Price in wei (use 0 to make it free)
     */
    function setPassPrice(uint256 passTypeId, uint256 price) external onlyOwner {
        passPrices[passTypeId] = price;
        emit PassPriceSet(passTypeId, price);
    }

    /**
     * @notice Set whether a pass type is available for sale
     * @param passTypeId The ID of the pass type
     * @param available True to enable sales, false to disable
     */
    function setPassAvailability(uint256 passTypeId, bool available) external onlyOwner {
        passAvailableForSale[passTypeId] = available;
        emit PassSaleStatusChanged(passTypeId, available);
    }

    /**
     * @notice Withdraw collected revenue to owner
     */
    function withdrawRevenue() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No revenue to withdraw");
        
        totalRevenue = 0;
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Transfer failed");
        
        emit RevenueWithdrawn(owner(), balance);
    }

    // ──────────────────────────────────────────────
    //  Public Functions
    // ──────────────────────────────────────────────

    /**
     * @notice Purchase a travel pass of a specific type
     * @param passTypeId The ID of the pass type to purchase
     * @return tokenId The ID of the newly minted pass NFT
     */
    function purchasePass(uint256 passTypeId) 
        external 
        payable 
        nonReentrant 
        returns (uint256 tokenId) 
    {
        // Check if pass type is available for sale
        require(passAvailableForSale[passTypeId], "Pass not available");
        
        // Check if correct payment amount
        uint256 price = passPrices[passTypeId];
        require(msg.value >= price, "Insufficient payment");
        
        // Mint the pass to the buyer
        tokenId = passFactory.mintPass(msg.sender, passTypeId);
        
        // Track revenue
        totalRevenue += msg.value;
        
        emit PassPurchased(msg.sender, tokenId, passTypeId, msg.value);
        
        // Refund excess payment
        if (msg.value > price) {
            uint256 refund = msg.value - price;
            (bool success, ) = payable(msg.sender).call{value: refund}("");
            require(success, "Refund failed");
        }
    }

    /**
     * @notice Get information about a pass type for sale
     * @param passTypeId The ID of the pass type
     * @return price The price in wei
     * @return available Whether it's available for sale
     */
    function getPassSaleInfo(uint256 passTypeId) 
        external 
        view 
        returns (uint256 price, bool available) 
    {
        return (passPrices[passTypeId], passAvailableForSale[passTypeId]);
    }

    /**
     * @notice Receive function to accept ETH
     */
    receive() external payable {
        totalRevenue += msg.value;
    }
}

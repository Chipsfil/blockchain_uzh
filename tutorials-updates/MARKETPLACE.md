# Travel Pass Marketplace Guide

This guide explains how to deploy and use the PassMarketplace contract, which enables travelers to purchase travel passes directly with ETH.

## Overview

The marketplace system consists of these components:

1. **PassMarketplace Contract**: Handles pass sales and payments
2. **Shop UI**: User-friendly interface for browsing and buying passes
3. **Admin Tools**: Scripts to configure prices and availability

## Architecture

```
Traveler → PassMarketplace (pays ETH) → PassFactory (mints NFT) → Traveler receives Pass
                ↓
          Admin Wallet (receives ETH)
```

## Deployment Steps

### 1. Compile Contracts

First, ensure all contracts are compiled:

```bash
cd travel-pass-chain
npx hardhat compile
```

### 2. Deploy All Contracts

Run the deployment script to deploy all four contracts:

```bash
npx ts-node --esm scripts/deploy.ts
```

This will deploy:
- ProviderRegistry
- PassFactory
- UsageRegistry
- **PassMarketplace** (new!)

The script will output contract addresses. Copy the **PASS_MARKETPLACE_ADDRESS**.

### 3. Update UI Configuration

Open `travel-pass-ui/src/config.ts` and update the addresses:

```typescript
export const PROVIDER_REGISTRY_ADDRESS = "0x...";
export const PASS_FACTORY_ADDRESS      = "0x...";
export const USAGE_REGISTRY_ADDRESS    = "0x...";
export const PASS_MARKETPLACE_ADDRESS  = "0x..."; // Add this line with your deployed address
```

### 4. Copy Contract ABIs

After compilation, copy the PassMarketplace ABI to the UI:

```bash
cp travel-pass-chain/artifacts/contracts/PassMarketplace.sol/PassMarketplace.json \
   travel-pass-ui/src/abi/PassMarketplace.json
```

Also update the other ABIs if they changed:

```bash
cp travel-pass-chain/artifacts/contracts/PassFactory.sol/PassFactory.json \
   travel-pass-ui/src/abi/PassFactory.json
   
cp travel-pass-chain/artifacts/contracts/ProviderRegistry.sol/ProviderRegistry.json \
   travel-pass-ui/src/abi/ProviderRegistry.json
   
cp travel-pass-chain/artifacts/contracts/UsageRegistry.sol/UsageRegistry.json \
   travel-pass-ui/src/abi/UsageRegistry.json
```

## Marketplace Configuration

### 5. Create Pass Types (Admin Only)

Use the Admin panel in the UI to create pass types before configuring the marketplace.

Example pass type:
- **Name**: "City Pass 24h"
- **Zone**: "Zone 110"
- **Duration**: 86400 seconds (24 hours)
- **Entitlements**: Bus (unlimited), Metro (unlimited)

### 6. Set Prices and Availability

Edit `scripts/setup-marketplace.ts` and configure your pass types:

```typescript
const MARKETPLACE_ADDRESS = "0x..."; // Your deployed marketplace address

const PASS_SALES_CONFIG = [
  { passTypeId: 1, priceInEth: "0.001", available: true },
  { passTypeId: 2, priceInEth: "0.002", available: true },
];
```

Then run the configuration script:

```bash
npx ts-node --esm scripts/setup-marketplace.ts
```

## Using the Shop

### For Travelers

1. **Visit the Shop**: Open the UI and click the "🛒 Shop" tab
2. **Connect Wallet**: Connect your MetaMask or other Web3 wallet
3. **Browse Passes**: View available passes with prices and features
4. **Purchase**: Click "Buy Now" on any pass and confirm the transaction
5. **Receive Token ID**: After purchase, save your Token ID
6. **View Pass**: Go to the "Traveler" tab to load and use your pass

### For Admins

Admins can manage the marketplace through the contract directly or by calling:

**Set Price:**
```javascript
await marketplace.setPassPrice(passTypeId, priceInWei);
```

**Enable/Disable Sales:**
```javascript
await marketplace.setPassAvailability(passTypeId, true/false);
```

**Withdraw Revenue:**
```javascript
await marketplace.withdrawRevenue();
```

## Key Features

### ✅ What's New

- **Self-Service Purchasing**: Travelers can buy passes without admin intervention
- **Automatic Minting**: Passes are minted immediately upon purchase
- **Price Management**: Flexible pricing per pass type
- **Revenue Tracking**: Admin can track and withdraw collected funds
- **User-Friendly Shop**: Beautiful shopping interface for browsing passes

### 🔐 Security Features

- **Owner-Only Admin**: Only contract owner can set prices and withdraw funds
- **ReentrancyGuard**: Protection against reentrancy attacks
- **Excess Refund**: Overpayments are automatically refunded
- **Authorization**: Marketplace must be authorized by PassFactory to mint

## Testing the System

### Quick Test Flow

1. **Admin**: Create a pass type (e.g., "Test Pass 1 hour")
2. **Admin**: Configure marketplace with price (e.g., 0.001 ETH)
3. **Traveler**: Go to Shop tab
4. **Traveler**: Connect wallet with test ETH
5. **Traveler**: Purchase the pass
6. **Traveler**: Note the Token ID from the confirmation
7. **Traveler**: Go to Traveler tab and load the token ID
8. **Provider**: Scan and validate the pass
9. **Admin**: Withdraw collected revenue

## Common Issues

### "Marketplace not deployed yet" in console

**Solution**: Update `PASS_MARKETPLACE_ADDRESS` in `travel-pass-ui/src/config.ts`

### "Not authorized" error when purchasing

**Solution**: Ensure `PassFactory.setMarketplace()` was called during deployment. Re-run deployment script.

### No passes showing in shop

**Solution**: 
1. Create pass types using Admin panel
2. Run `setup-marketplace.ts` script to enable sales
3. Refresh the Shop page

### Transaction fails with "Insufficient payment"

**Solution**: Ensure you're sending enough ETH. Check the displayed price and your wallet balance.

## Smart Contract Reference

### PassMarketplace.sol

**Admin Functions:**
- `setPassPrice(uint256 passTypeId, uint256 price)` - Set price for a pass type
- `setPassAvailability(uint256 passTypeId, bool available)` - Enable/disable sales
- `withdrawRevenue()` - Withdraw collected ETH to owner
- `setPassFactory(address newFactory)` - Update PassFactory address

**Public Functions:**
- `purchasePass(uint256 passTypeId) payable` - Buy a pass
- `getPassSaleInfo(uint256 passTypeId)` - Get price and availability

**Events:**
- `PassPurchased(buyer, tokenId, passTypeId, price)` - Emitted on successful purchase
- `PassPriceSet(passTypeId, price)` - Emitted when price is updated
- `PassSaleStatusChanged(passTypeId, available)` - Emitted when availability changes

## Next Steps

- Set up automated price updates based on demand
- Add discount codes or promotional pricing
- Implement batch purchases for multiple passes
- Add payment in ERC20 tokens (e.g., USDC)
- Create analytics dashboard for sales data

## Support

For issues or questions:
1. Check the console for error messages
2. Verify all contract addresses are correct
3. Ensure wallet is connected to Sepolia testnet
4. Check that contracts are properly wired (deployment logs)

---

Happy selling! 🎫✨

# 🚀 Quick Deployment Guide

## Prerequisites
- Node.js installed
- MetaMask with Sepolia testnet ETH
- `.env` configured in `travel-pass-chain/` with:
  - `SEPOLIA_RPC_URL`
  - `PRIVATE_KEY`

## Step-by-Step Deployment

### 1️⃣ Deploy Smart Contracts

```bash
cd travel-pass-chain

# Compile all contracts
npx hardhat compile

# Deploy to Sepolia
npx ts-node --esm scripts/deploy.ts
```

**Save the output!** You'll see:
```
ProviderRegistry deployed at: 0x...
PassFactory      deployed at: 0x...
UsageRegistry    deployed at: 0x...
PassMarketplace  deployed at: 0x...  ← Copy this!
```

### 2️⃣ Update UI Configuration

Edit `travel-pass-ui/src/config.ts`:

```typescript
export const PROVIDER_REGISTRY_ADDRESS = "0x1783F575e2D300b06286797D68e6BF4e4fb48A9a";
export const PASS_FACTORY_ADDRESS      = "0x0a2198093025D755C84C2e1Bb58Ad78e4D7a9c7A";
export const USAGE_REGISTRY_ADDRESS    = "0x3f57eBbfcb30AB69Cd05d0b207f22903B8F799d2";
export const PASS_MARKETPLACE_ADDRESS  = "0x..."; // ← Paste marketplace address here
```

### 3️⃣ Create Pass Types (Admin UI)

```bash
cd travel-pass-ui
npm install  # if not done yet
npm run dev
```

1. Open browser to `http://localhost:5173`
2. Connect your admin wallet
3. Go to "Administration" tab
4. Create pass types:
   - **Example 1**: "City Pass 24h" - Zone 110 - 86400 seconds
   - **Example 2**: "Weekly Pass" - Zone 110 - 604800 seconds

### 4️⃣ Configure Marketplace Prices

Edit `travel-pass-chain/scripts/setup-marketplace.ts`:

```typescript
const MARKETPLACE_ADDRESS = "0x..."; // Your deployed marketplace address

const PASS_SALES_CONFIG = [
  { passTypeId: 1, priceInEth: "0.001", available: true },  // City Pass 24h
  { passTypeId: 2, priceInEth: "0.005", available: true },  // Weekly Pass
];
```

Run the configuration:

```bash
cd travel-pass-chain
npx ts-node --esm scripts/setup-marketplace.ts
```

### 5️⃣ Test the Shop! 🛒

1. Open UI at `http://localhost:5173`
2. Click "🛒 Shop" tab
3. Connect a **different wallet** (traveler account)
4. Browse available passes
5. Click "Buy Now" on any pass
6. Confirm transaction in MetaMask
7. **Save the Token ID** from the confirmation popup
8. Go to "Traveler" tab and enter your token ID

## 🎉 You're Done!

Your marketplace is live! Travelers can now:
- Browse passes in the Shop
- Purchase with ETH
- Receive NFTs instantly
- Use passes with providers

## 📋 Common Tasks

### Add New Pass Type
1. Admin panel → Create Pass Type
2. Run setup script to configure price
3. Pass appears in shop automatically

### Change Price
```bash
# Edit setup-marketplace.ts
# Update priceInEth for the pass type
# Run setup script again
```

### Disable Sales
```bash
# Edit setup-marketplace.ts
# Set available: false
# Run setup script again
```

### Withdraw Revenue
Use the Admin panel or call:
```javascript
await marketplace.withdrawRevenue();
```

## 🆘 Troubleshooting

**"Marketplace not deployed yet"**
→ Update `PASS_MARKETPLACE_ADDRESS` in `config.ts`

**No passes in shop**
→ Create pass types in Admin panel
→ Run setup-marketplace script

**Purchase fails**
→ Check wallet has enough ETH
→ Verify pass type is available

**Invalid token ID**
→ Use the exact token ID from purchase confirmation
→ Check in Traveler tab, not Shop

## 📚 Full Documentation

See `MARKETPLACE.md` for complete details.

---

**Happy selling!** 🎫✨

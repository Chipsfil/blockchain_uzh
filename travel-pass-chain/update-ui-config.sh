#!/bin/bash

# Helper script to update UI config after deployment
# Usage: ./update-ui-config.sh

echo "📝 Updating UI Configuration..."
echo ""

# Check if we're in the right directory
if [ ! -f "scripts/deploy.ts" ]; then
    echo "❌ Error: Please run this script from the travel-pass-chain directory"
    exit 1
fi

# Prompt for contract addresses
echo "Enter the deployed contract addresses:"
echo ""

read -p "PROVIDER_REGISTRY_ADDRESS: " PROVIDER_REGISTRY
read -p "PASS_FACTORY_ADDRESS: " PASS_FACTORY
read -p "USAGE_REGISTRY_ADDRESS: " USAGE_REGISTRY
read -p "PASS_MARKETPLACE_ADDRESS: " MARKETPLACE

# Path to config file
CONFIG_FILE="../travel-pass-ui/src/config.ts"

# Update config file
cat > "$CONFIG_FILE" << EOF
// ── Contract addresses (paste output of scripts/deploy.ts) ──
export const PROVIDER_REGISTRY_ADDRESS = "$PROVIDER_REGISTRY";
export const PASS_FACTORY_ADDRESS      = "$PASS_FACTORY";
export const USAGE_REGISTRY_ADDRESS    = "$USAGE_REGISTRY";
export const PASS_MARKETPLACE_ADDRESS  = "$MARKETPLACE";

export const TARGET_CHAIN_ID = 11155111; // Sepolia
EOF

echo ""
echo "✅ Config updated successfully!"
echo ""
echo "Updated file: $CONFIG_FILE"
echo ""
echo "Next steps:"
echo "1. Run: npx ts-node --esm scripts/setup-marketplace.ts"
echo "2. Start UI: cd ../travel-pass-ui && npm run dev"

// scripts/setup-marketplace.ts
//
// Helper script to configure the PassMarketplace after deployment:
//   - Set prices for pass types
//   - Enable/disable pass types for sale
//
// Usage:
//   npx ts-node --esm scripts/setup-marketplace.ts

import { ethers } from "ethers";
import * as dotenv from "dotenv";
import * as fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PassMarketplaceArtifact = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../artifacts/contracts/PassMarketplace.sol/PassMarketplace.json"),
    "utf-8"
  )
);

dotenv.config();

const { SEPOLIA_RPC_URL, PRIVATE_KEY } = process.env;

// ── CONFIGURATION ──
// Update these values to match your deployed contracts
const MARKETPLACE_ADDRESS = "0xBE5734F6c5d00EA53D8EF1df574A2D80033cf59D"; // Paste your deployed marketplace address here

// Define which pass types to sell and at what price (in ETH)
const PASS_SALES_CONFIG = [
  { passTypeId: 5, priceInEth: "0.001", available: true },  // Example: 0.001 ETH
  // { passTypeId: 2, priceInEth: "0.002", available: true },  // Example: 0.002 ETH
  // Add more pass types as needed
];

async function main() {
  if (!SEPOLIA_RPC_URL || !PRIVATE_KEY) {
    throw new Error("SEPOLIA_RPC_URL or PRIVATE_KEY missing in .env");
  }

  if (!MARKETPLACE_ADDRESS) {
    throw new Error("Please set MARKETPLACE_ADDRESS in this script");
  }

  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log("Configuring PassMarketplace with:", wallet.address);
  console.log("Marketplace address:", MARKETPLACE_ADDRESS);
  console.log("─".repeat(50));

  const marketplace = new ethers.Contract(
    MARKETPLACE_ADDRESS,
    PassMarketplaceArtifact.abi,
    wallet
  );

  for (const config of PASS_SALES_CONFIG) {
    console.log(`\nConfiguring Pass Type #${config.passTypeId}:`);
    
    // Set price
    const priceInWei = ethers.parseEther(config.priceInEth);
    console.log(`  Setting price to ${config.priceInEth} ETH...`);
    let tx = await marketplace.setPassPrice(config.passTypeId, priceInWei);
    await tx.wait();
    console.log(`  ✓ Price set`);

    // Set availability
    console.log(`  Setting availability to ${config.available}...`);
    tx = await marketplace.setPassAvailability(config.passTypeId, config.available);
    await tx.wait();
    console.log(`  ✓ Availability set`);
  }

  console.log("\n" + "─".repeat(50));
  console.log("Marketplace configuration complete!");
  console.log("\nPass types configured:");
  for (const config of PASS_SALES_CONFIG) {
    const status = config.available ? "✓ Available" : "✗ Not available";
    console.log(`  Pass Type #${config.passTypeId}: ${config.priceInEth} ETH - ${status}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

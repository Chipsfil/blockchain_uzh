// scripts/verify-deployment.ts
//
// Verify that all contracts are deployed and wired correctly
//
// Usage:
//   npx ts-node --esm scripts/verify-deployment.ts

import { ethers } from "ethers";
import * as dotenv from "dotenv";
import * as fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load contract ABIs
const PassFactoryArtifact = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../artifacts/contracts/PassFactory.sol/PassFactory.json"),
    "utf-8"
  )
);
const PassMarketplaceArtifact = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../artifacts/contracts/PassMarketplace.sol/PassMarketplace.json"),
    "utf-8"
  )
);

dotenv.config();

const { SEPOLIA_RPC_URL } = process.env;

// ── CONFIGURATION ──
// Update these with your deployed addresses from config.ts
const PASS_FACTORY_ADDRESS = "0xc5Ac5Afdc2DF127e5Da27FFAFE87FD5571e5c0A8";
const PASS_MARKETPLACE_ADDRESS = "0xBE5734F6c5d00EA53D8EF1df574A2D80033cf59D";

async function main() {
  if (!SEPOLIA_RPC_URL) {
    throw new Error("SEPOLIA_RPC_URL missing in .env");
  }

  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);

  console.log("🔍 Verifying Deployment on Sepolia");
  console.log("─".repeat(60));

  // 1. Check if contracts exist
  console.log("\n1. Checking contract existence...");
  
  const factoryCode = await provider.getCode(PASS_FACTORY_ADDRESS);
  if (factoryCode === "0x") {
    console.log("  ❌ PassFactory NOT FOUND at", PASS_FACTORY_ADDRESS);
    console.log("     → You need to deploy the contracts!");
    return;
  } else {
    console.log("  ✅ PassFactory exists at", PASS_FACTORY_ADDRESS);
  }

  const marketplaceCode = await provider.getCode(PASS_MARKETPLACE_ADDRESS);
  if (marketplaceCode === "0x") {
    console.log("  ❌ PassMarketplace NOT FOUND at", PASS_MARKETPLACE_ADDRESS);
    console.log("     → You need to deploy the contracts!");
    return;
  } else {
    console.log("  ✅ PassMarketplace exists at", PASS_MARKETPLACE_ADDRESS);
  }

  // 2. Connect to contracts
  console.log("\n2. Connecting to contracts...");
  const passFactory = new ethers.Contract(
    PASS_FACTORY_ADDRESS,
    PassFactoryArtifact.abi,
    provider
  );
  const marketplace = new ethers.Contract(
    PASS_MARKETPLACE_ADDRESS,
    PassMarketplaceArtifact.abi,
    provider
  );

  // 3. Check if marketplace is authorized
  console.log("\n3. Checking marketplace authorization...");
  const authorizedMarketplace = await passFactory.marketplace();
  console.log("  PassFactory.marketplace() =", authorizedMarketplace);
  if (authorizedMarketplace.toLowerCase() === PASS_MARKETPLACE_ADDRESS.toLowerCase()) {
    console.log("  ✅ Marketplace is properly authorized");
  } else {
    console.log("  ❌ Marketplace is NOT authorized!");
    console.log("     → Run: await passFactory.setMarketplace('" + PASS_MARKETPLACE_ADDRESS + "')");
    return;
  }

  // 4. Check marketplace's PassFactory reference
  console.log("\n4. Checking marketplace configuration...");
  const marketplaceFactory = await marketplace.passFactory();
  console.log("  Marketplace.passFactory() =", marketplaceFactory);
  if (marketplaceFactory.toLowerCase() === PASS_FACTORY_ADDRESS.toLowerCase()) {
    console.log("  ✅ Marketplace points to correct PassFactory");
  } else {
    console.log("  ❌ Marketplace points to wrong PassFactory!");
    console.log("     Expected:", PASS_FACTORY_ADDRESS);
    console.log("     Got:", marketplaceFactory);
    return;
  }

  // 5. Check for pass types
  console.log("\n5. Checking for pass types...");
  const nextPassTypeId = await passFactory.nextPassTypeId();
  console.log("  Next pass type ID:", nextPassTypeId.toString());
  
  const totalPassTypes = Number(nextPassTypeId) - 1;
  if (totalPassTypes === 0) {
    console.log("  ⚠️  NO PASS TYPES CREATED YET");
    console.log("     → Go to Admin panel and create a pass type!");
    return;
  } else {
    console.log(`  ✅ Found ${totalPassTypes} pass type(s)`);
  }

  // 6. Check each pass type
  console.log("\n6. Pass type details:");
  for (let i = 1; i < Number(nextPassTypeId); i++) {
    try {
      const passType = await passFactory.getPassType(i);
      const saleInfo = await marketplace.getPassSaleInfo(i);
      
      console.log(`\n  Pass Type #${i}:`);
      console.log(`    Name: ${passType.name}`);
      console.log(`    Description: ${passType.description}`);
      console.log(`    Active: ${passType.active ? "✅" : "❌"}`);
      console.log(`    Price: ${ethers.formatEther(saleInfo.price)} ETH`);
      console.log(`    Available for Sale: ${saleInfo.available ? "✅" : "❌"}`);
      
      if (passType.active && saleInfo.available && saleInfo.price > 0n) {
        console.log(`    → ✅ Ready to sell in shop!`);
      } else {
        console.log(`    → ⚠️  Not ready:`);
        if (!passType.active) console.log(`       - Pass type is inactive`);
        if (!saleInfo.available) console.log(`       - Not marked as available for sale`);
        if (saleInfo.price === 0n) console.log(`       - Price is 0 (set a price > 0)`);
      }
    } catch (err) {
      console.log(`  ❌ Error reading pass type #${i}:`, err);
    }
  }

  console.log("\n" + "─".repeat(60));
  console.log("✅ Verification complete!");
  console.log("\nIf you found issues above, here's what to do:");
  console.log("1. Not authorized? Run deployment script again");
  console.log("2. No pass types? Create them in Admin panel");
  console.log("3. Not for sale? Use Admin → Marketplace Configuration");
  console.log("4. Price is 0? Set price in Marketplace Configuration");
}

main().catch((error) => {
  console.error("\n❌ Verification failed:");
  console.error(error.message);
  process.exitCode = 1;
});

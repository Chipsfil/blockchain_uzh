// scripts/deploy.ts
//
// Deploys the four-contract travel-pass system and wires them together:
//   1. ProviderRegistry
//   2. PassFactory  (ERC-721)
//   3. UsageRegistry
//   4. PassMarketplace (for travelers to purchase passes)
//
// Usage:
//   npx hardhat compile
//   npx ts-node --esm scripts/deploy.ts

import { ethers } from "ethers";
import * as dotenv from "dotenv";
import * as fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load artifact JSON files
const ProviderRegistryArtifact = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../artifacts/contracts/ProviderRegistry.sol/ProviderRegistry.json"),
    "utf-8"
  )
);
const PassFactoryArtifact = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../artifacts/contracts/PassFactory.sol/PassFactory.json"),
    "utf-8"
  )
);
const UsageRegistryArtifact = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../artifacts/contracts/UsageRegistry.sol/UsageRegistry.json"),
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

const { SEPOLIA_RPC_URL, PRIVATE_KEY } = process.env;

async function main() {
  if (!SEPOLIA_RPC_URL || !PRIVATE_KEY) {
    throw new Error("SEPOLIA_RPC_URL or PRIVATE_KEY missing in .env");
  }

  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const owner = wallet.address;

  console.log("Deploying with:", owner);
  console.log("─".repeat(50));

  // 1. ProviderRegistry
  const prFactory = new ethers.ContractFactory(
    ProviderRegistryArtifact.abi,
    ProviderRegistryArtifact.bytecode,
    wallet
  );
  const providerRegistry = await prFactory.deploy(owner);
  await providerRegistry.waitForDeployment();
  const prAddr = await providerRegistry.getAddress();
  console.log("ProviderRegistry deployed at:", prAddr);

  // 2. PassFactory
  const pfFactory = new ethers.ContractFactory(
    PassFactoryArtifact.abi,
    PassFactoryArtifact.bytecode,
    wallet
  );
  const passFactory = await pfFactory.deploy(owner);
  await passFactory.waitForDeployment();
  const pfAddr = await passFactory.getAddress();
  console.log("PassFactory      deployed at:", pfAddr);

  // 3. UsageRegistry
  const urFactory = new ethers.ContractFactory(
    UsageRegistryArtifact.abi,
    UsageRegistryArtifact.bytecode,
    wallet
  );
  const usageRegistry = await urFactory.deploy(owner);
  await usageRegistry.waitForDeployment();
  const urAddr = await usageRegistry.getAddress();
  console.log("UsageRegistry    deployed at:", urAddr);

  // 4. PassMarketplace
  const pmFactory = new ethers.ContractFactory(
    PassMarketplaceArtifact.abi,
    PassMarketplaceArtifact.bytecode,
    wallet
  );
  const passMarketplace = await pmFactory.deploy(owner, pfAddr);
  await passMarketplace.waitForDeployment();
  const pmAddr = await passMarketplace.getAddress();
  console.log("PassMarketplace  deployed at:", pmAddr);

  console.log("─".repeat(50));
  console.log("Wiring contracts together...");

  // Wire PassFactory → UsageRegistry
  const pfContract = new ethers.Contract(pfAddr, PassFactoryArtifact.abi, wallet);
  let tx = await pfContract.setUsageRegistry(urAddr);
  await tx.wait();
  console.log("  PassFactory.setUsageRegistry →", urAddr);

  // Wire UsageRegistry → PassFactory
  const urContract = new ethers.Contract(urAddr, UsageRegistryArtifact.abi, wallet);
  tx = await urContract.setPassFactory(pfAddr);
  await tx.wait();
  console.log("  UsageRegistry.setPassFactory →", pfAddr);

  // Wire UsageRegistry → ProviderRegistry
  tx = await urContract.setProviderRegistry(prAddr);
  await tx.wait();
  console.log("  UsageRegistry.setProviderRegistry →", prAddr);

  // Wire PassFactory → PassMarketplace
  tx = await pfContract.setMarketplace(pmAddr);
  await tx.wait();
  console.log("  PassFactory.setMarketplace →", pmAddr);

  console.log("─".repeat(50));
  console.log("Deployment complete!  Copy these addresses into travel-pass-ui/src/config.ts:");
  console.log();
  console.log(`export const PROVIDER_REGISTRY_ADDRESS = "${prAddr}";`);
  console.log(`export const PASS_FACTORY_ADDRESS      = "${pfAddr}";`);
  console.log(`export const USAGE_REGISTRY_ADDRESS    = "${urAddr}";`);
  console.log(`export const PASS_MARKETPLACE_ADDRESS  = "${pmAddr}";`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

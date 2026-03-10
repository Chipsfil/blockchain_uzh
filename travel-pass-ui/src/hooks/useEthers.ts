// src/hooks/useEthers.ts
import { useEffect, useState } from "react";
import { BrowserProvider, Contract, JsonRpcSigner } from "ethers";

import ProviderRegistryAbi from "../abi/ProviderRegistry.json";
import PassFactoryAbi from "../abi/PassFactory.json";
import UsageRegistryAbi from "../abi/UsageRegistry.json";
import PassMarketplaceAbi from "../abi/PassMarketplace.json";

import {
  PROVIDER_REGISTRY_ADDRESS,
  PASS_FACTORY_ADDRESS,
  USAGE_REGISTRY_ADDRESS,
  PASS_MARKETPLACE_ADDRESS,
  TARGET_CHAIN_ID,
} from "../config";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export interface Contracts {
  providerRegistry: Contract;
  passFactory: Contract;
  usageRegistry: Contract;
  marketplace: Contract | null;
}

export function useEthers() {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [contracts, setContracts] = useState<Contracts | null>(null);

  useEffect(() => {
    if (!window.ethereum) return;
    const prov = new BrowserProvider(window.ethereum);
    setProvider(prov);
  }, []);

  const connect = async () => {
    if (!provider) {
      alert("No provider \u2013 is MetaMask installed?");
      return;
    }

    await provider.send("eth_requestAccounts", []);

    const network = await provider.getNetwork();
    if (network.chainId !== BigInt(TARGET_CHAIN_ID)) {
      alert("Please switch MetaMask to Ethereum Sepolia");
      return;
    }

    const s = await provider.getSigner();
    const addr = await s.getAddress();
    setSigner(s);
    setAddress(addr);

    const c: Contracts = {
      providerRegistry: new Contract(
        PROVIDER_REGISTRY_ADDRESS,
        (ProviderRegistryAbi as any).abi,
        s
      ),
      passFactory: new Contract(
        PASS_FACTORY_ADDRESS,
        (PassFactoryAbi as any).abi,
        s
      ),
      usageRegistry: new Contract(
        USAGE_REGISTRY_ADDRESS,
        (UsageRegistryAbi as any).abi,
        s
      ),
      marketplace: PASS_MARKETPLACE_ADDRESS
        ? new Contract(
            PASS_MARKETPLACE_ADDRESS,
            (PassMarketplaceAbi as any).abi,
            s
          )
        : null,
    };
    setContracts(c);

    console.log("Contracts connected:", {
      providerRegistry: PROVIDER_REGISTRY_ADDRESS,
      passFactory: PASS_FACTORY_ADDRESS,
      usageRegistry: USAGE_REGISTRY_ADDRESS,
      marketplace: PASS_MARKETPLACE_ADDRESS || "Not deployed yet",
    });
  };

  return { provider, signer, address, contracts, connect };
}

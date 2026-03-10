// src/App.tsx
import { useState } from "react";
import { useEthers } from "./hooks/useEthers";
import { TravelerView } from "./components/TravelerView";
import { ProviderView } from "./components/ProviderView";
import { AdminView } from "./components/AdminView";
import { ShopView } from "./components/ShopView";
import { HowToUse } from "./components/HowToUse";
import { AboutConcept } from "./components/AboutConcept";

import "./App.css";

type Tab = "about" | "howto" | "shop" | "traveler" | "provider" | "admin";

function App() {
  const { address, contracts, connect } = useEthers();
  const [tab, setTab] = useState<Tab>("about");

  const tabs = [
    { id: "about", label: "Overview" },
    { id: "howto", label: "Operations" },
    { id: "shop", label: "🛒 Shop" },
    { id: "traveler", label: "Traveler" },
    { id: "provider", label: "Provider" },
    { id: "admin", label: "Administration" },
  ] as const;

  return (
    <div className="app-root">
      <div className="app-container">
        {/* Header Section */}
        <header className="app-header">
          <div className="header-content">
            <div className="brand-section">
              <div className="brand-icon">TP</div>
              <div className="brand-info">
                <h1 className="app-title">Travel Pass Management</h1>
                <p className="app-subtitle">
                  Institutional pass operations on Ethereum Sepolia
                </p>
              </div>
            </div>
            <div className="header-actions">
              {!address ? (
                <button className="connect-button" onClick={connect}>
                  <span>Connect Wallet</span>
                </button>
              ) : (
                <div className="wallet-badge">
                  <div className="wallet-status">
                    <span className="status-dot"></span>
                    <span className="status-text">Connected</span>
                  </div>
                  <div className="wallet-address">
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Navigation Tabs */}
        <nav className="navigation-bar">
          <div className="nav-tabs">
            {tabs.map((t) => (
              <button
                key={t.id}
                className={`nav-tab ${tab === t.id ? "active" : ""}`}
                onClick={() => setTab(t.id as Tab)}
              >
                <span className="tab-label">{t.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Main Content Area */}
        <main className="app-main">
          <div className="content-wrapper">
            {tab === "about" && <AboutConcept />}
            {tab === "howto" && <HowToUse />}

            {contracts && tab === "shop" && (
              <ShopView 
                address={address} 
                contracts={contracts} 
                marketplace={contracts.marketplace || null}
              />
            )}

            {!contracts && tab === "shop" && (
              <div className="connect-prompt">
                <div className="prompt-icon">🛒</div>
                <h3>Wallet Connection Required</h3>
                <p>Please connect your wallet to browse and purchase passes</p>
              </div>
            )}

            {address && contracts && tab === "traveler" && (
              <TravelerView address={address} contracts={contracts} />
            )}
            {address && contracts && tab === "provider" && (
              <ProviderView address={address} contracts={contracts} />
            )}
            {address && contracts && tab === "admin" && (
              <AdminView address={address} contracts={contracts} />
            )}

            {!address && tab !== "about" && tab !== "howto" && tab !== "shop" && (
              <div className="connect-prompt">
                <div className="prompt-icon">Access</div>
                <h3>Wallet Connection Required</h3>
                <p>Please connect your Sepolia wallet to access this section</p>
              </div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="app-footer">
          <div className="footer-content">
            <span className="footer-network">Ethereum Sepolia Testnet</span>
            <span className="footer-divider">•</span>
            <span className="footer-info">3-Contract Architecture</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;

// src/components/HowToUse.tsx

export function HowToUse() {
  return (
    <div className="view-section">
      <div className="section-card">
        <h3 className="section-title">Quick Start Guide</h3>
        <p className="section-subtitle">
          Follow this flow to run the complete TravelPass lifecycle on Ethereum Sepolia.
        </p>

        <div className="info-card">
          <h4 style={{ marginTop: 0 }}>1) Connect Wallet</h4>
          <p className="muted" style={{ margin: 0 }}>
            Click Connect Wallet and select a Sepolia account with test ETH for gas.
          </p>
        </div>

        <div className="success-card">
          <h4 style={{ marginTop: 0 }}>2) Admin Setup</h4>
          <ol>
            <li>Open the Admin tab.</li>
            <li>Register providers with address, name, and service type.</li>
            <li>Create a pass type with duration, zone, transferability, and entitlements.</li>
            <li>Issue the pass to a traveler wallet using the pass type ID.</li>
          </ol>
        </div>

        <div className="info-card">
          <h4 style={{ marginTop: 0 }}>3) Traveler Validation</h4>
          <ol>
            <li>Switch to the traveler wallet in MetaMask.</li>
            <li>Open Traveler tab and enter token ID.</li>
            <li>View validity, entitlements, and usage history.</li>
          </ol>
        </div>

        <div className="warning-card">
          <h4 style={{ marginTop: 0 }}>4) Provider Consumption</h4>
          <ol>
            <li>Switch to a registered provider wallet.</li>
            <li>Open Provider tab and verify provider status.</li>
            <li>Enter token ID and entitlement label (e.g. BIKE_RIDES).</li>
            <li>Encode label and consume amount.</li>
          </ol>
        </div>
      </div>

      <div className="section-card">
        <h3 className="section-title">Testing and Operations Notes</h3>
        <p className="section-subtitle">
          Useful checks to validate behavior and maintain deployment configuration.
        </p>

        <h4>Edge Cases to Test</h4>
        <ul>
          <li>Expired pass consumption should revert.</li>
          <li>Revoked provider should fail authorization checks.</li>
          <li>Over-consumption should be prevented by remaining balances.</li>
          <li>Soulbound passes should be non-transferable.</li>
        </ul>

        <h4>Contract Address Config</h4>
        <p className="muted">
          After deploying contracts, update addresses in <code>src/config.ts</code>:
        </p>
        <ul>
          <li><code>PROVIDER_REGISTRY_ADDRESS</code></li>
          <li><code>PASS_FACTORY_ADDRESS</code></li>
          <li><code>USAGE_REGISTRY_ADDRESS</code></li>
        </ul>

        <div className="info-card">
          <h4 style={{ marginTop: 0 }}>Explorer Verification</h4>
          <p className="muted" style={{ margin: 0 }}>
            Use Sepolia Etherscan to inspect transactions, emitted events, and usage history.
          </p>
        </div>

        <p className="muted" style={{ marginTop: 16 }}>
          Educational prototype only. Do not use on mainnet with real funds.
        </p>
      </div>
    </div>
  );
}

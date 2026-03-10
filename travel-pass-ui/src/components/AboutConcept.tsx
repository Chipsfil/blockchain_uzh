// src/components/AboutConcept.tsx

export function AboutConcept() {
  return (
    <div className="view-section">
      <div className="section-card">
        <h3 className="section-title">Concept Overview</h3>
        <p className="section-subtitle">
          TravelPass is a modern multi-modal city pass built on Ethereum Sepolia. One NFT bundles transport,
          attractions, and service usage into a single verifiable on-chain identity.
        </p>

        <div className="info-card">
          <h4 style={{ marginTop: 0 }}>Business Value</h4>
          <ul>
            <li>Unified pass experience across multiple providers and city services</li>
            <li>Shared source of truth for admins, operators, and travelers</li>
            <li>On-chain auditability for entitlement usage and fraud reduction</li>
          </ul>
        </div>

        <h4>Three-Contract Architecture</h4>
        <ul>
          <li><strong>ProviderRegistry</strong>: Whitelists and manages authorized operators.</li>
          <li><strong>PassFactory</strong>: Defines pass types and mints ERC-721 travel passes.</li>
          <li><strong>UsageRegistry</strong>: Tracks remaining entitlements and immutable usage logs.</li>
        </ul>

        <h4>Lifecycle Flow</h4>
        <ol>
          <li>Admin deploys and links the contracts.</li>
          <li>Admin registers providers in ProviderRegistry.</li>
          <li>Admin creates pass types and entitlements in PassFactory.</li>
          <li>Admin mints passes to travelers.</li>
          <li>Providers consume entitlements through UsageRegistry.</li>
        </ol>
      </div>

      <div className="section-card">
        <h3 className="section-title">Role Model</h3>
        <p className="section-subtitle">
          The app supports three operational roles. Any Sepolia wallet can switch roles by changing connected account.
        </p>

        <div className="success-card">
          <h4 style={{ marginTop: 0 }}>Admin / Owner</h4>
          <ul>
            <li>Registers and revokes providers</li>
            <li>Creates pass templates with duration, zone, and entitlements</li>
            <li>Mints pass NFTs to traveler addresses</li>
          </ul>
        </div>

        <div className="info-card">
          <h4 style={{ marginTop: 0 }}>Provider</h4>
          <ul>
            <li>Verifies provider status from ProviderRegistry</li>
            <li>Consumes specific entitlements from a traveler token</li>
            <li>Generates immutable usage entries on-chain</li>
          </ul>
        </div>

        <div className="warning-card">
          <h4 style={{ marginTop: 0 }}>Traveler</h4>
          <ul>
            <li>Loads pass by token ID</li>
            <li>Checks validity window and transferability</li>
            <li>Monitors remaining units and full usage history</li>
          </ul>
        </div>

        <p className="muted" style={{ marginTop: 16 }}>
          Prototype for Sepolia testnet and educational use only.
        </p>
      </div>
    </div>
  );
}

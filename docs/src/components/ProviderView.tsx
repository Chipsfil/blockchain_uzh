// src/components/ProviderView.tsx
import { useState } from "react";
import { encodeBytes32String } from "ethers";
import type { Contracts } from "../hooks/useEthers";

type Props = {
  address: string | null;
  contracts: Contracts;
};

export function ProviderView({ address, contracts }: Props) {
  const [tokenIdInput, setTokenIdInput] = useState("");
  const [labelInput, setLabelInput] = useState("BIKE_RIDES");
  const [encodedId, setEncodedId] = useState("");
  const [amountInput, setAmountInput] = useState("1");
  const [loading, setLoading] = useState(false);

  // ── Provider info state ──────────────────────
  const [provInfo, setProvInfo] = useState<{
    name: string;
    serviceType: string;
    active: boolean;
  } | null>(null);

  const encodeLabel = () => {
    try {
      const eid = encodeBytes32String(labelInput.trim());
      setEncodedId(eid);
    } catch {
      alert("Label must be <= 31 ASCII characters");
    }
  };

  const loadProviderInfo = async () => {
    if (!contracts.providerRegistry || !address) return;
    try {
      const [name, serviceType, active] =
        await contracts.providerRegistry.getProvider(address);
      setProvInfo({ name, serviceType, active });
    } catch {
      setProvInfo(null);
    }
  };

  const consume = async () => {
    if (!contracts.usageRegistry) return;
    if (!tokenIdInput || !encodedId || !amountInput) {
      alert("Fill token ID, encode entitlement, and amount");
      return;
    }

    setLoading(true);
    try {
      const tokenId = BigInt(tokenIdInput);
      const amount = BigInt(amountInput);

      const tx = await contracts.usageRegistry.consumeEntitlement(
        tokenId,
        encodedId,
        amount
      );
      await tx.wait();
      alert("Entitlement consumed ✓");
    } catch (err: any) {
      console.error(err);
      alert("Error: " + (err?.reason || err?.message || "unknown"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="view-section">
      <div className="section-card">
        <h3 className="section-title">Validate and Consume Pass</h3>
        <p className="section-subtitle">
          Validate traveler passes and consume entitlements for your services.
        </p>

        <div className="info-card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <strong>Provider Account</strong>
              <div style={{ marginTop: 6 }}>
                <span className="badge info">
                  {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
                </span>
              </div>
            </div>
          </div>
          <button
            className="primary-button"
            onClick={loadProviderInfo}
          >
            <span>Check Provider Status</span>
          </button>
          {provInfo && (
            <div style={{ marginTop: 16, padding: 16, background: 'rgba(15, 23, 42, 0.4)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ marginBottom: 8 }}>
                <strong style={{ color: 'var(--text-primary)' }}>{provInfo.name}</strong>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className="badge">{provInfo.serviceType}</span>
                {provInfo.active ? (
                  <span className="badge success">✓ Active</span>
                ) : (
                  <span className="badge error">✗ Revoked</span>
                )}
              </div>
            </div>
          )}
        </div>

        <h4>Consumption Details</h4>

        <div className="form-row">
          <label>Traveler Token ID</label>
          <input
            className="input"
            type="number"
            min={0}
            placeholder="Enter traveler's pass token ID"
            value={tokenIdInput}
            onChange={(e) => setTokenIdInput(e.target.value)}
          />
        </div>

        <div className="form-row">
          <label>Entitlement Label</label>
          <input
            className="input"
            type="text"
            placeholder="e.g., BIKE_RIDES, MUSEUM_ENTRY"
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value)}
          />
          <button
            className="secondary-button"
            style={{ marginTop: 8 }}
            onClick={encodeLabel}
          >
            <span>Encode to bytes32</span>
          </button>
        </div>

        <div className="form-row">
          <label>Encoded Entitlement ID</label>
          <input
            className="input"
            type="text"
            placeholder="0x... (auto-filled after encoding)"
            value={encodedId}
            onChange={(e) => setEncodedId(e.target.value)}
            readOnly
            style={{ background: 'rgba(200, 200, 200, 0.8)', cursor: 'not-allowed' }}
          />
          <p className="muted">
            This field is auto-filled when you encode the label above
          </p>
        </div>

        <div className="form-row">
          <label>Amount to Consume</label>
          <input
            className="input"
            type="number"
            min={1}
            placeholder="Enter quantity (e.g., 1)"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
          />
        </div>

        <button
          className="primary-button"
          onClick={consume}
          disabled={loading}
          style={{ width: '100%' }}
        >
          {loading ? (
            <>
              <span className="spinner"></span>
              <span>Processing...</span>
            </>
          ) : (
            <>
              <span>Consume Entitlement</span>
            </>
          )}
        </button>

        <div className="warning-card" style={{ marginTop: 20 }}>
          <p style={{ margin: 0, fontSize: 13 }}>
            <strong>Note:</strong> Your address must be registered by the admin in the ProviderRegistry,
            or the transaction will fail.
          </p>
        </div>
      </div>

      <div className="section-card">
        <h3 className="section-title">Provider Workflow Guide</h3>
        <p className="section-subtitle">
          Step-by-step guide for consuming entitlements.
        </p>

        <div className="info-card">
          <h4 style={{ marginTop: 0, marginBottom: 12 }}>Example: Bike-Sharing Station</h4>
          <ol style={{ paddingLeft: 20, fontSize: 14, lineHeight: 1.8, margin: 0 }}>
            <li>Traveler scans QR code at your station</li>
            <li>System retrieves their pass token ID</li>
            <li>Use predefined label (e.g., <code>BIKE_RIDES</code>)</li>
            <li>Encode label to bytes32 format</li>
            <li>Call <code>consumeEntitlement(tokenId, entitlementId, 1)</code></li>
            <li>Transaction confirmed and usage is recorded.</li>
          </ol>
        </div>

        <h4>Smart Contract Validation</h4>
        <div className="success-card">
          <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0 }}>
            The UsageRegistry contract automatically:
          </p>
          <ul style={{ paddingLeft: 20, fontSize: 14, lineHeight: 1.7, marginTop: 8, marginBottom: 0 }}>
            <li>✓ Verifies your provider authorization</li>
            <li>✓ Checks pass validity and expiration</li>
            <li>✓ Decrements entitlement counter</li>
            <li>✓ Records usage in on-chain log</li>
            <li>✓ Emits consumption event</li>
          </ul>
        </div>

        <h4>Security Checks</h4>
        <ul style={{ paddingLeft: 20, fontSize: 14, lineHeight: 1.8 }}>
          <li>
            <strong>Provider Authorization:</strong> Calls <code>ProviderRegistry.isAuthorized(msg.sender)</code>
          </li>
          <li>
            <strong>Pass Validity:</strong> Checks <code>PassFactory.isPassValid(tokenId)</code>
          </li>
          <li>
            <strong>Entitlement Balance:</strong> Ensures sufficient remaining units (or unlimited)
          </li>
          <li>
            <strong>Audit Trail:</strong> Appends <code>UsageEntry</code> with timestamp and provider info
          </li>
        </ul>

        <div className="info-card">
          <p className="muted" style={{ margin: 0 }}>
            <strong>Operational Tip:</strong> Travelers can verify remaining entitlements in the Traveler tab
            to see real-time updates after each consumption.
          </p>
        </div>
      </div>
    </div>
  );
}


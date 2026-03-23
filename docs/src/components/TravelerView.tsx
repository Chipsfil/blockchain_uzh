// src/components/TravelerView.tsx
import { useState } from "react";
import { decodeBytes32String } from "ethers";
import type { Contracts } from "../hooks/useEthers";

type Props = {
  address: string | null;
  contracts: Contracts;
};

export function TravelerView({ address, contracts }: Props) {
  const [tokenIdInput, setTokenIdInput] = useState("");
  const [info, setInfo] = useState<{
    tokenId: string;
    passTypeId: string;
    validFrom: number;
    validUntil: number;
    zone: string;
    transferable: boolean;
  } | null>(null);
  const [entitlements, setEntitlements] = useState<
    { label: string; max: string; remaining: string; unlimited: boolean }[]
  >([]);
  const [usageLog, setUsageLog] = useState<
    { provider: string; label: string; amount: string; timestamp: number }[]
  >([]);
  const [loading, setLoading] = useState(false);

  const loadPass = async () => {
    if (!contracts.passFactory || !contracts.usageRegistry || !tokenIdInput) {
      alert("Please enter a token ID");
      return;
    }
    setLoading(true);
    try {
      const tokenId = BigInt(tokenIdInput);

      // First, check if token exists and who owns it
      let owner: string;
      try {
        owner = await contracts.passFactory.ownerOf(tokenId);
      } catch (err: any) {
        console.error("Token not found:", err);
        alert(
          `Token ID ${tokenIdInput} doesn't exist. Did the admin mint it to you? Ask them to provide your token ID.`
        );
        setLoading(false);
        return;
      }

      // Check if the current user owns this token
      if (address && owner.toLowerCase() !== address.toLowerCase()) {
        alert(
          `This token (ID ${tokenIdInput}) belongs to ${owner}, not your account. Make sure you use the correct token ID.`
        );
        setLoading(false);
        return;
      }

      // Get pass info
      const passInfo = await contracts.passFactory.getPassInfo(tokenId);
      const passTypeId = passInfo[0];
      const validFrom = passInfo[1];
      const validUntil = passInfo[2];
      const zone = passInfo[3];

      const passType = await contracts.passFactory.getPassType(passTypeId);

      const [entIds, maxArr, remainingArr] =
        await contracts.usageRegistry.getAllRemainingUnits(tokenId);

      const items = entIds.map((id: string, idx: number) => {
        let label: string;
        try {
          label = decodeBytes32String(id);
        } catch {
          label = id;
        }
        const max = maxArr[idx].toString();
        const remaining = remainingArr[idx].toString();
        return { label, max, remaining, unlimited: max === "0" };
      });

      const logCount = await contracts.usageRegistry.getUsageLogCount(tokenId);
      let logs: { provider: string; label: string; amount: string; timestamp: number }[] = [];
      if (Number(logCount) > 0) {
        const rawLog = await contracts.usageRegistry.getUsageLog(
          tokenId,
          0,
          Number(logCount)
        );
        logs = rawLog.map((entry: any) => {
          let label: string;
          try {
            label = decodeBytes32String(entry.entitlementId);
          } catch {
            label = entry.entitlementId;
          }
          return {
            provider: entry.provider,
            label,
            amount: entry.amount.toString(),
            timestamp: Number(entry.timestamp),
          };
        });
      }

      setInfo({
        tokenId: tokenId.toString(),
        passTypeId: passTypeId.toString(),
        validFrom: Number(validFrom),
        validUntil: Number(validUntil),
        zone: zone,
        transferable: passType.transferable ?? false,
      });
      setEntitlements(items);
      setUsageLog(logs);
    } catch (err: any) {
      console.error(err);
      alert(
        "Error loading pass: " +
          (err?.reason || err?.message || "unknown error")
      );
    } finally {
      setLoading(false);
    }
  };

  const now = Math.floor(Date.now() / 1000);
  const isExpired = info ? now > info.validUntil : false;
  const isActive = info && !isExpired;

  return (
    <div className="view-section">
      {/* Load Pass Section */}
      <div className="section-card">
        <h3 className="section-title">Load Travel Pass</h3>
        <p className="section-subtitle">
          Enter your token ID to view pass details, remaining entitlements, and complete usage history.
        </p>

        <div className="form-row">
          <label>Token ID</label>
          <input
            className="input"
            type="number"
            min={0}
            placeholder="Enter your token ID (e.g., 1)"
            value={tokenIdInput}
            onChange={(e) => setTokenIdInput(e.target.value)}
          />
        </div>

        <button
          className="primary-button"
          onClick={loadPass}
          disabled={loading}
          style={{ width: '100%' }}
        >
          {loading ? (
            <>
              <span className="spinner"></span>
              <span>Loading...</span>
            </>
          ) : (
            <>
              <span>View My Pass</span>
            </>
          )}
        </button>

        <div className="info-card" style={{ marginTop: 20 }}>
          <p className="muted" style={{ margin: 0 }}>
            <strong>Tip:</strong> The admin will provide your token ID after minting your pass.
          </p>
        </div>
      </div>

      {/* Pass Details Section */}
      <div className="section-card">
        <h3 className="section-title">Pass Details</h3>
        
        {!info && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>🎫</div>
            <p className="muted" style={{ margin: 0 }}>
              No pass loaded yet. Enter a token ID above to view details.
            </p>
          </div>
        )}

        {info && (
          <>
            {/* Status Badges */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              <span className="badge info">Token #{info.tokenId}</span>
              <span className="badge">Type #{info.passTypeId}</span>
              {info.zone && <span className="badge">{info.zone}</span>}
              {info.transferable ? (
                <span className="badge warning">Transferable</span>
              ) : (
                <span className="badge info">Soulbound</span>
              )}
              {isExpired ? (
                <span className="badge error">Expired</span>
              ) : (
                <span className="badge success">✓ Active</span>
              )}
            </div>

            {/* Validity Dates */}
            <div className={isActive ? "success-card" : "warning-card"}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Valid From:</span>
                  <strong style={{ fontSize: 14 }}>
                    {new Date(info.validFrom * 1000).toLocaleString()}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Valid Until:</span>
                  <strong style={{ fontSize: 14 }}>
                    {new Date(info.validUntil * 1000).toLocaleString()}
                  </strong>
                </div>
              </div>
            </div>

            {/* Entitlements Table */}
            <h4>Available Entitlements</h4>
            {entitlements.length === 0 && (
              <p className="muted">No entitlements found for this pass.</p>
            )}
            {entitlements.length > 0 && (
              <div className="table-container">
                <table className="data-table">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th style={{ textAlign: 'center' }}>Remaining</th>
                    <th style={{ textAlign: 'center' }}>Maximum</th>
                    <th style={{ textAlign: 'right' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {entitlements.map((e) => {
                    const percentage = e.unlimited ? 100 : (Number(e.remaining) / Number(e.max)) * 100;
                    
                    return (
                      <tr key={e.label}>
                        <td><code>{e.label}</code></td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>
                          <span style={{ 
                            color: e.unlimited ? 'var(--secondary)' : 
                                   Number(e.remaining) === 0 ? 'var(--error)' :
                                   percentage < 30 ? 'var(--warning)' : 'var(--text-primary)'
                          }}>
                            {e.unlimited ? '∞' : e.remaining}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                          {e.unlimited ? '∞' : e.max}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {e.unlimited ? (
                            <span className="badge success">Unlimited</span>
                          ) : Number(e.remaining) === 0 ? (
                            <span className="badge error">Depleted</span>
                          ) : percentage < 30 ? (
                            <span className="badge warning">Low</span>
                          ) : (
                            <span className="badge success">Available</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            )}

            {/* Usage History */}
            {usageLog.length > 0 && (
              <>
                <h4>Usage History ({usageLog.length} entries)</h4>
                <div className="table-container" style={{ maxHeight: 400, overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date & Time</th>
                        <th>Service</th>
                        <th style={{ textAlign: 'center' }}>Amount</th>
                        <th>Provider</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usageLog.map((log, i) => (
                        <tr key={i}>
                          <td style={{ fontSize: 12 }}>
                            {new Date(log.timestamp * 1000).toLocaleString()}
                          </td>
                          <td><code>{log.label}</code></td>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>
                            {log.amount}
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                            {log.provider.slice(0, 6)}...{log.provider.slice(-4)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}


// src/components/AdminView.tsx
import { useState } from "react";
import { encodeBytes32String, parseEther } from "ethers";
import type { Contracts } from "../hooks/useEthers";

type Props = {
  address: string | null;
  contracts: Contracts;
};

export function AdminView({ address, contracts }: Props) {
  // ── Provider registration state ──────────────────
  const [provAddr, setProvAddr] = useState("");
  const [provName, setProvName] = useState("");
  const [provType, setProvType] = useState("bus");

  // ── Pass-type creation state ─────────────────────
  const [passName, setPassName] = useState("");
  const [passDesc, setPassDesc] = useState("");
  const [passZone, setPassZone] = useState("");
  const [imageURI, setImageURI] = useState("");
  const [duration, setDuration] = useState("48");
  const [transferable, setTransferable] = useState(false);
  
  // Simple entitlements: ["label1:max1", "label2:max2", ...]
  const [entitlements, setEntitlements] = useState([
    { label: "", maxUnits: "" },
  ]);

  // ── Minting state ───────────────────────────────
  const [mintTo, setMintTo] = useState("");
  const [mintPassTypeId, setMintPassTypeId] = useState("");

  // ── Provider revoke state ───────────────────────
  const [revokeAddr, setRevokeAddr] = useState("");

  // ── Marketplace configuration state ─────────────
  const [marketplacePassTypeId, setMarketplacePassTypeId] = useState("");
  const [marketplacePrice, setMarketplacePrice] = useState("");
  const [marketplaceAvailable, setMarketplaceAvailable] = useState(true);

  // ── Pass type activation state ──────────────────
  const [activatePassTypeId, setActivatePassTypeId] = useState("");
  const [activateStatus, setActivateStatus] = useState(true);

  // ── Pass type inspection state ──────────────────
  const [inspectPassTypeId, setInspectPassTypeId] = useState("");
  const [inspectedPassData, setInspectedPassData] = useState<any>(null);

  // ─── Handlers ──────────────────────────────────

  const registerProvider = async () => {
    if (!contracts.providerRegistry || !provAddr || !provName) {
      alert("Please fill in all fields");
      return;
    }
    try {
      const tx = await contracts.providerRegistry.registerProvider(
        provAddr,
        provName,
        provType
      );
      await tx.wait();
      alert("✓ Provider registered!");
      setProvAddr("");
      setProvName("");
    } catch (err: any) {
      console.error(err);
      alert("Error: " + (err?.reason || err?.message || "unknown"));
    }
  };

  const revokeProvider = async () => {
    if (!contracts.providerRegistry || !revokeAddr) {
      alert("Please enter an address");
      return;
    }
    try {
      const tx = await contracts.providerRegistry.revokeProvider(revokeAddr);
      await tx.wait();
      alert("✓ Provider removed!");
      setRevokeAddr("");
    } catch (err: any) {
      console.error(err);
      alert("Error: " + (err?.reason || err?.message || "unknown"));
    }
  };

  const createType = async () => {
    if (!contracts.passFactory || !passName || !passZone || !passDesc || !imageURI) {
      alert("Please fill in all required fields");
      return;
    }

    // Validate entitlements
    if (entitlements.some((e) => !e.label || e.maxUnits === "")) {
      alert("Please fill in all entitlements");
      return;
    }

    try {
      const ids = entitlements.map((e) => encodeBytes32String(e.label.trim()));
      const units = entitlements.map((e) => BigInt(e.maxUnits.trim() || "0"));

      // Convert hours to seconds
      const durationSeconds = BigInt(duration) * 3600n;

      // FIXED: Correct parameter order matching the contract signature
      const tx = await contracts.passFactory.createPassType(
        passName,       // name
        passDesc,       // description
        passZone,       // zone
        imageURI,       // imageURI (metadata generated on-chain)
        durationSeconds, // durationSeconds
        transferable,   // transferable (bool) - WAS IN WRONG POSITION
        ids,            // entitlementIds (bytes32[])
        units           // maxUnits (uint256[])
      );
      await tx.wait();
      alert("✓ Pass type created!");
      setPassName("");
      setPassDesc("");
      setPassZone("");
      setImageURI("");
      setDuration("48");
      setTransferable(false);
      setEntitlements([{ label: "", maxUnits: "" }]);
    } catch (err: any) {
      console.error(err);
      alert("Error: " + (err?.reason || err?.message || "unknown"));
    }
  };

  const mint = async () => {
    if (!contracts.passFactory || !mintTo || !mintPassTypeId) {
      alert("Please fill in all fields");
      return;
    }
    try {
      const tx = await contracts.passFactory.mintPass(
        mintTo,
        BigInt(mintPassTypeId)
      );
      await tx.wait();
      alert("✓ Pass issued!");
      setMintTo("");
      setMintPassTypeId("");
    } catch (err: any) {
      console.error(err);
      alert("Error: " + (err?.reason || err?.message || "unknown"));
    }
  };

  const configureMarketplace = async () => {
    if (!contracts.marketplace || !marketplacePassTypeId || !marketplacePrice) {
      alert("Please fill in all fields and ensure marketplace is deployed");
      return;
    }
    try {
      const priceInWei = parseEther(marketplacePrice);
      
      // Set price
      let tx = await contracts.marketplace.setPassPrice(
        BigInt(marketplacePassTypeId),
        priceInWei
      );
      await tx.wait();
      
      // Set availability
      tx = await contracts.marketplace.setPassAvailability(
        BigInt(marketplacePassTypeId),
        marketplaceAvailable
      );
      await tx.wait();
      
      alert(
        `✓ Marketplace configured!\n\nPass Type #${marketplacePassTypeId}\nPrice: ${marketplacePrice} ETH\nAvailable: ${marketplaceAvailable ? 'Yes' : 'No'}\n\nTravelers can now see this pass in the shop!`
      );
      setMarketplacePassTypeId("");
      setMarketplacePrice("");
    } catch (err: any) {
      console.error(err);
      alert("Error: " + (err?.reason || err?.message || "unknown"));
    }
  };

  const activatePassType = async () => {
    if (!contracts.passFactory || !activatePassTypeId) {
      alert("Please enter a pass type ID");
      return;
    }
    try {
      const tx = await contracts.passFactory.setPassTypeActive(
        BigInt(activatePassTypeId),
        activateStatus
      );
      await tx.wait();
      
      alert(
        `✓ Pass type ${activateStatus ? 'activated' : 'deactivated'}!\n\nPass Type #${activatePassTypeId} is now ${activateStatus ? 'ACTIVE' : 'INACTIVE'}`
      );
      setActivatePassTypeId("");
    } catch (err: any) {
      console.error(err);
      alert("Error: " + (err?.reason || err?.message || "unknown"));
    }
  };

  const handleInspectPassType = async () => {
    if (!contracts.passFactory || !inspectPassTypeId) {
      alert("Please enter a pass type ID");
      return;
    }
    try {
      const typeId = BigInt(inspectPassTypeId);
      const passType = await contracts.passFactory.getPassType(typeId);
      
      // PassType returns: name, description, zone, imageURI, durationSeconds, transferable, active, entitlementIds, maxUnits
      setInspectedPassData({
        id: inspectPassTypeId,
        name: passType[0],
        description: passType[1],
        zone: passType[2],
        imageURI: passType[3],
        duration: passType[4],
        transferable: passType[5],
        active: passType[6],
        entitlementIds: passType[7],
        unitCaps: passType[8]
      });
    } catch (err: any) {
      console.error(err);
      alert("Error: " + (err?.reason || err?.message || "unknown"));
      setInspectedPassData(null);
    }
  };

  const addEntitlement = () => {
    setEntitlements([...entitlements, { label: "", maxUnits: "" }]);
  };

  const removeEntitlement = (idx: number) => {
    setEntitlements(entitlements.filter((_, i) => i !== idx));
  };

  const updateEntitlement = (
    idx: number,
    field: "label" | "maxUnits",
    value: string
  ) => {
    const updated = [...entitlements];
    updated[idx][field] = value;
    setEntitlements(updated);
  };

  // ─── Render ────────────────────────────────────

  return (
    <div className="view-section">

      {/* Provider Management */}
      <div className="section-card">
        <h3 className="section-title">Provider Management</h3>
        <p className="section-subtitle">
          Register and manage service providers (buses, bikes, museums, etc.)
        </p>

        <div className="info-card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <strong>Administrator Account</strong>
          </div>
          <span className="badge info" style={{ fontSize: 12 }}>
            {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
          </span>
        </div>

        <h4>Register New Provider</h4>
        <div className="form-row">
          <label>Provider Wallet Address</label>
          <input
            className="input"
            type="text"
            placeholder="0x... (provider's wallet address)"
            value={provAddr}
            onChange={(e) => setProvAddr(e.target.value)}
          />
        </div>

        <div className="form-row">
          <label>Provider Name</label>
          <input
            className="input"
            type="text"
            placeholder="e.g., City Buses Inc., Bike Share Co."
            value={provName}
            onChange={(e) => setProvName(e.target.value)}
          />
        </div>

        <div className="form-row">
          <label>Service Type</label>
          <select
            className="input"
            value={provType}
            onChange={(e) => setProvType(e.target.value)}
          >
            <option value="bus">🚌 Bus Service</option>
            <option value="bike">🚴 Bike</option>
            <option value="train">🚆 Train / Metro</option>
            <option value="museum">🏛️ Museum</option>
            <option value="restaurant">🍽️ Restaurant</option>
            <option value="hotel">🏨 Accommodation</option>
          </select>
        </div>

        <button 
          className="primary-button" 
          onClick={registerProvider}
          style={{ width: '100%' }}
        >
          <span>Register Provider</span>
        </button>

        <hr style={{ margin: "20px 0", borderColor: "rgba(31,41,55,0.9)" }} />

        <h4>Remove Provider</h4>
        <div className="form-row">
          <label>Provider Address</label>
          <input
            className="input"
            type="text"
            placeholder="0x... (address to revoke)"
            value={revokeAddr}
            onChange={(e) => setRevokeAddr(e.target.value)}
          />
        </div>
        <button
          className="danger-button"
          style={{ width: '100%' }}
          onClick={revokeProvider}
        >
          <span>Revoke Provider Access</span>
        </button>
      </div>

      {/* Pass Type Creation & Minting */}
      <div className="section-card">
        <h3 className="section-title">Pass Type and Issuance</h3>
        <p className="section-subtitle">
          Create pass templates and issue them to travelers.
        </p>

        <h4>Create New Pass Type</h4>
        <div className="form-row">
          <label>Pass Name</label>
          <input
            className="input"
            type="text"
            placeholder="e.g., Weekend Explorer Pass, 48h City Access"
            value={passName}
            onChange={(e) => setPassName(e.target.value)}
          />
        </div>

        <div className="form-row">
          <label>Description</label>
          <textarea
            className="input"
            rows={2}
            placeholder="Describe what this pass includes..."
            value={passDesc}
            onChange={(e) => setPassDesc(e.target.value)}
          />
        </div>

        <div className="form-row">
          <label>Valid Zone or Area</label>
          <input
            className="input"
            type="text"
            placeholder="e.g., Downtown, Zone A, City Center"
            value={passZone}
            onChange={(e) => setPassZone(e.target.value)}
          />
        </div>

        <div className="form-row">
          <label>NFT Image URL</label>
          <input
            className="input"
            type="text"
            placeholder="ipfs://Qm... or https://yoursite.com/image.png"
            value={imageURI}
            onChange={(e) => setImageURI(e.target.value)}
          />
          <div className="info-card" style={{ marginTop: 8 }}>
            <p style={{ margin: 0, fontSize: 13 }}>
              <strong>🌟 Smart Metadata:</strong> The NFT metadata JSON is automatically generated from your input fields (name, description, zone, etc.). Just provide the image URL!
            </p>
            <p style={{ margin: '8px 0 0 0', fontSize: 12, opacity: 0.9 }}>
              � Upload your image to <a href="https://www.pinata.cloud" target="_blank" style={{ color: 'var(--accent)' }}>Pinata</a> or <a href="https://nft.storage" target="_blank" style={{ color: 'var(--accent)' }}>NFT.Storage</a> to get an IPFS URL
            </p>
          </div>
        </div>

        <div className="form-row">
          <label>Validity Duration (hours)</label>
          <input
            className="input"
            type="number"
            min="1"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
          <p className="muted">Example: 48 hours = 2 days, 168 hours = 1 week</p>
        </div>

        <div className="form-row">
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={transferable}
              onChange={(e) => setTransferable(e.target.checked)}
            />
            <span>Allow transfer or resale (not soulbound)</span>
          </label>
          <p className="muted">
            {transferable
              ? "✓ Travelers can transfer this pass to others"
              : "Pass is soulbound and cannot be transferred (recommended)"}
          </p>
        </div>

        <div className="form-row">
          <label style={{ fontWeight: 600 }}>Entitlements and Benefits</label>
          <div className="info-card" style={{ marginBottom: 16 }}>
            <p style={{ margin: 0, fontSize: 13 }}>
              Define the services included in this pass and usage limits (0 = unlimited).
            </p>
          </div>

          {entitlements.map((ent, idx) => (
            <div
              key={idx}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 120px auto",
                gap: 12,
                marginBottom: 16,
                alignItems: "end",
                padding: 16,
                background: 'rgba(99, 102, 241, 0.05)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(99, 102, 241, 0.1)'
              }}
            >
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>
                  Service Name
                </label>
                <input
                  className="input"
                  type="text"
                  placeholder="BUS_RIDES, MUSEUM_ENTRY"
                  value={ent.label}
                  onChange={(e) => updateEntitlement(idx, "label", e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>
                  Max Uses
                </label>
                <input
                  className="input"
                  type="number"
                  placeholder="0"
                  min="0"
                  value={ent.maxUnits}
                  onChange={(e) => updateEntitlement(idx, "maxUnits", e.target.value)}
                />
              </div>
              {entitlements.length > 1 && (
                <button
                  className="danger-button"
                  style={{
                    padding: "12px 16px",
                    fontSize: 14
                  }}
                  onClick={() => removeEntitlement(idx)}
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          <button
            className="secondary-button"
            style={{
              width: '100%',
              marginBottom: 20
            }}
            onClick={addEntitlement}
          >
            <span>Add Another Entitlement</span>
          </button>
        </div>

        <button 
          className="primary-button" 
          onClick={createType}
          style={{ width: '100%' }}
        >
          <span>Create Pass Type</span>
        </button>

        <hr style={{ margin: "20px 0", borderColor: "rgba(31,41,55,0.9)" }} />

        <h4>Issue Pass to Traveler</h4>

        <div className="form-row">
          <label>Traveler Wallet Address</label>
          <input
            className="input"
            type="text"
            placeholder="0x... (traveler's wallet)"
            value={mintTo}
            onChange={(e) => setMintTo(e.target.value)}
          />
        </div>

        <div className="form-row">
          <label>Pass Type ID</label>
          <input
            className="input"
            type="number"
            min="1"
            placeholder="Enter pass type ID (e.g., 1)"
            value={mintPassTypeId}
            onChange={(e) => setMintPassTypeId(e.target.value)}
          />
          <p className="muted">Use the pass type ID from the creation step above</p>
        </div>

        <button 
          className="primary-button" 
          onClick={mint}
          style={{ width: '100%' }}
        >
          <span>Issue Pass to Traveler</span>
        </button>
      </div>

      {/* Marketplace Configuration */}
      <div className="section-card">
        <h3 className="section-title">🛒 Marketplace Configuration</h3>
        <p className="section-subtitle">
          Set prices and enable pass types for sale in the shop
        </p>

        <div className="info-card" style={{ marginBottom: 20, background: '#fff3cd', borderLeft: '4px solid #ffc107' }}>
          <p style={{ margin: 0, color: '#856404' }}>
            <strong>Note:</strong> After creating a pass type above, configure it here to make it available in the shop.
          </p>
        </div>

        <hr style={{ margin: "20px 0", borderColor: "rgba(31,41,55,0.9)" }} />

        <h4>Configure Pass Type for Sale</h4>

        <div className="form-row">
          <label>Pass Type ID</label>
          <input
            className="input"
            type="number"
            min="1"
            placeholder="Enter pass type ID (e.g., 1)"
            value={marketplacePassTypeId}
            onChange={(e) => setMarketplacePassTypeId(e.target.value)}
          />
        </div>

        <div className="form-row">
          <label>Price (in ETH)</label>
          <input
            className="input"
            type="text"
            placeholder="e.g., 0.001"
            value={marketplacePrice}
            onChange={(e) => setMarketplacePrice(e.target.value)}
          />
          <p className="muted">Set the price travelers will pay (e.g., 0.001 for testnet)</p>
        </div>

        <div className="form-row">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={marketplaceAvailable}
              onChange={(e) => setMarketplaceAvailable(e.target.checked)}
              style={{ width: 'auto' }}
            />
            <span>Available for Sale</span>
          </label>
          <p className="muted">Check to make this pass available in the shop</p>
        </div>

        <button 
          className="primary-button" 
          onClick={configureMarketplace}
          style={{ width: '100%' }}
        >
          <span>Update Marketplace Settings</span>
        </button>
      </div>

      {/* Pass Type Activation/Deactivation */}
      <div className="section-card">
        <h3 className="section-title">🔄 Activate/Deactivate Pass Types</h3>
        <p className="section-subtitle">
          Control whether existing pass types can be used
        </p>

        <div className="info-card" style={{ marginBottom: 20, background: '#fff3cd', borderLeft: '4px solid #ffc107' }}>
          <p style={{ margin: 0, color: '#856404' }}>
            <strong>⚠️ Important:</strong> If your pass type shows as "inactive" in the verification, activate it here!
          </p>
        </div>

        <div className="form-row">
          <label>Pass Type ID</label>
          <input
            className="input"
            type="number"
            min="1"
            placeholder="Enter pass type ID (e.g., 1)"
            value={activatePassTypeId}
            onChange={(e) => setActivatePassTypeId(e.target.value)}
          />
        </div>

        <div className="form-row">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={activateStatus}
              onChange={(e) => setActivateStatus(e.target.checked)}
              style={{ width: 'auto' }}
            />
            <span>Active</span>
          </label>
          <p className="muted">
            ✅ Checked = Active (can be minted) | ❌ Unchecked = Inactive (cannot be minted)
          </p>
        </div>

        <button 
          className="primary-button" 
          onClick={activatePassType}
          style={{ width: '100%' }}
        >
          <span>{activateStatus ? 'Activate' : 'Deactivate'} Pass Type</span>
        </button>
      </div>

      {/* Pass Type Inspection */}
      <div className="section-card">
        <h3 className="section-title">🔍 Inspect Pass Type</h3>
        <p className="section-subtitle">
          View details of any pass type stored on the blockchain
        </p>

        <div className="form-row">
          <label>Pass Type ID</label>
          <input
            className="input"
            type="number"
            min="1"
            placeholder="Enter pass type ID to inspect (e.g., 1)"
            value={inspectPassTypeId}
            onChange={(e) => setInspectPassTypeId(e.target.value)}
          />
        </div>

        <button 
          className="primary-button" 
          onClick={handleInspectPassType}
          style={{ width: '100%', marginBottom: '15px' }}
        >
          <span>🔍 Inspect Pass Type</span>
        </button>

        {inspectedPassData && (
          <div className="info-card" style={{ background: '#f8f9fa', padding: '15px' }}>
            <h4 style={{ marginTop: 0 }}>Pass Type #{inspectedPassData.id}</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>Name:</td>
                  <td style={{ padding: '8px' }}>{inspectedPassData.name || '(undefined)'}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>Description:</td>
                  <td style={{ padding: '8px' }}>{inspectedPassData.description || '(undefined)'}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>Zone:</td>
                  <td style={{ padding: '8px' }}>{inspectedPassData.zone}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>Duration (sec):</td>
                  <td style={{ padding: '8px' }}>{inspectedPassData.duration.toString()}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>Transferable:</td>
                  <td style={{ padding: '8px' }}>{inspectedPassData.transferable ? '✅ Yes' : '❌ No'}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>Active:</td>
                  <td style={{ padding: '8px' }}>{inspectedPassData.active ? '✅ Active' : '❌ Inactive'}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>Image URI:</td>
                  <td style={{ padding: '8px', wordBreak: 'break-all' }}>{inspectedPassData.imageURI || '(none)'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>Entitlements:</td>
                  <td style={{ padding: '8px' }}>
                    {inspectedPassData.entitlementIds.length > 0 ? (
                      <ul style={{ margin: 0, paddingLeft: '20px' }}>
                        {inspectedPassData.entitlementIds.map((id: bigint, idx: number) => (
                          <li key={idx}>ID: {id.toString()}, Max Units: {inspectedPassData.unitCaps[idx].toString()}</li>
                        ))}
                      </ul>
                    ) : '(none)'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

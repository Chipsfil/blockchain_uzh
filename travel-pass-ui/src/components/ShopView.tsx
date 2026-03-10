// src/components/ShopView.tsx
import { useState, useEffect } from "react";
import { ethers, decodeBytes32String, formatEther, parseEther } from "ethers";
import type { Contracts } from "../hooks/useEthers";

type Props = {
  address: string | null;
  contracts: Contracts;
  marketplace: ethers.Contract | null;
};

type PassTypeInfo = {
  passTypeId: number;
  name: string;
  description: string;
  zone: string;
  imageURI: string;
  durationSeconds: number;
  transferable: boolean;
  active: boolean;
  entitlementIds: string[];
  maxUnits: bigint[];
  price: string;
  availableForSale: boolean;
};

export function ShopView({ address, contracts, marketplace }: Props) {
  const [passes, setPasses] = useState<PassTypeInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState<number | null>(null);

  useEffect(() => {
    loadAvailablePasses();
  }, [contracts, marketplace]);

  const loadAvailablePasses = async () => {
    console.log("🔍 Loading passes...");
    console.log("  - contracts.passFactory:", !!contracts.passFactory);
    console.log("  - marketplace:", !!marketplace);
    console.log("  - marketplace address:", marketplace ? await marketplace.getAddress() : "null");
    
    if (!contracts.passFactory || !marketplace) {
      console.log("❌ Missing contracts, aborting load");
      return;
    }
    
    setLoading(true);
    try {
      // Try to load first 20 pass types
      const loadedPasses: PassTypeInfo[] = [];
      
      for (let i = 1; i <= 20; i++) {
        try {
          console.log(`Checking pass type #${i}...`);
          const passType = await contracts.passFactory.getPassType(i);
          console.log(`  Pass #${i} found:`, passType.name_);
          
          const saleInfo = await marketplace.getPassSaleInfo(i);
          console.log(`  Sale info:`, {
            price: saleInfo.price.toString(),
            available: saleInfo.available
          });
          
          // Decode entitlement labels
          const entitlementLabels = passType.entitlementIds_.map((id: string) => {
            try {
              return decodeBytes32String(id);
            } catch {
              return id.substring(0, 10) + "...";
            }
          });

          loadedPasses.push({
            passTypeId: i,
            name: passType.name_,
            description: passType.description_,
            zone: passType.zone_,
            imageURI: passType.imageURI_,
            durationSeconds: Number(passType.durationSeconds_),
            transferable: passType.transferable_,
            active: passType.active_,
            entitlementIds: entitlementLabels,
            maxUnits: passType.maxUnits_,
            price: formatEther(saleInfo.price),
            availableForSale: saleInfo.available,
          });
          
          console.log(`  ✅ Added pass #${i}:`, {
            name: passType.name_,
            active: passType.active_,
            availableForSale: saleInfo.available,
            price: formatEther(saleInfo.price)
          });
        } catch (err) {
          console.log(`  ℹ️ Pass #${i} not found, stopping search`);
          // Pass type doesn't exist, stop loading
          break;
        }
      }
      
      console.log("📋 Total loaded passes:", loadedPasses.length);
      console.log("   Full details:", loadedPasses);
      console.log("   Available (active + for sale):", loadedPasses.filter(p => p.active && p.availableForSale).length);
      console.log("   Unavailable:", loadedPasses.filter(p => !p.active || !p.availableForSale).length);
      
      setPasses(loadedPasses);
    } catch (err: any) {
      console.error("❌ Error loading passes:", err);
    } finally {
      setLoading(false);
    }
  };

  const purchasePass = async (passTypeId: number, price: string) => {
    if (!marketplace || !address) {
      alert("Please connect your wallet first");
      return;
    }

    setPurchasing(passTypeId);
    try {
      const priceInWei = parseEther(price);
      const tx = await marketplace.purchasePass(passTypeId, {
        value: priceInWei,
      });
      
      alert("Transaction submitted! Waiting for confirmation...");
      const receipt = await tx.wait();
      
      // Find the PassMinted event to get the token ID
      const passFactory = contracts.passFactory;
      const mintEvent = receipt.logs
        .map((log: any) => {
          try {
            return passFactory?.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((evt: any) => evt?.name === "PassMinted");

      const tokenId = mintEvent?.args?.tokenId?.toString();
      
      alert(
        `Pass purchased successfully! 🎉\n\nYour Token ID: ${tokenId}\n\nSave this ID to view your pass in the Traveler section.`
      );
      
    } catch (err: any) {
      console.error("Purchase error:", err);
      alert(
        "Purchase failed: " + (err?.reason || err?.message || "Unknown error")
      );
    } finally {
      setPurchasing(null);
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''}`;
    }
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  };

  const availablePasses = passes.filter(p => p.availableForSale && p.active);
  const unavailablePasses = passes.filter(p => !p.availableForSale || !p.active);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Top Header */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '16px 20px',
          background: 'linear-gradient(135deg, #1d4f8f 0%, #2b5fa3 100%)',
          borderRadius: 'var(--radius-md)',
          color: 'white',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>🎫</span>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
              Travel Pass Shop
            </h2>
            <p style={{ margin: 0, fontSize: 13, opacity: 0.9 }}>
              {availablePasses.length > 0 
                ? `${availablePasses.length} pass${availablePasses.length !== 1 ? 'es' : ''} available` 
                : 'Browse available passes'}
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {!address && (
            <span style={{ fontSize: 12, opacity: 0.9, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>⚠️</span>
              <span>Connect wallet</span>
            </span>
          )}
          <button 
            className="secondary-button" 
            onClick={loadAvailablePasses}
            disabled={loading}
            style={{ 
              padding: '8px 16px', 
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: 'white',
            }}
          >
            <span>🔄</span>
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Main Layout: Sidebar + Content */}
      <div className="shop-layout" style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Left Sidebar - How It Works */}
        <div 
          className="shop-sidebar"
          style={{ 
            width: 280,
            flexShrink: 0,
            position: 'sticky',
            top: 16,
          }}
        >
          <div 
            style={{ 
              background: 'white',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: 'var(--radius-md)',
              padding: 20,
            }}
          >
            <h3 style={{ 
              margin: '0 0 16px 0', 
              fontSize: 16, 
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}>
              💡 How It Works
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { icon: '👛', title: 'Connect Wallet', desc: 'Connect your Ethereum wallet' },
                { icon: '🔍', title: 'Browse', desc: 'Explore available passes' },
                { icon: '💳', title: 'Purchase', desc: 'Click Buy and confirm' },
                { icon: '🎫', title: 'Receive NFT', desc: 'Pass sent to your wallet' },
                { icon: '✅', title: 'Use Pass', desc: 'Manage in Traveler tab' },
              ].map((step, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ 
                    fontSize: 24,
                    flexShrink: 0,
                  }}>
                    {step.icon}
                  </div>
                  <div>
                    <h4 style={{ 
                      margin: '0 0 4px 0', 
                      fontSize: 13, 
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                    }}>
                      {idx + 1}. {step.title}
                    </h4>
                    <p style={{ 
                      margin: 0, 
                      fontSize: 12, 
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5,
                    }}>
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Content - Passes Grid */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Alerts */}
          {!loading && availablePasses.length === 0 && passes.length > 0 && (
            <div 
              style={{ 
                background: '#fff9e6', 
                borderLeft: '3px solid #ffc107',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                marginBottom: 16,
              }}
            >
              <p style={{ margin: '0 0 8px 0', fontWeight: 600, color: '#856404', fontSize: 14 }}>
                ⚠️ Passes need configuration
              </p>
              <p style={{ margin: 0, color: '#856404', fontSize: 13 }}>
                {passes.length} pass type{passes.length !== 1 ? 's' : ''} found but not yet available for purchase.
              </p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div className="spinner" style={{ 
                margin: '0 auto 16px',
                width: 40,
                height: 40,
                border: '3px solid rgba(29, 79, 143, 0.1)',
                borderTopColor: 'var(--primary)',
              }}></div>
              <p className="muted" style={{ fontSize: 14 }}>Loading passes...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && availablePasses.length === 0 && passes.length === 0 && (
            <div 
              style={{ 
                textAlign: 'center', 
                padding: '40px 20px',
                background: 'rgba(248, 249, 250, 0.5)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.4 }}>🎫</div>
              <h4 style={{ marginTop: 0, marginBottom: 8, fontSize: 16, fontWeight: 600 }}>
                No Passes Available
              </h4>
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                Check back later or contact the administrator.
              </p>
            </div>
          )}

          {/* Passes Grid */}
          {!loading && availablePasses.length > 0 && (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
              gap: 20,
            }}>
              {availablePasses.map((pass) => (
              <div
                key={pass.passTypeId}
                className="pass-card"
                style={{
                  background: 'white',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(29, 79, 143, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.06)';
                }}
              >
                {/* Pass Image */}
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    background: pass.imageURI 
                      ? `url(${pass.imageURI}) center/cover` 
                      : 'linear-gradient(135deg, #1d4f8f 0%, #2b5fa3 100%)',
                    position: 'relative',
                  }}
                >
                  {/* Duration Badge */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      background: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(8px)',
                      color: 'var(--primary)',
                      padding: '5px 12px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    ⏱️ {formatDuration(pass.durationSeconds)}
                  </div>
                </div>

                {/* Pass Info */}
                <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h4 style={{ 
                    marginTop: 0, 
                    marginBottom: 8, 
                    fontSize: 18, 
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                  }}>
                    {pass.name}
                  </h4>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    {pass.zone && (
                      <span style={{
                        background: 'rgba(29, 79, 143, 0.1)',
                        color: 'var(--primary)',
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: 11,
                        fontWeight: 500,
                      }}>
                        📍 {pass.zone}
                      </span>
                    )}
                    {pass.transferable && (
                      <span style={{
                        background: 'rgba(245, 158, 11, 0.1)',
                        color: 'var(--warning)',
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: 11,
                        fontWeight: 500,
                      }}>
                        🔄 Transferable
                      </span>
                    )}
                  </div>

                  <p style={{ 
                    fontSize: 13, 
                    color: 'var(--text-secondary)', 
                    marginBottom: 12,
                    lineHeight: 1.5,
                    flex: 1,
                  }}>
                    {pass.description || 'Travel pass with various entitlements'}
                  </p>

                  {/* Entitlements */}
                  {pass.entitlementIds.length > 0 && (
                    <div style={{ 
                      marginBottom: 14,
                      padding: 12,
                      background: 'rgba(29, 79, 143, 0.04)',
                      borderRadius: 'var(--radius-sm)',
                    }}>
                      <p style={{ 
                        fontSize: 11, 
                        fontWeight: 600, 
                        marginBottom: 8, 
                        textTransform: 'uppercase', 
                        color: 'var(--text-muted)',
                        letterSpacing: '0.5px',
                      }}>
                        Includes
                      </p>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.6 }}>
                        {pass.entitlementIds.map((label, idx) => (
                          <li key={idx} style={{ color: 'var(--text-secondary)' }}>
                            {label}: {pass.maxUnits[idx] === 0n ? 'Unlimited' : pass.maxUnits[idx].toString()}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Price & Purchase */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>
                        Price
                      </div>
                      <div style={{ 
                        fontSize: 20, 
                        fontWeight: 700, 
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}>
                        <span style={{ fontSize: 16 }}>Ξ</span>
                        <span>{pass.price}</span>
                      </div>
                    </div>

                    <button
                      className="primary-button"
                      onClick={() => purchasePass(pass.passTypeId, pass.price)}
                      disabled={!address || purchasing === pass.passTypeId}
                      style={{ 
                        padding: '12px 20px',
                        fontSize: 14,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        flex: 1,
                      }}
                    >
                      {purchasing === pass.passTypeId ? (
                        <>
                          <span className="spinner" style={{ width: 14, height: 14 }}></span>
                          <span>Buying...</span>
                        </>
                      ) : (
                        <>
                          <span>🛒</span>
                          <span>Buy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Unavailable Passes */}
        {unavailablePasses.length > 0 && (
          <div 
            style={{ 
              marginTop: 20,
              padding: 16,
              background: 'rgba(248, 249, 250, 0.5)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600 }}>
              ⚙️ Needs Configuration
            </h3>
            
            <p style={{ margin: '0 0 12px 0', fontSize: 13, color: 'var(--text-secondary)' }}>
              {unavailablePasses.length} pass type{unavailablePasses.length !== 1 ? 's' : ''} awaiting admin setup
            </p>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
              gap: 12,
            }}>
              {unavailablePasses.map((pass) => (
                <div
                  key={pass.passTypeId}
                  style={{
                    background: 'white',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: 'var(--radius-sm)',
                    padding: 12,
                    opacity: 0.6,
                  }}
                >
                  <h4 style={{ margin: '0 0 6px 0', fontSize: 13, fontWeight: 600 }}>
                    {pass.name || 'Unnamed Pass'}
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    <span style={{
                      background: 'rgba(148, 163, 184, 0.15)',
                      color: 'var(--text-muted)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: 10,
                      fontWeight: 500,
                    }}>
                      #{pass.passTypeId}
                    </span>
                    {!pass.active && (
                      <span style={{
                        background: 'rgba(244, 67, 54, 0.15)',
                        color: '#f44336',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: 10,
                        fontWeight: 500,
                      }}>
                        Inactive
                      </span>
                    )}
                    {!pass.availableForSale && pass.active && (
                      <span style={{
                        background: 'rgba(255, 152, 0, 0.15)',
                        color: '#ff9800',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: 10,
                        fontWeight: 500,
                      }}>
                        Not for Sale
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

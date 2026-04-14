import TopNav from '../../components/TopNav';
import Sidebar from '../../components/Sidebar';

export default function InsightPage() {
  return (
    <>
      <TopNav brand="ORBIT" active="STAKE" />
      <div className="flex" style={{ height: 'calc(100vh - 72px)' }}>
        <Sidebar />
        <div className="page-content flex flex-col gap-8" style={{ padding: '2rem 3rem', maxWidth: '1200px' }}>
          
          <div className="flex justify-between items-end mb-4">
             <div>
                <div className="btn btn-secondary mb-4" style={{ padding: '0.25rem 0.5rem', fontSize: '0.65rem', border: '1px solid var(--tertiary)' }}>PIPELINE: VALIDATION // 0x4f2..e91</div>
                <h1 className="display-md text-gradient-purple">VERIFICATION STATUS</h1>
             </div>
             <div className="orbit-card ghost-border" style={{ padding: '1rem', background: 'var(--surface-container-low)', minWidth: '200px' }}>
                <div className="label-sm mb-2 text-right">PROOF GENERATION</div>
                <div className="display-sm text-right">99.9% <span style={{ fontSize: '0.875rem', fontWeight: 'normal', color: 'var(--on-surface-variant)' }}>COMPLETE</span></div>
             </div>
          </div>

          <div className="flex gap-8">
             {/* Left Main Content */}
             <div className="flex flex-col gap-8" style={{ flex: 2 }}>
                
                <div className="orbit-card ghost-border flex" style={{ padding: '2.5rem', background: 'var(--surface-container-low)' }}>
                   <div style={{ flex: 1, paddingRight: '2rem', borderRight: '1px dashed var(--outline-variant)' }}>
                      <div className="flex gap-4 items-center mb-8">
                         <div style={{ width: '64px', height: '64px', background: 'var(--primary)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--on-primary-fixed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                         </div>
                         <div>
                            <h2 className="display-md mb-1" style={{ fontStyle: 'italic', color: 'var(--on-surface)' }}>VERIFIED</h2>
                            <div className="label-sm">CRYPTOGRAPHIC PROOF-OF-ACTION<br/>ANCHOR</div>
                         </div>
                      </div>

                      <div className="orbit-card ghost-border mb-4" style={{ padding: '1rem', background: 'var(--surface)' }}>
                         <div className="label-sm mb-2 text-gradient">STORAGE ROOT HASH</div>
                         <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>sha256:8f2a1b9c3d4e5f6a7b8c9d0e1f2a3<br/>b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0</div>
                      </div>

                      <div className="orbit-card ghost-border" style={{ padding: '1rem', background: 'var(--surface)' }}>
                         <div className="label-sm mb-2 text-gradient">ZK PROOF AFFIDAVIT</div>
                         <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>zksync:v2:7721 9901 alpha 0x992...bc01</div>
                      </div>
                   </div>

                   <div className="flex flex-col justify-between" style={{ paddingLeft: '2rem', width: '200px' }}>
                      <div className="text-right">
                         <div className="label-sm text-gradient-purple">TIMESTAMP ISO 8601</div>
                         <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>2024-10-24<br/>14:22:01.442 Z</div>
                      </div>
                      <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', lineHeight: '1.6' }}>
                         This transaction has been cryptographically validated across the <strong style={{ color: 'var(--primary)' }}>Orbit Compute Mesh</strong>. Identity markers have been hashed and anchored immutably to the sovereign storage cluster.
                      </p>
                      <div className="flex flex-col gap-2 mt-4">
                         <button className="btn btn-primary" style={{ padding: '0.75rem' }}>VIEW ON EXPLORER</button>
                         <button className="btn btn-secondary" style={{ padding: '0.75rem' }}>DOWNLOAD RECEIPT</button>
                      </div>
                   </div>
                </div>

                <div className="orbit-card ghost-border flex flex-col" style={{ flex: 1, padding: '2rem', background: 'var(--surface-container-lowest)' }}>
                   <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-2">
                         <div className="status-dot"></div>
                         <h3 className="label-md">COMPUTE JOB FEED</h3>
                      </div>
                      <div className="label-sm">NODE: 882-QX-ORBIT</div>
                   </div>
                   
                   <div style={{ background: '#0e0e11', padding: '1.5rem', borderRadius: 'var(--rounded-md)', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--on-surface-variant)', minHeight: '200px', border: '1px solid var(--outline-variant)' }}>
                      <div>[SYSTEM] Handshaking with ZK-Worker Cluster Delta...</div>
                      <div style={{ color: 'var(--primary)', marginTop: '0.5rem' }}>[SUCCESS] Biometric similarity: 0.9994 Verified</div>
                      <div style={{ marginTop: '0.5rem' }}>[CRYPTO] Initializing nonce injection: 77219921</div>
                      <div style={{ marginTop: '0.5rem' }}>[NETWORK] Fragmentation protocol active</div>
                      <div style={{ color: 'var(--tertiary)', marginTop: '0.5rem' }}>[STORAGE] Anchoring root hash to Cluster Node Orbit Alpha</div>
                      <div style={{ marginTop: '0.5rem' }}>[SYSTEM] Packing cryptographic seal...</div>
                      <div style={{ color: 'var(--on-surface)', marginTop: '0.5rem', fontWeight: 'bold' }}>[COMPLETED] Validation pipeline finalized in 1.44s</div>
                      <div className="mt-2 text-gradient-purple"> </div>
                   </div>
                </div>

             </div>

             {/* Right Sidebar Content */}
             <div className="flex flex-col gap-8" style={{ width: '320px', flexShrink: 0 }}>
                
                <div className="orbit-card ghost-border" style={{ padding: '2rem', background: 'var(--surface-container)' }}>
                   <div className="flex justify-between items-center mb-6">
                      <h3 className="label-md">WEBHOOK TRIGGERS</h3>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--tertiary)" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><line x1="3" y1="12" x2="9" y2="12"></line><line x1="15" y1="12" x2="21" y2="12"></line><line x1="12" y1="3" x2="12" y2="9"></line><line x1="12" y1="15" x2="12" y2="21"></line></svg>
                   </div>
                   
                   <div className="flex flex-col gap-4 relative">
                      <div style={{ position: 'absolute', top: 0, bottom: 0, left: '7px', width: '2px', background: 'var(--outline-variant)' }}></div>
                      
                      <div className="orbit-card ghost-border relative" style={{ padding: '1rem', background: 'var(--surface-container-lowest)', marginLeft: '1rem' }}>
                         <div style={{ position: 'absolute', left: '-1rem', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '2px', background: 'var(--outline-variant)' }}></div>
                         <div className="flex justify-between items-center mb-1">
                            <span style={{ fontSize: '0.65rem', color: 'var(--on-surface-variant)' }}>14:22:00</span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--tertiary)' }}>PENDING</span>
                         </div>
                         <div className="label-md mb-1" style={{ color: 'var(--on-surface)' }}>CORE INITIATED</div>
                         <div style={{ fontSize: '0.65rem', color: 'var(--on-surface-variant)' }}>Endpoint: /v2/bridge/verify</div>
                      </div>

                      <div className="orbit-card ghost-border relative" style={{ padding: '1rem', background: 'var(--surface-container-lowest)', marginLeft: '1rem' }}>
                         <div style={{ position: 'absolute', left: '-1rem', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '2px', background: 'var(--outline-variant)' }}></div>
                         <div className="flex justify-between items-center mb-1">
                            <span style={{ fontSize: '0.65rem', color: 'var(--on-surface-variant)' }}>14:22:01</span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--primary)' }}>SUCCESS</span>
                         </div>
                         <div className="label-md mb-1" style={{ color: 'var(--on-surface)' }}>AUTH SUCCESS</div>
                         <div style={{ fontSize: '0.65rem', color: 'var(--on-surface-variant)' }}>Bearer token signature validated</div>
                      </div>

                      <div className="orbit-card relative" style={{ padding: '1rem', background: 'var(--surface-container-lowest)', marginLeft: '1rem', borderTop: '2px solid var(--tertiary)' }}>
                         <div style={{ position: 'absolute', left: '-1rem', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '2px', background: 'var(--outline-variant)' }}></div>
                         <div className="flex justify-between items-center mb-1">
                            <span style={{ fontSize: '0.65rem', color: 'var(--on-surface-variant)' }}>14:22:01</span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--tertiary)' }}>CALLBACK</span>
                         </div>
                         <div className="label-md mb-1" style={{ color: 'var(--on-surface)' }}>EXTERNAL TRIGGER</div>
                         <div style={{ fontSize: '0.65rem', color: 'var(--on-surface-variant)' }}>Provider: Global AML Sync</div>
                      </div>
                   </div>
                </div>

                <div className="orbit-card ghost-border" style={{ padding: '1.5rem', background: 'var(--surface-container-low)' }}>
                   <div className="flex items-center gap-2 mb-4">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                      <h3 className="label-md">SOVEREIGN RECEIPT</h3>
                   </div>
                   <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', fontStyle: 'italic', marginBottom: '1.5rem' }}>
                     "Identity data is ephemeral. Only the mathematical proof of validation remains."
                   </p>
                   
                   <div className="flex flex-col gap-2">
                     <div className="flex justify-between items-center padding-y-2 border-b">
                        <span className="label-sm">SECURED BY ORBIT PROTOCOL</span>
                        <div className="status-dot"></div>
                     </div>
                     <div className="flex justify-between items-center padding-y-2 border-b mt-2">
                        <span className="label-sm">ENCRYPTION</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--on-surface)' }}>XCHACHA20-POLY1305</span>
                     </div>
                     <div className="flex justify-between items-center padding-y-2 border-b mt-2">
                        <span className="label-sm">SOVEREIGNTY SCORE</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--tertiary)' }}>MAXIMAL (99.9%)</span>
                     </div>
                     <div className="flex justify-between items-center padding-y-2 mt-2">
                        <span className="label-sm">NODE REDUNDANCY</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--on-surface)', fontWeight: 'bold' }}>128 SHARDS</span>
                     </div>
                   </div>
                </div>

                <div className="orbit-card flex-col gap-4 text-center" style={{ padding: '2rem', background: 'var(--primary)', color: 'var(--on-primary-fixed)' }}>
                   <h3 className="display-sm mb-2" style={{ color: 'var(--on-primary-fixed)' }}>SHARE PROOF</h3>
                   <p style={{ fontSize: '0.875rem', marginBottom: '2rem', color: 'rgba(32, 0, 95, 0.7)' }}>
                      Generate a one-time cryptographic link for 3rd party identity validation.
                   </p>
                   <button className="btn" style={{ background: 'var(--on-primary-fixed)', color: 'var(--primary)', width: '100%' }}>GENERATE ONE TIME LINK</button>
                </div>

             </div>
          </div>

          <div className="data-ribbon justify-end text-gradient mt-auto" style={{ padding: '0.5rem 0', margin: 'auto 0 -2rem 0', background: 'transparent' }}>
             <div className="flex gap-8">
                <div style={{ color: 'var(--on-surface)' }}>@2024 ORBIT ENGINE STABLE V4.2</div>
                <div style={{ color: 'var(--on-surface-variant)' }}>SYS HEALTH: 100%</div>
                <div style={{ color: 'var(--on-surface-variant)' }}>LATENCY: 4MS</div>
                <div style={{ color: 'var(--on-surface-variant)' }}>LEGAL</div>
             </div>
          </div>
        </div>
      </div>
    </>
  );
}

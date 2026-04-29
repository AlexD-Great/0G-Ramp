'use client';
import { useState } from 'react';
import TopNav from '../../components/TopNav';
import Sidebar from '../../components/Sidebar';
import BridgeForm from '../../components/BridgeForm';
import LiveLedger from '../../components/LiveLedger';

export default function TerminalPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <>
      <TopNav brand="ORBIT" active="BRIDGE" />
      <div className="flex" style={{ height: 'calc(100vh - 72px)' }}>
        <Sidebar />
        <div className="page-content flex flex-col" style={{ padding: '2rem 3rem' }}>
          
          <div className="flex gap-8" style={{ flex: 1 }}>
            
            {/* Left Column: Asset Config */}
            <div className="flex-col gap-6" style={{ width: '320px', flexShrink: 0 }}>
              <div>
                <h3 className="label-md mb-1" style={{ color: 'var(--on-surface)' }}>ASSET CONFIGURATION</h3>
                <div className="label-sm">DEFINE INGRESS PARAMETERS</div>
              </div>

              <div className="mt-8">
                 <div className="label-sm mb-2">SOURCE NETWORK</div>
                 <div className="orbit-card ghost-border flex items-center justify-between" style={{ padding: '1rem', cursor: 'pointer' }}>
                   <div className="flex items-center gap-4">
                     <div style={{ background: 'var(--surface-container-highest)', width: '32px', height: '32px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                     </div>
                     <div>
                       <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>ETHEREUM MAINNET</div>
                       <div style={{ fontSize: '0.65rem', color: 'var(--on-surface-variant)' }}>GAS LOW 12GWEI</div>
                     </div>
                   </div>
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                 </div>
              </div>

              <div className="mt-6">
                 <div className="label-sm mb-2">ASSET SELECTION</div>
                 <div className="orbit-card ghost-border" style={{ padding: '1.5rem', background: 'var(--surface-container)' }}>
                   <div className="flex items-center justify-between mb-8">
                     <div className="flex items-center gap-4">
                       <div style={{ background: 'var(--tertiary)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-primary-fixed)' }}>
                         $
                       </div>
                       <div>
                         <div style={{ fontSize: '1rem', fontWeight: 600 }}>USDT</div>
                         <div style={{ fontSize: '0.65rem', color: 'var(--on-surface-variant)' }}>STABLECOIN LIQUIDITY</div>
                       </div>
                     </div>
                     <div className="text-right">
                       <div className="label-sm">BALANCE</div>
                       <div style={{ fontSize: '0.875rem' }}>12,450.00</div>
                     </div>
                   </div>

                   <div className="display-sm mb-4" style={{ textAlign: 'center' }}>1000.00</div>

                   <div className="flex items-center justify-between" style={{ borderTop: '1px solid var(--outline-variant)', paddingTop: '1rem' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>≈ $1,000.00 USD</div>
                      <div className="flex gap-2">
                         <div className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.65rem' }}>25%</div>
                         <div className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.65rem' }}>MAX</div>
                      </div>
                   </div>
                 </div>
              </div>

              <div className="mt-6">
                 <div className="label-sm mb-2">DESTINATION ENDPOINT</div>
                 <div className="orbit-card ghost-border" style={{ padding: '1rem', border: '1px solid var(--tertiary)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--tertiary)', marginBottom: '0.5rem' }}>TARGET WALLET ADDRESS</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>0x71C7656EC7ab88b09...</div>
                 </div>
              </div>
            </div>

            {/* Middle Column: Orchestration Layer */}
            <div className="flex-col flex" style={{ flex: 1 }}>
              <div className="flex items-center justify-between mb-8">
                 <div>
                    <h3 className="label-md mb-1" style={{ color: 'var(--on-surface)' }}>ORCHESTRATION LAYER V2</h3>
                    <div className="label-sm flex items-center gap-2">
                       <div className="status-dot active" style={{ background: 'var(--tertiary)', boxShadow: '0 0 8px var(--tertiary)' }}></div>
                       LIVE COMPUTE VERIFICATION ACTIVE
                    </div>
                 </div>
                 <div className="orbit-card flex items-center gap-4" style={{ padding: '0.5rem 1rem', background: 'var(--surface-container-lowest)' }}>
                    <div className="text-right">
                       <div className="label-sm">NETWORK LOAD</div>
                       <div style={{ fontSize: '0.875rem', color: 'var(--secondary)' }}>HIGH LATENCY 18MS</div>
                    </div>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--secondary)" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                 </div>
              </div>

              <div className="orbit-card flex-col items-center justify-center ghost-border" style={{ flex: 1, position: 'relative', background: 'var(--surface-container-low)' }}>
                  {/* Nodes Simulation Diagram */}
                  <div className="flex gap-8 items-center justify-center w-full mt-4 mb-16 relative">
                     <div style={{ position: 'absolute', top: '50%', left: '20%', right: '20%', height: '2px', background: 'var(--outline-variant)', borderStyle: 'dashed', zIndex: 0 }}></div>
                     
                     <div className="flex flex-col items-center gap-4 relative z-10">
                        <div className="orbit-card flex items-center justify-center" style={{ width: '96px', height: '96px', background: 'var(--surface-container-highest)' }}>
                           <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--on-surface-variant)" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
                        </div>
                        <div className="text-center">
                           <div className="label-sm" style={{ color: 'var(--on-surface)' }}>INGRESS GATEWAY</div>
                           <div style={{ fontSize: '0.65rem', color: 'var(--on-surface-variant)' }}>SIG VERIFIED</div>
                        </div>
                     </div>

                     <div className="flex flex-col items-center gap-4 relative z-10">
                        <div style={{ position: 'absolute', top: '-24px', background: 'var(--tertiary)', color: 'var(--on-primary-fixed)', fontSize: '0.65rem', padding: '2px 8px', borderRadius: '2px', fontWeight: 'bold' }}>ACTIVE</div>
                        <div className="orbit-card flex items-center justify-center" style={{ width: '112px', height: '112px', border: '2px solid var(--tertiary)' }}>
                           <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--tertiary)" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>
                        </div>
                        <div className="text-center">
                           <div className="label-sm" style={{ color: 'var(--tertiary)' }}>0G COMPUTE CORE</div>
                           <div style={{ fontSize: '0.65rem', color: 'var(--on-surface-variant)' }}>PROCESSING JOBS...</div>
                        </div>
                     </div>

                     <div className="flex flex-col items-center gap-4 relative z-10">
                        <div className="orbit-card flex items-center justify-center opacity-50" style={{ width: '96px', height: '96px', background: 'var(--surface-container-highest)' }}>
                           <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--on-surface-variant)" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
                        </div>
                        <div className="text-center opacity-50">
                           <div className="label-sm" style={{ color: 'var(--on-surface)' }}>SETTLEMENT LAYER</div>
                           <div style={{ fontSize: '0.65rem', color: 'var(--on-surface-variant)' }}>PENDING QUEUE</div>
                        </div>
                     </div>
                  </div>
              </div>

              <BridgeForm onCreated={() => setRefreshKey((k) => k + 1)} />
            </div>

            {/* Right Column: Ledger */}
            <div className="flex-col gap-6" style={{ width: '300px', flexShrink: 0 }}>
              <div>
                <h3 className="label-md mb-1" style={{ color: 'var(--on-surface)' }}>SETTLEMENT LEDGER</h3>
                <div className="label-sm">RECENT NET ACTIVITY</div>
              </div>

              <div className="mt-8">
                <LiveLedger refreshKey={refreshKey} />
              </div>

              <div className="orbit-card mt-auto" style={{ border: '1px solid var(--outline-variant)' }}>
                 <div className="label-sm mb-4">SYSTEM TELEMETRY</div>
                 <div className="flex items-end gap-1" style={{ height: '40px', marginBottom: '1rem' }}>
                    {[20, 30, 45, 80, 60, 40, 50, 90, 70, 50, 40].map((h, i) => (
                      <div key={i} style={{ flex: 1, backgroundColor: h > 70 ? 'var(--tertiary)' : 'var(--surface-variant)', height: `${h}%`, borderRadius: '1px' }}></div>
                    ))}
                 </div>
                 <div className="flex justify-between" style={{ fontSize: '0.5rem', color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>
                    <div>NODE HEALTH 99.8%</div>
                    <div>0X4...F2</div>
                 </div>
              </div>
            </div>

          </div>

          <div className="data-ribbon justify-between mt-auto" style={{ padding: '0.5rem 0', margin: '2rem 0 -2rem 0', borderTop: '1px solid var(--outline-variant)', background: 'transparent' }}>
             <div>@2024 ORBIT OS V4.2.0 STABLE</div>
             <div className="flex gap-8">
                <div>SYS STATUS OK</div>
                <div style={{ color: 'var(--on-surface)' }}>LATENCY 12MS</div>
                <div>GH REPOS</div>
                <div>LEGAL PROX</div>
             </div>
          </div>
        </div>
      </div>
    </>
  );
}

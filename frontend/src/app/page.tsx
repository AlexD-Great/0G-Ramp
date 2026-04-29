'use client';
import { useState } from 'react';
import TopNav from '../components/TopNav';
import Sidebar from '../components/Sidebar';
import SystemStatus from '../components/SystemStatus';

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <TopNav brand="OG RAMP CORE" active="BRIDGE" onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex" style={{ height: 'calc(100vh - 72px)', overflow: 'hidden' }}>
        {sidebarOpen && <Sidebar />}
        <div className="page-content flex justify-center" style={{ padding: '4rem', flex: 1, overflow: 'auto' }}>
          <div style={{ maxWidth: '1200px', width: '100%' }}>

          <SystemStatus />

          <div className="mb-4 text-gradient-purple" style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', letterSpacing: '0.1em' }}>
                     ○ SYSTEM ACTIVE // ORBIT SYNC
          </div>

          <div className="flex gap-8 mb-8" style={{ alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <h1 className="display-lg mb-4">
                ACCELERATE<br/>
                THE<br/>
                <span className="text-gradient">VALUE LAYER</span>
              </h1>
              <p className="mb-8 p-0" style={{ color: 'var(--on-surface-variant)', fontSize: '1.25rem', maxWidth: '400px', lineHeight: '1.6' }}>
                High-performance orchestration for the 0G compute era. Execute deep-liquidity flows through refined cryptographic tunnels.
              </p>
              <div className="flex gap-4">
                <a href="/terminal" className="btn btn-primary" style={{ padding: '1rem 2rem' }}>LAUNCH TERMINAL</a>
                <a href="https://docs.0g.ai/developer-hub/testnet/testnet-overview" target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ padding: '1rem 2rem' }}>TECHNICAL DOCS</a>
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <div className="orbit-card ghost-border" style={{ padding: '0', background: 'var(--surface-container-low)', aspectRatio: '1/1', position: 'relative' }}>
                 <div style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', zIndex: 10, fontSize: '0.65rem', fontFamily: 'var(--font-display)', color: 'var(--on-surface)', letterSpacing: '0.1em' }}>
                   CORE LATENCY: 0.824MS<br/>
                   THROUGHPUT: 1.2TB/S
                 </div>
                 <div style={{ position: 'absolute', bottom: '1.5rem', right: '1.5rem', zIndex: 10, textAlign: 'right', fontSize: '0.65rem', fontFamily: 'var(--font-display)', color: 'var(--tertiary)', letterSpacing: '0.1em' }}>
                   ORCHESTRATION: 99.9% STABLE<br/>
                   VIOLET NODES: 4,096
                 </div>
                 <img src="/images/orchestration_engine.png" alt="Orchestration Engine" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8, borderRadius: 'var(--rounded-lg)' }} />
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '6rem', marginBottom: '4rem' }}>
            <h2 className="display-sm mb-8" style={{ letterSpacing: '0.2em' }}>ARCHITECTURAL <span style={{ color: 'var(--on-surface-variant)' }}>WORKFLOW</span></h2>
            
            <div className="flex gap-4">
              <div className="orbit-card flex-col gap-4 text-left" style={{ flex: 1, padding: '2.5rem 2rem' }}>
                <div className="display-md" style={{ color: 'var(--surface-bright)', marginBottom: '1rem' }}>01</div>
                <div className="flex items-center gap-2 mb-2">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
                  <h3 className="label-md">CLIENT LAYER</h3>
                </div>
                <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem', lineHeight: '1.6', marginBottom: '2rem' }}>
                  Direct integration via the 0G SDK. Secure, hardware-level signatures for all high-frequency requests.
                </p>
                <div style={{ background: 'var(--surface-container-lowest)', padding: '1rem', borderRadius: 'var(--rounded-sm)', fontFamily: 'monospace', fontSize: '0.65rem', color: 'var(--on-surface-variant)' }}>
                  &gt; REQUEST INITIATED<br/>
                  &gt; AUTH HANDSHAKE OK<br/>
                  &gt; PACKET VIOLET ENCRYPTED
                </div>
              </div>
              
              <div className="orbit-card flex-col gap-4 text-left" style={{ flex: 1, padding: '2.5rem 2rem' }}>
                <div className="display-md" style={{ color: 'var(--surface-bright)', marginBottom: '1rem' }}>02</div>
                <div className="flex items-center gap-2 mb-2">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--secondary)" strokeWidth="2"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"></polygon></svg>
                  <h3 className="label-md">ORCHESTRATION</h3>
                </div>
                <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem', lineHeight: '1.6', marginBottom: '2rem' }}>
                  The Kinetic Engine shards liquidity across the decentralized network, ensuring zero-latency execution.
                </p>
                <div style={{ background: 'var(--surface-container-lowest)', padding: '1rem', borderRadius: 'var(--rounded-sm)', fontFamily: 'monospace', fontSize: '0.65rem', color: 'var(--on-surface-variant)' }}>
                  &gt; SHARDING PROTOCOL ACTIVE<br/>
                  &gt; ROUTE ORBIT SYNC<br/>
                  &gt; COMPUTE LAYER MAPPED
                </div>
              </div>

              <div className="orbit-card flex-col gap-4 text-left" style={{ flex: 1, padding: '2.5rem 2rem' }}>
                <div className="display-md" style={{ color: 'var(--surface-bright)', marginBottom: '1rem' }}>03</div>
                <div className="flex items-center gap-2 mb-2">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--tertiary)" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                  <h3 className="label-md">SETTLEMENT</h3>
                </div>
                <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem', lineHeight: '1.6', marginBottom: '2rem' }}>
                  Finalized states committed to 0G Core, bridging value with cryptographic certainty and instant finality.
                </p>
                <div style={{ background: 'var(--surface-container-lowest)', padding: '1rem', borderRadius: 'var(--rounded-sm)', fontFamily: 'monospace', fontSize: '0.65rem', color: 'var(--on-surface-variant)' }}>
                  &gt; BLOCK FINALIZED V2<br/>
                  &gt; ASSET FLOW READY<br/>
                  &gt; RECONCILIATION STABLE
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 mb-16">
             <div className="orbit-card flex-col" style={{ flex: 2, padding: '2rem' }}>
                <div className="flex justify-between items-center mb-6">
                   <div className="label-md flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                      LIVE CORE PERFORMANCE
                   </div>
                   <div className="label-sm text-gradient">UPTIME: 99.999%</div>
                </div>
                <div className="flex gap-4 mb-6">
                   <div style={{ background: 'var(--surface-container-lowest)', padding: '1rem', flex: 1, borderRadius: 'var(--rounded-sm)' }}>
                      <div className="label-sm mb-1">VOLUME</div>
                      <div className="display-sm">$4.2B</div>
                   </div>
                   <div style={{ background: 'var(--surface-container-lowest)', padding: '1rem', flex: 1, borderRadius: 'var(--rounded-sm)' }}>
                      <div className="label-sm mb-1">NODES</div>
                      <div className="display-sm">12,842</div>
                   </div>
                   <div style={{ background: 'var(--surface-container-lowest)', padding: '1rem', flex: 1, borderRadius: 'var(--rounded-sm)' }}>
                      <div className="label-sm mb-1">LATENCY</div>
                      <div className="display-sm" style={{ color: 'var(--tertiary)' }}>120ms</div>
                   </div>
                   <div style={{ background: 'var(--surface-container-lowest)', padding: '1rem', flex: 1, borderRadius: 'var(--rounded-sm)' }}>
                      <div className="label-sm mb-1">GAS DELTA</div>
                      <div className="display-sm">94.2%</div>
                   </div>
                </div>
                <div style={{ height: '300px', width: '100%', background: 'var(--surface-container-lowest)', borderRadius: 'var(--rounded-sm)', overflow: 'hidden' }}>
                   <img src="/images/live_core_performance.png" alt="Live Core Performance" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
             </div>

             <div className="flex-col gap-4" style={{ flex: 1, display: 'flex' }}>
                <div className="orbit-card flex-col justify-between" style={{ flex: 1, background: 'var(--primary)' }}>
                   <div>
                      <h3 className="display-sm mb-2" style={{ color: 'var(--on-primary-fixed)' }}>BRIDGE ASSETS</h3>
                      <p style={{ color: 'rgba(32, 0, 95, 0.7)', fontSize: '0.875rem', lineHeight: '1.5' }}>
                        Refined cross-chain flows. Instant liquidity transfers between 0G and Ethereum.
                      </p>
                   </div>
                   <a href="/terminal" className="btn" style={{ background: 'var(--background)', color: 'var(--on-surface)', width: '100%', marginTop: '2rem', textAlign: 'center' }}>INITIATE BRIDGE</a>
                </div>
                <div className="orbit-card flex-col justify-between" style={{ flex: 1 }}>
                   <div>
                      <h3 className="display-sm mb-2" style={{ color: 'var(--secondary)' }}>NODE PORTAL</h3>
                      <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem', lineHeight: '1.5' }}>
                        Power the Obsidian Orbit. Provide compute and secure the orchestration layer.
                      </p>
                   </div>
                   <div className="flex gap-2" style={{ marginTop: '2rem' }}>
                      <a href="/node" className="btn btn-secondary flex-1" style={{ textAlign: 'center' }}>STAKE 0G</a>
                   </div>
                </div>
             </div>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '8rem' }}>
            <h2 className="display-md mb-8">
               SCALE THE <span className="text-gradient-purple">COMPUTE<br/>FRONTIER</span>
            </h2>
            <div className="flex gap-4 justify-center">
               <a href="/node" className="btn btn-primary">DEPLOY NODE</a>
               <a href="https://chainscan-galileo.0g.ai" target="_blank" rel="noreferrer" className="btn btn-secondary">VIEW EXPLORER</a>
            </div>
          </div>

          <div className="data-ribbon justify-between text-gradient" style={{ borderTop: '1px solid var(--outline-variant)' }}>
             <div>@2024 OBSIDIAN ORBIT LTD</div>
             <div className="flex gap-8">
                <div>BUILD V2.0.4 STABLE</div>
                <div style={{ color: 'var(--on-surface)' }}>SYS STATUS: STABLE</div>
                <div>LATENCY VISUALIZER</div>
                <div>DEVELOPER API</div>
                <div>LEGAL VAULT</div>
                <div style={{ color: 'var(--tertiary)' }}>◎ SECURE ORBIT ONLINE</div>
             </div>
          </div>

        </div>
      </div>
      </div>
    </>
  );
}

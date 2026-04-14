import TopNav from '../../components/TopNav';
import Sidebar from '../../components/Sidebar';

export default function NodePage() {
  return (
    <>
      <TopNav brand="ORBIT" active="LIQUIDITY" />
      <div className="flex" style={{ height: 'calc(100vh - 72px)' }}>
        <Sidebar />
        <div className="page-content flex flex-col gap-8" style={{ padding: '2rem 3rem', maxWidth: '1200px' }}>
          
          <div className="flex gap-8">
             <div className="orbit-card ghost-border flex-col justify-center" style={{ flex: 2, padding: '2.5rem', background: 'var(--surface-container-lowest)' }}>
                <div className="flex justify-between items-start mb-8">
                   <div>
                      <h2 className="label-md mb-1" style={{ color: 'var(--primary)' }}>SOVEREIGN VAULT ALPHA</h2>
                      <div className="label-sm">ID: 0x9823...F921 [VAULT A]</div>
                   </div>
                   <div className="btn" style={{ background: 'var(--surface)', border: '1px solid var(--outline-variant)', fontSize: '0.65rem' }}>SYPHON ACTIVE</div>
                </div>

                <div className="mb-8">
                   <span className="display-lg">14,829 00</span>
                   <span className="display-sm" style={{ color: 'var(--primary)', marginLeft: '1rem' }}>USDT</span>
                </div>

                <div className="flex gap-4">
                   <button className="btn btn-primary" style={{ padding: '1rem 3rem' }}>DEPOSIT</button>
                   <button className="btn btn-secondary" style={{ padding: '1rem 3rem' }}>WITHDRAW</button>
                </div>
             </div>

             <div className="orbit-card ghost-border active-indicator" style={{ flex: 1, padding: '2.5rem', background: 'var(--surface)' }}>
                <h3 className="label-md mb-6" style={{ letterSpacing: '0.15em' }}>TRUST ARCHITECTURE</h3>
                
                <div className="orbit-card ghost-border flex justify-between items-center mb-6" style={{ padding: '1rem', background: 'var(--surface-container-lowest)' }}>
                   <div className="flex items-center gap-2 label-sm" style={{ color: 'var(--on-surface)' }}>
                     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                     VAULT STORAGE
                   </div>
                   <div className="label-sm" style={{ color: 'var(--tertiary)' }}>SECURE</div>
                </div>

                <div className="mb-2 flex justify-between items-end">
                   <div className="label-sm">IDENTITY<br/>CLEARANCE</div>
                   <div className="label-sm" style={{ color: 'var(--on-surface)' }}>L3 INSTITUTIONAL</div>
                </div>
                <div style={{ width: '100%', height: '4px', background: 'var(--outline-variant)', borderRadius: '2px', marginBottom: '2rem' }}>
                   <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, var(--primary) 0%, var(--tertiary) 100%)', borderRadius: '2px' }}></div>
                </div>

                <div className="flex items-center gap-2 label-sm">
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--tertiary)" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                   PROOF HASH 8812...AC91
                </div>
             </div>
          </div>

          <div className="orbit-card ghost-border" style={{ padding: '2.5rem', background: 'var(--surface-container-low)' }}>
             <div className="flex justify-between items-center mb-8">
                <h2 className="label-md" style={{ letterSpacing: '0.15em', color: 'var(--on-surface)' }}>LIQUIDITY GATEWAYS</h2>
                <a href="#" className="label-sm" style={{ color: 'var(--tertiary)', textDecoration: 'underline' }}>Attach Provisioner</a>
             </div>

             <div className="flex gap-4">
                <div className="orbit-card ghost-border flex items-center justify-between" style={{ flex: 1, padding: '1.5rem', background: 'var(--surface-container-lowest)', cursor: 'pointer' }}>
                   <div className="flex items-center gap-4">
                      <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'linear-gradient(135deg, #635bff 0%, #00d4ff 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <div style={{ width: '16px', height: '16px', background: 'white', borderRadius: '2px' }}></div>
                      </div>
                      <div>
                         <div className="label-md" style={{ color: 'var(--on-surface)' }}>STRIPE PRO</div>
                         <div className="label-sm">VISA •••• 4242</div>
                      </div>
                   </div>
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--on-surface-variant)" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>

                <div className="orbit-card ghost-border flex items-center justify-between" style={{ flex: 1, padding: '1.5rem', background: 'var(--surface-container-lowest)', cursor: 'pointer' }}>
                   <div className="flex items-center gap-4">
                      <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: '#00c3f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <div style={{ width: '16px', height: '16px', background: 'white' }}></div>
                      </div>
                      <div>
                         <div className="label-md" style={{ color: 'var(--on-surface)' }}>PAYSTACK V3</div>
                         <div className="label-sm">Sovereign Link</div>
                      </div>
                   </div>
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--on-surface-variant)" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>
             </div>
          </div>

          <div className="orbit-card ghost-border" style={{ padding: '2.5rem', background: 'var(--surface-container-low)' }}>
             <div className="flex justify-between items-center mb-8">
                <h2 className="label-md" style={{ letterSpacing: '0.15em', color: 'var(--on-surface)' }}>CHRONOLOGICAL LEDGER</h2>
                <div className="flex gap-2">
                   <div className="input-container" style={{ margin: 0, padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--on-surface-variant)" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                      <input type="text" placeholder="Filter ledger..." style={{ fontSize: '0.75rem' }} />
                   </div>
                   <button className="btn btn-secondary" style={{ padding: '0.5rem' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>
                   </button>
                </div>
             </div>

             <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', fontFamily: 'var(--font-display)' }}>
                <thead>
                   <tr style={{ color: 'var(--on-surface-variant)', borderBottom: '1px solid var(--outline-variant)', textAlign: 'left' }}>
                      <th style={{ padding: '1rem', fontWeight: 'normal' }}>TIMESTAMP</th>
                      <th style={{ padding: '1rem', fontWeight: 'normal' }}>OPERATION</th>
                      <th style={{ padding: '1rem', fontWeight: 'normal' }}>ASSET</th>
                      <th style={{ padding: '1rem', fontWeight: 'normal' }}>MAGNITUDE</th>
                      <th style={{ padding: '1rem', fontWeight: 'normal' }}>CLEARANCE</th>
                      <th style={{ padding: '1rem', fontWeight: 'normal' }}>NETWORK REF</th>
                   </tr>
                </thead>
                <tbody>
                   <tr style={{ borderBottom: '1px solid var(--outline-variant)' }}>
                      <td style={{ padding: '1.5rem 1rem', color: 'var(--on-surface-variant)' }}>2024.05.24 14:32</td>
                      <td style={{ padding: '1.5rem 1rem' }} className="flex items-center gap-2">
                         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
                         RAMP IN
                      </td>
                      <td style={{ padding: '1.5rem 1rem', color: 'var(--primary)' }}>USDT</td>
                      <td style={{ padding: '1.5rem 1rem', fontWeight: 'bold' }}>+ 1,200.00</td>
                      <td style={{ padding: '1.5rem 1rem' }}>
                         <span style={{ border: '1px solid var(--outline-variant)', padding: '0.25rem 0.5rem', borderRadius: '1rem', fontSize: '0.65rem' }}>CLEARED</span>
                      </td>
                      <td style={{ padding: '1.5rem 1rem', color: 'var(--on-surface-variant)' }}>0x71A...BD4E</td>
                   </tr>
                   <tr style={{ borderBottom: '1px solid var(--outline-variant)' }}>
                      <td style={{ padding: '1.5rem 1rem', color: 'var(--on-surface-variant)' }}>2024.05.24 11:05</td>
                      <td style={{ padding: '1.5rem 1rem' }} className="flex items-center gap-2">
                         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--tertiary)" strokeWidth="2"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg>
                         BRIDGE
                      </td>
                      <td style={{ padding: '1.5rem 1rem', color: 'var(--tertiary)' }}>ETH</td>
                      <td style={{ padding: '1.5rem 1rem', fontWeight: 'bold' }}>- 0.450.00</td>
                      <td style={{ padding: '1.5rem 1rem' }}>
                         <span style={{ border: '1px solid var(--tertiary)', color: 'var(--tertiary)', padding: '0.25rem 0.5rem', borderRadius: '1rem', fontSize: '0.65rem' }}>PENDING</span>
                      </td>
                      <td style={{ padding: '1.5rem 1rem', color: 'var(--on-surface-variant)' }}>0x922...EE12</td>
                   </tr>
                   <tr style={{ borderBottom: '1px solid var(--outline-variant)' }}>
                      <td style={{ padding: '1.5rem 1rem', color: 'var(--on-surface-variant)' }}>2024.05.23 23:59</td>
                      <td style={{ padding: '1.5rem 1rem' }} className="flex items-center gap-2">
                         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
                         RAMP IN
                      </td>
                      <td style={{ padding: '1.5rem 1rem', color: 'var(--primary)' }}>USDC</td>
                      <td style={{ padding: '1.5rem 1rem', fontWeight: 'bold' }}>+ 5,000.00</td>
                      <td style={{ padding: '1.5rem 1rem' }}>
                         <span style={{ border: '1px solid var(--outline-variant)', padding: '0.25rem 0.5rem', borderRadius: '1rem', fontSize: '0.65rem' }}>CLEARED</span>
                      </td>
                      <td style={{ padding: '1.5rem 1rem', color: 'var(--on-surface-variant)' }}>0x442...CD91</td>
                   </tr>
                </tbody>
             </table>
             
             <div style={{ textAlign: 'center', marginTop: '2rem' }}>
               <button className="btn btn-tertiary" style={{ width: '100%', border: '1px solid var(--outline-variant)' }}>RETRIEVE ARCHIVAL DATA</button>
             </div>
          </div>

          <div className="data-ribbon justify-end text-gradient" style={{ padding: '0.5rem 0', margin: 'auto 0 -2rem 0', background: 'transparent' }}>
             <div className="flex gap-8">
                <div style={{ color: 'var(--on-surface)' }}>ORBIT CORE V2.5.0 LATEST</div>
                <div className="flex items-center gap-2"><div className="status-dot"></div> NODE STABLE</div>
                <div style={{ color: 'var(--on-surface-variant)' }}>LATENCY 8MS</div>
                <div style={{ color: 'var(--on-surface-variant)' }}>Repository</div>
                <div style={{ color: 'var(--on-surface-variant)' }}>Compliance</div>
                <div style={{ color: 'var(--tertiary)' }}>Sovereign Identity Verified</div>
             </div>
          </div>
        </div>
      </div>
    </>
  );
}

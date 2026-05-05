import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '../lib/auth';
import BottomNav from '../components/BottomNav';

export const metadata: Metadata = {
  title: '0G Ramp | Sovereign Orchestrator',
  description: 'High-performance orchestration for the 0G compute era.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <div className="app-container">
            <main className="w-full flex-col flex">{children}</main>
          </div>
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}

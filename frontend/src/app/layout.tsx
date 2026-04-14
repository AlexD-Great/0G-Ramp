import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '0G Ramp | Sovereign Orchestrator',
  description: 'High-performance orchestration for the 0G compute era.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="app-container">
          <main className="w-full flex-col flex">{children}</main>
        </div>
      </body>
    </html>
  );
}

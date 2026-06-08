import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EPC Tender Screening MCP',
  description: 'MCP server and showcase UI for evidence-based EPC tender screening.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'EPC Tender Screening MCP',
  description: 'MCP server for evidence-based EPC tender screening.',
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

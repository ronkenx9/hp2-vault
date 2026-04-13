import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HP2-Vault | PayFi Merchant Console",
  description: "AI-guarded yield-bearing escrow on HashKey Chain",
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

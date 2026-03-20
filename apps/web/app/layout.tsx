import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "QueueKeeper",
  description: "Private queue procurement with staged escrow."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

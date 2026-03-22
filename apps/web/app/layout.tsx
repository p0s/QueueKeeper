import "./globals.css";
import type { Metadata } from "next";
import Script from "next/script";
import { Manrope, Space_Grotesk } from "next/font/google";
import { ThemeToggle } from "../components/theme-toggle";

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["500", "600", "700"]
});

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700", "800"]
});

export const metadata: Metadata = {
  title: "QueueKeeper — Private Scout-and-Hold Procurement",
  description: "Privately procure a verified human to scout, hold, or hand off scarce real-world access with proof-backed micropayments."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={`${headingFont.variable} ${bodyFont.variable}`} lang="en" suppressHydrationWarning>
      <body>
        <Script id="queuekeeper-theme-init" strategy="beforeInteractive">
          {`
            try {
              const stored = window.localStorage.getItem('queuekeeper-theme');
              const theme = stored === 'dark' ? 'dark' : 'light';
              document.documentElement.dataset.theme = theme;
              document.documentElement.style.colorScheme = theme;
            } catch (error) {
              document.documentElement.dataset.theme = 'light';
              document.documentElement.style.colorScheme = 'light';
            }
          `}
        </Script>
        <ThemeToggle />
        {children}
      </body>
    </html>
  );
}

import "@rainbow-me/rainbowkit/styles.css";
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

// Client component to suppress console errors
function ConsoleErrorSuppressor() {
  if (typeof window !== 'undefined') {
    const originalError = console.error;
    console.error = (...args: unknown[]) => {
      // Filter out "Failed to fetch" errors from RainbowKit/WalletConnect
      const errorMessage = args.join(' ');
      if (errorMessage.includes('Failed to fetch') &&
          (errorMessage.includes('reown') || errorMessage.includes('walletconnect'))) {
        return; // Suppress this specific error
      }
      originalError.apply(console, args);
    };
  }
  return null;
}

export const metadata: Metadata = {
  title: "Cloak & Clash | Encrypted Rock Paper Scissors",
  description:
    "Battle in a privacy-preserving Rock Paper Scissors arena powered by Zama FHEVM.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.2),_rgba(15,23,42,0.9))]" />
        <ConsoleErrorSuppressor />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

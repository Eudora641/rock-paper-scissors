import { Button } from "@/components/ui/button";
import arenaLogo from "@/assets/arena-logo.png";

interface HeaderProps {
  onConnectWallet: () => void;
  isConnected: boolean;
}

/**
 * Header component for the Cloak & Clash application
 * Displays the logo, title, and wallet connection button
 */

export const Header = ({ onConnectWallet, isConnected }: HeaderProps) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <img src={arenaLogo} alt="Arena Logo" className="h-8 w-8 sm:h-10 sm:w-10 animate-glow-pulse" />
          <h1 className="text-lg sm:text-xl font-bold text-primary truncate">Hidden Loadout Arena</h1>
        </div>

        <div className="flex items-center gap-4">
          <h2 className="hidden lg:block text-base lg:text-lg font-semibold text-foreground/90">
            Fight Fair. Fight Unknown.
          </h2>
        
        <Button
          onClick={onConnectWallet}
          variant={isConnected ? "secondary" : "default"}
          className="font-semibold"
        >
          {isConnected ? "Wallet Connected" : "Connect Rainbow Wallet"}
        </Button>
      </div>
    </header>
  );
};

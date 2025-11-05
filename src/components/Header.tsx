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
      <div className="container mx-auto flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <img src={arenaLogo} alt="Arena Logo" className="h-10 w-10 animate-glow-pulse" />
          <h1 className="text-xl font-bold text-primary">Hidden Loadout Arena</h1>
        </div>
        
        <h2 className="hidden md:block text-lg font-semibold text-foreground/90">
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

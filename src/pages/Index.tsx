import { useState } from "react";
import { Header } from "@/components/Header";
import { MatchmakingLobby } from "@/components/MatchmakingLobby";
import { toast } from "sonner";
import heroBackground from "@/assets/hero-bg.jpg";

/**
 * Main landing page component for Cloak & Clash
 * Displays the hero section, game introduction, and matchmaking interface
 */
const Index = () => {
  const [isWalletConnected, setIsWalletConnected] = useState(false);

  const handleConnectWallet = () => {
    if (!isWalletConnected) {
      toast.success("Rainbow Wallet Connected!", {
        description: "Your competitive identity is now synced.",
      });
      setIsWalletConnected(true);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onConnectWallet={handleConnectWallet} isConnected={isWalletConnected} />
      
      {/* Hero Section */}
      <section 
        className="relative pt-32 pb-20 overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.8), hsl(var(--background))), url(${heroBackground})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="container mx-auto px-6 text-center relative z-10">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent animate-slide-up">
            Fight Fair. Fight Unknown.
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-8 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            Your loadout stays encrypted until combat begins. No counter-picking. Pure skill.
          </p>
          {!isWalletConnected && (
            <div className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <p className="text-accent mb-4 font-medium">Connect Rainbow Wallet to enter the arena</p>
            </div>
          )}
        </div>
        
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background pointer-events-none" />
      </section>

      {/* Game Introduction */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            How It Works
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Experience competitive gaming where strategy matters more than memorization
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="p-6 rounded-xl border border-primary/20 bg-card/30 backdrop-blur-sm hover:border-primary/40 transition-all hover:scale-105">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2 text-foreground">Encrypted Loadouts</h3>
            <p className="text-muted-foreground">
              Your equipment and abilities stay hidden until combat begins. No peeking, no counter-picking.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-secondary/20 bg-card/30 backdrop-blur-sm hover:border-secondary/40 transition-all hover:scale-105">
            <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2 text-foreground">Pure Skill</h3>
            <p className="text-muted-foreground">
              Win through adaptation and strategy, not meta-gaming. Every match is a fresh challenge.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-accent/20 bg-card/30 backdrop-blur-sm hover:border-accent/40 transition-all hover:scale-105">
            <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2 text-foreground">Real-Time Combat</h3>
            <p className="text-muted-foreground">
              Face opponents in fast-paced battles where your decisions matter more than your prep time.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      {isWalletConnected ? (
        <MatchmakingLobby />
      ) : (
        <div className="container mx-auto px-6 py-20 text-center">
          <div className="max-w-md mx-auto p-8 rounded-2xl border-2 border-primary/20 bg-card/30 backdrop-blur-sm animate-glow-pulse">
            <p className="text-lg text-muted-foreground mb-4">
              Rainbow Wallet connection required to sync your competitive identity and enter matchmaking.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;

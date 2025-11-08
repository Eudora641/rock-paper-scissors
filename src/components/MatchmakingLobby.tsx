import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadoutSlot } from "./LoadoutSlot";
import { PlayerCard } from "./PlayerCard";
import { Swords, Clock } from "lucide-react";

/**
 * Matchmaking lobby component that handles loadout selection and opponent matching
 * Displays encrypted opponent loadout and provides match status tracking
 */
export const MatchmakingLobby = () => {
  const [isReady, setIsReady] = useState(false);
  const [searchTime, setSearchTime] = useState(0);

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Left Side - Your Loadout */}
        <div className="space-y-6 animate-slide-up">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Your Loadout</h2>
            <p className="text-muted-foreground">
              Select your equipment. Opponents won't see it until battle starts.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 p-6 rounded-xl border-2 border-border bg-card/30 backdrop-blur-sm">
            <LoadoutSlot type="weapon" isEncrypted={false} rarity="epic" />
            <LoadoutSlot type="armor" isEncrypted={false} rarity="rare" />
            <LoadoutSlot type="ability" isEncrypted={false} rarity="legendary" />
            <LoadoutSlot type="special" isEncrypted={false} rarity="epic" />
          </div>
          
          <Button
            onClick={() => setIsReady(!isReady)}
            className={`w-full h-14 text-lg font-bold transition-all duration-300 ${
              isReady ? "bg-primary hover:bg-primary/90" : ""
            }`}
            variant={isReady ? "default" : "outline"}
          >
            {isReady ? "Ready!" : "Lock In Loadout"}
          </Button>
        </div>

        {/* Right Side - Match Status */}
        <div className="space-y-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Match Lobby</h2>
            <p className="text-muted-foreground flex items-center gap-2">
              <Swords className="h-4 w-4 animate-pulse" />
              <span className="animate-pulse">Waiting for opponent</span>
              <span className="flex gap-1 ml-2">
                <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: "0s" }}></span>
                <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></span>
                <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></span>
              </span>
            </p>
          </div>

          {/* Opponent Loadout - Encrypted */}
          <div className="p-6 rounded-xl border-2 border-accent/30 bg-gradient-to-br from-card/30 to-accent/5 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Opponent Loadout</h3>
              <div className="px-3 py-1 rounded-full bg-accent/20 border border-accent/50 text-accent text-xs font-bold animate-encrypted-pulse">
                ENCRYPTED
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <LoadoutSlot type="weapon" isEncrypted={true} />
              <LoadoutSlot type="armor" isEncrypted={true} />
              <LoadoutSlot type="ability" isEncrypted={true} />
              <LoadoutSlot type="special" isEncrypted={true} />
            </div>
          </div>

          {/* Players */}
          <div className="space-y-3">
            <PlayerCard playerName="You" isReady={isReady} isYou={true} />
            <PlayerCard playerName="Searching..." isReady={false} />
          </div>

          {/* Match Timer */}
          <div className="flex items-center justify-center gap-2 text-muted-foreground p-4 rounded-lg border border-border bg-card/20">
            <Clock className="h-5 w-5 animate-glow-pulse" />
            <span className="font-mono text-sm">Matchmaking: 0:{searchTime.toString().padStart(2, '0')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

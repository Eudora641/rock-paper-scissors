import { Shield, Sword, Zap, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Props for the LoadoutSlot component
 */
interface LoadoutSlotProps {
  type: "weapon" | "armor" | "ability" | "special";
  isEncrypted: boolean;
  rarity?: "common" | "rare" | "epic" | "legendary";
}

const iconMap = {
  weapon: Sword,
  armor: Shield,
  ability: Zap,
  special: Eye,
};

const rarityColors = {
  common: "from-muted to-muted-foreground/20",
  rare: "from-secondary to-primary/30",
  epic: "from-accent to-primary/40",
  legendary: "from-primary to-accent",
};

export const LoadoutSlot = ({ type, isEncrypted, rarity = "common" }: LoadoutSlotProps) => {
  const Icon = iconMap[type];
  
  return (
    <div className="relative group">
      <div
        className={cn(
          "relative h-24 w-24 rounded-lg border-2 transition-all duration-300",
          "bg-gradient-to-br flex items-center justify-center",
          isEncrypted
            ? "border-accent/50 from-muted/50 to-accent/10 animate-encrypted-pulse"
            : `border-primary/50 ${rarityColors[rarity]}`,
          "hover:scale-105 hover:shadow-[0_0_20px_hsl(var(--neon-glow)/0.4)]"
        )}
      >
        <Icon
          className={cn(
            "h-10 w-10 transition-all duration-300",
            isEncrypted ? "text-accent blur-md opacity-40" : "text-primary"
          )}
        />
        
        {isEncrypted && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-accent text-xs font-bold tracking-wider opacity-80">
              ENCRYPTED
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-2 text-center text-xs text-muted-foreground capitalize">
        {type}
      </div>
    </div>
  );
};

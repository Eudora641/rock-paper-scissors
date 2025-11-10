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
  common: "from-gray-400 to-gray-600 border-gray-500",
  rare: "from-blue-400 to-blue-600 border-blue-500",
  epic: "from-purple-400 to-purple-600 border-purple-500",
  legendary: "from-yellow-400 via-orange-500 to-red-500 border-yellow-500",
};

const rarityGlow = {
  common: "shadow-gray-500/20",
  rare: "shadow-blue-500/30",
  epic: "shadow-purple-500/40",
  legendary: "shadow-yellow-500/50",
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
            : `border-2 ${rarityColors[rarity]} ${rarityGlow[rarity]}`,
          "hover:scale-105 hover:shadow-lg transition-all duration-300"
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

import { User, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Props for the PlayerCard component
 */
interface PlayerCardProps {
  playerName: string;
  isReady: boolean;
  isYou?: boolean;
}

export const PlayerCard = ({ playerName, isReady, isYou = false }: PlayerCardProps) => {
  return (
    <div
      className={cn(
        "relative rounded-xl border-2 p-6 transition-all duration-300",
        "bg-card/50 backdrop-blur-sm",
        isReady
          ? "border-primary shadow-[0_0_20px_hsl(var(--neon-glow)/0.3)]"
          : "border-border hover:border-primary/50"
      )}
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          "h-12 w-12 rounded-full flex items-center justify-center",
          "bg-gradient-to-br from-primary/20 to-accent/20 border-2",
          isReady ? "border-primary" : "border-border"
        )}>
          <User className="h-6 w-6 text-primary" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">
              {playerName}
            </h3>
            {isYou && (
              <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary font-medium">
                YOU
              </span>
            )}
          </div>
          <p className={cn(
            "text-sm mt-1 font-medium",
            isReady ? "text-primary" : "text-muted-foreground"
          )}>
            {isReady ? "Ready for Battle" : "Selecting Loadout..."}
          </p>
        </div>
        
        {isReady && (
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center animate-glow-pulse">
            <Check className="h-5 w-5 text-primary-foreground" />
          </div>
        )}
      </div>
    </div>
  );
};

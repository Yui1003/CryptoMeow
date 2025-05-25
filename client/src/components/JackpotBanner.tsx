import { useQuery } from "@tanstack/react-query";
import { Trophy, Info } from "lucide-react";
import { Jackpot } from "@shared/schema";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function JackpotBanner() {
  const { data: jackpot } = useQuery<Jackpot>({
    queryKey: ["/api/jackpot"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  return (
    <TooltipProvider>
      <div className="gradient-pink py-3 animate-pulse-slow animate-glow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center space-x-4">
            <Trophy className="text-2xl animate-bounce text-black animate-float" />
            <div className="text-center text-black">
              <div className="text-sm font-medium">GRAND JACKPOT</div>
              <div className="text-xl font-bold animate-jackpot text-glow">
                {jackpot ? parseFloat(jackpot.amount).toFixed(4) : "0.1000"} $MEOW
              </div>
            </div>
            <div className="text-xs bg-black/30 px-2 py-1 rounded text-white animate-twinkle">
              2-10% WIN CHANCE
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-black/70 hover:text-black cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-sm">
                  You have a chance to win the jackpot $MEOW on every game round, 
                  even if you lose the main game! Your jackpot chance increases 
                  with each bet you place.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
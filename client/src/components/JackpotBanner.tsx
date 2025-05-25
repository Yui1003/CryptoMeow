import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import { Jackpot } from "@shared/schema";

export default function JackpotBanner() {
  const { data: jackpot } = useQuery<Jackpot>({
    queryKey: ["/api/jackpot"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  return (
    <div className="gradient-gold py-3 animate-pulse-slow animate-glow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center space-x-4">
          <Trophy className="text-2xl animate-bounce text-black animate-float" />
          <div className="text-center text-black">
            <div className="text-sm font-medium">GRAND JACKPOT</div>
            <div className="text-xl font-bold animate-jackpot text-glow">
              {jackpot ? parseFloat(jackpot.amount).toFixed(4) : "0.1000"} $MEOW
            </div>
          </div>
          <div className="text-xs bg-black/20 px-2 py-1 rounded text-black animate-twinkle">
            2-10% WIN CHANCE
          </div>
        </div>
      </div>
    </div>
  );
}
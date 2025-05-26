
import { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, Zap, TrendingUp, ShoppingCart } from "lucide-react";

interface GameHUDProps {
  farmData: any;
  user: any;
  unclaimedMeow: number;
  onClaimRewards: () => void;
  onOpenShop: () => void;
  className?: string;
}

export default function GameHUD({ 
  farmData, 
  user, 
  unclaimedMeow, 
  onClaimRewards, 
  onOpenShop,
  className = ""
}: GameHUDProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (unclaimedMeow > 0) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [unclaimedMeow]);

  return (
    <div className={`absolute top-4 left-4 right-4 z-10 ${className}`}>
      <div className="flex justify-between items-start">
        {/* Left side - Stats */}
        <div className="flex gap-2">
          <Card className="crypto-gray border-crypto-pink/20 backdrop-blur-sm bg-opacity-90">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 crypto-gold" />
                <div>
                  <div className="text-xs text-gray-400">Balance</div>
                  <div className="text-sm font-bold text-crypto-pink">
                    {parseFloat(user?.meowBalance || "0").toFixed(4)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="crypto-gray border-crypto-pink/20 backdrop-blur-sm bg-opacity-90">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 crypto-green" />
                <div>
                  <div className="text-xs text-gray-400">Production</div>
                  <div className="text-sm font-bold crypto-green">
                    {farmData ? `${parseFloat(farmData.totalProduction || "0").toFixed(4)}/h` : "0/h"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`crypto-gray border-crypto-pink/20 backdrop-blur-sm bg-opacity-90 transition-all duration-300 ${
            isAnimating ? 'scale-105 border-crypto-green' : ''
          }`}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Zap className={`w-4 h-4 ${isAnimating ? 'crypto-green animate-pulse' : 'crypto-gold'}`} />
                <div>
                  <div className="text-xs text-gray-400">Unclaimed</div>
                  <div className={`text-sm font-bold ${isAnimating ? 'crypto-green' : 'text-crypto-pink'}`}>
                    {unclaimedMeow.toFixed(4)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right side - Actions */}
        <div className="flex gap-2">
          <Button
            onClick={onOpenShop}
            className="bg-purple-600 hover:bg-purple-700 text-white"
            size="sm"
          >
            <ShoppingCart className="w-4 h-4 mr-1" />
            Shop
          </Button>

          <Button
            onClick={onClaimRewards}
            disabled={unclaimedMeow <= 0}
            className={`transition-all duration-300 ${
              unclaimedMeow > 0 
                ? 'bg-crypto-green hover:bg-green-500 text-white animate-pulse' 
                : 'bg-gray-600 text-gray-400'
            }`}
            size="sm"
          >
            <Zap className="w-4 h-4 mr-1" />
            Claim
          </Button>
        </div>
      </div>
    </div>
  );
}

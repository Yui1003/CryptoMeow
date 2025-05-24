import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

const BET_AMOUNTS = [0.25, 0.50, 1.00, 1.50, 2.00, 5.00, 10.00, 50.00, 100.00, 500.00, 1000.00];

interface BettingPanelProps {
  selectedBet: number;
  onBetSelect: (amount: number) => void;
}

export default function BettingPanel({ selectedBet, onBetSelect }: BettingPanelProps) {
  return (
    <Card className="crypto-gray border-crypto-pink/20">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Betting Options</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-11 gap-2 mb-4">
          {BET_AMOUNTS.map((amount) => (
            <Button
              key={amount}
              variant={selectedBet === amount ? "default" : "outline"}
              size="sm"
              onClick={() => onBetSelect(amount)}
              className={`
                ${selectedBet === amount 
                  ? "crypto-pink border-crypto-pink" 
                  : "crypto-black border-crypto-pink/30 hover:bg-crypto-pink hover:border-crypto-pink"
                }
                transition-all duration-200 text-sm font-semibold
              `}
            >
              {amount}
            </Button>
          ))}
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <div className="text-gray-400">
            Selected Bet: <span className="text-crypto-pink font-semibold">{selectedBet.toFixed(2)}</span> Coins
          </div>
          <div className="text-gray-400 flex items-center">
            <Shield className="w-4 h-4 crypto-green mr-1" />
            Provably Fair Gaming
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

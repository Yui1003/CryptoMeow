
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BettingPanel from "@/components/BettingPanel";
import { generateServerSeed, generateClientSeed, calculateResult } from "@/lib/provablyFair";
import { Sparkles, RotateCcw } from "lucide-react";

const SYMBOLS = [
  { symbol: "🍒", value: "cherry", color: "text-red-500", multiplier: 2 },
  { symbol: "🍋", value: "lemon", color: "text-yellow-500", multiplier: 3 },
  { symbol: "🍊", value: "orange", color: "text-orange-500", multiplier: 4 },
  { symbol: "🍇", value: "grape", color: "text-purple-500", multiplier: 5 },
  { symbol: "🔔", value: "bell", color: "text-yellow-400", multiplier: 8 },
  { symbol: "💎", value: "diamond", color: "text-blue-400", multiplier: 10 },
  { symbol: "7️⃣", value: "seven", color: "text-red-600", multiplier: 20 },
];

export default function Wheel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedBet, setSelectedBet] = useState(1.00);
  const [isSpinning, setIsSpinning] = useState(false);
  const [reels, setReels] = useState([0, 0, 0]);
  const [winningCombination, setWinningCombination] = useState<number[] | null>(null);
  const [spinHistory, setSpinHistory] = useState<{ symbols: string[], multiplier: number }[]>([]);

  const playGameMutation = useMutation({
    mutationFn: async (gameData: any) => {
      const response = await apiRequest("POST", "/api/games/play", gameData);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      if (data.jackpotWin) {
        toast({
          title: "🎉 JACKPOT WON! 🎉",
          description: `You won ${parseFloat(data.meowWon).toFixed(4)} $MEOW!`,
        });
      }
    },
  });

  const getRandomSymbolIndex = (result: number, offset: number): number => {
    const adjustedResult = (result + offset) % 1;
    return Math.floor(adjustedResult * SYMBOLS.length);
  };

  const calculateWin = (symbolIndices: number[], result: number): { multiplier: number, isWin: boolean } => {
    // 50% win chance - if result > 0.5, it's a win
    const isWin = result > 0.5;
    
    if (!isWin) {
      return { multiplier: 0, isWin: false };
    }
    
    // Check for three of a kind (higher payout)
    if (symbolIndices[0] === symbolIndices[1] && symbolIndices[1] === symbolIndices[2]) {
      return { multiplier: SYMBOLS[symbolIndices[0]].multiplier, isWin: true };
    }
    
    // Check for two of a kind (medium payout)
    const counts = symbolIndices.reduce((acc, index) => {
      acc[index] = (acc[index] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    
    for (const [index, count] of Object.entries(counts)) {
      if (count === 2) {
        return { multiplier: SYMBOLS[parseInt(index)].multiplier * 0.5, isWin: true };
      }
    }
    
    // Any other combination when win = 1.8x (regular win)
    return { multiplier: 1.8, isWin: true };
  };

  const spinSlots = () => {
    if (!user || parseFloat(user.balance) < selectedBet) {
      toast({
        title: "Error",
        description: "Insufficient balance",
        variant: "destructive",
      });
      return;
    }

    setIsSpinning(true);
    setWinningCombination(null);
    
    const serverSeed = generateServerSeed();
    const clientSeed = generateClientSeed();
    const nonce = Math.floor(Math.random() * 1000000);
    
    const result = calculateResult(serverSeed, clientSeed, nonce);
    
    // Generate three symbol indices
    const symbolIndices = [
      getRandomSymbolIndex(result, 0),
      getRandomSymbolIndex(result, 0.33),
      getRandomSymbolIndex(result, 0.66)
    ];
    
    const { multiplier, isWin } = calculateWin(symbolIndices, result);
    
    // Animate the reels
    const animationDuration = 2000;
    const reelAnimations = symbolIndices.map((_, index) => {
      return new Promise<void>((resolve) => {
        let currentSymbol = reels[index];
        const interval = setInterval(() => {
          currentSymbol = (currentSymbol + 1) % SYMBOLS.length;
          setReels(prev => {
            const newReels = [...prev];
            newReels[index] = currentSymbol;
            return newReels;
          });
        }, 100);
        
        setTimeout(() => {
          clearInterval(interval);
          setReels(prev => {
            const newReels = [...prev];
            newReels[index] = symbolIndices[index];
            return newReels;
          });
          resolve();
        }, animationDuration + (index * 300));
      });
    });

    Promise.all(reelAnimations).then(() => {
      setIsSpinning(false);
      
      if (isWin) {
        setWinningCombination(symbolIndices);
        setTimeout(() => setWinningCombination(null), 3000);
      }
      
      const winAmount = isWin ? selectedBet * multiplier : 0;
      
      if (isWin) {
        toast({
          title: "🎊 Winner!",
          description: `You won ${winAmount.toFixed(2)} coins with ${multiplier}x multiplier!`,
        });
      } else {
        toast({
          title: "💥 No Win",
          description: `Better luck next time!`,
          variant: "destructive",
        });
      }

      playGameMutation.mutate({
        gameType: "slots",
        betAmount: selectedBet.toString(),
        winAmount: winAmount.toString(),
        serverSeed,
        clientSeed,
        nonce,
        result: JSON.stringify({ 
          symbolIndices, 
          multiplier,
          isWin
        }),
      });
      
      setSpinHistory(prev => [
        { 
          symbols: symbolIndices.map(i => SYMBOLS[i].symbol), 
          multiplier 
        }, 
        ...prev.slice(0, 9)
      ]);
    });
  };

  const resetSlots = () => {
    if (!isSpinning) {
      setReels([0, 0, 0]);
      setWinningCombination(null);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center mb-8">
        <Sparkles className="w-8 h-8 crypto-pink mr-3" />
        <h1 className="text-3xl font-bold">Lucky 7s Slots</h1>
        <Badge variant="secondary" className="ml-4">
          Provably Fair
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Slot Machine */}
        <div className="lg:col-span-2">
          <Card className="crypto-gray border-crypto-pink/20">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Slot Machine</span>
                <Button
                  onClick={resetSlots}
                  variant="outline"
                  size="sm"
                  className="border-crypto-pink/30 hover:bg-crypto-pink"
                  disabled={isSpinning}
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Reset
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Slot Reels */}
              <div className="flex items-center justify-center p-8">
                <div className="bg-black/40 p-6 rounded-lg border-4 border-crypto-pink/50">
                  <div className="flex space-x-4">
                    {reels.map((symbolIndex, reelIndex) => (
                      <div
                        key={reelIndex}
                        className={`
                          w-24 h-24 bg-gray-800 border-2 border-crypto-pink/30 rounded-lg 
                          flex items-center justify-center text-4xl font-bold
                          transition-all duration-300
                          ${winningCombination?.includes(symbolIndex) ? 'border-yellow-400 bg-yellow-400/20 animate-pulse' : ''}
                          ${isSpinning ? 'animate-bounce' : ''}
                        `}
                      >
                        <span className={SYMBOLS[symbolIndex].color}>
                          {SYMBOLS[symbolIndex].symbol}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Paytable */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">Paytable</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  {SYMBOLS.map((symbol, index) => (
                    <div key={index} className="flex items-center space-x-2 p-2 bg-gray-800 rounded">
                      <span className={`text-lg ${symbol.color}`}>{symbol.symbol}</span>
                      <span className="text-xs">3x = {symbol.multiplier}x</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  50% Win Chance • Regular win = 1.8x • 2 of a kind = 0.5x symbol multiplier • 3 of a kind = full symbol multiplier
                </p>
              </div>
              
              {/* Spin History */}
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Recent Spins</h3>
                <div className="flex space-x-2 overflow-x-auto">
                  {spinHistory.map((spin, index) => (
                    <div 
                      key={index} 
                      className="min-w-fit flex items-center space-x-1 p-2 bg-gray-800 rounded"
                    >
                      {spin.symbols.map((symbol, i) => (
                        <span key={i} className="text-sm">{symbol}</span>
                      ))}
                      <Badge 
                        variant="outline" 
                        className={`ml-2 ${
                          spin.multiplier === 0 ? "border-gray-500 text-gray-500" :
                          spin.multiplier >= 10 ? "border-crypto-pink text-crypto-pink" :
                          spin.multiplier >= 5 ? "border-crypto-gold text-crypto-gold" :
                          "border-crypto-green text-crypto-green"
                        }`}
                      >
                        {spin.multiplier === 0 ? 'L' : `${spin.multiplier}x`}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Game Controls */}
        <div className="space-y-6">
          <Card className="crypto-gray border-crypto-pink/20">
            <CardHeader>
              <CardTitle>Game Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Current Bet</label>
                <div className="text-xl font-semibold crypto-gold">
                  {selectedBet.toFixed(2)} coins
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Win Chance</label>
                <div className="text-sm crypto-green">
                  50%
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Max Payout</label>
                <div className="text-sm crypto-green">
                  Up to {(selectedBet * 20).toFixed(2)} coins (20x)
                </div>
              </div>

              <Button
                onClick={spinSlots}
                disabled={isSpinning || parseFloat(user.balance) < selectedBet}
                className="w-full gradient-pink hover:opacity-90 transition-opacity"
              >
                {isSpinning ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                    Spinning...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Spin ({selectedBet} coins)
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <BettingPanel 
            selectedBet={selectedBet}
            onBetSelect={setSelectedBet}
          />
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BettingPanel from "@/components/BettingPanel";
import { generateServerSeed, generateClientSeed, calculateResult, wheelResult } from "@/lib/provablyFair";
import { RotateCcw, Disc3 } from "lucide-react";

interface WheelSegment {
  multiplier: number;
  color: string;
  weight: number;
}

const RISK_LEVELS = {
  low: [
    { multiplier: 1.2, color: "bg-green-500", weight: 40 },
    { multiplier: 1.5, color: "bg-green-400", weight: 30 },
    { multiplier: 2.0, color: "bg-yellow-500", weight: 20 },
    { multiplier: 3.0, color: "bg-orange-500", weight: 8 },
    { multiplier: 5.0, color: "bg-red-500", weight: 2 },
  ],
  medium: [
    { multiplier: 1.5, color: "bg-green-500", weight: 30 },
    { multiplier: 2.0, color: "bg-green-400", weight: 25 },
    { multiplier: 3.0, color: "bg-yellow-500", weight: 20 },
    { multiplier: 5.0, color: "bg-orange-500", weight: 15 },
    { multiplier: 10.0, color: "bg-red-500", weight: 8 },
    { multiplier: 20.0, color: "bg-purple-500", weight: 2 },
  ],
  high: [
    { multiplier: 2.0, color: "bg-green-500", weight: 25 },
    { multiplier: 3.0, color: "bg-green-400", weight: 20 },
    { multiplier: 5.0, color: "bg-yellow-500", weight: 18 },
    { multiplier: 10.0, color: "bg-orange-500", weight: 15 },
    { multiplier: 20.0, color: "bg-red-500", weight: 12 },
    { multiplier: 50.0, color: "bg-purple-500", weight: 10 },
  ],
};

export default function Wheel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedBet, setSelectedBet] = useState(1.00);
  const [riskLevel, setRiskLevel] = useState<keyof typeof RISK_LEVELS>("medium");
  const [isSpinning, setIsSpinning] = useState(false);
  const [winningSegment, setWinningSegment] = useState<number | null>(null);
  const [spinHistory, setSpinHistory] = useState<number[]>([]);
  const [rotation, setRotation] = useState(0);

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

  const spinWheel = () => {
    if (!user || parseFloat(user.balance) < selectedBet) {
      toast({
        title: "Error",
        description: "Insufficient balance",
        variant: "destructive",
      });
      return;
    }

    setIsSpinning(true);
    
    const serverSeed = generateServerSeed();
    const clientSeed = generateClientSeed();
    const nonce = Date.now();
    
    const result = calculateResult(serverSeed, clientSeed, nonce);
    const segments = RISK_LEVELS[riskLevel];
    const weights = segments.map(s => s.weight);
    const winningIndex = wheelResult(result, weights);
    const winningMultiplier = segments[winningIndex].multiplier;
    
    // Calculate rotation for visual effect
    const segmentAngle = 360 / segments.length;
    const targetRotation = rotation + 360 * 3 + (winningIndex * segmentAngle) + (segmentAngle / 2);
    setRotation(targetRotation);
    
    setTimeout(() => {
      setWinningSegment(winningIndex);
      setIsSpinning(false);
      
      const winAmount = selectedBet * winningMultiplier;
      
      toast({
        title: "🎊 Wheel Stopped!",
        description: `You won ${winAmount.toFixed(2)} coins with ${winningMultiplier}x multiplier!`,
      });

      playGameMutation.mutate({
        gameType: "wheel",
        betAmount: selectedBet.toString(),
        winAmount: winAmount.toString(),
        serverSeed,
        clientSeed,
        nonce,
        result: JSON.stringify({ 
          riskLevel, 
          winningIndex, 
          multiplier: winningMultiplier 
        }),
      });
      
      setSpinHistory(prev => [winningMultiplier, ...prev.slice(0, 9)]);
      
      // Reset winning segment after delay
      setTimeout(() => {
        setWinningSegment(null);
      }, 3000);
    }, 3000);
  };

  const resetWheel = () => {
    if (!isSpinning) {
      setWinningSegment(null);
      setRotation(0);
    }
  };

  if (!user) return null;

  const segments = RISK_LEVELS[riskLevel];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center mb-8">
        <Disc3 className="w-8 h-8 crypto-pink mr-3" />
        <h1 className="text-3xl font-bold">Wheel of Fortune</h1>
        <Badge variant="secondary" className="ml-4">
          Provably Fair
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Wheel Display */}
        <div className="lg:col-span-2">
          <Card className="crypto-gray border-crypto-pink/20">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Wheel</span>
                <Button
                  onClick={resetWheel}
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
              <div className="flex items-center justify-center p-8">
                <div className="relative">
                  {/* Pointer */}
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-10">
                    <div className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-crypto-pink"></div>
                  </div>
                  
                  {/* Wheel */}
                  <div 
                    className={`w-80 h-80 rounded-full border-4 border-crypto-pink relative transition-transform duration-3000 ease-out ${
                      isSpinning ? 'animate-spin' : ''
                    }`}
                    style={{ 
                      transform: `rotate(${rotation}deg)`,
                      transitionDuration: isSpinning ? '3000ms' : '0ms'
                    }}
                  >
                    {segments.map((segment, index) => {
                      const segmentAngle = 360 / segments.length;
                      const rotation = index * segmentAngle;
                      const isWinning = winningSegment === index;
                      
                      return (
                        <div
                          key={index}
                          className={`absolute inset-0 ${segment.color} ${
                            isWinning ? 'ring-4 ring-crypto-gold' : ''
                          }`}
                          style={{
                            clipPath: `polygon(50% 50%, ${
                              50 + 50 * Math.cos((rotation - segmentAngle/2) * Math.PI / 180)
                            }% ${
                              50 + 50 * Math.sin((rotation - segmentAngle/2) * Math.PI / 180)
                            }%, ${
                              50 + 50 * Math.cos((rotation + segmentAngle/2) * Math.PI / 180)
                            }% ${
                              50 + 50 * Math.sin((rotation + segmentAngle/2) * Math.PI / 180)
                            }%)`,
                          }}
                        >
                          <div 
                            className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg"
                            style={{
                              transform: `rotate(${rotation}deg) translateY(-60px)`,
                              transformOrigin: '50% 160px'
                            }}
                          >
                            {segment.multiplier}x
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              {/* Spin History */}
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Recent Spins</h3>
                <div className="flex space-x-2 overflow-x-auto">
                  {spinHistory.map((multiplier, index) => (
                    <Badge 
                      key={index} 
                      variant="outline" 
                      className={`min-w-fit ${
                        multiplier >= 10 ? "border-crypto-pink text-crypto-pink" :
                        multiplier >= 5 ? "border-crypto-gold text-crypto-gold" :
                        multiplier >= 2 ? "border-crypto-green text-crypto-green" :
                        "border-gray-400 text-gray-400"
                      }`}
                    >
                      {multiplier}x
                    </Badge>
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
                <label className="block text-sm font-medium mb-2">Risk Level</label>
                <Select 
                  value={riskLevel} 
                  onValueChange={(value: keyof typeof RISK_LEVELS) => setRiskLevel(value)}
                  disabled={isSpinning}
                >
                  <SelectTrigger className="crypto-black border-crypto-pink/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="crypto-gray border-crypto-pink/20">
                    <SelectItem value="low">Low Risk (Max 5x)</SelectItem>
                    <SelectItem value="medium">Medium Risk (Max 20x)</SelectItem>
                    <SelectItem value="high">High Risk (Max 50x)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Multiplier Range</label>
                <div className="text-sm crypto-green">
                  {Math.min(...segments.map(s => s.multiplier))}x - {Math.max(...segments.map(s => s.multiplier))}x
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Bet Amount</label>
                <div className="text-xl font-semibold crypto-gold">
                  {selectedBet.toFixed(2)} coins
                </div>
              </div>

              <Button
                onClick={spinWheel}
                disabled={isSpinning || parseFloat(user.balance) < selectedBet}
                className="w-full gradient-pink hover:opacity-90 transition-opacity"
              >
                {isSpinning ? (
                  <>
                    <Disc3 className="w-4 h-4 mr-2 animate-spin" />
                    Spinning...
                  </>
                ) : (
                  <>
                    <Disc3 className="w-4 h-4 mr-2" />
                    Spin Wheel ({selectedBet} coins)
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

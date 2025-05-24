import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import BettingPanel from "@/components/BettingPanel";
import { generateServerSeed, generateClientSeed, calculateResult, crashResult } from "@/lib/provablyFair";
import { TrendingUp, RotateCcw, Zap } from "lucide-react";

type GameState = "waiting" | "rising" | "crashed" | "cashed_out";

export default function Crash() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedBet, setSelectedBet] = useState(1.00);
  const [autoCashOut, setAutoCashOut] = useState("");
  const [gameState, setGameState] = useState<GameState>("waiting");
  const [currentMultiplier, setCurrentMultiplier] = useState(1.00);
  const [crashPoint, setCrashPoint] = useState(0);
  const [betPlaced, setBetPlaced] = useState(false);
  const [serverSeed, setServerSeed] = useState("");
  const [clientSeed, setClientSeed] = useState("");
  const [nonce, setNonce] = useState(0);
  const [gameHistory, setGameHistory] = useState<number[]>([]);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

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

  const startGame = () => {
    if (!user || parseFloat(user.balance) < selectedBet) {
      toast({
        title: "Error",
        description: "Insufficient balance",
        variant: "destructive",
      });
      return;
    }

    const newServerSeed = generateServerSeed();
    const newClientSeed = generateClientSeed();
    const newNonce = nonce + 1;
    
    setServerSeed(newServerSeed);
    setClientSeed(newClientSeed);
    setNonce(newNonce);
    
    const result = calculateResult(newServerSeed, newClientSeed, newNonce);
    const crash = crashResult(result);
    
    setCrashPoint(crash);
    setCurrentMultiplier(1.00);
    setGameState("rising");
    setBetPlaced(true);
    startTimeRef.current = Date.now();
    
    // Start the multiplier animation
    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const newMultiplier = 1 + (elapsed * 0.5); // Rises at 0.5x per second
      
      setCurrentMultiplier(newMultiplier);
      
      // Auto cash out check
      if (autoCashOut && newMultiplier >= parseFloat(autoCashOut)) {
        cashOut(newMultiplier);
        return;
      }
      
      // Check if crashed
      if (newMultiplier >= crash) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setCurrentMultiplier(crash);
        setGameState("crashed");
        
        // Player loses
        toast({
          title: "💥 Crashed!",
          description: `The multiplier crashed at ${crash.toFixed(2)}x`,
          variant: "destructive",
        });
        
        playGameMutation.mutate({
          gameType: "crash",
          betAmount: selectedBet.toString(),
          winAmount: "0",
          serverSeed: newServerSeed,
          clientSeed: newClientSeed,
          nonce: newNonce,
          result: JSON.stringify({ crashPoint: crash, cashedOut: false }),
        });
        
        setGameHistory(prev => [crash, ...prev.slice(0, 9)]);
        
        // Reset for next game after delay
        setTimeout(() => {
          setGameState("waiting");
          setBetPlaced(false);
        }, 3000);
      }
    }, 100);
  };

  const cashOut = (multiplier = currentMultiplier) => {
    if (gameState !== "rising" || !betPlaced) return;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    setGameState("cashed_out");
    const winAmount = selectedBet * multiplier;
    
    toast({
      title: "💰 Cashed Out!",
      description: `You won ${winAmount.toFixed(2)} coins at ${multiplier.toFixed(2)}x!`,
    });

    playGameMutation.mutate({
      gameType: "crash",
      betAmount: selectedBet.toString(),
      winAmount: winAmount.toString(),
      serverSeed,
      clientSeed,
      nonce,
      result: JSON.stringify({ cashOutPoint: multiplier, cashedOut: true }),
    });
    
    // Reset for next game after delay
    setTimeout(() => {
      setGameState("waiting");
      setBetPlaced(false);
    }, 3000);
  };

  const resetGame = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setGameState("waiting");
    setBetPlaced(false);
    setCurrentMultiplier(1.00);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center mb-8">
        <TrendingUp className="w-8 h-8 crypto-pink mr-3" />
        <h1 className="text-3xl font-bold">Crash</h1>
        <Badge variant="secondary" className="ml-4">
          Provably Fair
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Game Display */}
        <div className="lg:col-span-2">
          <Card className="crypto-gray border-crypto-pink/20">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Multiplier Chart</span>
                <Button
                  onClick={resetGame}
                  variant="outline"
                  size="sm"
                  className="border-crypto-pink/30 hover:bg-crypto-pink"
                  disabled={gameState === "rising"}
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Reset
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="crypto-black rounded-lg p-8 h-80 flex items-center justify-center relative overflow-hidden">
                <div className="text-center">
                  <div className={`text-8xl font-bold mb-4 transition-all duration-200 ${
                    gameState === "crashed" ? "text-red-500" :
                    gameState === "cashed_out" ? "crypto-green" :
                    gameState === "rising" ? "crypto-pink animate-pulse" :
                    "crypto-green"
                  }`}>
                    {currentMultiplier.toFixed(2)}x
                  </div>
                  <div className="text-lg text-gray-400">
                    {gameState === "waiting" && "Waiting for next round"}
                    {gameState === "rising" && "Rising..."}
                    {gameState === "crashed" && "CRASHED!"}
                    {gameState === "cashed_out" && "Cashed Out!"}
                  </div>
                </div>
                
                {gameState === "rising" && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-crypto-pink/10 to-transparent animate-pulse"></div>
                )}
              </div>
              
              {/* Game History */}
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Recent Crashes</h3>
                <div className="flex space-x-2 overflow-x-auto">
                  {gameHistory.map((crash, index) => (
                    <Badge 
                      key={index} 
                      variant="outline" 
                      className={`min-w-fit ${
                        crash >= 2 ? "border-crypto-green text-crypto-green" :
                        crash >= 1.5 ? "border-crypto-gold text-crypto-gold" :
                        "border-crypto-red text-crypto-red"
                      }`}
                    >
                      {crash.toFixed(2)}x
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
              <CardTitle>Game Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="auto-cashout">Auto Cash Out At</Label>
                <Input
                  id="auto-cashout"
                  type="number"
                  step="0.01"
                  min="1.01"
                  placeholder="2.00"
                  value={autoCashOut}
                  onChange={(e) => setAutoCashOut(e.target.value)}
                  className="crypto-black border-crypto-pink/30 focus:border-crypto-pink"
                  disabled={gameState === "rising"}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Leave empty for manual cash out
                </p>
              </div>

              <div>
                <Label>Potential Win</Label>
                <div className="text-xl font-semibold crypto-green">
                  {betPlaced ? (selectedBet * currentMultiplier).toFixed(2) : selectedBet.toFixed(2)} coins
                </div>
              </div>

              {!betPlaced ? (
                <Button
                  onClick={startGame}
                  disabled={parseFloat(user.balance) < selectedBet || gameState === "rising"}
                  className="w-full gradient-pink hover:opacity-90"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Place Bet ({selectedBet} coins)
                </Button>
              ) : gameState === "rising" ? (
                <Button
                  onClick={() => cashOut()}
                  className="w-full bg-crypto-green hover:bg-green-500 text-black font-semibold animate-pulse"
                >
                  Cash Out Now! ({(selectedBet * currentMultiplier).toFixed(2)} coins)
                </Button>
              ) : (
                <Button
                  disabled
                  className="w-full crypto-gray"
                >
                  {gameState === "crashed" ? "Crashed!" : "Cashed Out!"}
                </Button>
              )}
              
              {autoCashOut && parseFloat(autoCashOut) > 1 && (
                <div className="text-sm text-crypto-gold">
                  Auto cash out at {parseFloat(autoCashOut).toFixed(2)}x
                </div>
              )}
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

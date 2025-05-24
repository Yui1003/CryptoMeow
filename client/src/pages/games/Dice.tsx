import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import BettingPanel from "@/components/BettingPanel";
import { generateServerSeed, generateClientSeed, calculateResult, diceResult } from "@/lib/provablyFair";
import { Dice6, RotateCcw, Target } from "lucide-react";

type GameMode = "over" | "under" | "range";

export default function Dice() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedBet, setSelectedBet] = useState(1.00);
  const [gameMode, setGameMode] = useState<GameMode>("over");
  const [targetNumber, setTargetNumber] = useState(50);
  const [rangeMin, setRangeMin] = useState(40);
  const [rangeMax, setRangeMax] = useState(60);
  const [isRolling, setIsRolling] = useState(false);
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const [rollHistory, setRollHistory] = useState<{ roll: number; won: boolean }[]>([]);

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

  const calculateWinChance = () => {
    switch (gameMode) {
      case "over":
        return 100 - targetNumber;
      case "under":
        return targetNumber - 1;
      case "range":
        return rangeMax - rangeMin + 1;
      default:
        return 50;
    }
  };

  const calculateMultiplier = () => {
    const winChance = calculateWinChance();
    return winChance > 0 ? (100 / winChance) * 0.98 : 1; // 2% house edge
  };

  const rollDice = () => {
    if (!user || parseFloat(user.balance) < selectedBet) {
      toast({
        title: "Error",
        description: "Insufficient balance",
        variant: "destructive",
      });
      return;
    }

    setIsRolling(true);
    
    const serverSeed = generateServerSeed();
    const clientSeed = generateClientSeed();
    const nonce = Date.now();
    
    const result = calculateResult(serverSeed, clientSeed, nonce);
    const roll = diceResult(result, 1, 100);
    
    // Simulate rolling animation
    let animationRoll = 1;
    const rollInterval = setInterval(() => {
      animationRoll = Math.floor(Math.random() * 100) + 1;
      setLastRoll(animationRoll);
    }, 100);
    
    setTimeout(() => {
      clearInterval(rollInterval);
      setLastRoll(roll);
      setIsRolling(false);
      
      // Check if won
      let won = false;
      switch (gameMode) {
        case "over":
          won = roll > targetNumber;
          break;
        case "under":
          won = roll < targetNumber;
          break;
        case "range":
          won = roll >= rangeMin && roll <= rangeMax;
          break;
      }
      
      const multiplier = calculateMultiplier();
      const winAmount = won ? selectedBet * multiplier : 0;
      
      if (won) {
        toast({
          title: "🎉 You Won!",
          description: `Rolled ${roll}! You won ${winAmount.toFixed(2)} coins!`,
        });
      } else {
        toast({
          title: "💔 You Lost!",
          description: `Rolled ${roll}. Better luck next time!`,
          variant: "destructive",
        });
      }

      playGameMutation.mutate({
        gameType: "dice",
        betAmount: selectedBet.toString(),
        winAmount: winAmount.toString(),
        serverSeed,
        clientSeed,
        nonce,
        result: JSON.stringify({ 
          roll, 
          gameMode, 
          target: gameMode === "range" ? [rangeMin, rangeMax] : targetNumber,
          multiplier,
          won 
        }),
      });
      
      setRollHistory(prev => [{ roll, won }, ...prev.slice(0, 9)]);
    }, 2000);
  };

  const resetGame = () => {
    if (!isRolling) {
      setLastRoll(null);
    }
  };

  if (!user) return null;

  const winChance = calculateWinChance();
  const multiplier = calculateMultiplier();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center mb-8">
        <Dice6 className="w-8 h-8 crypto-pink mr-3" />
        <h1 className="text-3xl font-bold">Dice Roll</h1>
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
                <span>Dice Roll</span>
                <Button
                  onClick={resetGame}
                  variant="outline"
                  size="sm"
                  className="border-crypto-pink/30 hover:bg-crypto-pink"
                  disabled={isRolling}
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Reset
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="crypto-black rounded-lg p-8 text-center">
                {/* Dice Display */}
                <div className="mb-8">
                  <div className={`text-8xl mb-4 transition-all duration-200 ${
                    isRolling ? "animate-bounce crypto-pink" : 
                    lastRoll ? "crypto-green" : "text-gray-400"
                  }`}>
                    🎲
                  </div>
                  <div className="text-6xl font-bold mb-2">
                    {lastRoll || "--"}
                  </div>
                  <div className="text-lg text-gray-400">
                    {isRolling ? "Rolling..." : lastRoll ? "Last Roll" : "Ready to Roll"}
                  </div>
                </div>

                {/* Win Condition Display */}
                <div className="mb-6 p-4 crypto-gray rounded-lg">
                  <h3 className="text-lg font-semibold mb-2">Win Condition</h3>
                  <div className="text-crypto-gold text-xl">
                    {gameMode === "over" && `Roll over ${targetNumber}`}
                    {gameMode === "under" && `Roll under ${targetNumber}`}
                    {gameMode === "range" && `Roll between ${rangeMin} - ${rangeMax}`}
                  </div>
                  <div className="text-sm text-gray-400 mt-2">
                    Win Chance: {winChance}% | Multiplier: {multiplier.toFixed(2)}x
                  </div>
                </div>

                {/* Roll History */}
                {rollHistory.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Recent Rolls</h3>
                    <div className="flex justify-center space-x-2 overflow-x-auto">
                      {rollHistory.map((entry, index) => (
                        <Badge 
                          key={index} 
                          variant="outline" 
                          className={`min-w-fit ${
                            entry.won ? "border-crypto-green text-crypto-green" :
                            "border-crypto-red text-crypto-red"
                          }`}
                        >
                          {entry.roll}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
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
                <Label>Game Mode</Label>
                <Select value={gameMode} onValueChange={(value: GameMode) => setGameMode(value)} disabled={isRolling}>
                  <SelectTrigger className="crypto-black border-crypto-pink/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="crypto-gray border-crypto-pink/20">
                    <SelectItem value="over">Roll Over</SelectItem>
                    <SelectItem value="under">Roll Under</SelectItem>
                    <SelectItem value="range">Roll Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {gameMode === "over" && (
                <div>
                  <Label>Roll Over: {targetNumber}</Label>
                  <Slider
                    value={[targetNumber]}
                    onValueChange={(value) => setTargetNumber(value[0])}
                    max={99}
                    min={2}
                    step={1}
                    disabled={isRolling}
                    className="mt-2"
                  />
                </div>
              )}

              {gameMode === "under" && (
                <div>
                  <Label>Roll Under: {targetNumber}</Label>
                  <Slider
                    value={[targetNumber]}
                    onValueChange={(value) => setTargetNumber(value[0])}
                    max={99}
                    min={2}
                    step={1}
                    disabled={isRolling}
                    className="mt-2"
                  />
                </div>
              )}

              {gameMode === "range" && (
                <div className="space-y-3">
                  <div>
                    <Label>Min: {rangeMin}</Label>
                    <Slider
                      value={[rangeMin]}
                      onValueChange={(value) => {
                        const newMin = value[0];
                        setRangeMin(newMin);
                        if (newMin >= rangeMax) {
                          setRangeMax(newMin + 1);
                        }
                      }}
                      max={rangeMax - 1}
                      min={1}
                      step={1}
                      disabled={isRolling}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Max: {rangeMax}</Label>
                    <Slider
                      value={[rangeMax]}
                      onValueChange={(value) => {
                        const newMax = value[0];
                        setRangeMax(newMax);
                        if (newMax <= rangeMin) {
                          setRangeMin(newMax - 1);
                        }
                      }}
                      max={100}
                      min={rangeMin + 1}
                      step={1}
                      disabled={isRolling}
                      className="mt-2"
                    />
                  </div>
                </div>
              )}

              <div>
                <Label>Win Chance</Label>
                <div className="text-2xl font-bold crypto-green">
                  {winChance.toFixed(1)}%
                </div>
              </div>

              <div>
                <Label>Multiplier</Label>
                <div className="text-2xl font-bold crypto-gold">
                  {multiplier.toFixed(2)}x
                </div>
              </div>

              <div>
                <Label>Potential Win</Label>
                <div className="text-xl font-semibold crypto-green">
                  {(selectedBet * multiplier).toFixed(2)} coins
                </div>
              </div>

              <Button
                onClick={rollDice}
                disabled={isRolling || parseFloat(user.balance) < selectedBet || winChance <= 0}
                className="w-full gradient-pink hover:opacity-90 transition-opacity"
              >
                {isRolling ? (
                  <>
                    <Dice6 className="w-4 h-4 mr-2 animate-spin" />
                    Rolling...
                  </>
                ) : (
                  <>
                    <Target className="w-4 h-4 mr-2" />
                    Roll Dice ({selectedBet} coins)
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

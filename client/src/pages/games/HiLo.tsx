import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BettingPanel from "@/components/BettingPanel";
import { generateServerSeed, generateClientSeed, calculateResult, hiloResult } from "@/lib/provablyFair";
import { RotateCcw, TrendingUp, TrendingDown, Spade, Heart, Diamond, Club } from "lucide-react";

type Suit = "spades" | "hearts" | "diamonds" | "clubs";
type GameState = "waiting" | "playing" | "ended";

interface Card {
  value: number;
  suit: Suit;
  name: string;
}

const CARD_NAMES = ["", "Ace", "2", "3", "4", "5", "6", "7", "8", "9", "10", "Jack", "Queen", "King"];
const SUITS: Suit[] = ["spades", "hearts", "diamonds", "clubs"];

const getSuitIcon = (suit: Suit) => {
  switch (suit) {
    case "spades": return <Spade className="w-6 h-6" />;
    case "hearts": return <Heart className="w-6 h-6 text-red-500" />;
    case "diamonds": return <Diamond className="w-6 h-6 text-red-500" />;
    case "clubs": return <Club className="w-6 h-6" />;
  }
};

const getSuitColor = (suit: Suit) => {
  return suit === "hearts" || suit === "diamonds" ? "text-red-500" : "text-black";
};

export default function HiLo() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedBet, setSelectedBet] = useState(1.00);
  const [gameState, setGameState] = useState<GameState>("waiting");
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [nextCard, setNextCard] = useState<Card | null>(null);
  const [streak, setStreak] = useState(0);
  const [multiplier, setMultiplier] = useState(1.0);
  const [gameHistory, setGameHistory] = useState<{correct: boolean, guess: 'higher' | 'lower', currentCard: number, nextCard: number, currentCardName: string, nextCardName: string}[]>([]);
  const [serverSeed, setServerSeed] = useState("");
  const [clientSeed, setClientSeed] = useState("");
  const [nonce, setNonce] = useState(0);

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

  const generateCard = (value: number): Card => {
    const suit = SUITS[Math.floor(Math.random() * 4)];
    return {
      value,
      suit,
      name: CARD_NAMES[value],
    };
  };

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
    const newNonce = 1;

    setServerSeed(newServerSeed);
    setClientSeed(newClientSeed);
    setNonce(newNonce);

    const result = calculateResult(newServerSeed, newClientSeed, newNonce);
    const cardValue = hiloResult(result);
    const card = generateCard(cardValue);

    setCurrentCard(card);
    setNextCard(null);
    setGameState("playing");
    setStreak(0);
    setMultiplier(1.0);
    setGameHistory([]);
  };

  const makeGuess = (isHigher: boolean) => {
    if (!currentCard || gameState !== "playing") return;

    let nextNonce = nonce + streak + Math.floor(Math.random() * 1000) + 1;
    let result = calculateResult(serverSeed, clientSeed, nextNonce);
    let nextValue = hiloResult(result);
    
    // Keep generating new cards until we don't get a tie
    while (nextValue === currentCard.value) {
      nextNonce += 1;
      result = calculateResult(serverSeed, clientSeed, nextNonce);
      nextValue = hiloResult(result);
    }

    const next = generateCard(nextValue);
    setNextCard(next);
    setNonce(nextNonce); // Update nonce state

    const isCorrect = isHigher ? next.value > currentCard.value : next.value < currentCard.value;

    if (isCorrect) {
      const newStreak = streak + 1;
      const newMultiplier = 1 + (newStreak * 0.5); // 0.5x increase per correct guess

      setStreak(newStreak);
      setMultiplier(newMultiplier);
      setGameHistory(prev => [...prev, {
        correct: true,
        guess: isHigher ? 'higher' : 'lower',
        currentCard: currentCard.value,
        nextCard: next.value,
        currentCardName: currentCard.name,
        nextCardName: next.name
      }]);

      toast({
        title: "✅ Correct!",
        description: `Streak: ${newStreak} | Multiplier: ${newMultiplier.toFixed(1)}x`,
      });

      setTimeout(() => {
        setCurrentCard(next);
        setNextCard(null);
      }, 2000);
    } else {
      // Wrong guess - game over, no winnings
      setGameHistory(prev => [...prev, {
        correct: false,
        guess: isHigher ? 'higher' : 'lower',
        currentCard: currentCard.value,
        nextCard: next.value,
        currentCardName: currentCard.name,
        nextCardName: next.name
      }]);
      setGameState("ended");

      // Wrong guess always results in 0 winnings, regardless of streak
      const winAmount = 0;

      toast({
        title: "💥 Wrong!",
        description: "You lost your bet! Better luck next time!",
        variant: "destructive",
      });

      playGameMutation.mutate({
        gameType: "hilo",
        betAmount: selectedBet.toString(),
        winAmount: winAmount.toString(),
        serverSeed,
        clientSeed,
        nonce: nextNonce,
        result: JSON.stringify({ 
          streak, 
          multiplier, 
          finalGuess: isHigher ? "higher" : "lower",
          isCorrect 
        }),
      });
    }
  };

  const cashOut = () => {
    if (gameState !== "playing" || streak === 0) return;

    const winAmount = selectedBet * multiplier;
    setGameState("ended");

    toast({
      title: "💰 Cashed Out!",
      description: `You won ${winAmount.toFixed(2)} coins with ${streak} correct guesses!`,
    });

    playGameMutation.mutate({
      gameType: "hilo",
      betAmount: selectedBet.toString(),
      winAmount: winAmount.toString(),
      serverSeed,
      clientSeed,
      nonce: nonce + streak,
      result: JSON.stringify({ 
        streak, 
        multiplier, 
        cashedOut: true 
      }),
    });
  };

  const resetGame = () => {
    setGameState("waiting");
    setCurrentCard(null);
    setNextCard(null);
    setStreak(0);
    setMultiplier(1.0);
    setGameHistory([]);
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center mb-8">
        <TrendingUp className="w-8 h-8 crypto-pink mr-3" />
        <h1 className="text-3xl font-bold">Hi-Lo</h1>
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
                <span>Card Game</span>
                <Button
                  onClick={resetGame}
                  variant="outline"
                  size="sm"
                  className="border-crypto-pink/30 hover:bg-crypto-pink"
                  disabled={gameState === "playing"}
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Reset
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="crypto-black rounded-lg p-8 min-h-96">
                {gameState === "waiting" ? (
                  <div className="text-center py-16">
                    <div className="text-6xl mb-4">🃏</div>
                    <p className="text-gray-400 mb-4">Click "Start Game" to begin</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Current Card */}
                    <div className="text-center">
                      <h3 className="text-lg font-medium mb-4">Current Card</h3>
                      {currentCard && (
                        <div className="inline-block bg-white rounded-lg p-6 shadow-lg border-2 border-gray-300">
                          <div className={`text-center ${getSuitColor(currentCard.suit)}`}>
                            <div className="text-4xl font-bold mb-2">{currentCard.name}</div>
                            <div className="flex justify-center">
                              {getSuitIcon(currentCard.suit)}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Next Card (when revealed) */}
                    {nextCard && (
                      <div className="text-center">
                        <h3 className="text-lg font-medium mb-4">Next Card</h3>
                        <div className="inline-block bg-white rounded-lg p-6 shadow-lg border-2 border-crypto-gold">
                          <div className={`text-center ${getSuitColor(nextCard.suit)}`}>
                            <div className="text-4xl font-bold mb-2">{nextCard.name}</div>
                            <div className="flex justify-center">
                              {getSuitIcon(nextCard.suit)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Game Controls */}
                    {gameState === "playing" && !nextCard && (
                      <div className="text-center space-y-4">
                        <p className="text-lg">Will the next card be higher or lower?</p>
                        <div className="flex justify-center space-x-4">
                          <Button
                            onClick={() => makeGuess(true)}
                            className="bg-crypto-green hover:bg-green-500 text-white font-semibold px-8 py-3"
                          >
                            <TrendingUp className="w-5 h-5 mr-2" />
                            Higher
                          </Button>
                          <Button
                            onClick={() => makeGuess(false)}
                            className="bg-crypto-red hover:bg-red-600 text-white font-semibold px-8 py-3"
                          >
                            <TrendingDown className="w-5 h-5 mr-2" />
                            Lower
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Game History */}
                {gameHistory.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-sm font-medium text-gray-400 mb-4 text-center">Guess History</h3>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {gameHistory.map((guess, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-lg border-l-4 ${
                            guess.correct 
                              ? "bg-green-900/20 border-crypto-green" 
                              : "bg-red-900/20 border-crypto-red"
                          }`}
                        >
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center space-x-2">
                              <span className={guess.correct ? "crypto-green" : "crypto-red"}>
                                {guess.correct ? "✅" : "❌"}
                              </span>
                              <span className="text-gray-300">
                                Guess #{index + 1}:
                              </span>
                              <span className="capitalize font-medium">
                                {guess.guess}
                              </span>
                            </div>
                            <div className="text-gray-400 text-xs">
                              {guess.currentCardName} → {guess.nextCardName}
                            </div>
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            {guess.currentCard} vs {guess.nextCard} | 
                            {guess.guess === 'higher' 
                              ? ` Expected ${guess.nextCard} > ${guess.currentCard}`
                              : ` Expected ${guess.nextCard} < ${guess.currentCard}`
                            } | 
                            <span className={guess.correct ? "crypto-green" : "crypto-red"}>
                              {guess.correct ? " Correct!" : " Wrong!"}
                            </span>
                          </div>
                        </div>
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
              <CardTitle>Game Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Streak</label>
                <div className="text-2xl font-bold crypto-green">
                  {streak}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Current Multiplier</label>
                <div className="text-2xl font-bold crypto-gold">
                  {multiplier.toFixed(1)}x
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Potential Win</label>
                <div className="text-xl font-semibold crypto-green">
                  {(selectedBet * multiplier).toFixed(2)} coins
                </div>
              </div>

              {gameState === "waiting" ? (
                <Button
                  onClick={startGame}
                  disabled={parseFloat(user.balance) < selectedBet}
                  className="w-full gradient-pink hover:opacity-90"
                >
                  Start Game ({selectedBet} coins)
                </Button>
              ) : gameState === "playing" ? (
                <Button
                  onClick={cashOut}
                  disabled={streak === 0}
                  className="w-full bg-crypto-green hover:bg-green-500 text-black font-semibold"
                >
                  Cash Out ({(selectedBet * multiplier).toFixed(2)} coins)
                </Button>
              ) : (
                <Button
                  onClick={resetGame}
                  className="w-full gradient-pink hover:opacity-90"
                >
                  Play Again
                </Button>
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
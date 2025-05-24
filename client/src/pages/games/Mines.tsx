import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import BettingPanel from "@/components/BettingPanel";
import {
  generateServerSeed,
  generateClientSeed,
  calculateResult,
  minesResult,
} from "@/lib/provablyFair";
import { Bomb, Gem, RotateCcw } from "lucide-react";

type TileState = "hidden" | "safe" | "mine";

interface Tile {
  id: number;
  state: TileState;
  revealed: boolean;
}

export default function Mines() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedBet, setSelectedBet] = useState(1.0);
  const [mineCount, setMineCount] = useState(5);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [gameActive, setGameActive] = useState(false);
  const [serverSeed, setServerSeed] = useState("");
  const [clientSeed, setClientSeed] = useState("");
  const [nonce, setNonce] = useState(0);

  // SINGLE multiplier calculation used everywhere
  const calculateMultiplier = (revealed: number, mines: number) => {
    if (revealed === 0) return 1.0;

    // Simple and consistent multiplier calculation
    const baseMultiplier = 1.0;
    const increment = 0.2 + mines * 0.05; // Higher mines = bigger increments

    return parseFloat((baseMultiplier + revealed * increment).toFixed(2));
  };

  // Real-time calculations using the SAME function
  const revealedCount = tiles.filter(
    (tile) => tile.revealed && tile.state === "safe",
  ).length;
  const currentMultiplier = calculateMultiplier(revealedCount, mineCount);
  const potentialWin = (selectedBet * currentMultiplier).toFixed(2);

  const initializeGame = () => {
    const newTiles = Array.from({ length: 25 }, (_, i) => ({
      id: i,
      state: "hidden" as TileState,
      revealed: false,
    }));

    setTiles(newTiles);
    setGameActive(true);
    const newServerSeed = generateServerSeed();
    const newClientSeed = generateClientSeed();
    setServerSeed(newServerSeed);
    setClientSeed(newClientSeed);
    setNonce(0);
    
    // Pre-generate mine positions
    generateMinePositions(newServerSeed, newClientSeed);
  };

  // Generate exactly the right number of mine positions
  const generateMinePositions = (serverSeed: string, clientSeed: string) => {
    // Create a simple hash from seeds
    const combinedSeed = serverSeed + clientSeed;
    let hash = 0;
    for (let i = 0; i < combinedSeed.length; i++) {
      const char = combinedSeed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // Use the hash to seed a simple random number generator
    let seed = Math.abs(hash);
    const random = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    
    // Generate exactly mineCount unique positions
    const positions = new Set<number>();
    while (positions.size < mineCount) {
      const position = Math.floor(random() * 25);
      positions.add(position);
    }
    
    return Array.from(positions);
  };

  const revealAllMines = () => {
    const minePositions = generateMinePositions(serverSeed, clientSeed);
    
    setTiles(prev => prev.map(tile => {
      if (!tile.revealed) {
        const isMine = minePositions.includes(tile.id);
        return { ...tile, state: isMine ? "mine" : "safe", revealed: true };
      }
      return tile;
    }));
  };

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

  const revealTile = (tileId: number) => {
    if (!gameActive || tiles[tileId].revealed) return;

    // Use the same mine position generation
    const minePositions = generateMinePositions(serverSeed, clientSeed);
    const isMine = minePositions.includes(tileId);

    setTiles((prev) =>
      prev.map((tile) =>
        tile.id === tileId
          ? { ...tile, state: isMine ? "mine" : "safe", revealed: true }
          : tile,
      ),
    );

    if (isMine) {
      // Game over - hit mine - reveal all mines
      setGameActive(false);
      revealAllMines();
      
      toast({
        title: "💥 Boom!",
        description: "You hit a mine! Better luck next time.",
        variant: "destructive",
      });

      // Record loss
      playGameMutation.mutate({
        gameType: "mines",
        betAmount: selectedBet.toString(),
        winAmount: "0",
        serverSeed,
        clientSeed,
        nonce: nonce + tileId + 1,
        result: JSON.stringify({ tileId, isMine: true, revealedCount }),
      });
    } else {
      // Safe tile revealed
      const newRevealedCount = revealedCount + 1;

      if (newRevealedCount === 25 - mineCount) {
        // All safe tiles revealed - auto cash out
        revealAllMines();
        cashOut();
      }
    }
  };

  const cashOut = () => {
    if (!gameActive || revealedCount === 0) return;

    // Use the exact same multiplier that's displayed on screen
    const winAmount = selectedBet * currentMultiplier;
    setGameActive(false);
    
    // Reveal all tiles when cashing out
    revealAllMines();

    const profit = winAmount - selectedBet;
    toast({
      title: "💰 Cashed Out!",
      description: `Total payout: ${winAmount.toFixed(2)} coins (Profit: +${profit.toFixed(2)}) with ${currentMultiplier.toFixed(2)}x multiplier!`,
    });

    playGameMutation.mutate({
      gameType: "mines",
      betAmount: selectedBet.toString(),
      winAmount: winAmount.toString(),
      serverSeed,
      clientSeed,
      nonce: nonce + revealedCount + 1,
      result: JSON.stringify({
        revealedCount,
        multiplier: currentMultiplier,
        cashedOut: true,
      }),
    });
  };

  const resetGame = () => {
    setTiles([]);
    setGameActive(false);
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center mb-8">
        <Bomb className="w-8 h-8 crypto-pink mr-3" />
        <h1 className="text-3xl font-bold">Mines</h1>
        <Badge variant="secondary" className="ml-4">
          Provably Fair
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Game Board */}
        <div className="lg:col-span-2">
          <Card className="crypto-gray border-crypto-pink/20">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Minefield</span>
                <Button
                  onClick={resetGame}
                  variant="outline"
                  size="sm"
                  className="border-crypto-pink/30 hover:bg-crypto-pink"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Reset
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tiles.length === 0 ? (
                <div className="text-center py-12">
                  <Bomb className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-400 mb-4">
                    Click "Start Game" to begin playing
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-2 p-4 crypto-black rounded-lg">
                  {tiles.map((tile) => (
                    <Button
                      key={tile.id}
                      onClick={() => revealTile(tile.id)}
                      disabled={!gameActive || tile.revealed}
                      className={`
                        w-16 h-16 text-xl transition-all duration-200
                        ${
                          tile.revealed
                            ? tile.state === "mine"
                              ? "bg-red-500 hover:bg-red-500"
                              : "bg-green-500 hover:bg-green-500"
                            : "crypto-gray hover:bg-crypto-pink/30 border border-crypto-pink/20"
                        }
                      `}
                    >
                      {tile.revealed ? (
                        tile.state === "mine" ? (
                          <Bomb className="w-6 h-6" />
                        ) : (
                          <Gem className="w-6 h-6" />
                        )
                      ) : (
                        "?"
                      )}
                    </Button>
                  ))}
                </div>
              )}
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
                <Label className="block text-sm font-medium mb-2">
                  Number of Mines
                </Label>
                <Select
                  value={mineCount.toString()}
                  onValueChange={(value) => setMineCount(parseInt(value))}
                  disabled={gameActive}
                >
                  <SelectTrigger className="crypto-black border-crypto-pink/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="crypto-gray border-crypto-pink/20">
                    <SelectItem value="3">3 Mines</SelectItem>
                    <SelectItem value="5">5 Mines</SelectItem>
                    <SelectItem value="7">7 Mines</SelectItem>
                    <SelectItem value="10">10 Mines</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Current Multiplier</Label>
                <div className="text-2xl font-bold crypto-green">
                  {currentMultiplier.toFixed(2)}x
                </div>
              </div>

              <div>
                <Label>Potential Win</Label>
                <div className="text-xl font-bold text-crypto-pink">
                  {potentialWin} coins
                </div>
              </div>

              <div>
                <Label className="block text-sm font-medium mb-2">
                  Tiles Revealed
                </Label>
                <div className="text-lg">
                  {revealedCount} / {25 - mineCount}
                </div>
              </div>

              {!gameActive ? (
                <Button
                  onClick={initializeGame}
                  disabled={parseFloat(user.balance) < selectedBet}
                  className="w-full gradient-pink hover:opacity-90"
                >
                  Start Game ({selectedBet} coins)
                </Button>
              ) : (
                <Button
                  onClick={() => cashOut()}
                  disabled={revealedCount === 0}
                  className="w-full bg-crypto-green hover:bg-green-500 text-black font-semibold"
                >
                  Cash Out ({potentialWin} coins)
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

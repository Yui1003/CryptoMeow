import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GameHistory } from "@shared/schema";
import { Wallet as WalletIcon, TrendingUp, TrendingDown, Coins } from "lucide-react";

export default function Wallet() {
  const { user } = useAuth();

  const { data: gameHistory = [] } = useQuery<GameHistory[]>({
    queryKey: ["/api/games/history"],
  });

  const totalWinnings = gameHistory.reduce((sum, game) => sum + parseFloat(game.winAmount), 0);
  const totalBets = gameHistory.reduce((sum, game) => sum + parseFloat(game.betAmount), 0);
  const totalMeowWon = gameHistory.reduce((sum, game) => sum + parseFloat(game.meowWon), 0);

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center mb-8">
        <WalletIcon className="w-8 h-8 crypto-pink mr-3" />
        <h1 className="text-3xl font-bold">Wallet</h1>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="crypto-gray border-crypto-pink/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold crypto-green">
              {parseFloat(user.balance).toFixed(2)} coins
            </div>
          </CardContent>
        </Card>

        <Card className="crypto-gray border-crypto-pink/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">$MEOW Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-crypto-pink">
              {parseFloat(user.meowBalance).toFixed(4)} $MEOW
            </div>
          </CardContent>
        </Card>

        <Card className="crypto-gray border-crypto-pink/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Winnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold crypto-green">
              {totalWinnings.toFixed(2)} coins
            </div>
          </CardContent>
        </Card>

        <Card className="crypto-gray border-crypto-pink/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total $MEOW Won</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-crypto-pink">
              {totalMeowWon.toFixed(4)} $MEOW
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Game History */}
      <Card className="crypto-gray border-crypto-pink/20">
        <CardHeader>
          <CardTitle>Recent Game History</CardTitle>
        </CardHeader>
        <CardContent>
          {gameHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Coins className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No games played yet. Start playing to see your history!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Game</TableHead>
                  <TableHead>Bet Amount</TableHead>
                  <TableHead>Win Amount</TableHead>
                  <TableHead>$MEOW Won</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gameHistory.slice(0, 20).map((game) => {
                  const isWin = parseFloat(game.winAmount) > 0;
                  const isMeowWin = parseFloat(game.meowWon) > 0;
                  
                  return (
                    <TableRow key={game.id}>
                      <TableCell className="capitalize font-medium">{game.gameType}</TableCell>
                      <TableCell>{parseFloat(game.betAmount).toFixed(2)} coins</TableCell>
                      <TableCell className={isWin ? "crypto-green" : "crypto-red"}>
                        {isWin ? <TrendingUp className="w-4 h-4 inline mr-1" /> : <TrendingDown className="w-4 h-4 inline mr-1" />}
                        {parseFloat(game.winAmount).toFixed(2)} coins
                      </TableCell>
                      <TableCell className="text-crypto-pink">
                        {parseFloat(game.meowWon).toFixed(4)} $MEOW
                        {isMeowWin && <Badge variant="secondary" className="ml-2">JACKPOT!</Badge>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={isWin ? "default" : "destructive"}>
                          {isWin ? "Win" : "Loss"}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(game.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

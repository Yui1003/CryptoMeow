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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GameHistory, Withdrawal } from "@shared/schema";
import { Wallet as WalletIcon, TrendingUp, TrendingDown, Coins, Download } from "lucide-react";

export default function Wallet() {
  const { user } = useAuth();

  const { data: gameHistory = [] } = useQuery<GameHistory[]>({
    queryKey: ["/api/games/history"],
    refetchOnWindowFocus: true,
  });

  const { data: withdrawalHistory = [] } = useQuery<Withdrawal[]>({
    queryKey: ["/api/withdrawals/user"],
    refetchOnWindowFocus: true,
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

      {/* History Tabs */}
      <Card className="crypto-gray border-crypto-pink/20">
        <CardContent className="p-0">
          <Tabs defaultValue="games" className="w-full">
            <TabsList className="crypto-gray border-crypto-pink/20 w-full rounded-none">
              <TabsTrigger value="games" className="flex-1">Game History</TabsTrigger>
              <TabsTrigger value="withdrawals" className="flex-1">Withdrawal History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="games" className="p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white">Recent Game History</h3>
              </div>
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
            </TabsContent>

            <TabsContent value="withdrawals" className="p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white">Withdrawal History</h3>
              </div>
              {withdrawalHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Download className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No withdrawal requests yet. Request a withdrawal to see your history!</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Amount</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Request Date</TableHead>
                      <TableHead>Processing Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawalHistory.map((withdrawal) => (
                      <TableRow key={withdrawal.id}>
                        <TableCell className="font-medium">
                          {parseFloat(withdrawal.amount).toFixed(2)} coins
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {withdrawal.platform?.replace('_', ' ') || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              withdrawal.status === "approved" ? "default" :
                              withdrawal.status === "rejected" ? "destructive" : "secondary"
                            }
                            className={
                              withdrawal.status === "approved" ? "bg-green-600" :
                              withdrawal.status === "rejected" ? "" : "bg-yellow-600"
                            }
                          >
                            {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(withdrawal.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-gray-400">
                          {withdrawal.status === "pending" ? "Processing..." : 
                           withdrawal.status === "approved" ? "1-3 business days" :
                           "Rejected"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

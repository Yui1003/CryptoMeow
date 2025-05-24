import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
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
import { useToast } from "@/hooks/use-toast";
import { User, Deposit, Withdrawal, GameHistory } from "@shared/schema";
import { Shield, Ban, Check, X } from "lucide-react";
import { useLocation } from "wouter";

export default function Admin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Redirect if not admin
  if (!user?.isAdmin) {
    setLocation("/");
    return null;
  }

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: deposits = [] } = useQuery<Deposit[]>({
    queryKey: ["/api/deposits"],
  });

  const { data: withdrawals = [] } = useQuery<Withdrawal[]>({
    queryKey: ["/api/withdrawals"],
  });

  const { data: gameHistory = [] } = useQuery<GameHistory[]>({
    queryKey: ["/api/admin/game-history"],
  });

  const banUserMutation = useMutation({
    mutationFn: async ({ userId, banned }: { userId: number; banned: boolean }) => {
      const response = await apiRequest("PATCH", `/api/admin/users/${userId}/ban`, { banned });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User status updated successfully",
      });
    },
  });

  const updateDepositMutation = useMutation({
    mutationFn: async ({ depositId, status }: { depositId: number; status: string }) => {
      const response = await apiRequest("PATCH", `/api/deposits/${depositId}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deposits"] });
      toast({
        title: "Success",
        description: "Deposit status updated successfully",
      });
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center mb-8">
        <Shield className="w-8 h-8 crypto-pink mr-3" />
        <h1 className="text-3xl font-bold">Admin Panel</h1>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="crypto-gray border-crypto-pink/20">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="deposits">Deposits</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
          <TabsTrigger value="games">Game History</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card className="crypto-gray border-crypto-pink/20">
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>$MEOW</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.username}
                        {user.isAdmin && (
                          <Badge variant="secondary" className="ml-2">Admin</Badge>
                        )}
                      </TableCell>
                      <TableCell>{parseFloat(user.balance).toFixed(2)} coins</TableCell>
                      <TableCell>{parseFloat(user.meowBalance).toFixed(4)} $MEOW</TableCell>
                      <TableCell>
                        <Badge variant={user.isBanned ? "destructive" : "default"}>
                          {user.isBanned ? "Banned" : "Active"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {!user.isAdmin && (
                          <Button
                            size="sm"
                            variant={user.isBanned ? "default" : "destructive"}
                            onClick={() => banUserMutation.mutate({
                              userId: user.id,
                              banned: !user.isBanned
                            })}
                            disabled={banUserMutation.isPending}
                          >
                            <Ban className="w-4 h-4 mr-1" />
                            {user.isBanned ? "Unban" : "Ban"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deposits">
          <Card className="crypto-gray border-crypto-pink/20">
            <CardHeader>
              <CardTitle>Deposit Management</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deposits.map((deposit) => (
                    <TableRow key={deposit.id}>
                      <TableCell>{deposit.userId}</TableCell>
                      <TableCell>{parseFloat(deposit.amount).toFixed(2)} coins</TableCell>
                      <TableCell>{deposit.paymentMethod}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            deposit.status === "approved" ? "default" :
                            deposit.status === "rejected" ? "destructive" : "secondary"
                          }
                        >
                          {deposit.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(deposit.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {deposit.status === "pending" && (
                          <div className="space-x-2">
                            <Button
                              size="sm"
                              onClick={() => updateDepositMutation.mutate({
                                depositId: deposit.id,
                                status: "approved"
                              })}
                              disabled={updateDepositMutation.isPending}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => updateDepositMutation.mutate({
                                depositId: deposit.id,
                                status: "rejected"
                              })}
                              disabled={updateDepositMutation.isPending}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdrawals">
          <Card className="crypto-gray border-crypto-pink/20">
            <CardHeader>
              <CardTitle>Withdrawal Management</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals.map((withdrawal) => (
                    <TableRow key={withdrawal.id}>
                      <TableCell>{withdrawal.userId}</TableCell>
                      <TableCell>{parseFloat(withdrawal.amount).toFixed(2)} coins</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            withdrawal.status === "approved" ? "default" :
                            withdrawal.status === "rejected" ? "destructive" : "secondary"
                          }
                        >
                          {withdrawal.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(withdrawal.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="games">
          <Card className="crypto-gray border-crypto-pink/20">
            <CardHeader>
              <CardTitle>Game History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Game</TableHead>
                    <TableHead>Bet</TableHead>
                    <TableHead>Win</TableHead>
                    <TableHead>$MEOW Won</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gameHistory.slice(0, 50).map((game) => (
                    <TableRow key={game.id}>
                      <TableCell>{game.userId}</TableCell>
                      <TableCell className="capitalize">{game.gameType}</TableCell>
                      <TableCell>{parseFloat(game.betAmount).toFixed(2)}</TableCell>
                      <TableCell className={parseFloat(game.winAmount) > 0 ? "crypto-green" : "crypto-red"}>
                        {parseFloat(game.winAmount).toFixed(2)}
                      </TableCell>
                      <TableCell className="crypto-gold">
                        {parseFloat(game.meowWon).toFixed(4)}
                      </TableCell>
                      <TableCell>{new Date(game.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

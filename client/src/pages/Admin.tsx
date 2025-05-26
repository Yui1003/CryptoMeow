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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { User, Deposit, Withdrawal, GameHistory } from "@shared/schema";
import { Shield, Ban, Check, X, Eye, Image } from "lucide-react";
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
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  const { data: withdrawals = [] } = useQuery<Withdrawal[]>({
    queryKey: ["/api/withdrawals"],
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  const { data: gameHistory = [] } = useQuery<GameHistory[]>({
    queryKey: ["/api/admin/game-history"],
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Helper function to get username by user ID
  const getUsernameById = (userId: number) => {
    const user = users.find(u => u.id === userId);
    return user?.username || `User ${userId}`;
  };

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
    mutationFn: async (data: { depositId: number; status: string }) => {
      const response = await apiRequest("PATCH", `/api/deposits/${data.depositId}/status`, {
        status: data.status
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deposits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "Deposit status updated successfully!",
      });
    },
  });

  const updateWithdrawalMutation = useMutation({
    mutationFn: async (data: { withdrawalId: number; status: string }) => {
      const response = await apiRequest("PATCH", `/api/withdrawals/${data.withdrawalId}/status`, {
        status: data.status
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/withdrawals/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "Withdrawal status updated successfully!",
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
                      <TableCell className="text-crypto-pink">{parseFloat(user.meowBalance).toFixed(4)} $MEOW</TableCell>
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
                    <TableHead>Receipt</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deposits.map((deposit) => (
                    <TableRow key={deposit.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{getUsernameById(deposit.userId)}</div>
                          <div className="text-xs text-gray-400">ID: {deposit.userId}</div>
                        </div>
                      </TableCell>
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
                      <TableCell>
                        {deposit.receiptUrl ? (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Eye className="w-4 h-4 mr-1" />
                                View Receipt
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Payment Receipt</DialogTitle>
                              </DialogHeader>
                              <div className="flex justify-center">
                                <img 
                                  src={deposit.receiptUrl} 
                                  alt="Payment Receipt" 
                                  className="max-w-full max-h-96 object-contain rounded-lg"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBmb3VuZDwvdGV4dD48L3N2Zz4=';
                                  }}
                                />
                              </div>
                            </DialogContent>
                          </Dialog>
                        ) : (
                          <span className="text-gray-400 flex items-center">
                            <Image className="w-4 h-4 mr-1" />
                            No receipt
                          </span>
                        )}
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
                    <TableHead>Platform</TableHead>
                    <TableHead>Account Info</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals.map((withdrawal) => (
                    <TableRow key={withdrawal.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{getUsernameById(withdrawal.userId)}</div>
                          <div className="text-xs text-gray-400">ID: {withdrawal.userId}</div>
                        </div>
                      </TableCell>
                      <TableCell>{parseFloat(withdrawal.amount).toFixed(2)} coins</TableCell>
                      <TableCell>{withdrawal.platform || 'N/A'}</TableCell>
                      <TableCell>
                        {withdrawal.accountInfo ? (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Eye className="w-4 h-4 mr-1" />
                                View Details
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>Account Information</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-3">
                                {(() => {
                                  try {
                                    const accountInfo = JSON.parse(withdrawal.accountInfo);
                                    return (
                                      <div className="space-y-2">
                                        <div className="flex justify-between">
                                          <span className="font-medium text-gray-400">Account Number:</span>
                                          <span className="text-white">{accountInfo.accountNumber}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="font-medium text-gray-400">Account Name:</span>
                                          <span className="text-white">{accountInfo.accountName}</span>
                                        </div>
                                        {accountInfo.bankName && (
                                          <div className="flex justify-between">
                                            <span className="font-medium text-gray-400">Bank Name:</span>
                                            <span className="text-white">{accountInfo.bankName}</span>
                                          </div>
                                        )}
                                        <div className="flex justify-between">
                                          <span className="font-medium text-gray-400">Platform:</span>
                                          <span className="text-white capitalize">{withdrawal.platform?.replace('_', ' ')}</span>
                                        </div>
                                      </div>
                                    );
                                  } catch (e) {
                                    return (
                                      <div className="text-gray-400">
                                        {withdrawal.accountInfo}
                                      </div>
                                    );
                                  }
                                })()}
                              </div>
                            </DialogContent>
                          </Dialog>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </TableCell>
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
                      <TableCell>
                        {withdrawal.status === "pending" && (
                          <div className="space-x-2">
                            <Button
                              size="sm"
                              onClick={() => updateWithdrawalMutation.mutate({
                                withdrawalId: withdrawal.id,
                                status: "approved"
                              })}
                              disabled={updateWithdrawalMutation.isPending}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => updateWithdrawalMutation.mutate({
                                withdrawalId: withdrawal.id,
                                status: "rejected"
                              })}
                              disabled={updateWithdrawalMutation.isPending}
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
                      <TableCell>
                        <div>
                          <div className="font-medium">{getUsernameById(game.userId)}</div>
                          <div className="text-xs text-gray-400">ID: {game.userId}</div>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{game.gameType}</TableCell>
                      <TableCell>{parseFloat(game.betAmount).toFixed(2)}</TableCell>
                      <TableCell className={parseFloat(game.winAmount) > 0 ? "crypto-green" : "crypto-red"}>
                        {parseFloat(game.winAmount).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-crypto-pink">
                        {parseFloat(game.meowWon).toFixed(4)} $MEOW
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
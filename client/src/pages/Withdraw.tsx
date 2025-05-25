import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, AlertTriangle } from "lucide-react";

export default function Withdraw() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");

  const withdrawMutation = useMutation({
    mutationFn: async (data: { amount: string }) => {
      const response = await apiRequest("POST", "/api/withdrawals", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Success",
        description: "Withdrawal request submitted successfully!",
      });
      setAmount("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit withdrawal request",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) {
      toast({
        title: "Error",
        description: "Please enter an amount",
        variant: "destructive",
      });
      return;
    }

    const withdrawAmount = parseFloat(amount);
    if (withdrawAmount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (!user || withdrawAmount > parseFloat(user.balance)) {
      toast({
        title: "Error",
        description: "Insufficient balance",
        variant: "destructive",
      });
      return;
    }

    withdrawMutation.mutate({ amount });
  };

  if (!user) return null;

  const currentBalance = parseFloat(user.balance);
  const maxWithdraw = Math.max(0, currentBalance - 10); // Keep minimum 10 coins

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center mb-8">
        <Download className="w-8 h-8 crypto-pink mr-3" />
        <h1 className="text-3xl font-bold text-white">Withdraw Funds</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Withdrawal Form */}
        <Card className="crypto-gray border-crypto-pink/20">
          <CardHeader>
            <CardTitle className="text-white">Request Withdrawal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 crypto-black rounded-lg border border-crypto-pink/30">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Current Balance:</span>
                <span className="crypto-green font-bold text-lg">
                  {currentBalance.toFixed(2)} coins
                </span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-gray-400">Available to Withdraw:</span>
                <span className="crypto-gold font-semibold">
                  {maxWithdraw.toFixed(2)} coins
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="amount">Withdrawal Amount (Coins)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={maxWithdraw}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount to withdraw"
                  className="crypto-black border-crypto-pink/30 focus:border-crypto-pink"
                  required
                />
                <p className="text-sm text-gray-400 mt-1">
                  1 coin = 1 PHP
                </p>
              </div>

              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-crypto-pink/30 hover:bg-crypto-pink"
                  onClick={() => setAmount((maxWithdraw * 0.25).toFixed(2))}
                >
                  25%
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-crypto-pink/30 hover:bg-crypto-pink"
                  onClick={() => setAmount((maxWithdraw * 0.5).toFixed(2))}
                >
                  50%
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-crypto-pink/30 hover:bg-crypto-pink"
                  onClick={() => setAmount((maxWithdraw * 0.75).toFixed(2))}
                >
                  75%
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-crypto-pink/30 hover:bg-crypto-pink"
                  onClick={() => setAmount(maxWithdraw.toFixed(2))}
                >
                  Max
                </Button>
              </div>

              <Button
                type="submit"
                disabled={withdrawMutation.isPending || maxWithdraw <= 0}
                className="w-full gradient-pink hover:opacity-90 transition-opacity"
              >
                {withdrawMutation.isPending ? "Processing..." : "Request Withdrawal"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Withdrawal Information */}
        <Card className="crypto-gray border-crypto-pink/20">
          <CardHeader>
            <CardTitle className="text-white">Withdrawal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-500">Important Notice</h3>
                <p className="text-sm text-gray-300 mt-1">
                  All withdrawal requests require manual processing and verification. 
                  Please allow 1-3 business days for processing.
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold crypto-pink mb-2">Withdrawal Process:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
                <li>Submit your withdrawal request</li>
                <li>Your account balance will be immediately deducted</li>
                <li>Admin will review and process your request</li>
                <li>Funds will be transferred to your registered account</li>
                <li>You'll receive confirmation once completed</li>
              </ol>
            </div>

            <div className="border-t border-crypto-pink/20 pt-4">
              <h3 className="font-semibold crypto-pink mb-2">Withdrawal Limits:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                <li>Minimum withdrawal: ₱50 (50 coins)</li>
                <li>Maximum withdrawal: ₱50,000 per day</li>
                <li>Must maintain minimum balance of 10 coins</li>
                <li>Processing fee: 2% of withdrawal amount</li>
              </ul>
            </div>

            <div className="border-t border-crypto-pink/20 pt-4">
              <h3 className="font-semibold crypto-pink mb-2">Processing Times:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                <li>GCash/Maya: 1-2 business days</li>
                <li>Bank Transfer: 2-3 business days</li>
                <li>Weekends and holidays may cause delays</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

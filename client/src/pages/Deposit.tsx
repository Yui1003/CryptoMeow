import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, CreditCard, Smartphone, Building } from "lucide-react";

const PAYMENT_METHODS = [
  { value: "gcash", label: "GCash", icon: Smartphone },
  { value: "maya", label: "Maya (PayMaya)", icon: Smartphone },
  { value: "bank_transfer", label: "Bank Transfer", icon: Building },
  { value: "credit_card", label: "Credit Card", icon: CreditCard },
];

export default function Deposit() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");

  const depositMutation = useMutation({
    mutationFn: async (data: { amount: string; paymentMethod: string }) => {
      const response = await apiRequest("POST", "/api/deposits", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Deposit request submitted successfully! Please wait for admin approval.",
      });
      setAmount("");
      setPaymentMethod("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit deposit request",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !paymentMethod) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const depositAmount = parseFloat(amount);
    if (depositAmount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    depositMutation.mutate({ amount, paymentMethod });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center mb-8">
        <Upload className="w-8 h-8 crypto-pink mr-3" />
        <h1 className="text-3xl font-bold">Deposit Funds</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Deposit Form */}
        <Card className="crypto-gray border-crypto-pink/20">
          <CardHeader>
            <CardTitle>Make a Deposit</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="amount">Amount (PHP)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount in PHP"
                  className="crypto-black border-crypto-pink/30 focus:border-crypto-pink"
                  required
                />
                <p className="text-sm text-gray-400 mt-1">
                  1 PHP = 1 coin
                </p>
              </div>

              <div>
                <Label htmlFor="payment-method">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod} required>
                  <SelectTrigger className="crypto-black border-crypto-pink/30 focus:border-crypto-pink">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent className="crypto-gray border-crypto-pink/20">
                    {PAYMENT_METHODS.map((method) => {
                      const Icon = method.icon;
                      return (
                        <SelectItem key={method.value} value={method.value}>
                          <div className="flex items-center">
                            <Icon className="w-4 h-4 mr-2" />
                            {method.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                disabled={depositMutation.isPending}
                className="w-full gradient-pink hover:opacity-90 transition-opacity"
              >
                {depositMutation.isPending ? "Submitting..." : "Submit Deposit Request"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="crypto-gray border-crypto-pink/20">
          <CardHeader>
            <CardTitle>Deposit Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold crypto-pink mb-2">How to Deposit:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
                <li>Enter the amount you want to deposit</li>
                <li>Select your preferred payment method</li>
                <li>Submit your deposit request</li>
                <li>Make the payment using your chosen method</li>
                <li>Upload your payment receipt for verification</li>
                <li>Wait for admin approval (usually within 24 hours)</li>
              </ol>
            </div>

            <div className="border-t border-crypto-pink/20 pt-4">
              <h3 className="font-semibold crypto-pink mb-2">Payment Methods:</h3>
              <div className="space-y-2">
                {PAYMENT_METHODS.map((method) => {
                  const Icon = method.icon;
                  return (
                    <div key={method.value} className="flex items-center text-sm">
                      <Icon className="w-4 h-4 mr-2 crypto-green" />
                      <span>{method.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-crypto-pink/20 pt-4">
              <h3 className="font-semibold crypto-pink mb-2">Important Notes:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                <li>Minimum deposit: ₱100</li>
                <li>All deposits are subject to verification</li>
                <li>Processing time: 1-24 hours</li>
                <li>Keep your payment receipt for reference</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

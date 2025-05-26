import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, CreditCard, Smartphone, Building, Bitcoin, Wallet, Copy } from "lucide-react";

const PAYMENT_METHODS = [
  { value: "gcash", label: "GCash", icon: Smartphone, type: "traditional" },
  { value: "maya", label: "Maya (PayMaya)", icon: Smartphone, type: "traditional" },
  { value: "bank_transfer", label: "Bank Transfer", icon: Building, type: "traditional" },
  { value: "credit_card", label: "Credit Card", icon: CreditCard, type: "traditional" },
  { value: "btc", label: "Bitcoin (BTC)", icon: Bitcoin, type: "crypto" },
  { value: "eth", label: "Ethereum (ETH)", icon: Wallet, type: "crypto" },
  { value: "usdt", label: "Tether (USDT)", icon: Wallet, type: "crypto" },
];

const CRYPTO_ADDRESSES = {
  btc: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
  eth: "0x742d35Cc6A3c8a36BBB0F9C52F1c5e7f53C0e5E5",
  usdt: "0x742d35Cc6A3c8a36BBB0F9C52F1c5e7f53C0e5E5", // Same as ETH for ERC-20 USDT
};

export default function Deposit() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const depositMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/deposits", data, {
        isFormData: true,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deposits"] });
      toast({
        title: "Success",
        description: "Deposit request submitted successfully! Please wait for admin approval.",
      });
      setAmount("");
      setPaymentMethod("");
      setReceiptFile(null);
      // Reset file input
      const fileInput = document.getElementById("receipt") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
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
        description: "Please fill in all required fields",
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

    if (!receiptFile) {
      toast({
        title: "Error",
        description: "Please upload your payment receipt",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("amount", amount);
    formData.append("paymentMethod", paymentMethod);
    formData.append("receipt", receiptFile);

    depositMutation.mutate(formData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "File size must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      // Check file type
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Error",
          description: "Please upload an image file",
          variant: "destructive",
        });
        return;
      }
      setReceiptFile(file);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Address copied to clipboard",
    });
  };

  const selectedMethod = PAYMENT_METHODS.find(m => m.value === paymentMethod);
  const isCrypto = selectedMethod?.type === "crypto";

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center mb-8">
        <Upload className="w-8 h-8 crypto-pink mr-3" />
        <h1 className="text-3xl font-bold text-white">Deposit Funds</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Deposit Form */}
        <Card className="crypto-gray border-crypto-pink/20">
          <CardHeader>
            <CardTitle className="text-white">Make a Deposit</CardTitle>
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
                            {method.type === "crypto" && (
                              <span className="ml-2 text-xs bg-crypto-pink/20 text-crypto-pink px-1 rounded">
                                CRYPTO
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Crypto Address Display */}
              {isCrypto && paymentMethod && (
                <div className="p-4 crypto-black border border-crypto-pink/30 rounded-lg">
                  <Label className="text-crypto-pink mb-2 block">
                    {selectedMethod?.label} Address
                  </Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      value={CRYPTO_ADDRESSES[paymentMethod as keyof typeof CRYPTO_ADDRESSES]}
                      readOnly
                      className="crypto-gray border-crypto-pink/30 font-mono text-sm"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => copyToClipboard(CRYPTO_ADDRESSES[paymentMethod as keyof typeof CRYPTO_ADDRESSES])}
                      className="crypto-pink hover:opacity-80"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Send exactly the amount specified above to this address
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="receipt">Upload Payment Receipt *</Label>
                <Input
                  id="receipt"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="crypto-black border-crypto-pink/30 focus:border-crypto-pink"
                  required
                />
                <p className="text-sm text-gray-400 mt-1">
                  Upload screenshot or photo of your payment confirmation (Max 5MB)
                </p>
                {receiptFile && (
                  <p className="text-sm text-crypto-green mt-1">
                    Selected: {receiptFile.name}
                  </p>
                )}
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
            <CardTitle className="text-white">Deposit Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold crypto-pink mb-2">How to Deposit:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
                <li>Enter the amount you want to deposit</li>
                <li>Select your preferred payment method</li>
                <li>Make the payment using your chosen method</li>
                <li>Upload your payment receipt for verification</li>
                <li>Submit your deposit request</li>
                <li>Wait for admin approval (usually within 24 hours)</li>
              </ol>
            </div>

            {/* Traditional Payment Methods */}
            <div className="border-t border-crypto-pink/20 pt-4">
              <h3 className="font-semibold crypto-pink mb-2">Traditional Payment Methods:</h3>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-crypto-green flex items-center">
                    <Smartphone className="w-4 h-4 mr-1" />
                    GCash & Maya
                  </h4>
                  <p className="text-xs text-gray-400 ml-5">
                    Send to: 0999-791-4791<br/>
                    Account Name: CryptoMeow Casino<br/>
                    Reference: JO****E A.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-crypto-green flex items-center">
                    <Building className="w-4 h-4 mr-1" />
                    Bank Transfer
                  </h4>
                  <p className="text-xs text-gray-400 ml-5">
                    Bank: BPI<br/>
                    Account: 1234-5678-90<br/>
                    Account Name: CryptoMeow Casino Inc.
                  </p>
                </div>
              </div>
            </div>

            {/* Crypto Payment Methods */}
            <div className="border-t border-crypto-pink/20 pt-4">
              <h3 className="font-semibold crypto-pink mb-2">Cryptocurrency Payments:</h3>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-crypto-green flex items-center">
                    <Bitcoin className="w-4 h-4 mr-1" />
                    Bitcoin (BTC)
                  </h4>
                  <p className="text-xs text-gray-400 ml-5">
                    Network: Bitcoin Mainnet<br/>
                    Min Deposit: 0.001 BTC<br/>
                    Confirmations: 3 blocks
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-crypto-green flex items-center">
                    <Wallet className="w-4 h-4 mr-1" />
                    Ethereum (ETH)
                  </h4>
                  <p className="text-xs text-gray-400 ml-5">
                    Network: Ethereum Mainnet<br/>
                    Min Deposit: 0.01 ETH<br/>
                    Confirmations: 12 blocks
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-crypto-green flex items-center">
                    <Wallet className="w-4 h-4 mr-1" />
                    Tether (USDT)
                  </h4>
                  <p className="text-xs text-gray-400 ml-5">
                    Network: Ethereum (ERC-20)<br/>
                    Min Deposit: 10 USDT<br/>
                    Confirmations: 12 blocks
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-crypto-pink/20 pt-4">
              <h3 className="font-semibold crypto-pink mb-2">Important Notes:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                <li>Minimum deposit: ₱100</li>
                <li>All deposits require receipt upload</li>
                <li>Processing time: 1-24 hours</li>
                <li>Wrong network transactions cannot be recovered</li>
                <li>Double-check addresses before sending crypto</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
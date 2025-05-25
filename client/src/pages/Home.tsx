import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import GameCard from "@/components/GameCard";
import BettingPanel from "@/components/BettingPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";
import {
  Gamepad2,
  Wallet,
  Upload,
  Download,
  ArrowUpDown,
  Shield,
  Cat,
  Sparkles,
  Coins,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Particle component
const Particle = ({ delay }: { delay: number }) => {
  const [style, setStyle] = useState({});

  useEffect(() => {
    const randomX = Math.random() * 100;
    const randomSize = Math.random() * 4 + 2;
    const randomDuration = Math.random() * 10 + 15;

    setStyle({
      left: `${randomX}%`,
      width: `${randomSize}px`,
      height: `${randomSize}px`,
      animationDelay: `${delay}s`,
      animationDuration: `${randomDuration}s`,
    });
  }, [delay]);

  return <div className="particle" style={style} />;
};

// Coin rain component
const CoinRain = ({ delay }: { delay: number }) => {
  const [style, setStyle] = useState({});

  useEffect(() => {
    const randomX = Math.random() * 100;
    const randomDuration = Math.random() * 4 + 6;

    setStyle({
      left: `${randomX}%`,
      animationDelay: `${delay}s`,
      animationDuration: `${randomDuration}s`,
    });
  }, [delay]);

  return (
    <div className="coin-rain" style={style}>
      💰
    </div>
  );
};

export default function Home() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBet, setSelectedBet] = useState(1.0);
  const [meowToConvert, setMeowToConvert] = useState("");
  const [particles, setParticles] = useState<number[]>([]);
  const [coins, setCoins] = useState<number[]>([]);

  // Initialize particles and coin rain
  useEffect(() => {
    setParticles(Array.from({ length: 20 }, (_, i) => i));
    setCoins(Array.from({ length: 8 }, (_, i) => i));
  }, []);

  const convertMutation = useMutation({
    mutationFn: async (meowAmount: string) => {
      const response = await apiRequest("POST", "/api/user/convert-meow", {
        meowAmount,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Success",
        description: `Converted ${data.converted} coins from $MEOW!`,
      });
      setMeowToConvert("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Conversion failed",
        variant: "destructive",
      });
    },
  });

  const handleConvert = () => {
    if (!meowToConvert || parseFloat(meowToConvert) <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }
    convertMutation.mutate(meowToConvert);
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="relative min-h-screen background-animated">
      {/* Particle System */}
      <div className="particles-container">
        {particles.map((particle, index) => (
          <Particle key={`particle-${particle}`} delay={index * 0.5} />
        ))}
        {coins.map((coin, index) => (
          <CoinRain key={`coin-${coin}`} delay={index * 1.2} />
        ))}
      </div>

      {/* Floating decorative elements */}
      <div className="fixed top-20 left-10 text-crypto-pink/20 animate-float z-10">
        <Sparkles size={32} />
      </div>
      <div className="fixed top-40 right-20 text-crypto-pink/20 animate-float-delayed z-10">
        <Coins size={28} />
      </div>
      <div className="fixed bottom-32 left-20 text-crypto-pink/20 animate-float z-10">
        <Cat size={24} />
      </div>

      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="col-span-12 lg:col-span-3 animate-slide-in">
            <Card className="crypto-gray border-crypto-pink/20 backdrop-blur-sm bg-opacity-95 animate-glow hover-scale">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-crypto-pink flex items-center animate-sparkle">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Navigation Menu */}
                <div className="space-y-3">
                  <Button
                    asChild
                    className="w-full crypto-pink hover:bg-crypto-pink-light transition-all hover:scale-105 hover:shadow-lg hover:shadow-crypto-pink/30"
                  >
                    <Link href="/">
                      <Gamepad2 className="w-4 h-4 mr-2" />
                      Games
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full crypto-black hover:bg-crypto-gray border-crypto-pink/30 transition-all hover:scale-105 hover:border-crypto-pink"
                  >
                    <Link href="/wallet">
                      <Wallet className="w-4 h-4 mr-2" />
                      Wallet
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full crypto-black hover:bg-crypto-gray border-crypto-pink/30 transition-all hover:scale-105 hover:border-crypto-pink"
                  >
                    <Link href="/deposit">
                      <Upload className="w-4 h-4 mr-2" />
                      Deposit
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full crypto-black hover:bg-crypto-gray border-crypto-pink/30 transition-all hover:scale-105 hover:border-crypto-pink"
                  >
                    <Link href="/withdraw">
                      <Download className="w-4 h-4 mr-2" />
                      Withdraw
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full crypto-black hover:bg-crypto-gray border-crypto-pink/30 transition-all hover:scale-105 hover:border-crypto-pink"
                  >
                    <Link href="/farm">
                      <Cat className="w-4 h-4 mr-2" />
                      Cat Farm
                    </Link>
                  </Button>
                </div>

                {/* Conversion Tool */}
                <div className="border-t border-crypto-pink/20 pt-6">
                  <h3 className="font-semibold mb-3 text-crypto-pink flex items-center">
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    Convert $MEOW
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span>1 $MEOW</span>
                      <span className="crypto-green">= 5,000 Coins</span>
                    </div>
                    <div>
                      <Label htmlFor="meow-amount" className="text-sm">
                        $MEOW Amount
                      </Label>
                      <Input
                        id="meow-amount"
                        type="number"
                        step="0.0001"
                        min="0"
                        placeholder="Enter $MEOW amount"
                        value={meowToConvert}
                        onChange={(e) => setMeowToConvert(e.target.value)}
                        className="crypto-black border-crypto-pink/30 focus:border-crypto-pink"
                      />
                    </div>
                    <Button
                      onClick={handleConvert}
                      disabled={convertMutation.isPending}
                      className="w-full bg-crypto-green hover:bg-green-500 text-black font-semibold"
                    >
                      {convertMutation.isPending
                        ? "Converting..."
                        : "Convert to Coins"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="col-span-12 lg:col-span-9 animate-fade-in">
            {/* Games Grid */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-crypto-pink animate-glow text-shadow-lg">
                  Casino Games
                </h2>
                <div className="flex items-center space-x-2 text-sm text-gray-400 animate-pulse">
                  <Shield className="w-4 h-4 crypto-green animate-sparkle" />
                  <span>Provably Fair</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
                <div
                  className="animate-fade-in"
                  style={{ animationDelay: "0.1s" }}
                >
                  <GameCard
                    title="Mines"
                    description="Navigate the minefield and cash out before hitting a bomb. The more tiles you reveal, the higher your multiplier!"
                    imageUrl="https://images.unsplash.com/photo-1621761191319-c6fb62004040?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"
                    players={247}
                    maxWin="24.75x"
                    gameUrl="/games/mines"
                  />
                </div>

                <div
                  className="animate-fade-in"
                  style={{ animationDelay: "0.2s" }}
                >
                  <GameCard
                    title="Crash"
                    description="Watch the multiplier rise and cash out before it crashes! Will you be greedy or play it safe?"
                    imageUrl="https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"
                    players={189}
                    maxWin="2.47x"
                    gameUrl="/games/crash"
                  />
                </div>

                <div
                  className="animate-fade-in"
                  style={{ animationDelay: "0.3s" }}
                >
                  <GameCard
                    title="Wheel of Fortune"
                    description="Spin the wheel and let fortune decide your fate! Choose your risk level and potential rewards."
                    imageUrl="https://images.unsplash.com/photo-1596838132731-3301c3fd4317?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"
                    players={156}
                    maxWin="50.00x"
                    gameUrl="/games/wheel"
                  />
                </div>

                <div
                  className="animate-fade-in"
                  style={{ animationDelay: "0.4s" }}
                >
                  <GameCard
                    title="Hi-Lo"
                    description="Guess if the next card is higher or lower than the current one. Simple rules, endless excitement!"
                    imageUrl="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"
                    players={201}
                    winRate="~49%"
                    gameUrl="/games/hilo"
                  />
                </div>

                <div
                  className="animate-fade-in"
                  style={{ animationDelay: "0.5s" }}
                >
                  <GameCard
                    title="Dice Roll"
                    description="Roll the dice and predict the outcome! Choose your risk range for bigger rewards."
                    imageUrl="https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"
                    players={134}
                    maxWin="Range: 1-100"
                    gameUrl="/games/dice"
                  />
                </div>

                {/* Coming Soon Card */}
                <div
                  className="animate-fade-in"
                  style={{ animationDelay: "0.6s" }}
                >
                  <Card className="crypto-gray/50 border-2 border-dashed border-crypto-pink/30 flex items-center justify-center h-80 hover-scale transition-all hover:border-crypto-pink/50 hover:bg-crypto-gray/70">
                    <div className="text-center">
                      <div className="text-6xl text-crypto-pink/50 mb-4 animate-pulse">
                        +
                      </div>
                      <h3 className="text-xl font-bold text-crypto-pink/70 mb-2">
                        More Games Coming Soon
                      </h3>
                      <p className="text-gray-500">
                        Stay tuned for exciting new additions!
                      </p>
                    </div>
                  </Card>
                </div>
              </div>
            </div>

            {/* Betting Panel */}
            <BettingPanel
              selectedBet={selectedBet}
              onBetSelect={setSelectedBet}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

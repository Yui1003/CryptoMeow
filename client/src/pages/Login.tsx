import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Coins, Cat } from "lucide-react";

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

export default function Login() {
  const [, setLocation] = useLocation();
  const { user, login, isLoading } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [particles, setParticles] = useState<number[]>([]);
  const [coins, setCoins] = useState<number[]>([]);

  // Initialize particles and coin rain
  useEffect(() => {
    setParticles(Array.from({ length: 20 }, (_, i) => i));
    setCoins(Array.from({ length: 8 }, (_, i) => i));
  }, []);

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    
    try {
      await login(username, password);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  return (
    <div className="min-h-screen background-animated flex items-center justify-center p-4 relative">
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
      <Card className="w-full max-w-md crypto-gray border-crypto-pink/20 relative z-20">
        <CardHeader className="text-center">
          <div className="w-16 h-16 gradient-pink rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">🐱</span>
          </div>
          <CardTitle className="text-2xl font-bold">Welcome to CryptoMeow</CardTitle>
          <p className="text-gray-400 mt-2">Login to your account</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="crypto-black border-crypto-pink/30 focus:border-crypto-pink"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="crypto-black border-crypto-pink/30 focus:border-crypto-pink"
                required
              />
            </div>
            
            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full gradient-pink hover:opacity-90 transition-opacity"
            >
              {isLoading ? "Logging in..." : "Login"}
            </Button>
            
            <div className="text-center">
              <Link href="/register">
                <Button variant="link" className="text-crypto-pink hover:text-crypto-pink-light">
                  Don't have an account? Register here
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

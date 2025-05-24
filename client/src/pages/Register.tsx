import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect } from "react";

export default function Register() {
  const [, setLocation] = useLocation();
  const { user, register, isLoading } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || !confirmPassword) return;
    
    if (password !== confirmPassword) {
      // Handle password mismatch
      return;
    }
    
    try {
      await register(username, password);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  return (
    <div className="min-h-screen crypto-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md crypto-gray border-crypto-pink/20">
        <CardHeader className="text-center">
          <div className="w-16 h-16 gradient-pink rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">🐱</span>
          </div>
          <CardTitle className="text-2xl font-bold">Join CryptoMeow</CardTitle>
          <p className="text-gray-400 mt-2">Create your account and start playing</p>
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
                placeholder="Choose a username"
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

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="crypto-black border-crypto-pink/30 focus:border-crypto-pink"
                required
              />
            </div>
            
            <Button 
              type="submit" 
              disabled={isLoading || password !== confirmPassword}
              className="w-full gradient-pink hover:opacity-90 transition-opacity"
            >
              {isLoading ? "Creating Account..." : "Register"}
            </Button>
            
            <div className="text-center">
              <Link href="/login">
                <Button variant="link" className="text-crypto-pink hover:text-crypto-pink-light">
                  Already have an account? Login here
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

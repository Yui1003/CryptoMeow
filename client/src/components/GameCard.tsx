import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { Link } from "wouter";

interface GameCardProps {
  title: string;
  description: string;
  imageUrl: string;
  players: number;
  maxWin?: string;
  winRate?: string;
  gameUrl: string;
}

export default function GameCard({ 
  title, 
  description, 
  imageUrl, 
  players, 
  maxWin, 
  winRate, 
  gameUrl 
}: GameCardProps) {
  return (
    <Card className="game-card crypto-gray border-crypto-pink/20 hover:border-crypto-pink/50 transition-all duration-300 overflow-hidden">
      <img 
        src={imageUrl} 
        alt={title}
        className="w-full h-48 object-cover"
      />
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <div className="flex items-center space-x-1 crypto-green">
            <Users className="w-4 h-4" />
            <span className="text-sm">{players}</span>
          </div>
        </div>

        <p className="text-gray-400 text-sm mb-4">{description}</p>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-300">
            Max Win: <span className="text-crypto-green font-semibold text-base">{maxWin}</span>
          </div>
          <Link href={gameUrl}>
            <Button className="gradient-pink hover:opacity-90 transition-opacity">
              Play Now
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
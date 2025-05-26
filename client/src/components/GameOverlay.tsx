
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, TrendingUp, ShoppingCart } from "lucide-react";

interface GameOverlayProps {
  isVisible: boolean;
  overlayType: 'catInfo' | 'shop' | 'upgrade' | null;
  data?: any;
  onClose: () => void;
  onAction?: (action: string, data?: any) => void;
}

export default function GameOverlay({ 
  isVisible, 
  overlayType, 
  data, 
  onClose, 
  onAction 
}: GameOverlayProps) {
  if (!isVisible || !overlayType) return null;

  const renderCatInfo = () => (
    <Card className="crypto-gray border-crypto-pink/20 max-w-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center">
          <span className="text-2xl mr-2">{data?.emoji || '🐱'}</span>
          {data?.name || 'Cat'}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between">
          <span className="text-sm text-gray-400">Level</span>
          <Badge>{data?.level || 1}</Badge>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-400">Production</span>
          <span className="text-crypto-green font-semibold">
            {data?.production?.toFixed(6) || '0.000000'} $MEOW/hour
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-400">Upgrade Cost</span>
          <span className="text-crypto-pink">
            {data?.upgradeCost || '0.000000'} $MEOW
          </span>
        </div>
        <Button 
          className="w-full crypto-pink hover:bg-crypto-pink-light"
          onClick={() => onAction?.('upgrade', data)}
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          Upgrade Cat
        </Button>
      </CardContent>
    </Card>
  );

  const renderShop = () => (
    <Card className="crypto-gray border-crypto-pink/20 max-w-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>Cat Shop</CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 max-h-96 overflow-y-auto">
        {data?.map((cat: any) => (
          <div key={cat.id} className="border border-crypto-pink/20 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center">
                <span className="text-xl mr-2">{cat.emoji}</span>
                {cat.name}
              </span>
              <Badge className={`text-xs ${
                cat.rarity === 'legendary' ? 'text-yellow-400 border-yellow-400' :
                cat.rarity === 'epic' ? 'text-purple-400 border-purple-400' :
                cat.rarity === 'rare' ? 'text-blue-400 border-blue-400' :
                'text-gray-400 border-gray-400'
              }`}>
                {cat.rarity}
              </Badge>
            </div>
            <p className="text-xs text-gray-400 mb-2">{cat.description}</p>
            <div className="flex justify-between items-center">
              <span className="text-sm">
                <span className="text-gray-400">Cost: </span>
                <span className="text-crypto-pink font-semibold">
                  {cat.cost.toFixed(6)} $MEOW
                </span>
              </span>
              <Button 
                size="sm"
                className="gradient-pink hover:opacity-90"
                onClick={() => onAction?.('buy', cat)}
              >
                <ShoppingCart className="w-3 h-3 mr-1" />
                Buy
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="pointer-events-auto">
        {overlayType === 'catInfo' && renderCatInfo()}
        {overlayType === 'shop' && renderShop()}
      </div>
    </div>
  );
}

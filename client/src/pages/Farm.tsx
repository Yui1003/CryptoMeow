import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GameEngine from "@/components/GameEngine";
import {
  Cat,
  Sprout,
  Coins,
  ShoppingCart,
  TrendingUp,
  Star,
  Clock,
  Zap,
  Gamepad2,
  BarChart3,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Cat {
  id: string;
  name: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  baseProduction: number;
  cost: number;
  description: string;
  emoji: string;
}

interface FarmData {
  cats: Array<{
    id: string;
    catId: string;
    level: number;
    lastClaim: string;
    production: number;
  }>;
  totalProduction: number;
  unclaimedMeow: number;
}

const CAT_TYPES: Cat[] = [
  {
    id: "basic",
    name: "House Cat",
    rarity: "common",
    baseProduction: 0.001,
    cost: 0.1,
    description: "A lazy house cat that occasionally finds loose change",
    emoji: "🐱",
  },
  {
    id: "farm",
    name: "Farm Cat",
    rarity: "common",
    baseProduction: 0.002,
    cost: 0.25,
    description: "Works hard catching mice and earning $MEOW",
    emoji: "🐈",
  },
  {
    id: "business",
    name: "Business Cat",
    rarity: "rare",
    baseProduction: 0.005,
    cost: 0.75,
    description: "Wears a tiny suit and makes smart investments",
    emoji: "🐱‍💼",
  },
  {
    id: "ninja",
    name: "Ninja Cat",
    rarity: "rare",
    baseProduction: 0.008,
    cost: 1.5,
    description: "Stealthily acquires $MEOW through secret missions",
    emoji: "🥷",
  },
  {
    id: "cyber",
    name: "Cyber Cat",
    rarity: "epic",
    baseProduction: 0.015,
    cost: 3.0,
    description: "Mines cryptocurrency with advanced algorithms",
    emoji: "🤖",
  },
  {
    id: "golden",
    name: "Golden Cat",
    rarity: "legendary",
    baseProduction: 0.05,
    cost: 10.0,
    description: "A mystical cat that attracts wealth and fortune",
    emoji: "✨",
  },
];

export default function Farm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: farmData, isLoading } = useQuery({
    queryKey: ["/api/farm/data"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/farm/data");
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const [unclaimedMeow, setUnclaimedMeow] = useState(0);
  const [baseUnclaimedMeow, setBaseUnclaimedMeow] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
  const [showCatDialog, setShowCatDialog] = useState(false);
  const [selectedCat, setSelectedCat] = useState<any>(null);

  useEffect(() => {
    if (farmData) {
      setBaseUnclaimedMeow(parseFloat(farmData.unclaimedMeow || "0"));
      setUnclaimedMeow(parseFloat(farmData.unclaimedMeow || "0"));
      setLastUpdateTime(Date.now());
    }
  }, [farmData]);

  useEffect(() => {
    if (farmData && farmData.totalProduction > 0) {
      const calculateUnclaimed = () => {
        const currentTime = Date.now();
        const timeElapsedSinceUpdate = (currentTime - lastUpdateTime) / 3600000; // in hours
        const additionalEarnings = farmData.totalProduction * timeElapsedSinceUpdate;
        const newUnclaimed = baseUnclaimedMeow + additionalEarnings;
        setUnclaimedMeow(newUnclaimed);
      };

      const intervalId = setInterval(calculateUnclaimed, 1000); // Update every second

      return () => clearInterval(intervalId); // Cleanup interval on unmount
    }
  }, [farmData, baseUnclaimedMeow, lastUpdateTime]);

  const buyCatMutation = useMutation({
    mutationFn: async (catId: string) => {
      console.log("Buying cat with ID:", catId);
      const response = await apiRequest("POST", "/api/farm/buy-cat", { catId });
      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Network error" }));
        console.error("Buy cat error response:", errorData);
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`,
        );
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/farm/data"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Success!",
        description: "Cat purchased successfully!",
      });
    },
    onError: (error: any) => {
      console.error("Buy cat error:", error);
      toast({
        title: "Error",
        description:
          error.message || "Failed to purchase cat. Check console for details.",
        variant: "destructive",
      });
    },
  });

  const claimMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/farm/claim");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/farm/data"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Claimed!",
        description: `You earned ${parseFloat(data.claimed).toFixed(6)} $MEOW!`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to claim rewards",
        variant: "destructive",
      });
    },
  });

  const upgradeCatMutation = useMutation({
    mutationFn: async (farmCatId: string) => {
      const response = await apiRequest("POST", "/api/farm/upgrade-cat", {
        farmCatId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/farm/data"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Upgraded!",
        description: "Cat upgraded successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upgrade cat",
        variant: "destructive",
      });
    },
  });

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "common":
        return "text-gray-400 border-gray-400";
      case "rare":
        return "text-blue-400 border-blue-400";
      case "epic":
        return "text-purple-400 border-purple-400";
      case "legendary":
        return "text-yellow-400 border-yellow-400";
      default:
        return "text-gray-400 border-gray-400";
    }
  };

  const getUpgradeCost = (level: number) => {
    return (0.1 * Math.pow(1.5, level)).toFixed(6);
  };

  const handleClaimRewards = () => {
    claimMutation.mutate();
  };

  const handleCatClick = (catData: any) => {
    setSelectedCat(catData);
    setShowCatDialog(true);
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center mb-8">
        <Cat className="w-8 h-8 crypto-pink mr-3" />
        <h1 className="text-3xl font-bold">$MEOW Cat Farm</h1>
        <Badge variant="secondary" className="ml-4">
          Passive Income
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Farm Stats */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="crypto-gray border-crypto-pink/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Coins className="w-5 h-5 crypto-gold mr-2" />
                Farm Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <div>
                <div className="text-sm text-gray-400">Your $MEOW Balance</div>
                <div className="text-xl font-bold text-crypto-pink">
                  {parseFloat(user.meowBalance || "0").toFixed(6)}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-400">Unclaimed Rewards</div>
                <div className="text-lg font-semibold crypto-green">
                  {unclaimedMeow.toFixed(6)}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-400">Production Rate</div>
                <div className="text-lg font-semibold bg-pink-500 text-black py-2 px-4 rounded-md">
                  {farmData
                    ? `${parseFloat(farmData.totalProduction || "0").toFixed(6)}/hour`
                    : "0.000000/hour"}
                </div>
              </div>

              <Button
                onClick={() => claimMutation.mutate()}
                disabled={
                  claimMutation.isPending ||
                  unclaimedMeow <= 0
                }
                className="w-full bg-crypto-green hover:bg-green-500 text-white hover:text-black font-semibold"
              >
                <Zap className="w-4 h-4 mr-2" />
                Claim Rewards
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="game" className="space-y-6">
            <TabsList className="crypto-gray border-crypto-pink/20">
              <TabsTrigger value="game" className="flex items-center gap-2">
                <Gamepad2 className="w-4 h-4" />
                Cat Village
              </TabsTrigger>
              <TabsTrigger value="cats" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                My Cats
              </TabsTrigger>
              <TabsTrigger value="shop">Cat Shop</TabsTrigger>
            </TabsList>

            {/* Game View Tab */}
            <TabsContent value="game">
              <div className="relative">
                <Card className="crypto-gray border-crypto-pink/20 overflow-hidden">
                  <CardContent className="p-0 relative">
                    {farmData && (
                      <GameEngine
                        farmData={farmData}
                        onCatClick={(catData: any) => {
                          console.log('Cat clicked in Farm component:', catData);
                          const catType = CAT_TYPES.find((c) => c.id === catData.catId);
                          if (catType) {
                            setSelectedCat({ ...catData, ...catType });
                            setShowCatDialog(true);
                          }
                        }}
                      />
                    )}

                    {/* Floating HUD */}
                    <div className="absolute top-4 left-4 right-4 z-10">
                      <div className="flex justify-between items-start">
                        {/* Stats Cards */}
                        <div className="flex gap-2">
                          <Card className="crypto-gray border-crypto-pink/20 backdrop-blur-sm bg-opacity-90">
                            <CardContent className="p-3">
                              <div className="flex items-center gap-2">
                                <Coins className="w-4 h-4 crypto-gold" />
                                <div>
                                  <div className="text-xs text-gray-400">Balance</div>
                                  <div className="text-sm font-bold text-crypto-pink">
                                    {parseFloat(user.meowBalance || "0").toFixed(4)}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          <Card className="crypto-gray border-crypto-pink/20 backdrop-blur-sm bg-opacity-90">
                            <CardContent className="p-3">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 crypto-green" />
                                <div>
                                  <div className="text-xs text-gray-400">Production</div>
                                  <div className="text-sm font-bold crypto-green">
                                    {farmData ? `${parseFloat(farmData.totalProduction || "0").toFixed(4)}/h` : "0/h"}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          <Card className="crypto-gray border-crypto-pink/20 backdrop-blur-sm bg-opacity-90">
                            <CardContent className="p-3">
                              <div className="flex items-center gap-2">
                                <Zap className="w-4 h-4 crypto-gold" />
                                <div>
                                  <div className="text-xs text-gray-400">Unclaimed</div>
                                  <div className="text-sm font-bold crypto-green">
                                    {unclaimedMeow.toFixed(4)}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <Button
                            onClick={() => claimMutation.mutate()}
                            disabled={claimMutation.isPending || unclaimedMeow <= 0}
                            className={`transition-all duration-300 ${
                              unclaimedMeow > 0
                                ? 'bg-crypto-green hover:bg-green-500 text-white'
                                : 'bg-gray-600 text-gray-400'
                            }`}
                            size="sm"
                          >
                            <Zap className="w-4 h-4 mr-1" />
                            Claim
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Instructions */}
                    <div className="absolute bottom-4 left-4 right-4 z-10">
                      <Card className="crypto-gray border-crypto-pink/20 backdrop-blur-sm bg-opacity-90">
                        <CardContent className="p-3">
                          <div className="text-center">
                            <p className="text-sm text-gray-300 mb-2">
                              🎮 <strong>How to Play:</strong> Click on cats to upgrade them • Watch them work and earn $MEOW • Buy new cats from the shop
                            </p>
                            <div className="flex justify-center gap-2 text-xs text-gray-400">
                              <span>🐱 = Working</span>
                              <span>💰 = Earning</span>
                              <span>✨ = Upgraded</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* My Cats Tab */}
            <TabsContent value="cats">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {farmData?.cats?.length > 0 ? (
                  farmData.cats.map((farmCat: any, index: number) => {
                    const catType = CAT_TYPES.find(
                      (c) => c.id === farmCat.catId,
                    );
                    if (!catType) return null;

                    return (
                      <Card
                        key={index}
                        className="crypto-gray border-crypto-pink/20"
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center justify-between">
                            <span className="flex items-center">
                              <span className="text-2xl mr-2">
                                {catType.emoji}
                              </span>
                              {catType.name}
                            </span>
                            <Badge className={getRarityColor(catType.rarity)}>
                              Lv.{farmCat.level}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <div className="text-sm text-gray-400">
                              Production Rate
                            </div>
                            <div className="text-lg font-semibold crypto-green">
                              {farmCat.production.toFixed(6)} $MEOW/hour
                            </div>
                          </div>

                          <div>
                            <div className="text-sm text-gray-400">
                              Upgrade Cost
                            </div>
                            <div className="text-sm text-crypto-pink">
                              {getUpgradeCost(farmCat.level)} $MEOW
                            </div>
                          </div>

                          <Button
                            onClick={() =>
                              upgradeCatMutation.mutate(farmCat.id)
                            }
                            disabled={
                              upgradeCatMutation.isPending ||
                              parseFloat(user.meowBalance) <
                                parseFloat(getUpgradeCost(farmCat.level))
                            }
                            className="w-full crypto-pink hover:bg-crypto-pink-light"
                            size="sm"
                          >
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Upgrade Cat
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <div className="col-span-full text-center py-12">
                    <Cat className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-400 mb-2">
                      No cats yet!
                    </h3>
                    <p className="text-gray-500">
                      Purchase your first cat from the shop to start earning
                      $MEOW
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Cat Shop Tab */}
            <TabsContent value="shop">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {CAT_TYPES.map((cat) => (
                  <Card
                    key={cat.id}
                    className="crypto-gray border-crypto-pink/20"
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center">
                          <span className="text-3xl mr-2">{cat.emoji}</span>
                          {cat.name}
                        </span>
                        <Badge className={getRarityColor(cat.rarity)}>
                          {cat.rarity}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-gray-400">{cat.description}</p>

                      <div>
                        <div className="text-sm text-gray-400">
                          Base Production
                        </div>
                        <div className="text-lg font-semibold crypto-green">
                          {cat.baseProduction.toFixed(6)} $MEOW/hour
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-gray-400">Cost</div>
                        <div className="text-lg font-semibold text-crypto-pink">
                          {cat.cost.toFixed(6)} $MEOW
                        </div>
                      </div>

                      <Button
                        onClick={() => buyCatMutation.mutate(cat.id)}
                        disabled={
                          buyCatMutation.isPending ||
                          parseFloat(user.meowBalance) < cat.cost
                        }
                        className="w-full gradient-pink hover:opacity-90"
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Buy Cat
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Cat Information Dialog */}
      <Dialog open={showCatDialog} onOpenChange={setShowCatDialog}>
        <DialogContent className="crypto-gray border-crypto-pink/20 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <span className="text-2xl">
                {selectedCat?.catId === 'basic' && '🐱'}
                {selectedCat?.catId === 'farm' && '🐈'}
                {selectedCat?.catId === 'business' && '🐱‍💼'}
                {selectedCat?.catId === 'ninja' && '🥷'}
                {selectedCat?.catId === 'cyber' && '🤖'}
                {selectedCat?.catId === 'golden' && '✨'}
              </span>
              {selectedCat?.catId?.toUpperCase()} Cat
            </DialogTitle>
          </DialogHeader>

          {selectedCat && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">Level</label>
                  <div className="text-lg font-semibold text-crypto-green">
                    {selectedCat.level}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Production</label>
                  <div className="text-lg font-semibold text-crypto-green">
                    {selectedCat.production?.toFixed(6)} $MEOW/h
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400">Upgrade Cost</label>
                <div className="text-lg font-semibold text-crypto-pink">
                  {getUpgradeCost(selectedCat.level)} $MEOW
                </div>
              </div>

              <Button
                onClick={() => {
                  upgradeCatMutation.mutate(selectedCat.id);
                  setShowCatDialog(false);
                }}
                disabled={
                  upgradeCatMutation.isPending ||
                  parseFloat(user.meowBalance) < parseFloat(getUpgradeCost(selectedCat.level))
                }
                className="w-full gradient-pink hover:opacity-90"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Upgrade Cat ({getUpgradeCost(selectedCat.level)} $MEOW)
              </Button>

              <div className="text-xs text-gray-500 mt-2">
                Click on cats in the farm to interact with them!
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
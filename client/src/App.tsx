import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Admin from "@/pages/Admin";
import Wallet from "@/pages/Wallet";
import Deposit from "@/pages/Deposit";
import Withdraw from "./pages/Withdraw";
import Farm from "./pages/Farm";
import Mines from "@/pages/games/Mines";
import Crash from "@/pages/games/Crash";
import Wheel from "@/pages/games/Wheel";
import HiLo from "@/pages/games/HiLo";
import Dice from "@/pages/games/Dice";
import Layout from "@/components/Layout";
import { AuthProvider } from "@/lib/auth";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/admin" component={Admin} />
      <Route path="/wallet" component={Wallet} />
      <Route path="/deposit" component={Deposit} />
      <Route path="/withdraw" component={Withdraw} />
      <Route path="/farm" component={Farm} />
      <Route path="/games/mines" component={Mines} />
      <Route path="/games/crash" component={Crash} />
      <Route path="/games/wheel" component={Wheel} />
      <Route path="/games/hilo" component={HiLo} />
      <Route path="/games/dice" component={Dice} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Layout>
            <Toaster />
            <Router />
          </Layout>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
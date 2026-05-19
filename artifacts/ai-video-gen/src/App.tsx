import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { PlanProvider } from "@/context/plan";
import GeneratePage from "@/pages/generate";
import HistoryPage from "@/pages/history";
import StatsPage from "@/pages/stats";
import ChatPage from "@/pages/chat";
import ImageGenPage from "@/pages/image-gen";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={ChatPage} />
        <Route path="/video" component={GeneratePage} />
        <Route path="/image" component={ImageGenPage} />
        <Route path="/history" component={HistoryPage} />
        <Route path="/stats" component={StatsPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PlanProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </PlanProvider>
    </QueryClientProvider>
  );
}

export default App;

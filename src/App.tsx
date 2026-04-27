import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Agencies from "./pages/Agencies";
import AgencyDetail from "./pages/AgencyDetail";
import WarRoom from "./pages/WarRoom";
import DataRoom from "./pages/DataRoom";
import Playbooks from "./pages/Playbooks";
import Deals from "./pages/Deals";
import DealDetail from "./pages/DealDetail";
import Projections from "./pages/Projections";
import QompassChat from "./pages/QompassChat";
import NotFound from "./pages/NotFound";
import { SimulationProvider } from "./lib/simulation-store";
import { DealsProvider } from "./lib/deals/deals-store";
import { QompassChatProvider } from "./lib/chat/chat-store";
import FloatingChat from "./components/chat/FloatingChat";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <SimulationProvider>
        <DealsProvider>
        <QompassChatProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/agencies" element={<Agencies />} />
            <Route path="/agencies/:id" element={<AgencyDetail />} />
            <Route path="/war-room" element={<WarRoom />} />
            <Route path="/data-room" element={<DataRoom />} />
            <Route path="/playbooks" element={<Playbooks />} />
            <Route path="/playbooks/:agencyId" element={<Playbooks />} />
            <Route path="/deals" element={<Deals />} />
            <Route path="/deals/:id" element={<DealDetail />} />
            <Route path="/projections" element={<Projections />} />
            <Route path="/chat" element={<QompassChat />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <FloatingChat />
        </BrowserRouter>
        </QompassChatProvider>
        </DealsProvider>
      </SimulationProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

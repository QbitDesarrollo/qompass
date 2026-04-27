import { createContext, useContext, useMemo, useState, ReactNode, useCallback } from 'react';
import { Deal, DEMO_DEALS, emptyInputs, DealStage } from './deals-data';

interface Ctx {
  deals: Deal[];
  getDeal: (id: string) => Deal | undefined;
  createDeal: (partial: Partial<Deal>) => Deal;
  updateDeal: (id: string, patch: Partial<Deal>) => void;
  setDdStatus: (id: string, itemId: string, status: 'pending'|'review'|'complete'|'redflag') => void;
}

const DealsContext = createContext<Ctx | null>(null);

export function DealsProvider({ children }: { children: ReactNode }) {
  const [deals, setDeals] = useState<Deal[]>(DEMO_DEALS);

  const getDeal = useCallback((id: string) => deals.find(d => d.id === id), [deals]);

  const createDeal = useCallback((partial: Partial<Deal>): Deal => {
    const nd: Deal = {
      id: `d${Date.now()}`,
      name: partial.name || 'Nuevo Deal',
      target: partial.target || '',
      vertical: partial.vertical || 'Creative & Strategy',
      country: partial.country || 'México',
      stage: (partial.stage as DealStage) || 'sourcing',
      thesis: partial.thesis || '',
      inputs: partial.inputs || emptyInputs(),
      ddStatus: {},
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setDeals(prev => [nd, ...prev]);
    return nd;
  }, []);

  const updateDeal = useCallback((id: string, patch: Partial<Deal>) => {
    setDeals(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d));
  }, []);

  const setDdStatus = useCallback((id: string, itemId: string, status: 'pending'|'review'|'complete'|'redflag') => {
    setDeals(prev => prev.map(d => d.id === id
      ? { ...d, ddStatus: { ...d.ddStatus, [itemId]: status } }
      : d));
  }, []);

  const value = useMemo(() => ({ deals, getDeal, createDeal, updateDeal, setDdStatus }),
    [deals, getDeal, createDeal, updateDeal, setDdStatus]);

  return <DealsContext.Provider value={value}>{children}</DealsContext.Provider>;
}

export function useDeals() {
  const ctx = useContext(DealsContext);
  if (!ctx) throw new Error('useDeals must be used inside DealsProvider');
  return ctx;
}

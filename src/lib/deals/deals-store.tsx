import { createContext, useContext, useMemo, useState, ReactNode, useCallback } from 'react';
import { Deal, DEMO_DEALS, emptyInputs, DealStage, emptyCompany, StageTemplate } from './deals-data';

interface Ctx {
  deals: Deal[];
  getDeal: (id: string) => Deal | undefined;
  createDeal: (partial: Partial<Deal>) => Deal;
  updateDeal: (id: string, patch: Partial<Deal>) => void;
  setDdStatus: (id: string, itemId: string, status: 'pending'|'review'|'complete'|'redflag') => void;
  setTemplate: (id: string, stage: DealStage, tpl: StageTemplate) => void;
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
      company: partial.company || emptyCompany(),
      templates: partial.templates || {} as any,
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

  const setTemplate = useCallback((id: string, stage: DealStage, tpl: StageTemplate) => {
    setDeals(prev => prev.map(d => d.id === id
      ? { ...d, templates: { ...(d.templates || {} as any), [stage]: tpl } }
      : d));
  }, []);

  const value = useMemo(() => ({ deals, getDeal, createDeal, updateDeal, setDdStatus, setTemplate }),
    [deals, getDeal, createDeal, updateDeal, setDdStatus, setTemplate]);

  return <DealsContext.Provider value={value}>{children}</DealsContext.Provider>;
}

export function useDeals() {
  const ctx = useContext(DealsContext);
  if (!ctx) throw new Error('useDeals must be used inside DealsProvider');
  return ctx;
}

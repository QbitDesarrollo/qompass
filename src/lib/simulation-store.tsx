import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { Agency } from './quantum-engine';

/**
 * Store global de simulaciones por agencia.
 * - Persiste en localStorage para mantener simulaciones entre páginas/recargas.
 * - Cualquier override no vacío en `overridesByAgency` marca la agencia como "simulada".
 */

const STORAGE_KEY = 'qg_simulations_v1';

type OverrideMap = Record<string, Partial<Agency>>;

interface SimulationCtx {
  /** Map agencyId → overrides parciales */
  overridesByAgency: OverrideMap;
  /** Reemplaza completamente los overrides de una agencia */
  setAgencyOverrides: (agencyId: string, overrides: Partial<Agency>) => void;
  /** Limpia los overrides de una agencia */
  clearAgency: (agencyId: string) => void;
  /** Limpia todas las simulaciones */
  clearAll: () => void;
  /** ¿La agencia tiene simulación activa? */
  isSimulated: (agencyId: string) => boolean;
  /** Aplica los overrides activos a la agencia */
  applyOverrides: (agency: Agency) => Agency;
  /** Cantidad de agencias con simulación activa */
  simulatedCount: number;
  /** IDs de agencias con simulación activa */
  simulatedIds: string[];
}

const SimulationContext = createContext<SimulationCtx | null>(null);

function loadFromStorage(): OverrideMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function persist(map: OverrideMap) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore quota errors
  }
}

function isNonEmpty(o: Partial<Agency> | undefined): boolean {
  return !!o && Object.keys(o).length > 0;
}

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [overridesByAgency, setMap] = useState<OverrideMap>(() => loadFromStorage());

  useEffect(() => {
    persist(overridesByAgency);
  }, [overridesByAgency]);

  // Sincronizar entre pestañas
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setMap(loadFromStorage());
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const setAgencyOverrides = useCallback((agencyId: string, overrides: Partial<Agency>) => {
    setMap(prev => {
      const next = { ...prev };
      if (!isNonEmpty(overrides)) {
        delete next[agencyId];
      } else {
        next[agencyId] = overrides;
      }
      return next;
    });
  }, []);

  const clearAgency = useCallback((agencyId: string) => {
    setMap(prev => {
      if (!prev[agencyId]) return prev;
      const next = { ...prev };
      delete next[agencyId];
      return next;
    });
  }, []);

  const clearAll = useCallback(() => setMap({}), []);

  const isSimulated = useCallback(
    (agencyId: string) => isNonEmpty(overridesByAgency[agencyId]),
    [overridesByAgency],
  );

  const applyOverrides = useCallback(
    (agency: Agency): Agency => {
      const o = overridesByAgency[agency.id];
      return isNonEmpty(o) ? { ...agency, ...o } : agency;
    },
    [overridesByAgency],
  );

  const simulatedIds = useMemo(
    () => Object.keys(overridesByAgency).filter(id => isNonEmpty(overridesByAgency[id])),
    [overridesByAgency],
  );

  const value = useMemo<SimulationCtx>(() => ({
    overridesByAgency,
    setAgencyOverrides,
    clearAgency,
    clearAll,
    isSimulated,
    applyOverrides,
    simulatedCount: simulatedIds.length,
    simulatedIds,
  }), [overridesByAgency, setAgencyOverrides, clearAgency, clearAll, isSimulated, applyOverrides, simulatedIds]);

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
}

export function useSimulation(): SimulationCtx {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error('useSimulation must be used within SimulationProvider');
  return ctx;
}
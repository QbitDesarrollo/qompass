import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { Agency } from './quantum-engine';

/**
 * Store global de simulaciones por agencia.
 * - Persiste en localStorage para mantener simulaciones entre páginas/recargas.
 * - Cualquier override no vacío en `overridesByAgency` marca la agencia como "simulada".
 */

const STORAGE_KEY = 'qg_simulations_v1';
const ENABLED_KEY = 'qg_simulations_enabled_v1';

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
  /** Marca/desmarca explícitamente el modo simulación de una agencia (sin tocar valores) */
  setSimulationEnabled: (agencyId: string, enabled: boolean) => void;
  /** ¿El modo simulación está activado para la agencia? */
  isSimulationEnabled: (agencyId: string) => boolean;
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

function loadEnabled(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ENABLED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function persistEnabled(ids: string[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ENABLED_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

function isNonEmpty(o: Partial<Agency> | undefined): boolean {
  return !!o && Object.keys(o).length > 0;
}

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [overridesByAgency, setMap] = useState<OverrideMap>(() => loadFromStorage());
  const [enabledSet, setEnabledSet] = useState<Set<string>>(() => new Set(loadEnabled()));

  useEffect(() => {
    persist(overridesByAgency);
  }, [overridesByAgency]);

  useEffect(() => {
    persistEnabled(Array.from(enabledSet));
  }, [enabledSet]);

  // Sincronizar entre pestañas
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setMap(loadFromStorage());
      }
      if (e.key === ENABLED_KEY) {
        setEnabledSet(new Set(loadEnabled()));
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
    setEnabledSet(prev => {
      if (!prev.has(agencyId)) return prev;
      const next = new Set(prev);
      next.delete(agencyId);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setMap({});
    setEnabledSet(new Set());
  }, []);

  const setSimulationEnabled = useCallback((agencyId: string, enabled: boolean) => {
    setEnabledSet(prev => {
      const has = prev.has(agencyId);
      if (enabled === has) return prev;
      const next = new Set(prev);
      if (enabled) next.add(agencyId); else next.delete(agencyId);
      return next;
    });
    if (!enabled) {
      // Al desactivar también descartamos los overrides
      setMap(prev => {
        if (!prev[agencyId]) return prev;
        const next = { ...prev };
        delete next[agencyId];
        return next;
      });
    }
  }, []);

  const isSimulationEnabled = useCallback(
    (agencyId: string) => enabledSet.has(agencyId),
    [enabledSet],
  );

  const isSimulated = useCallback(
    (agencyId: string) => enabledSet.has(agencyId) || isNonEmpty(overridesByAgency[agencyId]),
    [overridesByAgency, enabledSet],
  );

  const applyOverrides = useCallback(
    (agency: Agency): Agency => {
      const o = overridesByAgency[agency.id];
      return isNonEmpty(o) ? { ...agency, ...o } : agency;
    },
    [overridesByAgency],
  );

  const simulatedIds = useMemo(
    () => {
      const set = new Set<string>(enabledSet);
      Object.keys(overridesByAgency).forEach(id => {
        if (isNonEmpty(overridesByAgency[id])) set.add(id);
      });
      return Array.from(set);
    },
    [overridesByAgency, enabledSet],
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
    setSimulationEnabled,
    isSimulationEnabled,
  }), [overridesByAgency, setAgencyOverrides, clearAgency, clearAll, isSimulated, applyOverrides, simulatedIds, setSimulationEnabled, isSimulationEnabled]);

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
}

export function useSimulation(): SimulationCtx {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error('useSimulation must be used within SimulationProvider');
  return ctx;
}
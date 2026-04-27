import { createContext, useContext, useState, ReactNode } from 'react';

type SidebarCtx = {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  toggle: () => void;
};

const Ctx = createContext<SidebarCtx | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <Ctx.Provider value={{ collapsed, setCollapsed, toggle: () => setCollapsed(!collapsed) }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAppSidebar() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAppSidebar must be used within SidebarProvider');
  return v;
}
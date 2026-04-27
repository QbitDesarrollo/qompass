import { ReactNode } from 'react';
import AppSidebar from './AppSidebar';
import { SidebarProvider, useAppSidebar } from './SidebarContext';

function LayoutInner({ children }: { children: ReactNode }) {
  const { collapsed } = useAppSidebar();
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className={`min-h-screen transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-56'}`}>
        {children}
      </main>
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <LayoutInner>{children}</LayoutInner>
    </SidebarProvider>
  );
}

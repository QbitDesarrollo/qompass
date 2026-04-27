import { ReactNode } from 'react';
import AppSidebar from './AppSidebar';
import { SidebarProvider, useAppSidebar } from './SidebarContext';
import { LanguageProvider } from './LanguageContext';
import TopBar from './TopBar';

function LayoutInner({ children }: { children: ReactNode }) {
  const { collapsed } = useAppSidebar();
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <TopBar />
      <main className={`min-h-screen pt-12 transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-56'}`}>
        {children}
      </main>
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <SidebarProvider>
        <LayoutInner>{children}</LayoutInner>
      </SidebarProvider>
    </LanguageProvider>
  );
}

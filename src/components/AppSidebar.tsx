import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Building2, Swords, FileStack, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppSidebar } from './SidebarContext';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/agencies', label: 'Agencias', icon: Building2 },
  { path: '/war-room', label: 'War Room', icon: Swords },
  { path: '/data-room', label: 'Data Room', icon: FileStack },
];

export default function AppSidebar() {
  const location = useLocation();
  const { collapsed, toggle } = useAppSidebar();

  return (
    <aside className={`fixed left-0 top-0 h-screen bg-card border-r border-border flex flex-col z-50 transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'}`}>
      <div className="p-4 border-b border-border flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <span className="text-primary-foreground font-bold text-sm">Q</span>
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold text-foreground tracking-tight">QuantumOS</h1>
            <p className="text-[10px] text-muted-foreground">Quantum Group HQ</p>
          </div>
        )}
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {navItems.map(item => {
          const active = location.pathname === item.path || 
            (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                active
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={toggle}
        className="p-3 border-t border-border text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}

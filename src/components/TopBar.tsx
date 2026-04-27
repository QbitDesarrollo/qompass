import { Languages } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { useAppSidebar } from './SidebarContext';

export default function TopBar() {
  const { lang, setLang } = useLanguage();
  const { collapsed } = useAppSidebar();

  return (
    <header
      className={`fixed top-0 right-0 h-12 z-40 bg-card/80 backdrop-blur border-b border-border flex items-center justify-end px-4 gap-3 transition-all duration-300 ${
        collapsed ? 'left-16' : 'left-56'
      }`}
    >
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Languages className="w-3.5 h-3.5" />
        <span>Idioma</span>
      </div>
      <div className="inline-flex rounded-md border border-border bg-secondary/40 p-0.5">
        <button
          onClick={() => setLang('es')}
          className={`px-2.5 py-1 text-[11px] font-mono rounded-sm transition-colors ${
            lang === 'es'
              ? 'bg-primary text-primary-foreground font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          aria-pressed={lang === 'es'}
        >
          ES
        </button>
        <button
          onClick={() => setLang('en')}
          className={`px-2.5 py-1 text-[11px] font-mono rounded-sm transition-colors ${
            lang === 'en'
              ? 'bg-primary text-primary-foreground font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          aria-pressed={lang === 'en'}
        >
          EN
        </button>
      </div>
    </header>
  );
}
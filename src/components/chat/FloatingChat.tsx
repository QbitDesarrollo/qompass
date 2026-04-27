import { useLocation } from 'react-router-dom';
import { MessageSquare, X, Trash2, Maximize2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQompassChat } from '@/lib/chat/chat-store';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';

export default function FloatingChat() {
  const { isOpen, open, close, messages, isStreaming, send, cancel, clear } = useQompassChat();
  const location = useLocation();

  // No mostrar el flotante en la página dedicada (evitar redundancia)
  if (location.pathname === '/chat') return null;

  return (
    <>
      {/* Botón flotante */}
      {!isOpen && (
        <button
          onClick={open}
          aria-label="Abrir Qompass AI"
          className="fixed bottom-5 right-5 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 transition-transform"
        >
          <MessageSquare className="w-5 h-5" />
        </button>
      )}

      {/* Panel lateral */}
      {isOpen && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div
            className="absolute inset-0 bg-background/40 backdrop-blur-sm pointer-events-auto md:hidden"
            onClick={close}
          />
          <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col pointer-events-auto animate-in slide-in-from-right duration-200">
            <header className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center">
                  <MessageSquare className="w-3.5 h-3.5 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground leading-tight">Qompass AI</h2>
                  <p className="text-[10px] text-muted-foreground">Acceso total a la data del grupo</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Link
                  to="/chat"
                  onClick={close}
                  aria-label="Vista completa"
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </Link>
                {messages.length > 0 && (
                  <button
                    onClick={clear}
                    aria-label="Limpiar historial"
                    className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-secondary transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={close}
                  aria-label="Cerrar"
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto">
              <ChatMessages messages={messages} isStreaming={isStreaming} />
            </div>

            <ChatInput onSend={send} onCancel={cancel} isStreaming={isStreaming} autoFocus />
          </aside>
        </div>
      )}
    </>
  );
}
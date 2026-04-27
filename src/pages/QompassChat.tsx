import { MessageSquare, Trash2 } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import ChatMessages from '@/components/chat/ChatMessages';
import ChatInput from '@/components/chat/ChatInput';
import { useQompassChat } from '@/lib/chat/chat-store';

export default function QompassChat() {
  const { messages, isStreaming, send, cancel, clear } = useQompassChat();
  return (
    <AppLayout>
      <div className="h-[calc(100vh-4rem)] flex flex-col max-w-4xl mx-auto w-full">
        <header className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground leading-tight">Qompass AI</h1>
              <p className="text-[11px] text-muted-foreground">Copiloto estratégico — acceso total al portafolio, deals y proyecciones</p>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clear}
              className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-secondary transition-colors text-xs inline-flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Limpiar
            </button>
          )}
        </header>
        <div className="flex-1 overflow-y-auto">
          <ChatMessages messages={messages} isStreaming={isStreaming} />
        </div>
        <ChatInput onSend={send} onCancel={cancel} isStreaming={isStreaming} autoFocus />
      </div>
    </AppLayout>
  );
}
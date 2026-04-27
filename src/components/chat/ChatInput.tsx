import { useState, KeyboardEvent } from 'react';
import { Send, Square } from 'lucide-react';

interface Props {
  onSend: (text: string) => void;
  onCancel: () => void;
  isStreaming: boolean;
  autoFocus?: boolean;
}

export default function ChatInput({ onSend, onCancel, isStreaming, autoFocus }: Props) {
  const [text, setText] = useState('');

  const submit = () => {
    const t = text.trim();
    if (!t || isStreaming) return;
    onSend(t);
    setText('');
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="border-t border-border bg-card px-3 py-2.5">
      <div className="flex items-end gap-2">
        <textarea
          autoFocus={autoFocus}
          rows={1}
          value={text}
          maxLength={4000}
          onChange={e => setText(e.target.value)}
          onKeyDown={onKey}
          placeholder="Pregunta sobre cualquier agencia, deal, proyección…"
          className="flex-1 resize-none bg-secondary/30 border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 min-h-[36px] max-h-32"
        />
        {isStreaming ? (
          <button
            onClick={onCancel}
            className="h-9 px-3 rounded-md bg-destructive text-destructive-foreground text-xs font-medium inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity"
          >
            <Square className="w-3.5 h-3.5" /> Stop
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={!text.trim()}
            className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium inline-flex items-center gap-1.5 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            <Send className="w-3.5 h-3.5" /> Enviar
          </button>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground mt-1.5 px-1">
        Enter para enviar · Shift+Enter para salto de línea · Datos: snapshot completo de Qompass
      </p>
    </div>
  );
}
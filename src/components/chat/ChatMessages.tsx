import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Loader2, Sparkles, User2 } from 'lucide-react';
import { ChatMessage } from '@/lib/chat/chat-store';

interface Props {
  messages: ChatMessage[];
  isStreaming: boolean;
}

export default function ChatMessages({ messages, isStreaming }: Props) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isStreaming]);

  if (messages.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-6 gap-3">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Qompass AI</h3>
        <p className="text-xs text-muted-foreground max-w-sm">
          Pregunta sobre cualquier agencia, deal, métrica financiera, índice del framework (IPE/IPP/IPC), proyección o transición de nivel.
        </p>
        <div className="grid grid-cols-1 gap-1.5 w-full max-w-sm mt-2">
          {EXAMPLE_PROMPTS.map(p => (
            <div key={p} className="text-[11px] text-muted-foreground/70 italic border border-border rounded-md px-3 py-1.5 text-left">
              "{p}"
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 py-4">
      {messages.map(m => (
        <div key={m.id} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
          <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center ${
            m.role === 'user' ? 'bg-secondary' : 'bg-primary/15'
          }`}>
            {m.role === 'user'
              ? <User2 className="w-3.5 h-3.5 text-muted-foreground" />
              : <Sparkles className="w-3.5 h-3.5 text-primary" />}
          </div>
          <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
            m.role === 'user'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary/40 text-foreground border border-border'
          }`}>
            {m.role === 'assistant'
              ? (
                <div className="prose prose-sm prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_table]:text-xs [&_code]:text-[11px] [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-xs [&_strong]:text-foreground">
                  {m.content
                    ? <ReactMarkdown>{m.content}</ReactMarkdown>
                    : isStreaming
                      ? (
                        <div className="flex items-center gap-2 text-muted-foreground not-prose min-h-6">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span className="text-xs">Pensando…</span>
                        </div>
                      )
                      : null}
                </div>
              )
              : <div className="whitespace-pre-wrap break-words">{m.content}</div>
            }
          </div>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}

const EXAMPLE_PROMPTS = [
  '¿Qué agencias N3 están más cerca de subir a N2?',
  '¿Cuál es el EBITDA consolidado y cuánto aporta cada nivel?',
  'Compara Pulse Media vs NexaTech: cuál merece más capital y por qué',
  'Resume el deal Project Halo y su valuación implícita',
];
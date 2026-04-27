import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { buildQompassSnapshot } from './qompass-snapshot';

export type ChatRole = 'user' | 'assistant';
export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
}

interface ChatContextValue {
  messages: ChatMessage[];
  isStreaming: boolean;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  send: (text: string) => Promise<void>;
  clear: () => void;
  cancel: () => void;
}

const STORAGE_KEY = 'qompass.chat.history.v1';

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

function loadInitial(): ChatMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string');
  } catch {
    return [];
  }
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/qompass-chat`;

export function QompassChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>(loadInitial);
  const [isStreaming, setStreaming] = useState(false);
  const [isOpen, setOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Persist
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-100))); } catch {/* noop */}
  }, [messages]);

  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen(o => !o), []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  }, []);

  const clear = useCallback(() => {
    cancel();
    setMessages([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {/* noop */}
  }, [cancel]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim().slice(0, 4000);
    if (!trimmed || isStreaming) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      createdAt: Date.now(),
    };
    const assistantId = crypto.randomUUID();
    const baseHistory = [...messages, userMsg];
    setMessages([...baseHistory, { id: assistantId, role: 'assistant', content: '', createdAt: Date.now() }]);
    setStreaming(true);

    const ac = new AbortController();
    abortRef.current = ac;

    let assistantSoFar = '';
    const updateAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: assistantSoFar } : m));
    };

    try {
      const snapshot = buildQompassSnapshot();
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: baseHistory.map(m => ({ role: m.role, content: m.content })),
          context: snapshot,
        }),
        signal: ac.signal,
      });

      if (!resp.ok || !resp.body) {
        let errMsg = 'No se pudo iniciar el chat.';
        try {
          const j = await resp.json();
          if (j?.error) errMsg = j.error;
        } catch {/* noop */}
        if (resp.status === 429) errMsg = 'Demasiadas solicitudes. Intenta en unos segundos.';
        if (resp.status === 402) errMsg = 'Sin créditos disponibles en Lovable AI.';
        updateAssistant(`⚠️ ${errMsg}`);
        setStreaming(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let done = false;

      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (c) updateAssistant(c);
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }

      if (buffer.trim()) {
        for (let raw of buffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || !raw.startsWith('data: ')) continue;
          const json = raw.slice(6).trim();
          if (json === '[DONE]') continue;
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (c) updateAssistant(c);
          } catch {/* ignore */}
        }
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        updateAssistant(assistantSoFar ? '\n\n_(cancelado)_' : '_(cancelado)_');
      } else {
        console.error('chat error', e);
        updateAssistant(`⚠️ Error: ${e?.message || 'desconocido'}`);
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [messages, isStreaming]);

  const value = useMemo<ChatContextValue>(() => ({
    messages, isStreaming, isOpen, open, close, toggle, send, clear, cancel,
  }), [messages, isStreaming, isOpen, open, close, toggle, send, clear, cancel]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useQompassChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useQompassChat must be used within QompassChatProvider');
  return ctx;
}
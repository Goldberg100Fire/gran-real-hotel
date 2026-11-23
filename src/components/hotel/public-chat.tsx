"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { HOTEL } from "@/lib/hotel-info";

type ChatMessage = {
  id: string;
  role: "user" | "bot";
  text: string;
};

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "bot",
  text: `Hola, soy el asistente de ${HOTEL.name}. Pregúntame por habitaciones, precios o cómo reservar.`,
};

export function PublicChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState([
    "¿Cómo reservo?",
    "Precios",
    "Ubicación",
    "Habitaciones",
  ]);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, open, pending]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;

    setError(null);
    setInput("");
    setPending(true);
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", text: trimmed },
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = (await response.json()) as {
        reply?: string;
        suggestions?: string[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "No se pudo responder");
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          role: "bot",
          text: data.reply || "No tengo esa información ahora.",
        },
      ]);
      if (data.suggestions?.length) {
        setSuggestions(data.suggestions);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión");
    } finally {
      setPending(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void sendMessage(input);
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open && (
        <section
          className="flex h-[min(70vh,520px)] w-[min(100vw-2rem,380px)] flex-col overflow-hidden border border-[var(--brand-line)] bg-[var(--brand-cream)] shadow-[0_24px_60px_-28px_rgba(44,36,30,0.55)]"
          aria-label="Asistente de consultas"
        >
          <header className="flex items-center justify-between bg-[var(--brand-deep)] px-4 py-3 text-white">
            <div>
              <p className="text-sm font-semibold">Consultas · {HOTEL.name}</p>
              <p className="text-xs text-white/70">Sin registro · Respuesta inmediata</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-1.5 transition hover:bg-white/10"
              aria-label="Cerrar chat"
            >
              <X className="size-4" />
            </button>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={
                  message.role === "user"
                    ? "ml-8 rounded-2xl rounded-br-md bg-[var(--brand-deep)] px-3.5 py-2.5 text-sm text-white"
                    : "mr-8 rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-sm text-[var(--brand-ink)] shadow-sm ring-1 ring-[var(--brand-line)]"
                }
              >
                {message.text}
              </div>
            ))}
            {pending && (
              <p className="text-xs text-[var(--brand-muted)]">Escribiendo…</p>
            )}
            {error && <p className="text-xs text-red-700">{error}</p>}
          </div>

          <div className="space-y-2 border-t border-[var(--brand-line)] bg-white/70 px-3 py-3">
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  disabled={pending}
                  onClick={() => void sendMessage(suggestion)}
                  className="rounded-full border border-[var(--brand-line)] bg-[var(--brand-mist)] px-2.5 py-1 text-[11px] font-medium text-[var(--brand-ink)] transition hover:border-[var(--brand-gold)] disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
            <form onSubmit={onSubmit} className="flex gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Escribe tu consulta…"
                maxLength={400}
                className="h-10 flex-1 border border-[var(--brand-line)] bg-white px-3 text-sm outline-none focus:border-[var(--brand-gold)]"
                aria-label="Mensaje"
              />
              <button
                type="submit"
                disabled={pending || !input.trim()}
                className="inline-flex size-10 items-center justify-center bg-[var(--brand-gold)] text-[var(--brand-deep)] transition hover:brightness-110 disabled:opacity-50"
                aria-label="Enviar"
              >
                <Send className="size-4" />
              </button>
            </form>
            <a
              href={`tel:${HOTEL.phoneMobile}`}
              className="block text-center text-xs font-semibold text-[var(--brand-muted)] underline-offset-2 hover:underline"
            >
              Preferir llamada: {HOTEL.phoneMobile}
            </a>
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-gold)] px-4 py-3 text-sm font-bold text-[var(--brand-deep)] shadow-lg transition hover:brightness-110"
        aria-expanded={open}
        aria-controls="public-chat"
      >
        <MessageCircle className="size-4" />
        {open ? "Cerrar" : "Consultar"}
      </button>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { HOTEL } from "@/lib/hotel-info";

type ChatMessage = {
  id: string;
  role: "user" | "bot";
  text: string;
};

const WELCOME_TEXT = `Hola, soy el asistente de ${HOTEL.name}. Pregúntame por habitaciones, precios o cómo reservar.`;

export function PublicChat() {
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState([
    "¿Cómo reservo?",
    "Precios",
    "Ofertas",
    "Habitaciones",
  ]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "welcome", role: "bot", text: WELCOME_TEXT },
  ]);
  const listRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, pending]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;

    // Asegura el panel abierto al enviar desde chips
    if (detailsRef.current && !detailsRef.current.open) {
      detailsRef.current.open = true;
    }

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

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col items-end gap-2 sm:bottom-6 sm:right-6">
      <details
        ref={detailsRef}
        id="public-chat"
        className="group flex flex-col items-end"
      >
        <div className="mb-3 hidden h-[min(70vh,520px)] w-[min(100vw-2rem,380px)] flex-col overflow-hidden border border-[var(--brand-line)] bg-[var(--brand-cream)] shadow-[0_24px_60px_-28px_rgba(44,36,30,0.55)] group-open:flex">
          <header className="flex items-center justify-between bg-[var(--brand-deep)] px-4 py-3 text-white">
            <div>
              <p className="text-sm font-semibold">Consultas · {HOTEL.name}</p>
              <p className="text-xs text-white/70">Sin registro · Respuesta inmediata</p>
            </div>
            <button
              type="button"
              className="rounded-full px-2 py-1 text-xs font-semibold transition hover:bg-white/10"
              onClick={() => {
                if (detailsRef.current) detailsRef.current.open = false;
              }}
            >
              Cerrar panel
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
                className="inline-flex h-10 items-center justify-center bg-[var(--brand-gold)] px-3 text-sm font-bold text-[var(--brand-deep)] transition hover:brightness-110 disabled:opacity-50"
              >
                Enviar
              </button>
            </form>
            <a
              href={`tel:${HOTEL.phoneMobile}`}
              className="block text-center text-xs font-semibold text-[var(--brand-muted)] underline-offset-2 hover:underline"
            >
              Preferir llamada: {HOTEL.phoneMobile}
            </a>
            <a
              href="/consultar"
              className="block text-center text-xs text-[var(--brand-muted)] underline-offset-2 hover:underline"
            >
              Abrir consultas en página completa
            </a>
          </div>
        </div>

        <summary className="list-none cursor-pointer rounded-full bg-[var(--brand-gold)] px-4 py-3 text-sm font-bold text-[var(--brand-deep)] shadow-lg transition hover:brightness-110 [&::-webkit-details-marker]:hidden">
          <span className="group-open:hidden">Consultar</span>
          <span className="hidden group-open:inline">Ocultar chat</span>
        </summary>
      </details>
    </div>
  );
}

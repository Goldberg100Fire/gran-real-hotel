"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { HOTEL } from "@/lib/hotel-info";

type ChatMessage = {
  id: string;
  role: "user" | "bot";
  text: string;
};

const WELCOME = `Hola, soy el asistente de ${HOTEL.name}. Pregúntame por habitaciones, precios, ofertas o cómo reservar.`;

export function ConsultarChat() {
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
    { id: "welcome", role: "bot", text: WELCOME },
  ]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, pending]);

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
      if (!response.ok) throw new Error(data.error || "No se pudo responder");
      setMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          role: "bot",
          text: data.reply || "No tengo esa información ahora.",
        },
      ]);
      if (data.suggestions?.length) setSuggestions(data.suggestions);
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
    <div className="flex min-h-[28rem] flex-col overflow-hidden border border-[var(--brand-line)] bg-white shadow-sm">
      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-5">
        {messages.map((message) => (
          <div
            key={message.id}
            className={
              message.role === "user"
                ? "ml-10 rounded-2xl bg-[var(--brand-deep)] px-3.5 py-2.5 text-sm text-white"
                : "mr-10 rounded-2xl bg-[var(--brand-mist)] px-3.5 py-2.5 text-sm text-[var(--brand-ink)]"
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
      <div className="space-y-3 border-t border-[var(--brand-line)] px-4 py-4">
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              disabled={pending}
              onClick={() => void sendMessage(suggestion)}
              className="rounded-full border border-[var(--brand-line)] bg-[var(--brand-mist)] px-3 py-1 text-xs font-medium"
            >
              {suggestion}
            </button>
          ))}
        </div>
        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="h-11 flex-1 border border-[var(--brand-line)] px-3 text-sm outline-none focus:border-[var(--brand-gold)]"
            placeholder="Escribe tu consulta…"
            maxLength={400}
          />
          <button
            type="submit"
            disabled={pending || !input.trim()}
            className="bg-[var(--brand-gold)] px-4 text-sm font-bold text-[var(--brand-deep)] disabled:opacity-50"
          >
            Enviar
          </button>
        </form>
        <p className="text-center text-xs text-[var(--brand-muted)]">
          O llama al{" "}
          <a href={`tel:${HOTEL.phoneMobile}`} className="font-semibold underline">
            {HOTEL.phoneMobile}
          </a>
          {" · "}
          <Link href="/" className="underline">
            Volver al inicio
          </Link>
        </p>
      </div>
    </div>
  );
}

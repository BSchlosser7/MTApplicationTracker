"use client";

import { useEffect, useRef, useState } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setSending(true);
    setError("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      if (!res.ok) {
        setError("Something went wrong. Try again.");
        return;
      }
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl font-semibold">Ask the Tracker</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Ask about deadlines, requirements, or anything else you&apos;ve tracked.
          Answers come only from your data.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 py-4">
        {messages.length === 0 && (
          <p className="text-sm text-zinc-400">
            Try: &quot;What&apos;s due next?&quot; or &quot;Which schools still need a
            headshot?&quot;
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap max-w-[85%] ${
              m.role === "user"
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 ml-auto"
                : "bg-zinc-100 dark:bg-zinc-900"
            }`}
          >
            {m.content}
          </div>
        ))}
        {sending && <div className="text-sm text-zinc-400">Thinking…</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSend}
        className="flex gap-2 border-t border-zinc-200 dark:border-zinc-800 pt-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question…"
          className="flex-1 px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="px-4 py-2 rounded-md bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-sm font-medium hover:opacity-90 disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}

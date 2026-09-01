import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildDataSnapshot } from "@/lib/chatContext";

const MODEL = "claude-haiku-4-5";

interface IncomingMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured" },
      { status: 500 }
    );
  }

  const body = await req.json();
  const messages: IncomingMessage[] = Array.isArray(body.messages) ? body.messages : [];
  if (
    messages.length === 0 ||
    messages.some(
      (m) =>
        (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string"
    )
  ) {
    return NextResponse.json({ error: "messages is required" }, { status: 400 });
  }

  const snapshot = await buildDataSnapshot();
  const today = new Date().toISOString().slice(0, 10);

  const system = `You are a helpful assistant for the MT Application Tracker, a musical theatre BFA audition/application tracker. Answer questions using ONLY the data provided below. If the answer isn't in this data, say you don't have that information — never guess or use outside knowledge about these schools or programs.

Today's date is ${today}.

DATA:
${JSON.stringify(snapshot)}`;

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const textBlock = response.content.find((b) => b.type === "text");
    return NextResponse.json({ reply: textBlock?.type === "text" ? textBlock.text : "" });
  } catch (err) {
    console.error("Chat request failed", err);
    return NextResponse.json({ error: "Chat request failed" }, { status: 502 });
  }
}

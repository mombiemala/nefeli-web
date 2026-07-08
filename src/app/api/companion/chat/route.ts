import { NextResponse } from "next/server";
import { supabaseAdmin, getAuthedUserId } from "@/lib/supabase/admin";
import { loadCompanionContext } from "@/lib/companion/context";
import { streamChat, type ChatMessage } from "@/lib/astrology/prompt";

// Streaming companion chat. Assembles the full context (chart + transits + moon +
// memory), streams Claude's reply as plain UTF-8 text, and persists both turns to
// conversations/messages. Persistence is tied into the stream's flush so it runs
// before the function exits (Vercel-safe, no floating promise).
export async function POST(req: Request) {
  const uid = await getAuthedUserId(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { conversationId?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const message = (body.message || "").trim();
  if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });

  try {
    const loaded = await loadCompanionContext(supabaseAdmin, uid);
    if (!loaded) {
      return NextResponse.json({ error: "Complete onboarding first." }, { status: 400 });
    }

    // Resolve (and authorize) the conversation, or start a new one.
    let conversationId = body.conversationId || null;
    if (conversationId) {
      const { data: conv } = await supabaseAdmin
        .from("conversations").select("id").eq("id", conversationId).eq("user_id", uid).maybeSingle();
      if (!conv) conversationId = null;
    }
    if (!conversationId) {
      const { data: conv, error } = await supabaseAdmin
        .from("conversations")
        .insert({ user_id: uid, title: message.slice(0, 60), conversation_type: "open_chat" })
        .select("id").single();
      if (error || !conv) {
        return NextResponse.json({ error: "Could not start conversation" }, { status: 500 });
      }
      conversationId = conv.id;
    }
    const convId: string = conversationId!;

    // History → messages for Claude (before we add the new turn).
    const { data: prior } = await supabaseAdmin
      .from("messages").select("role,content")
      .eq("conversation_id", convId).order("created_at", { ascending: true });
    const history: ChatMessage[] = (prior ?? []).map((m) => ({
      role: m.role as "user" | "assistant", content: m.content,
    }));

    // Start the stream first — if Claude fails to start, we return a clean error
    // and never persist a dangling user turn.
    const source = await streamChat(loaded.ctx.system, [...history, { role: "user", content: message }]);

    await supabaseAdmin.from("messages").insert({
      conversation_id: convId, role: "user", content: message,
    });

    // Accumulate the assistant text as it streams; persist on flush.
    const decoder = new TextDecoder();
    let acc = "";
    const persist = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        acc += decoder.decode(chunk, { stream: true });
        controller.enqueue(chunk);
      },
      async flush() {
        if (acc.trim()) {
          await supabaseAdmin.from("messages").insert({
            conversation_id: convId, role: "assistant", content: acc,
          });
          await supabaseAdmin.from("conversations")
            .update({ updated_at: new Date().toISOString() }).eq("id", convId);
        }
      },
    });

    return new Response(source.pipeThrough(persist), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Conversation-Id": convId,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("companion chat error:", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

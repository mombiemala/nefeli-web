import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId, UnauthorizedError } from "@/lib/session";
import { assembleContext } from "@/lib/luminary-context";
import { streamLuminaryChat, type ChatMessage } from "@/lib/claude";
import type { ConversationType, MessageRole } from "@prisma/client";

const bodySchema = z.object({
  message: z.string().min(1),
  conversationId: z.string().optional(),
  conversationType: z
    .enum([
      "CHART_READING", "DAILY_GUIDANCE", "TRANSIT_DEEP_DIVE", "HEALING_SESSION",
      "MONTHLY_GUIDE", "LIFE_CONTEXT", "DAILY_ADVICE", "OPEN_CHAT",
    ])
    .optional(),
});

export async function POST(req: Request) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return new Response("Unauthorized", { status: 401 });
    }
    throw err;
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return new Response("Invalid request", { status: 400 });
  }
  const { message, conversationType } = parsed.data;

  // Find or create the conversation.
  let conversationId = parsed.data.conversationId;
  if (!conversationId) {
    const convo = await prisma.conversation.create({
      data: {
        userId,
        conversationType: (conversationType ?? "OPEN_CHAT") as ConversationType,
        title: message.slice(0, 60),
      },
    });
    conversationId = convo.id;
  } else {
    const owns = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });
    if (!owns) return new Response("Not found", { status: 404 });
  }

  // Assemble the full Luminary context (chart + transits + life story).
  const assembled = await assembleContext(userId);
  if (!assembled) {
    return new Response(
      "No birth profile found. Please complete onboarding first.",
      { status: 409 },
    );
  }

  // Load prior turns for continuity, then persist this user message.
  const history = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: 20,
  });
  await prisma.message.create({
    data: { conversationId, role: "USER" as MessageRole, content: message },
  });

  const messages: ChatMessage[] = [
    ...history.map((m) => ({
      role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    })),
    { role: "user", content: message },
  ];

  const source = await streamLuminaryChat(assembled.system, messages);

  // Tee: stream to client while accumulating the full reply to persist.
  let full = "";
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const convId = conversationId;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = source.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          full += decoder.decode(value, { stream: true });
          controller.enqueue(value);
        }
      } catch (e) {
        controller.error(e);
        return;
      }
      // Persist assistant message + a transit snapshot in metadata.
      await prisma.message.create({
        data: {
          conversationId: convId,
          role: "ASSISTANT" as MessageRole,
          content: full,
          metadata: {
            moon: `${assembled.moon.phaseName} in ${assembled.moon.moonSign}`,
            transitCount: assembled.transits.length,
          },
        },
      });
      await prisma.conversation.update({
        where: { id: convId },
        data: { updatedAt: new Date() },
      });
      controller.enqueue(encoder.encode(""));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Conversation-Id": convId,
    },
  });
}

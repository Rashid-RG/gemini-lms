import { NextResponse } from "next/server";
import { db } from "@/configs/db";
import { CHAT_CONVERSATIONS_TABLE, CHAT_MESSAGES_TABLE } from "@/configs/schema";
import { eq, desc, asc } from "drizzle-orm";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const generationConfig = {
  temperature: 0.8,
  topP: 0.9,
  topK: 40,
  maxOutputTokens: 512,
  responseMimeType: "text/plain",
};

async function buildContext(conversationId) {
  const convId = Number(conversationId);
  const history = await db
    .select()
    .from(CHAT_MESSAGES_TABLE)
    .where(eq(CHAT_MESSAGES_TABLE.conversationId, convId))
    .orderBy(asc(CHAT_MESSAGES_TABLE.createdAt))
    .limit(12);

  return history.map((item) => ({
    role: item.sender === "user" ? "user" : "model",
    parts: [{ text: item.content }],
  }));
}

function systemPrompt(userEmail) {
  return `You are Gemini LMS in-app study assistant. Keep answers short (4-6 sentences). Be encouraging and practical. If user asks about account or billing, ask them to contact support. If code is requested, provide concise snippets. User email: ${userEmail}.`;
}

async function generateReply(userEmail, conversationId, message) {
  const history = await buildContext(conversationId);
  const chat = model.startChat({
    generationConfig,
    history: [
      { role: "user", parts: [{ text: systemPrompt(userEmail) }] },
      ...history,
    ],
  });

  const result = await chat.sendMessage(message);
  return result.response.text();
}

async function* streamReply(userEmail, conversationId, message) {
  const history = await buildContext(conversationId);
  const chat = model.startChat({
    generationConfig,
    history: [
      { role: "user", parts: [{ text: systemPrompt(userEmail) }] },
      ...history,
    ],
  });

  const result = await chat.sendMessageStream(message);
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}

export async function POST(req) {
  try {
    const { message, userEmail, conversationId } = await req.json();

    if (!userEmail || !message) {
      return new Response("userEmail and message are required", { status: 400 });
    }

    let convoId = conversationId;

    if (!convoId) {
      const [conversation] = await db
        .insert(CHAT_CONVERSATIONS_TABLE)
        .values({ userEmail, title: message.slice(0, 60) })
        .returning({ id: CHAT_CONVERSATIONS_TABLE.id });
      convoId = conversation.id;
    }

    await db.insert(CHAT_MESSAGES_TABLE).values({
      conversationId: convoId,
      sender: "user",
      content: message,
    });

    const encoder = new TextEncoder();
    let fullReply = "";
    let isClosed = false;

    const stream = new ReadableStream({
      async start(controller) {
        const safeEnqueue = (data) => {
          if (!isClosed) {
            try {
              controller.enqueue(data);
            } catch (e) {
              console.warn("SSE enqueue failed (controller closed)");
            }
          }
        };
        
        const safeClose = () => {
          if (!isClosed) {
            isClosed = true;
            try {
              controller.close();
            } catch (e) {
              console.warn("SSE close failed (already closed)");
            }
          }
        };

        try {
          safeEnqueue(encoder.encode(`data: ${JSON.stringify({ conversationId: convoId })}\n\n`));

          for await (const chunk of streamReply(userEmail, convoId, message)) {
            if (isClosed) break;
            fullReply += chunk;
            safeEnqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
          }

          // Save bot reply to DB
          if (fullReply) {
            await db.insert(CHAT_MESSAGES_TABLE).values({
              conversationId: convoId,
              sender: "bot",
              content: fullReply,
            }).catch(e => console.error("Failed to save bot reply:", e));
          }

          safeEnqueue(encoder.encode("data: [DONE]\n\n"));
          safeClose();
        } catch (error) {
          console.error("Stream error", error);
          if (!isClosed) {
            isClosed = true;
            try {
              controller.error(error);
            } catch (e) {
              console.warn("SSE error signal failed");
            }
          }
        }
      },
      cancel() {
        isClosed = true;
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chatbot error", error);
    return new Response(error.message || "Failed to process chat", { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const { message, userEmail, conversationId } = await req.json();

    if (!userEmail || !message) {
      return NextResponse.json({ error: "userEmail and message are required" }, { status: 400 });
    }

    let convoId = conversationId;

    if (!convoId) {
      const [conversation] = await db
        .insert(CHAT_CONVERSATIONS_TABLE)
        .values({ userEmail, title: message.slice(0, 60) })
        .returning({ id: CHAT_CONVERSATIONS_TABLE.id });
      convoId = conversation.id;
    }

    await db.insert(CHAT_MESSAGES_TABLE).values({
      conversationId: convoId,
      sender: "user",
      content: message,
    });

    const reply = await generateReply(userEmail, convoId, message);

    await db.insert(CHAT_MESSAGES_TABLE).values({
      conversationId: convoId,
      sender: "bot",
      content: reply,
    });

    const messages = await db
      .select()
      .from(CHAT_MESSAGES_TABLE)
      .where(eq(CHAT_MESSAGES_TABLE.conversationId, convoId))
      .orderBy(desc(CHAT_MESSAGES_TABLE.createdAt))
      .limit(50);

    return NextResponse.json({ result: { conversationId: convoId, messages } });
  } catch (error) {
    console.error("Chatbot error", error);
    return NextResponse.json({ error: error.message || "Failed to process chat" }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");
    const userEmail = searchParams.get("userEmail");

    if (!conversationId || !userEmail) {
      return NextResponse.json({ error: "conversationId and userEmail are required" }, { status: 400 });
    }

    const [conversation] = await db
      .select()
      .from(CHAT_CONVERSATIONS_TABLE)
      .where(eq(CHAT_CONVERSATIONS_TABLE.id, Number(conversationId)));

    if (!conversation || conversation.userEmail !== userEmail) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const messages = await db
      .select()
      .from(CHAT_MESSAGES_TABLE)
      .where(eq(CHAT_MESSAGES_TABLE.conversationId, Number(conversationId)))
      .orderBy(asc(CHAT_MESSAGES_TABLE.createdAt))
      .limit(100);

    return NextResponse.json({ result: { conversation, messages } });
  } catch (error) {
    console.error("Chat history error", error);
    return NextResponse.json({ error: error.message || "Failed to load chat" }, { status: 500 });
  }
}

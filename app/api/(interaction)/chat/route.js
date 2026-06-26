import { NextResponse } from "next/server";
import { db } from "@/configs/db";
import { CHAT_CONVERSATIONS_TABLE, CHAT_MESSAGES_TABLE, CHAPTER_NOTES_TABLE } from "@/configs/schema";
import { eq, desc, asc, and } from "drizzle-orm";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { checkRateLimit } from "@/lib/rateLimit";
import { auth } from "@clerk/nextjs/server";
import { getAuthEmail } from "@/lib/clerkUtils";
import { getApiKeyRotationManager } from "@/lib/apiKeyRotation";

function getChatModel() {
  let key = process.env.GEMINI_API_KEY || "";
  try {
    const rotationManager = getApiKeyRotationManager();
    key = rotationManager.getCurrentKey();
  } catch (err) {
    console.warn("Failed to get key from rotation manager:", err);
  }
  const genAI = new GoogleGenerativeAI(key);
  return genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
}

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

function systemPrompt(userEmail, notesContext = "") {
  let prompt = `You are Gemini LMS in-app study assistant. Keep answers short (4-6 sentences). Be encouraging and practical. If user asks about account or billing, ask them to contact support. If code is requested, provide concise snippets. User email: ${userEmail}.`;
  if (notesContext) {
    prompt += `\n\nYou are currently helping the user study the following chapter material. Use it as reference context to answer their questions:\n---START CONTEXT---\n${notesContext}\n---END CONTEXT---`;
  }
  return prompt;
}

async function generateReply(userEmail, conversationId, message, notesContext = "") {
  const history = await buildContext(conversationId);
  const model = getChatModel();
  const chat = model.startChat({
    generationConfig,
    history: [
      { role: "user", parts: [{ text: systemPrompt(userEmail, notesContext) }] },
      ...history,
    ],
  });

  try {
    const result = await chat.sendMessage(message);
    try {
      getApiKeyRotationManager().recordSuccess();
    } catch (_) {}
    return result.response.text();
  } catch (error) {
    console.error("Gemini AI generation error in generateReply:", error);
    try {
      const rotationManager = getApiKeyRotationManager();
      if (rotationManager.constructor.isQuotaError(error) || rotationManager.constructor.isAuthError(error)) {
        rotationManager.handleQuotaExhausted();
      } else if (rotationManager.constructor.isRateLimitError(error)) {
        rotationManager.handleRateLimit();
      }
    } catch (_) {}
    throw error;
  }
}

async function* streamReply(userEmail, conversationId, message, notesContext = "") {
  const history = await buildContext(conversationId);
  const model = getChatModel();
  const chat = model.startChat({
    generationConfig,
    history: [
      { role: "user", parts: [{ text: systemPrompt(userEmail, notesContext) }] },
      ...history,
    ],
  });

  try {
    const result = await chat.sendMessageStream(message);
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) yield text;
    }
    try {
      getApiKeyRotationManager().recordSuccess();
    } catch (_) {}
  } catch (error) {
    console.error("Gemini AI stream error in streamReply:", error);
    try {
      const rotationManager = getApiKeyRotationManager();
      if (rotationManager.constructor.isQuotaError(error) || rotationManager.constructor.isAuthError(error)) {
        rotationManager.handleQuotaExhausted();
      } else if (rotationManager.constructor.isRateLimitError(error)) {
        rotationManager.handleRateLimit();
      }
    } catch (_) {}
    throw error;
  }
}

export async function POST(req) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }
    const authEmail = await getAuthEmail(sessionClaims);

    const { message, userEmail, conversationId, courseId, chapterId } = await req.json();

    if (!userEmail || !message) {
      return new Response("userEmail and message are required", { status: 400 });
    }

    if (authEmail !== userEmail.trim().toLowerCase()) {
      return new Response("Forbidden", { status: 403 });
    }

    // Query chapter notes context if courseId and chapterId are provided (RAG)
    let notesContext = "";
    if (courseId && chapterId !== undefined && chapterId !== null) {
      try {
        const dbNotes = await db.select({ notes: CHAPTER_NOTES_TABLE.notes })
          .from(CHAPTER_NOTES_TABLE)
          .where(
            and(
              eq(CHAPTER_NOTES_TABLE.courseId, courseId),
              eq(CHAPTER_NOTES_TABLE.chapterId, Number(chapterId))
            )
          ).limit(1);
        if (dbNotes.length > 0 && dbNotes[0].notes) {
          notesContext = dbNotes[0].notes.replace(/<[^>]*>/g, ' ');
        }
      } catch (err) {
        console.error("Failed to fetch notes context for chat:", err);
      }
    }

    // Rate limit: 10 messages per minute per user
    const rateCheck = checkRateLimit(userEmail, 'ai-chat');
    if (rateCheck.limited) {
      return NextResponse.json(
        { error: rateCheck.message },
        { status: 429, headers: { 'Retry-After': Math.ceil(rateCheck.resetIn / 1000).toString() } }
      );
    }

    // Input validation: limit message length
    if (typeof message !== 'string' || message.length > 2000) {
      return new Response("Message must be a string under 2000 characters", { status: 400 });
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

          for await (const chunk of streamReply(userEmail, convoId, message, notesContext)) {
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
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const authEmail = await getAuthEmail(sessionClaims);

    const { message, userEmail, conversationId, courseId, chapterId } = await req.json();

    if (!userEmail || !message) {
      return NextResponse.json({ error: "userEmail and message are required" }, { status: 400 });
    }

    if (authEmail !== userEmail.trim().toLowerCase()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Query chapter notes context if courseId and chapterId are provided (RAG)
    let notesContext = "";
    if (courseId && chapterId !== undefined && chapterId !== null) {
      try {
        const dbNotes = await db.select({ notes: CHAPTER_NOTES_TABLE.notes })
          .from(CHAPTER_NOTES_TABLE)
          .where(
            and(
              eq(CHAPTER_NOTES_TABLE.courseId, courseId),
              eq(CHAPTER_NOTES_TABLE.chapterId, Number(chapterId))
            )
          ).limit(1);
        if (dbNotes.length > 0 && dbNotes[0].notes) {
          notesContext = dbNotes[0].notes.replace(/<[^>]*>/g, ' ');
        }
      } catch (err) {
        console.error("Failed to fetch notes context for chat:", err);
      }
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

    const reply = await generateReply(userEmail, convoId, message, notesContext);

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
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const authEmail = await getAuthEmail(sessionClaims);

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");
    const userEmail = searchParams.get("userEmail");

    if (!conversationId || !userEmail) {
      return NextResponse.json({ error: "conversationId and userEmail are required" }, { status: 400 });
    }

    if (authEmail !== userEmail.trim().toLowerCase()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";

const panelBase =
  "fixed bottom-4 right-4 w-[24rem] max-h-[38rem] bg-white/95 backdrop-blur-xl shadow-2xl rounded-3xl border border-white/20 flex flex-col overflow-hidden z-50 animate-in slide-in-from-bottom-4 duration-300";

const quickPrompts = [
  "Summarize my last chapter",
  "Give me 3 flashcards",
  "Help me understand this",
  "Explain this topic simply",
];

function sortMessages(list) {
  return [...(list || [])].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

function MessageBubble({ sender, content }) {
  const isUser = sender === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-200`}>
      <div
        className={`px-4 py-2.5 rounded-2xl text-sm leading-6 max-w-[85%] whitespace-pre-wrap shadow-sm ${
          isUser
            ? "bg-gradient-to-br from-indigo-600 to-indigo-500 text-white rounded-br-md"
            : "bg-white border border-gray-200 text-gray-800 rounded-bl-md"
        }`}
      >
        {content}
      </div>
    </div>
  );
}

function ChatBotWidget() {
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSupportForm, setShowSupportForm] = useState(false);
  const [supportForm, setSupportForm] = useState({ subject: "", category: "General", message: "" });
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);
  const scrollRef = useRef(null);

  const userEmail = user?.primaryEmailAddress?.emailAddress;
  const userName = user?.fullName || "Learner";

  useEffect(() => {
    const stored = window.localStorage.getItem("gemini-chat-conversation-id");
    if (stored) {
      setConversationId(stored);
    }
  }, []);

  const fetchHistory = async (opts = { silent: false }) => {
    if (!conversationId || !userEmail) return;
    try {
      if (!opts.silent) setIsLoadingHistory(true);
      const res = await fetch(
        `/api/chat?conversationId=${conversationId}&userEmail=${encodeURIComponent(userEmail)}`
      );
      const data = await res.json();
      if (data?.result?.messages) {
        setMessages(sortMessages(data.result.messages));
      }
    } catch (err) {
      console.error("Failed to load chat", err);
    } finally {
      if (!opts.silent) setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [conversationId, userEmail]);

  useEffect(() => {
    if (conversationId) {
      window.localStorage.setItem("gemini-chat-conversation-id", conversationId);
    }
  }, [conversationId]);

  useEffect(() => {
    if (!isOpen || !conversationId || !userEmail) return;
    const id = setInterval(() => {
      setIsSyncing(true);
      fetchHistory({ silent: true }).finally(() => setIsSyncing(false));
    }, 4500);
    return () => clearInterval(id);
  }, [isOpen, conversationId, userEmail]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isSending]);

  const handleSend = async () => {
    if (!input.trim() || !userEmail || isSending) return;
    const userMsg = input.trim();
    setInput("");
    setIsSending(true);

    const tempUserMsg = {
      id: Date.now(),
      sender: "user",
      content: userMsg,
      createdAt: new Date().toISOString(),
    };
    const tempBotMsg = {
      id: Date.now() + 1,
      sender: "bot",
      content: "",
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg, tempBotMsg]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          userEmail,
          conversationId,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Stream failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let newConvoId = conversationId;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;

            try {
              const parsed = JSON.parse(data);
              if (parsed.conversationId) {
                newConvoId = parsed.conversationId;
                setConversationId(parsed.conversationId);
              }
              if (parsed.chunk) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const lastMsg = updated[updated.length - 1];
                  if (lastMsg?.sender === "bot") {
                    lastMsg.content += parsed.chunk;
                  }
                  return updated;
                });
              }
            } catch (e) {
              console.error("Parse error", e);
            }
          }
        }
      }

      await fetchHistory({ silent: true });
    } catch (err) {
      console.error("Send message failed", err);
      setMessages((prev) => prev.slice(0, -2));
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSupportSubmit = async () => {
    if (!supportForm.subject.trim() || !supportForm.message.trim()) return;
    try {
      setIsSubmittingSupport(true);
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail,
          subject: supportForm.subject,
          category: supportForm.category,
          message: supportForm.message,
          source: "chatbot",
        }),
      });
      if (res.ok) {
        setSupportForm({ subject: "", category: "General", message: "" });
        setShowSupportForm(false);
        setMessages((prev) => [...prev, {
          id: Date.now(),
          sender: "bot",
          content: "✅ Support ticket submitted! Our team will respond via email within 24 hours.",
          createdAt: new Date().toISOString(),
        }]);
      }
    } catch (err) {
      console.error("Support submit failed", err);
    } finally {
      setIsSubmittingSupport(false);
    }
  };

  const headerTitle = useMemo(() => {
    if (!userName) return "AI Study Buddy";
    return `Hi ${userName.split(" ")[0]}!`;
  }, [userName]);

  if (!userEmail) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-4 right-4 z-40 h-14 w-14 rounded-full bg-gradient-to-br from-indigo-600 via-indigo-500 to-blue-500 text-white shadow-2xl hover:shadow-3xl hover:scale-110 transition-all transform duration-200 flex items-center justify-center"
        aria-label="Open study assistant"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {isOpen && (
        <div className={panelBase}>
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-500 text-white">
            <div>
              <p className="text-base font-bold">{headerTitle}</p>
              <p className="text-xs text-indigo-100">Ask anything or contact support</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-[10px] text-indigo-200 font-medium">
                {isLoadingHistory || isSyncing ? "●" : "●"}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white transition p-1"
                aria-label="Close chat"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="px-4 pt-3 pb-2 border-b border-gray-100 bg-gradient-to-b from-white to-gray-50/50 flex flex-wrap gap-2">
            {quickPrompts.map((text) => (
              <button
                key={text}
                onClick={() => setInput(text)}
                className="text-[11px] px-3 py-1.5 rounded-full bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 transition shadow-sm font-medium"
              >
                {text}
              </button>
            ))}
          </div>

          <div
            ref={scrollRef}
            className="flex-1 px-4 py-4 space-y-3 overflow-y-auto bg-gradient-to-b from-gray-50/50 to-white"
          >
            {messages.length === 0 && !isLoadingHistory && (
              <div className="text-center py-16">
                <div className="text-4xl mb-3">💬</div>
                <p className="text-sm text-gray-600 font-medium">Start a conversation</p>
                <p className="text-xs text-gray-400 mt-1">Ask me anything about your courses</p>
              </div>
            )}
            {messages.map((msg) => (
              <MessageBubble key={msg.id} sender={msg.sender} content={msg.content} />
            ))}
            {isSending && (
              <div className="flex justify-start">
                <div className="px-4 py-2.5 rounded-2xl bg-white border border-gray-200 text-gray-600 text-sm shadow-sm">
                  <span className="inline-flex gap-1">
                    <span className="animate-bounce" style={{animationDelay: '0ms'}}>●</span>
                    <span className="animate-bounce" style={{animationDelay: '150ms'}}>●</span>
                    <span className="animate-bounce" style={{animationDelay: '300ms'}}>●</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {!showSupportForm ? (
            <div className="p-4 border-t border-gray-100 bg-white/90 backdrop-blur space-y-2">
              <div className="flex gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  className="flex-1 resize-none border border-gray-300 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent h-20 shadow-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSupportForm(true)}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-white border border-gray-300 text-gray-700 text-sm font-semibold py-2.5 shadow-sm hover:bg-gray-50 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Support
                </button>
                <button
                  onClick={handleSend}
                  disabled={isSending || !input.trim()}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white text-sm font-semibold py-2.5 shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100 transition transform"
                >
                  {isSending ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Thinking
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Send
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 border-t border-gray-100 bg-white/90 backdrop-blur space-y-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-900">Contact Support</p>
                <button onClick={() => setShowSupportForm(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <input
                type="text"
                placeholder="Subject"
                value={supportForm.subject}
                onChange={(e) => setSupportForm((p) => ({ ...p, subject: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              />
              <select
                value={supportForm.category}
                onChange={(e) => setSupportForm((p) => ({ ...p, category: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              >
                <option>General</option>
                <option>Technical Issue</option>
                <option>Account</option>
                <option>Content</option>
              </select>
              <textarea
                placeholder="Describe your issue..."
                value={supportForm.message}
                onChange={(e) => setSupportForm((p) => ({ ...p, message: e.target.value }))}
                className="w-full resize-none border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24 shadow-sm"
              />
              <button
                onClick={handleSupportSubmit}
                disabled={isSubmittingSupport || !supportForm.subject.trim() || !supportForm.message.trim()}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white text-sm font-semibold py-2.5 shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100 transition transform"
              >
                {isSubmittingSupport ? "Submitting..." : "Submit Ticket"}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default ChatBotWidget;

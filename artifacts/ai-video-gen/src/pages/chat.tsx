import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListOpenaiConversations,
  useCreateOpenaiConversation,
  useGetOpenaiConversation,
  useDeleteOpenaiConversation,
  getListOpenaiConversationsQueryKey,
  getGetOpenaiConversationQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, Send, Bot, User, MessageSquare } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

export default function ChatPage() {
  const qc = useQueryClient();
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [streamingMessages, setStreamingMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: convList } = useListOpenaiConversations();
  const { data: activeConv } = useGetOpenaiConversation(activeConvId ?? 0, {
    query: {
      enabled: !!activeConvId,
      queryKey: getGetOpenaiConversationQueryKey(activeConvId ?? 0),
    },
  });
  const createConv = useCreateOpenaiConversation();
  const deleteConv = useDeleteOpenaiConversation();

  const displayMessages: Message[] = activeConvId
    ? [
        ...(activeConv?.messages?.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })) ?? []),
        ...streamingMessages,
      ]
    : streamingMessages;

  useEffect(() => {
    setStreamingMessages([]);
  }, [activeConvId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages.length, isStreaming]);

  const startNewChat = async () => {
    const conv = await createConv.mutateAsync({ data: { title: "New Chat" } });
    setActiveConvId(conv.id);
    setStreamingMessages([]);
    qc.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
  };

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;
    let convId = activeConvId;

    if (!convId) {
      const conv = await createConv.mutateAsync({
        data: { title: input.slice(0, 40) },
      });
      convId = conv.id;
      setActiveConvId(conv.id);
      qc.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
    }

    const userMsg = input.trim();
    setInput("");
    setStreamingMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsStreaming(true);

    let assistantContent = "";
    setStreamingMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", streaming: true },
    ]);

    try {
      const res = await fetch(`/api/openai/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userMsg }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        const lines = text.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = JSON.parse(line.slice(6));
          if (data.done) break;
          if (data.content) {
            assistantContent += data.content;
            setStreamingMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                role: "assistant",
                content: assistantContent,
                streaming: true,
              };
              return updated;
            });
          }
        }
      }
    } finally {
      setIsStreaming(false);
      setStreamingMessages([]);
      qc.invalidateQueries({
        queryKey: getGetOpenaiConversationQueryKey(convId),
      });
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] md:h-[calc(100vh-3rem)] gap-4">
      {/* Sidebar: conversation list */}
      <div className="hidden md:flex flex-col w-52 shrink-0 gap-2">
        <Button
          onClick={startNewChat}
          variant="outline"
          className="w-full border-border gap-2 text-sm"
          size="sm"
        >
          <Plus className="h-4 w-4" /> New Chat
        </Button>
        <div className="flex-1 overflow-y-auto space-y-1">
          {convList?.map((c) => (
            <div
              key={c.id}
              className={`flex items-center justify-between px-2 py-1.5 rounded text-xs cursor-pointer group ${
                activeConvId === c.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-secondary text-muted-foreground"
              }`}
              onClick={() => setActiveConvId(c.id)}
            >
              <span className="truncate flex-1">{c.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConv.mutate(
                    { id: c.id },
                    {
                      onSuccess: () => {
                        if (activeConvId === c.id) setActiveConvId(null);
                        qc.invalidateQueries({
                          queryKey: getListOpenaiConversationsQueryKey(),
                        });
                      },
                    }
                  );
                }}
                className="opacity-0 group-hover:opacity-100 ml-1"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-card rounded-xl border border-border overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {displayMessages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
              <Bot className="h-12 w-12 mb-3 opacity-20" />
              <p className="font-medium text-sm">Kuch bhi poocho!</p>
              <p className="text-xs mt-1">
                Main VirgoAI hoon — baat karo, images banao, ya videos generate karo.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-2 max-w-xs text-left">
                {[
                  "Mujhe ek poem likho",
                  "AI se image kaise banate hain?",
                  "Pakistan ke baare mein kuch batao",
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="px-3 py-2 rounded-lg border border-border text-xs hover:bg-secondary transition-colors text-left"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {displayMessages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-secondary text-foreground rounded-tl-sm"
                }`}
              >
                {msg.content}
                {msg.streaming && (
                  <span className="inline-block w-1.5 h-4 ml-0.5 bg-current opacity-70 animate-pulse rounded-sm" />
                )}
              </div>
              {msg.role === "user" && (
                <div className="h-7 w-7 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="h-3.5 w-3.5 text-violet-400" />
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-border">
          <div className="flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Kuch bhi poocho... (Enter = send, Shift+Enter = new line)"
              className="min-h-10 max-h-32 resize-none text-sm bg-background border-border"
              disabled={isStreaming}
              rows={1}
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isStreaming}
              size="sm"
              className="shrink-0 bg-primary"
            >
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

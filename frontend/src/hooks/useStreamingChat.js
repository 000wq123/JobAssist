import { useState, useCallback, useRef } from "react";
import { defaultBaseURL } from "../services/api";
import { STORAGE_KEYS } from "../storageKeys";

/**
 * Real SSE streaming hook for Groq chat.
 * Usage:
 *   const { send, isStreaming } = useStreamingChat();
 *   send(payload, { onChunk, onDone, onError });
 */
export function useStreamingChat() {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef(null);

  const send = useCallback(async (payload, { onChunk, onDone, onError } = {}) => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setIsStreaming(true);

    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

    try {
      const resp = await fetch(`${defaultBaseURL}/ai-assistant/chat-stream`, {
        method: "POST",
        // `credentials: "include"` ensures the httpOnly refresh cookie rides
        // along when the access token has just expired and the server needs
        // to redirect to /auth/refresh.
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
        signal: abortRef.current.signal,
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") {
            onDone?.();
            return;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) onChunk?.(parsed.text);
          } catch {}
        }
      }
      onDone?.();
    } catch (err) {
      if (err.name !== "AbortError") onError?.(err);
    } finally {
      setIsStreaming(false);
    }
  }, []);

  return { send, isStreaming };
}

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { tokenStorage } from "../lib/api";
import { Message } from "../components/chat/types";

let globalWsInstance: WebSocket | null = null;

interface UseWebSocketProps {
  isAuthenticated: boolean;
  username?: string;
  onMessage?: (message: Message) => void;
}

export function useWebSocket({
  isAuthenticated,
  username,
  onMessage,
}: UseWebSocketProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const isInitialMount = useRef(true);
  const onMessageRef = useRef(onMessage);

  // Keep onMessage ref up to date without triggering reconnection
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  /**
   * Process received WebSocket message
   */
  const processMessage = useCallback((message: Message) => {
    if (message.type === "userCount") {
      setOnlineUsers(message.count || 0);
    } else {
      setMessages((prev) => [...prev, message]);
      if (onMessageRef.current) {
        onMessageRef.current(message);
      }
    }
  }, []);

  /**
   * Create WebSocket message handler
   */
  const createMessageHandler = useCallback(() => {
    return (event: MessageEvent) => {
      const message: Message = JSON.parse(event.data);
      processMessage(message);
    };
  }, [processMessage]);

  /**
   * Setup existing WebSocket connection
   */
  const setupExistingConnection = useCallback(
    (handleMessage: (event: MessageEvent) => void) => {
      if (wsRef.current !== globalWsInstance) {
        wsRef.current = globalWsInstance;
        globalWsInstance!.onmessage = handleMessage;
        setTimeout(() => setIsConnected(true), 0);
      }
    },
    [],
  );

  /**
   * Reset connection state
   */
  const resetConnectionState = useCallback(() => {
    setIsConnected(false);
    setOnlineUsers(0);
    setMessages([]);
    globalWsInstance = null;
    wsRef.current = null;
  }, []);

  /**
   * Create new WebSocket connection
   */
  const createWebSocketConnection = useCallback(
    (token: string, handleMessage: (event: MessageEvent) => void) => {
      // Build WebSocket URL based on current location (works in dev and prod)
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const CHAT_WS_URL =
        process.env.NEXT_PUBLIC_CHAT_WS_URL ||
        `${protocol}//${host}/api/chat/ws`;
      const ws = new WebSocket(`${CHAT_WS_URL}?token=${token}`);

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = handleMessage;

      ws.onclose = (event) => {
        resetConnectionState();
      };

      ws.onerror = () => {
        // WebSocket errors are handled in onclose
        setIsConnected(false);
      };

      wsRef.current = ws;
      globalWsInstance = ws;
    },
    [resetConnectionState],
  );

  /**
   * Close WebSocket connection
   */
  const closeConnection = useCallback(() => {
    if (globalWsInstance?.readyState === WebSocket.OPEN) {
      globalWsInstance.close(1000, "User logged out");
      globalWsInstance = null;
    }
    wsRef.current = null;
  }, []);

  // Reset state when user logs out
  useEffect(() => {
    if (!isAuthenticated && !isInitialMount.current) {
      closeConnection();
      resetConnectionState(); // ← Ajoute reset
    }
    isInitialMount.current = false;
  }, [isAuthenticated, closeConnection, resetConnectionState]);

  // Connect to WebSocket
  useEffect(() => {
    if (!isAuthenticated || !username) {
      return;
    }

    const token = tokenStorage.getAccessToken();
    if (!token) {
      return;
    }

    const handleMessage = createMessageHandler();

    // Si on a un username maintenant et la connexion existante est vieille, reset
    if (globalWsInstance && globalWsInstance.readyState === WebSocket.OPEN) {
      setupExistingConnection(handleMessage);
      return;
    }

    // Reset et crée nouvelle connexion si le username a changé
    if (globalWsInstance) {
      globalWsInstance.close();
      globalWsInstance = null;
      wsRef.current = null;
    }

    createWebSocketConnection(token, handleMessage);

    return () => {
      // Cleanup on component unmount
    };
  }, [
    isAuthenticated,
    username,
    createMessageHandler,
    setupExistingConnection,
    createWebSocketConnection,
  ]);

  const sendMessage = useCallback(
    (message: string) => {
      if (!message.trim() || !wsRef.current || !isConnected) return;
      wsRef.current.send(message);
    },
    [isConnected],
  );

  return {
    messages,
    isConnected,
    onlineUsers,
    sendMessage,
  };
}

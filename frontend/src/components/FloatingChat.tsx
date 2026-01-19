"use client";

import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useWebSocket } from "../hooks/useWebSocket";
import { ChatButton } from "./chat/ChatButton";
import { ChatWindow } from "./chat/ChatWindow";
import { Message } from "./chat/types";

export function FloatingChat() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleMessage = (message: Message) => {
    if (
      !isOpen &&
      message.type === "chat" &&
      message.username !== user?.username
    ) {
      setUnreadCount((prev) => prev + 1);
    }
  };

  const { messages, isConnected, onlineUsers, sendMessage } = useWebSocket({
    isAuthenticated,
    username: user?.username,
    onMessage: handleMessage,
  });

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setUnreadCount(0);
    }
  };

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <>
      <ChatButton onClick={toggleChat} unreadCount={unreadCount} />
      {isOpen && (
        <ChatWindow
          messages={messages}
          isConnected={isConnected}
          onlineUsers={onlineUsers}
          currentUsername={user?.username}
          onClose={toggleChat}
          onSendMessage={sendMessage}
        />
      )}
    </>
  );
}

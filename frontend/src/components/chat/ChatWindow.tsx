'use client';

import { ChatHeader } from './ChatHeader';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { Message } from './types';

interface ChatWindowProps {
    messages: Message[];
    isConnected: boolean;
    onlineUsers: number;
    currentUsername?: string;
    onClose: () => void;
    onSendMessage: (message: string) => void;
}

export function ChatWindow({
    messages,
    isConnected,
    onlineUsers,
    currentUsername,
    onClose,
    onSendMessage,
}: ChatWindowProps) {
    return (
        <div className="fixed bottom-24 right-6 z-50 w-96 h-[600px] bg-blue-dark/95 backdrop-blur-lg border border-blue rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <ChatHeader 
                isConnected={isConnected}
                onlineUsers={onlineUsers}
                onClose={onClose}
            />
            <ChatMessages 
                messages={messages}
                currentUsername={currentUsername}
            />
            <ChatInput 
                onSend={onSendMessage}
                isConnected={isConnected}
            />
        </div>
    );
}
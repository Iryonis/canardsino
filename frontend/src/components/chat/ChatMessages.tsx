'use client';

import { useEffect, useRef } from 'react';
import { Message } from './types';
import { ChatMessage } from './ChatMessage';

interface ChatMessagesProps {
    messages: Message[];
    currentUsername?: string;
}

export function ChatMessages({ messages, currentUsername }: ChatMessagesProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
                <div className="text-center text-blue-light/50 py-8 text-sm">
                    No messages yet 🦆
                </div>
            )}

            {messages.map((msg, index) => (
                <ChatMessage 
                    key={index} 
                    message={msg} 
                    currentUsername={currentUsername} 
                />
            ))}
            <div ref={messagesEndRef} />
        </div>
    );
}
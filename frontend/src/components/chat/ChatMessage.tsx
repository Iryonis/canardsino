'use client';

import { Message } from './types';

interface ChatMessageProps {
    message: Message;
    currentUsername?: string;
}

export function ChatMessage({ message, currentUsername }: ChatMessageProps) {
    if (message.type === 'system') {
        return (
            <div className="flex justify-center">
                <div className="bg-blue/30 text-blue-lightest px-3 py-1 rounded-full text-xs italic">
                    {message.message}
                </div>
            </div>
        );
    }

    if (message.type === 'chat') {
        const isOwnMessage = message.username === currentUsername;

        return (
            <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] ${
                    isOwnMessage
                        ? 'bg-gradient-to-r from-blue-light to-blue-lightest text-blue-darkest'
                        : 'bg-blue-darkest border border-blue text-blue-lightest'
                } rounded-lg px-3 py-2 shadow-lg`}>
                    <div className="font-semibold text-xs mb-1 opacity-80">
                        {message.username}
                    </div>
                    <div className="text-sm break-words leading-snug">
                        {message.message}
                    </div>
                    <div className="text-[10px] opacity-60 mt-1 text-right">
                        {new Date(message.timestamp).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
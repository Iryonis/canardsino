'use client';

import { useState } from 'react';

interface ChatInputProps {
    onSend: (message: string) => void;
    isConnected: boolean;
}

export function ChatInput({ onSend, isConnected }: ChatInputProps) {
    const [inputMessage, setInputMessage] = useState('');

    const handleSend = () => {
        if (!inputMessage.trim()) return;
        onSend(inputMessage);
        setInputMessage('');
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="border-t border-blue bg-blue-darkest/50 p-3">
            <div className="flex gap-2">
                <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    disabled={!isConnected}
                    className="flex-1 bg-blue-dark border border-blue rounded-lg px-3 py-2 text-sm text-blue-lightest placeholder-blue-light/50 focus:outline-none focus:ring-2 focus:ring-blue-light disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                    onClick={handleSend}
                    disabled={!isConnected || !inputMessage.trim()}
                    className="px-4 py-2 bg-gradient-to-r from-blue-light to-blue-lightest hover:from-blue-lightest hover:to-blue-light text-blue-darkest font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                    Send
                </button>
            </div>
        </div>
    );
}
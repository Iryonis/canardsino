'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { tokenStorage } from '../lib/api';

interface Message {
    type: 'system' | 'chat' | 'userCount';
    username?: string;
    message?: string;
    count?: number;
    timestamp: string;
}

let globalWsInstance: WebSocket | null = null;

export function FloatingChat() {
    const { user, isAuthenticated } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [onlineUsers, setOnlineUsers] = useState(0);
    const wsRef = useRef<WebSocket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Connect to WebSocket
    useEffect(() => {
        // Si l'utilisateur se déconnecte, fermer la connexion WebSocket
        if (!isAuthenticated) {
            if (globalWsInstance?.readyState === WebSocket.OPEN) {
                console.log('🔌 Closing WebSocket connection on logout');
                globalWsInstance.close(1000, 'User logged out');
                globalWsInstance = null;
            }
            wsRef.current = null;
            setIsConnected(false);
            setMessages([]);
            setOnlineUsers(0);
            setUnreadCount(0);
            return;
        }

        if (!user) {
            return;
        }

        const token = tokenStorage.getAccessToken();
        if (!token) {
            return;
        }

        if (globalWsInstance && globalWsInstance.readyState === WebSocket.OPEN) {
            wsRef.current = globalWsInstance;
            setIsConnected(true);

            globalWsInstance.onmessage = (event) => {
                const message: Message = JSON.parse(event.data);
                
                if (message.type === 'userCount') {
                    setOnlineUsers(message.count || 0);
                } else {
                    setMessages((prev) => [...prev, message]);
                    if (!isOpen && message.type === 'chat') {
                        setUnreadCount((prev) => prev + 1);
                    }
                }
            };

            return;
        }

        if (globalWsInstance) {
            return;
        }

        const CHAT_WS_URL = process.env.NEXT_PUBLIC_CHAT_WS_URL || 'ws://localhost:8004';
        const ws = new WebSocket(`${CHAT_WS_URL}?token=${token}`);

        ws.onopen = () => {
            console.log('✅ Connected to chat');
            setIsConnected(true);
        };

        ws.onmessage = (event) => {
            const message: Message = JSON.parse(event.data);
            
            if (message.type === 'userCount') {
                setOnlineUsers(message.count || 0);
            } else {
                setMessages((prev) => [...prev, message]);
                if (!isOpen && message.type === 'chat') {
                    setUnreadCount((prev) => prev + 1);
                }
            }
        };

        ws.onclose = (event) => {
            console.log('❌ Disconnected from chat', event.code, event.reason);
            setIsConnected(false);
            setOnlineUsers(0);
            globalWsInstance = null;
            wsRef.current = null;
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            setIsConnected(false);
        };

        wsRef.current = ws;
        globalWsInstance = ws;

        return () => {
            console.log('🔄 Component cleanup (connexion maintenue)');
        };
    }, [isAuthenticated, user, isOpen]);

    const sendMessage = () => {
        if (!inputMessage.trim() || !wsRef.current || !isConnected) return;

        wsRef.current.send(inputMessage);
        setInputMessage('');
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const toggleChat = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            setUnreadCount(0);
        }
    };

    if (!isAuthenticated) {
        return null;
    }

    return (
        <>
            {/* Chat Button */}
            <button
                onClick={toggleChat}
                className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-blue-light to-blue-lightest hover:from-blue-lightest hover:to-blue-light text-blue-darkest p-4 rounded-full shadow-2xl transition-transform hover:scale-110"
            >
                <span className="text-2xl">💬</span>
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 z-50 w-96 h-[600px] bg-blue-dark/95 backdrop-blur-lg border border-blue rounded-xl shadow-2xl flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-light to-blue-lightest p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">💬</span>
                            <div>
                                <h3 className="text-blue-darkest font-bold">Global Chat</h3>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                                    <span className="text-blue-darkest/70 text-xs">
                                        {onlineUsers} online
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={toggleChat}
                            className="text-blue-darkest hover:text-blue-dark transition text-xl font-bold"
                        >
                            ×
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {messages.length === 0 && (
                            <div className="text-center text-blue-light/50 py-8 text-sm">
                                No messages yet 🦆
                            </div>
                        )}

                        {messages.map((msg, index) => (
                            <div key={index}>
                                {msg.type === 'system' ? (
                                    <div className="flex justify-center">
                                        <div className="bg-blue/30 text-blue-lightest px-3 py-1 rounded-full text-xs italic">
                                            {msg.message}
                                        </div>
                                    </div>
                                ) : msg.type === 'chat' ? (
                                    <div className={`flex flex-col ${msg.username === user?.username ? 'items-end' : 'items-start'}`}>
                                        <div className={`max-w-[85%] ${msg.username === user?.username
                                                ? 'bg-gradient-to-r from-blue-light to-blue-lightest text-blue-darkest'
                                                : 'bg-blue-darkest border border-blue text-blue-lightest'
                                            } rounded-lg px-3 py-2 shadow-lg`}>
                                            <div className="font-semibold text-xs mb-1 opacity-80">
                                                {msg.username}
                                            </div>
                                            <div className="text-sm break-words leading-snug">
                                                {msg.message}
                                            </div>
                                            <div className="text-[10px] opacity-60 mt-1 text-right">
                                                {new Date(msg.timestamp).toLocaleTimeString('fr-FR', {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
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
                                onClick={sendMessage}
                                disabled={!isConnected || !inputMessage.trim()}
                                className="px-4 py-2 bg-gradient-to-r from-blue-light to-blue-lightest hover:from-blue-lightest hover:to-blue-light text-blue-darkest font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
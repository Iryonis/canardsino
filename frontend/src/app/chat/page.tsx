'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { tokenStorage } from '../../lib/api';

interface Message {
    type: 'system' | 'chat';
    username?: string;
    message: string;
    timestamp: string;
}

// Flag global pour éviter les doubles connexions en dev
let globalWsInstance: WebSocket | null = null;

export default function ChatPage() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Connect to WebSocket
    // Connect to WebSocket
    useEffect(() => {
        if (!isAuthenticated || !user) {
            return;
        }

        const token = tokenStorage.getAccessToken();
        if (!token) {
            return;
        }

        // Utiliser l'instance globale si elle existe déjà
        if (globalWsInstance && globalWsInstance.readyState === WebSocket.OPEN) {
            console.log('🔄 Réutilisation de la connexion existante');
            wsRef.current = globalWsInstance;
            setIsConnected(true);

            // Réattacher les handlers pour ce composant
            globalWsInstance.onmessage = (event) => {
                const message: Message = JSON.parse(event.data);
                setMessages((prev) => [...prev, message]);
            };

            return;
        }

        // Ne créer une nouvelle connexion que si aucune n'existe
        if (globalWsInstance) {
            return;
        }

        console.log('🔌 Connecting to chat...');

        const CHAT_WS_URL = process.env.NEXT_PUBLIC_CHAT_WS_URL || 'ws://localhost:8004';
        const ws = new WebSocket(`${CHAT_WS_URL}?token=${token}`);

        ws.onopen = () => {
            console.log('✅ Connected to chat');
            setIsConnected(true);
        };

        ws.onmessage = (event) => {
            const message: Message = JSON.parse(event.data);
            setMessages((prev) => [...prev, message]);
        };

        ws.onclose = (event) => {
            console.log('❌ Disconnected from chat', event.code, event.reason);
            setIsConnected(false);
            globalWsInstance = null;
            wsRef.current = null;
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            setIsConnected(false);
        };

        wsRef.current = ws;
        globalWsInstance = ws;

        // Cleanup - ne fermer que si on quitte vraiment la page
        return () => {
            // On ne ferme PAS la connexion ici car elle peut être réutilisée
            console.log('🔄 Component cleanup (connexion maintenue)');
        };
    }, [isAuthenticated, user]);

    // Gérer la redirection séparément
    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [isAuthenticated, isLoading, router]);

    // Fermer la connexion seulement quand on quitte vraiment le chat
    useEffect(() => {
        return () => {
            // Ce cleanup s'exécute quand on navigue vraiment ailleurs
            const handleBeforeUnload = () => {
                if (globalWsInstance?.readyState === WebSocket.OPEN) {
                    console.log('🧹 Closing connection on page leave');
                    globalWsInstance.close(1000, 'Leaving chat');
                    globalWsInstance = null;
                }
            };

            window.addEventListener('beforeunload', handleBeforeUnload);
            return () => window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);

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

    if (isLoading) {
        return (
            <div className="min-h-screen bg-blue-darkest flex items-center justify-center">
                <div className="text-blue-lightest text-xl">Loading...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="min-h-screen bg-blue-darkest">
            {/* Header */}
            <nav className="bg-blue-dark/50 backdrop-blur border-b border-blue">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => {
                                // Fermer la connexion avant de quitter
                                if (globalWsInstance?.readyState === WebSocket.OPEN) {
                                    globalWsInstance.close(1000, 'Leaving chat');
                                    globalWsInstance = null;
                                }
                                router.push('/');
                            }}
                            className="text-blue-light hover:text-blue-lightest transition"
                        >
                            ← Back
                        </button>
                        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-light to-blue-lightest">
                            💬 Global Chat
                        </h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                            <span className="text-blue-light text-sm">
                                {isConnected ? 'Connected' : 'Disconnected'}
                            </span>
                        </div>
                        <span className="text-blue-lightest">{user?.username}</span>
                    </div>
                </div>
            </nav>

            {/* Chat Container */}
            <div className="container mx-auto px-4 py-6 max-w-4xl">
                <div className="bg-blue-dark/50 backdrop-blur border border-blue rounded-lg shadow-xl overflow-hidden flex flex-col h-[calc(100vh-200px)]">

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {messages.length === 0 && (
                            <div className="text-center text-blue-light/50 py-8">
                                No messages yet. Start the conversation! 🦆
                            </div>
                        )}

                        {messages.map((msg, index) => (
                            <div key={index}>
                                {msg.type === 'system' ? (
                                    <div className="flex justify-center">
                                        <div className="bg-blue/30 text-blue-lightest px-4 py-2 rounded-full text-sm italic">
                                            {msg.message}
                                        </div>
                                    </div>
                                ) : (
                                    <div className={`flex ${msg.username === user?.username ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] ${msg.username === user?.username
                                                ? 'bg-gradient-to-r from-blue-light to-blue-lightest text-blue-darkest'
                                                : 'bg-blue-dark border border-blue text-blue-lightest'
                                            } rounded-lg px-4 py-3 shadow-lg`}>
                                            <div className="font-bold text-sm mb-1">
                                                {msg.username}
                                            </div>
                                            <div className="break-words">
                                                {msg.message}
                                            </div>
                                            <div className="text-xs opacity-70 mt-1">
                                                {new Date(msg.timestamp).toLocaleTimeString()}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="border-t border-blue bg-blue-darkest/50 p-4">
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Type your message..."
                                disabled={!isConnected}
                                className="flex-1 bg-blue-dark border border-blue rounded-lg px-4 py-3 text-blue-lightest placeholder-blue-light/50 focus:outline-none focus:ring-2 focus:ring-blue-light disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <button
                                onClick={sendMessage}
                                disabled={!isConnected || !inputMessage.trim()}
                                className="px-6 py-3 bg-gradient-to-r from-blue-light to-blue-lightest hover:from-blue-lightest hover:to-blue-light text-blue-darkest font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
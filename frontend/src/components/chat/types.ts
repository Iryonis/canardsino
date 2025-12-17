export interface Message {
    type: 'system' | 'chat' | 'userCount';
    username?: string;
    message?: string;
    count?: number;
    timestamp: string;
}

export interface ChatState {
    messages: Message[];
    isConnected: boolean;
    onlineUsers: number;
}
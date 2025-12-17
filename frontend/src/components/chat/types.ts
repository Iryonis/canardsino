export interface Message {
    type: MessageType;
    username?: string;
    message?: string;
    count?: number;
    timestamp: string;
}

export enum MessageType {
    SYSTEM = 'system',
    CHAT = 'chat',
    USER_COUNT = 'userCount'
}

export interface ChatState {
    messages: Message[];
    isConnected: boolean;
    onlineUsers: number;
}
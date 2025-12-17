// Types partagés pour le service chat

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  content: string;
  timestamp: Date;
}

export interface SendMessagePayload {
  content: string;
}

export interface ChatUser {
  userId: string;
  username: string;
  socketId: string;
}

// Events Socket.io
export const CHAT_EVENTS = {
  // Client -> Server
  SEND_MESSAGE: 'chat:send_message',
  GET_HISTORY: 'chat:get_history',
  USER_TYPING: 'chat:user_typing',
  
  // Server -> Client
  NEW_MESSAGE: 'chat:new_message',
  MESSAGE_HISTORY: 'chat:message_history',
  USER_JOINED: 'chat:user_joined',
  USER_LEFT: 'chat:user_left',
  USER_IS_TYPING: 'chat:user_is_typing',
  ERROR: 'chat:error',
  
  // Connection
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect'
} as const;

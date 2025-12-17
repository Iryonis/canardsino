'use client';

interface ChatHeaderProps {
    isConnected: boolean;
    onlineUsers: number;
    onClose: () => void;
}

export function ChatHeader({ isConnected, onlineUsers, onClose }: ChatHeaderProps) {
    return (
        <div className="bg-gradient-to-r from-blue-dark to-blue p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div>
                    <h3 className="text-blue-lightest font-bold">Global Chat</h3>
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className="text-blue-lightest/70 text-xs">
                            {onlineUsers} online
                        </span>
                    </div>
                </div>
            </div>
            <button
                onClick={onClose}
                className="text-blue-lightest hover:text-blue-light transition text-xl font-bold"
            >
                ×
            </button>
        </div>
    );
}
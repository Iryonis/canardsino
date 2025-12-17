'use client';

interface ChatHeaderProps {
    isConnected: boolean;
    onlineUsers: number;
    onClose: () => void;
}

export function ChatHeader({ isConnected, onlineUsers, onClose }: ChatHeaderProps) {
    return (
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
                onClick={onClose}
                className="text-blue-darkest hover:text-blue-dark transition text-xl font-bold"
            >
                ×
            </button>
        </div>
    );
}
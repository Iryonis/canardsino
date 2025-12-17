'use client';

interface ChatButtonProps {
    onClick: () => void;
    unreadCount: number;
}

export function ChatButton({ onClick, unreadCount }: ChatButtonProps) {
    return (
        <button
            onClick={onClick}
            className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-blue to-blue-dark hover:from-blue-dark hover:to-blue text-blue-lightest p-4 rounded-full shadow-2xl transition-transform hover:scale-110"
        >
            <span className="text-2xl">💬</span>
            {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                </span>
            )}
        </button>
    );
}
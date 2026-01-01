import { useState, type KeyboardEvent, useRef, forwardRef, useImperativeHandle } from "react";
import { motion } from "framer-motion";
import { Send } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export interface ChatInputRef {
  focus: () => void;
}

export const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(
  ({ onSend, disabled }, ref) => {
    const [message, setMessage] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = message.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setMessage("");
    }
  };

    // Expose focus method to parent
    useImperativeHandle(ref, () => ({
      focus: () => {
        textareaRef.current?.focus();
      },
    }));

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    };

    return (
      <motion.div
        className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="flex gap-2 items-end max-w-4xl mx-auto">
          <motion.textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
            disabled={disabled}
            rows={1}
            className="flex-1 resize-none px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            style={{
              minHeight: "48px",
              maxHeight: "120px",
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
            }}
            whileFocus={{ scale: 1.01 }}
            transition={{ duration: 0.2 }}
          />
          <motion.button
            onClick={handleSend}
            disabled={disabled || !message.trim()}
            className="px-5 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-md hover:shadow-lg disabled:shadow-none font-medium"
            whileHover={{ scale: disabled || !message.trim() ? 1 : 1.05 }}
            whileTap={{ scale: disabled || !message.trim() ? 1 : 0.95 }}
            animate={{
              boxShadow: disabled || !message.trim()
                ? "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                : [
                    "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    "0 10px 15px -3px rgba(59, 130, 246, 0.3)",
                    "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  ],
            }}
            transition={{
              boxShadow: {
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              },
            }}
          >
            <motion.div
              animate={disabled ? {} : { rotate: [0, 10, -10, 0] }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                repeatDelay: 2,
              }}
            >
              <Send size={18} />
            </motion.div>
            <span className="hidden sm:inline">Send</span>
          </motion.button>
        </div>
      </motion.div>
    );
  }
);

ChatInput.displayName = "ChatInput";


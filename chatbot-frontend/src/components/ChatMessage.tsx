import { motion } from "framer-motion";
import type { Message } from "../types/chat";
import { MessageCircle, User } from "lucide-react";

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.sender === "user";

  return (
    <motion.div
      className={`flex gap-3 mb-6 max-w-4xl mx-auto ${
        isUser ? "flex-row-reverse" : "flex-row"
      }`}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-md ${
          isUser
            ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
            : "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 text-gray-700 dark:text-gray-200"
        }`}
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatDelay: 3,
          ease: "easeInOut",
        }}
      >
        {isUser ? (
          <User size={20} />
        ) : (
          <MessageCircle size={20} />
        )}
      </motion.div>
      <div
        className={`flex-1 ${isUser ? "text-right" : "text-left"}`}
      >
        <motion.div
          className={`inline-block px-5 py-3 rounded-2xl shadow-sm ${
            isUser
              ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-md"
              : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md border border-gray-200 dark:border-gray-700"
          }`}
          whileHover={{ 
            scale: 1.02,
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
          }}
          transition={{ duration: 0.2 }}
        >
          <motion.p
            className="whitespace-pre-wrap break-words leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {message.text}
          </motion.p>
        </motion.div>
        <motion.p
          className="text-xs text-gray-500 dark:text-gray-400 mt-2 px-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </motion.p>
      </div>
    </motion.div>
  );
}


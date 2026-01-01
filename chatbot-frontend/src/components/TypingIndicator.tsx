import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";

export function TypingIndicator() {
  return (
    <motion.div
      className="flex gap-3 mb-6 max-w-4xl mx-auto flex-row"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-md bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 text-gray-700 dark:text-gray-200"
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
        <MessageCircle size={20} />
      </motion.div>
      <div className="flex-1 text-left">
        <motion.div
          className="inline-block px-5 py-3 rounded-2xl shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md border border-gray-200 dark:border-gray-700"
          whileHover={{ 
            scale: 1.02,
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
          }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center gap-2">
            <span className="text-gray-600 dark:text-gray-300 font-medium">Agent is typing</span>
            <motion.span
              className="flex gap-1.5 items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {[0, 1, 2].map((index) => (
                <motion.span
                  key={index}
                  className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500"
                  animate={{
                    y: [0, -6, 0],
                    opacity: [0.3, 1, 0.3],
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 1.4,
                    repeat: Infinity,
                    delay: index * 0.15,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </motion.span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}


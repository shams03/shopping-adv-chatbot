import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatMessage } from "./components/ChatMessage";
import { ChatInput, type ChatInputRef } from "./components/ChatInput";
import { TypingIndicator } from "./components/TypingIndicator";
import { api } from "./lib/api";
import { storage } from "./lib/storage";
import { useTheme } from "./hooks/useTheme";
import type { Message } from "./types/chat";
import { AlertCircle, Moon, Sun, MessageCircle, GripVertical } from "lucide-react";

// Default header height (in pixels)
const DEFAULT_HEADER_HEIGHT = 100;
const MIN_HEADER_HEIGHT = 60;
const MAX_HEADER_HEIGHT = 300;

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [headerHeight, setHeaderHeight] = useState<number>(() => {
    const saved = storage.getHeaderHeight();
    return saved ?? DEFAULT_HEADER_HEIGHT;
  });
  const [isDragging, setIsDragging] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<ChatInputRef>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number>(0);
  const dragStartHeight = useRef<number>(0);
  const currentHeightRef = useRef<number>(headerHeight);
  const { theme, toggleTheme } = useTheme();

  // Auto-scroll to bottom when messages change or when loading state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Keyboard shortcut: focus input when typing (if not disabled)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Ignore modifier keys alone
      if (
        e.key === "Control" ||
        e.key === "Alt" ||
        e.key === "Shift" ||
        e.key === "Meta" ||
        e.key === "Tab" ||
        e.key === "Escape"
      ) {
        return;
      }

      // Ignore if loading
      if (isLoading) {
        return;
      }

      // Focus input for any other key press
      inputRef.current?.focus();
    };

    window.addEventListener("keydown", handleKeyDown as any);
    return () => {
      window.removeEventListener("keydown", handleKeyDown as any);
    };
  }, [isLoading]);

  // Load session and history on mount
  useEffect(() => {
    const loadSession = async () => {
      try {
        const savedSessionId = storage.getSessionId();
        
        if (savedSessionId) {
          setSessionId(savedSessionId);
          
          // Load conversation history
          try {
            const history = await api.getHistory(savedSessionId);
            setMessages(history.messages);
          } catch (err) {
            console.error("Failed to load history:", err);
            // Continue with empty messages if history fails
          }
        }
      } catch (err) {
        console.error("Failed to load session:", err);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadSession();
  }, []);

  // Handle header resize drag
  const handleDragStart = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault();
    setIsDragging(true);
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    dragStartY.current = clientY;
    dragStartHeight.current = headerHeight;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  }, [headerHeight]);

  // Global mouse/touch event handlers for dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleDrag = (event: MouseEvent | TouchEvent) => {
      const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
      const deltaY = clientY - dragStartY.current;
      const newHeight = Math.max(
        MIN_HEADER_HEIGHT,
        Math.min(MAX_HEADER_HEIGHT, dragStartHeight.current + deltaY)
      );
      currentHeightRef.current = newHeight;
      setHeaderHeight(newHeight);
    };

    const handleDragEnd = () => {
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      // Save the current header height
      storage.setHeaderHeight(currentHeightRef.current);
    };

    window.addEventListener('mousemove', handleDrag);
    window.addEventListener('touchmove', handleDrag);
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchend', handleDragEnd);
    
    return () => {
      window.removeEventListener('mousemove', handleDrag);
      window.removeEventListener('touchmove', handleDrag);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging]);

  // Update ref when headerHeight changes
  useEffect(() => {
    currentHeightRef.current = headerHeight;
  }, [headerHeight]);

  // Save header height when it changes (debounced, only when not dragging)
  useEffect(() => {
    if (!isDragging) {
      const timeoutId = setTimeout(() => {
        storage.setHeaderHeight(headerHeight);
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [headerHeight, isDragging]);

  const handleSend = async (text: string) => {
    if (isLoading) return;

    // Add user message immediately for better UX
    const userMessage: Message = {
      sender: "user",
      text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setError(null);
    setIsLoading(true);

    try {
      const response = await api.sendMessage(text, sessionId || undefined);
      
      // Update session ID if we got a new one
      if (response.sessionId) {
        setSessionId(response.sessionId);
        storage.setSessionId(response.sessionId);
      }

      // Add AI reply
      const aiMessage: Message = {
        sender: "ai",
        text: response.reply,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to send message";
      setError(errorMessage);
      
      // Remove the user message if the request failed
      setMessages((prev) => prev.filter((m) => m !== userMessage));
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingHistory) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <motion.div
      className="flex flex-col h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 transition-colors"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <motion.header
        ref={headerRef}
        className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 px-6 shadow-sm relative overflow-hidden"
        style={{ height: `${headerHeight}px` }}
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 sm:gap-4 h-full">
          <div className="flex-1 min-w-0 pr-2 flex flex-col justify-center">
            <motion.h1
              className={`text-base sm:text-xl md:text-2xl lg:text-3xl font-bold leading-tight break-words ${
                theme === "light"
                  ? "bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600"
                  : "bg-gradient-to-r from-blue-400 via-blue-300 to-blue-400"
              } bg-clip-text text-transparent bg-[length:200%_auto]`}
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              E-commerce Support Chat
            </motion.h1>
            {headerHeight > 70 && (
              <motion.p
                className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                How can we help you today?
              </motion.p>
            )}
          </div>
          <motion.button
            onClick={toggleTheme}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className={`p-2 rounded-lg transition-colors ${
              theme === "light"
                ? "bg-white hover:bg-gray-200"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
            aria-label="Toggle theme"
          >
            <AnimatePresence mode="wait" initial={false}>
              {theme === "light" ? (
                <motion.div
                  key="moon"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Moon size={20} className="text-yellow-500" />
                </motion.div>
              ) : (
                <motion.div
                  key="sun"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Sun size={20} className="text-yellow-500" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
        
        {/* Drag Handle */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-3 cursor-row-resize flex items-center justify-center group hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors z-10"
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          whileHover={{ backgroundColor: theme === "light" ? "rgba(229, 231, 235, 0.5)" : "rgba(55, 65, 81, 0.5)" }}
        >
          <motion.div
            className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            animate={{ y: isDragging ? 0 : [0, -2, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <GripVertical 
              size={16} 
              className={`${theme === "light" ? "text-gray-400" : "text-gray-500"}`} 
            />
            <GripVertical 
              size={16} 
              className={`${theme === "light" ? "text-gray-400" : "text-gray-500"} -ml-2`} 
            />
          </motion.div>
        </motion.div>
      </motion.header>

      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-red-50/90 dark:bg-red-900/30 backdrop-blur-sm border-b border-red-200 dark:border-red-800/50 px-6 py-3 flex items-center gap-2 text-red-800 dark:text-red-200 max-w-4xl mx-auto w-full"
          >
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
            >
              <AlertCircle size={18} />
            </motion.div>
            <span className="flex-1">{error}</span>
            <motion.button
              onClick={() => setError(null)}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 transition-colors rounded-full p-1 hover:bg-red-100 dark:hover:bg-red-800/50"
              aria-label="Dismiss error"
            >
              ×
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Container */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 scroll-smooth relative"
      >
        {/* Animated background waves */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
          <motion.div
            className="absolute top-0 left-0 w-full h-full opacity-5 dark:opacity-10"
            animate={{
              background: [
                "radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.3) 0%, transparent 50%)",
                "radial-gradient(circle at 80% 50%, rgba(59, 130, 246, 0.3) 0%, transparent 50%)",
                "radial-gradient(circle at 50% 20%, rgba(59, 130, 246, 0.3) 0%, transparent 50%)",
                "radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.3) 0%, transparent 50%)",
              ],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        </div>

        {messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-center h-full"
          >
            <div className="text-center text-gray-500 dark:text-gray-400 max-w-md">
              <motion.div
                className="mb-4"
                animate={{
                  y: [0, -10, 0],
                  rotate: [0, 5, -5, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <MessageCircle size={32} className="text-white" />
                </div>
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-xl font-semibold mb-2"
              >
                Start a conversation
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-sm"
              >
                Ask about shipping, returns, or any other questions!
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-xs mt-4 text-gray-400 dark:text-gray-500"
              >
                Tip: Start typing anywhere to focus the input
              </motion.p>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-1">
            <AnimatePresence>
              {messages.map((message, index) => (
                <motion.div
                  key={`${message.timestamp}-${index}`}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.05,
                    ease: "easeOut",
                  }}
                >
                  <ChatMessage message={message} />
                </motion.div>
              ))}
              {isLoading && (
                <TypingIndicator />
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput ref={inputRef} onSend={handleSend} disabled={isLoading} />
    </motion.div>
  );
}

export default App;

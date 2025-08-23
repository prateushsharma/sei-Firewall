// src/components/chat/ChatWidget.tsx
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, X, Bot, User, Zap } from 'lucide-react';
import { toast } from 'react-hot-toast';
import './ChatWidget.css';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  type?: 'text' | 'command' | 'result';
}

interface QuickAction {
  label: string;
  command: string;
  icon: React.ReactNode;
}

const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hello! I\'m your Sei blockchain assistant. I can help you explore transactions, check balances, get token information, and more. What would you like to know?',
      sender: 'bot',
      timestamp: new Date(),
      type: 'text'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const quickActions: QuickAction[] = [
    {
      label: 'Get SEI Price',
      command: 'What is the current SEI price?',
      icon: <Zap size={16} />
    },
    {
      label: 'Network Status',
      command: 'Show me the network status',
      icon: <Bot size={16} />
    },
    {
      label: 'Latest Block',
      command: 'Get the latest block information',
      icon: <MessageCircle size={16} />
    }
  ];

  // Mock MCP server integration - replace with real MCP client
  const sendToMCPServer = async (message: string): Promise<string> => {
    // For real implementation, replace this with actual MCP client calls
    // Example: const response = await mcpClient.callTool('get_token_info', { query: message });
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // Mock responses based on message content
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('price') || lowerMessage.includes('sei')) {
      return `The current SEI price is $0.4287 (+5.2% in 24h). Market cap: $892M, Volume: $2.4M`;
    } else if (lowerMessage.includes('network') || lowerMessage.includes('status')) {
      return `Network Status: ✅ Online\nBlock Height: 15,847,293\nTPS: 18,420\nFinality: 380ms\nValidators: 127 active`;
    } else if (lowerMessage.includes('block') || lowerMessage.includes('latest')) {
      return `Latest Block #15,847,293:\n• Timestamp: ${new Date().toLocaleString()}\n• Transactions: 1,247\n• Gas Used: 67.8%\n• Block Size: 2.4MB`;
    } else if (lowerMessage.includes('balance')) {
      return `To check a balance, please provide an address. Example: "Check balance of sei1abcd..."`;
    } else if (lowerMessage.includes('token')) {
      return `Available tokens on Sei:\n• SEI (Native)\n• USDC: 0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1\n• WETH: 0xE30feDd158A2e3b13e9badaeABaFc5516e963441\nProvide a token address for detailed info.`;
    } else if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return `Hello! I'm here to help you with Sei blockchain queries. What would you like to know?`;
    } else {
      return `I can help you with:\n• Token prices and info\n• Balance checks\n• Network status\n• Block information\n• Transaction details\n\nTry asking "What is the SEI price?" or use the quick actions below.`;
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSendMessage = async (content: string = inputValue) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: content.trim(),
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await sendToMCPServer(content);
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response,
        sender: 'bot',
        timestamp: new Date(),
        type: 'result'
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      toast.error('Failed to get response. Please try again.');
      console.error('Chat error:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: 'Sorry, I encountered an error. Please try again or check if the MCP server is running.',
        sender: 'bot',
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (command: string) => {
    handleSendMessage(command);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <motion.button
        className={`chat-toggle ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={{ 
          rotate: isOpen ? 180 : 0,
          backgroundColor: isOpen ? '#dc2626' : '#ffd700'
        }}
        transition={{ duration: 0.3 }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X size={24} />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <MessageCircle size={24} />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Notification dot */}
        {!isOpen && (
          <motion.div 
            className="notification-dot"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="chat-widget"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {/* Header */}
            <div className="chat-header">
              <div className="chat-header-info">
                <div className="bot-avatar">
                  <Bot size={20} />
                </div>
                <div>
                  <h3 className="chat-title">Sei Assistant</h3>
                  <div className="chat-status">
                    <div className="status-dot online" />
                    <span>Online</span>
                  </div>
                </div>
              </div>
              <motion.button
                className="chat-close"
                onClick={() => setIsOpen(false)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X size={18} />
              </motion.button>
            </div>

            {/* Messages */}
            <div className="chat-messages">
              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    className={`message ${message.sender}`}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="message-avatar">
                      {message.sender === 'user' ? (
                        <User size={16} />
                      ) : (
                        <Bot size={16} />
                      )}
                    </div>
                    <div className="message-content">
                      <div className="message-text">
                        {message.content.split('\n').map((line, index) => (
                          <React.Fragment key={index}>
                            {line}
                            {index < message.content.split('\n').length - 1 && <br />}
                          </React.Fragment>
                        ))}
                      </div>
                      <div className="message-time">
                        {message.timestamp.toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Loading indicator */}
              {isLoading && (
                <motion.div
                  className="message bot"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="message-avatar">
                    <Bot size={16} />
                  </div>
                  <div className="message-content">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions - Only show when there's just the welcome message */}
            {messages.length === 1 && !isLoading && (
              <motion.div
                className="quick-actions"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <span className="quick-actions-label">Quick actions:</span>
                <div className="quick-actions-grid">
                  {quickActions.map((action, index) => (
                    <motion.button
                      key={action.label}
                      className="quick-action-btn"
                      onClick={() => handleQuickAction(action.command)}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {action.icon}
                      <span>{action.label}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Input */}
            <div className="chat-input-container">
              <div className="chat-input-wrapper">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Ask about tokens, balances, network..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="chat-input"
                  disabled={isLoading}
                />
                <motion.button
                  className={`send-btn ${inputValue.trim() && !isLoading ? 'active' : ''}`}
                  onClick={() => handleSendMessage()}
                  disabled={!inputValue.trim() || isLoading}
                  whileHover={{ scale: inputValue.trim() && !isLoading ? 1.1 : 1 }}
                  whileTap={{ scale: inputValue.trim() && !isLoading ? 0.9 : 1 }}
                  animate={{ 
                    backgroundColor: inputValue.trim() && !isLoading ? '#dc2626' : '#374151',
                    color: inputValue.trim() && !isLoading ? '#fff' : '#9ca3af'
                  }}
                >
                  <Send size={16} />
                </motion.button>
              </div>
              <div className="chat-footer">
                <span>Powered by Sei MCP Server</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatWidget;
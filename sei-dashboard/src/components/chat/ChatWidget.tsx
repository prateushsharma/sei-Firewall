// File Location: ~/sei-Firewall/sei-dashboard/src/components/chat/ChatWidget.tsx

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  X, 
  Send, 
  Bot, 
  User,
  Minimize2,
  Maximize2,
  Zap,
  TrendingUp,
  Search
} from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  type?: 'text' | 'command' | 'result';
}

const quickCommands = [
  { label: 'Get SEI Price', command: 'get token price SEI', icon: TrendingUp },
  { label: 'Latest Block', command: 'get latest block', icon: Zap },
  { label: 'Search Token', command: 'search token', icon: Search },
];

export const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! I\'m your Sei blockchain assistant. Ask me about tokens, transactions, or network stats!',
      sender: 'bot',
      timestamp: new Date(),
      type: 'text'
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!message.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: message,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setIsTyping(true);

    // Simulate API call to your MCP server
    setTimeout(() => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: generateBotResponse(message),
        sender: 'bot',
        timestamp: new Date(),
        type: 'result'
      };
      
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const generateBotResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();
    
    if (input.includes('price') || input.includes('sei')) {
      return '💰 SEI Current Price: $0.4231 (+5.32% 24h)\n📊 Market Cap: $1.2B\n📈 24h Volume: $12.4M';
    }
    
    if (input.includes('block') || input.includes('latest')) {
      return '🧱 Latest Block: #2,847,392\n⏱️ Block Time: 12.3s\n⛽ Gas Price: 0.025 SEI';
    }
    
    if (input.includes('token') && input.includes('search')) {
      return '🔍 Popular tokens on Sei:\n• USDC - $1.00 (+0.02%)\n• WETH - $1,650.25 (-2.34%)\n• WBTC - $26,800.00 (+1.23%)\n\nTry: "get token info 0x3894085ef7ff0f0aedf52e2a2704928d1ec074f1"';
    }
    
    if (input.includes('help')) {
      return '🤖 Available commands:\n• Get token price/info\n• Check latest block\n• Search transactions\n• Network statistics\n• Token balances\n\nExample: "get balance 0x..."';
    }
    
    return '🤔 I can help you with blockchain data! Try asking about:\n• Token prices and info\n• Block and transaction data\n• Network statistics\n• Address balances\n\nType "help" for more commands.';
  };

  const handleQuickCommand = (command: string) => {
    setMessage(command);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) {
    return (
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-sei-gradient rounded-full flex items-center justify-center shadow-2xl z-50 group"
      >
        <MessageCircle className="w-6 h-6 text-white group-hover:animate-bounce" />
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-sei-gold rounded-full animate-pulse" />
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 100, scale: 0.8 }}
      animate={{ 
        opacity: 1, 
        y: 0, 
        scale: 1,
        height: isMinimized ? 'auto' : '500px'
      }}
      className="fixed bottom-6 right-6 w-96 glass-card rounded-2xl shadow-2xl z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="bg-sei-gradient p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Sei Assistant</h3>
            <p className="text-xs text-white/80">Always online</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-white/10 rounded"
          >
            {isMinimized ? (
              <Maximize2 className="w-4 h-4 text-white" />
            ) : (
              <Minimize2 className="w-4 h-4 text-white" />
            )}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-white/10 rounded"
          >
            <X className="w-4 h-4 text-white" />
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {!isMinimized && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="flex flex-col h-96"
          >
            {/* Messages */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-start space-x-2 max-w-xs ${
                    msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                  }`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      msg.sender === 'user' 
                        ? 'bg-sei-500' 
                        : 'bg-sei-gold'
                    }`}>
                      {msg.sender === 'user' ? (
                        <User className="w-3 h-3 text-white" />
                      ) : (
                        <Bot className="w-3 h-3 text-white" />
                      )}
                    </div>
                    
                    <div className={`p-3 rounded-2xl ${
                      msg.sender === 'user'
                        ? 'bg-sei-500 text-white'
                        : 'bg-white/10 text-white'
                    }`}>
                      <p className="text-sm whitespace-pre-line">{msg.text}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {msg.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {/* Typing Indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="flex items-start space-x-2">
                    <div className="w-6 h-6 bg-sei-gold rounded-full flex items-center justify-center">
                      <Bot className="w-3 h-3 text-white" />
                    </div>
                    <div className="bg-white/10 p-3 rounded-2xl">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Commands */}
            <div className="px-4 py-2 border-t border-white/10">
              <div className="flex space-x-2 mb-3">
                {quickCommands.map((cmd) => {
                  const Icon = cmd.icon;
                  return (
                    <motion.button
                      key={cmd.command}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleQuickCommand(cmd.command)}
                      className="flex items-center space-x-1 px-3 py-1 bg-white/10 rounded-full text-xs text-white hover:bg-white/20 transition-colors"
                    >
                      <Icon className="w-3 h-3" />
                      <span>{cmd.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/10">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about tokens, blocks, or transactions..."
                  className="flex-1 px-3 py-2 bg-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-sei-500 text-white placeholder-gray-400 text-sm"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={sendMessage}
                  disabled={!message.trim() || isTyping}
                  className="p-2 bg-sei-gradient rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4 text-white" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
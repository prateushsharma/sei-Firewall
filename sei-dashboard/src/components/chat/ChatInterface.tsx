// src/components/chat/ChatInterface.tsx
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Bot, 
  User, 
  Zap, 
  DollarSign, 
  Activity, 
  Search,
  TrendingUp,
  Globe,
  Wallet,
  BarChart3,
  Coins,
  ArrowRight,
  Sparkles,
  Shield,
  Clock,
  PieChart,
  Target,
  Layers,
  Image,
  LineChart,
  CandlestickChart,
  Users,
  Building2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import './ChatInterface.css';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  type?: 'text' | 'command' | 'result' | 'error';
  isTyping?: boolean;
}

interface ExamplePrompt {
  id: string;
  title: string;
  description: string;
  prompt: string;
  icon: React.ReactNode;
  category: 'analysis' | 'nft' | 'defi' | 'trading';
}

interface Capability {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const capabilities: Capability[] = [
    {
      title: "Token Analytics",
      description: "Deep dive analysis of any token including price trends, volume patterns, holder distribution, and market sentiment",
      icon: <BarChart3 size={20} />,
      color: "#dc2626"
    },
    {
      title: "NFT Lifecycle Analysis", 
      description: "Complete NFT journey tracking from mint to current state, including ownership history, price evolution, and rarity analysis",
      icon: <Image size={20} />,
      color: "#8b5cf6"
    },
    {
      title: "Wallet Analysis",
      description: "Comprehensive wallet profiling including portfolio composition, trading patterns, profit/loss analysis, and risk assessment",
      icon: <Wallet size={20} />,
      color: "#10b981"
    },
    {
      title: "DeFi Protocol Analysis",
      description: "Protocol health metrics, TVL analysis, yield opportunities, smart contract risks, and governance insights",
      icon: <Building2 size={20} />,
      color: "#f59e0b"
    },
    {
      title: "Network Health Monitoring",
      description: "Real-time network performance, validator status, gas optimization, and congestion analysis",
      icon: <Globe size={20} />,
      color: "#3b82f6"
    },
    {
      title: "Trading Insights",
      description: "Technical analysis, support/resistance levels, market indicators, and optimal entry/exit strategies",
      icon: <CandlestickChart size={20} />,
      color: "#ec4899"
    }
  ];

  const examplePrompts: ExamplePrompt[] = [
    {
      id: 'nft-analysis',
      title: "Analyze NFT Collection",
      description: "Get detailed insights about any NFT collection's performance and trends",
      prompt: "Analyze the floor price trends, trading volume, and holder distribution for the top NFT collections on Sei. Show me which collections have the strongest communities.",
      icon: <Image size={18} />,
      category: 'nft'
    },
    {
      id: 'token-deep-dive',
      title: "Token Deep Analysis",
      description: "Comprehensive token analysis including fundamentals and technicals",
      prompt: "Perform a deep analysis of SEI token including price action, market cap changes, holder behavior, and compare it with other Layer 1 tokens.",
      icon: <LineChart size={18} />,
      category: 'analysis'
    },
    {
      id: 'wallet-profile',
      title: "Wallet Portfolio Review",
      description: "Analyze any wallet's complete portfolio and trading history",
      prompt: "Analyze wallet sei1xyz... Show me the portfolio composition, biggest wins/losses, trading frequency, and risk profile of this address.",
      icon: <PieChart size={18} />,
      category: 'analysis'
    },
    {
      id: 'defi-opportunities',
      title: "DeFi Yield Farming",
      description: "Find the best yield opportunities across Sei DeFi protocols",
      prompt: "Show me the highest yielding opportunities on Sei DeFi protocols. Include APY, risks, impermanent loss potential, and liquidity requirements.",
      icon: <Target size={18} />,
      category: 'defi'
    },
    {
      id: 'market-sentiment',
      title: "Market Sentiment Analysis",
      description: "Analyze current market sentiment and social indicators",
      prompt: "What's the current sentiment around Sei ecosystem? Analyze social media buzz, developer activity, and institutional interest.",
      icon: <TrendingUp size={18} />,
      category: 'analysis'
    },
    {
      id: 'gas-optimization',
      title: "Gas Fee Optimization",
      description: "Get strategies to optimize transaction costs",
      prompt: "Help me optimize gas fees for my transactions. When are the best times to transact and what strategies can reduce my costs?",
      icon: <Zap size={18} />,
      category: 'trading'
    }
  ];

  const quickActions = [
    { label: "SEI Price", query: "What's the current SEI price and recent performance?" },
    { label: "Network Status", query: "Show me the current Sei network health and performance metrics" },
    { label: "Top Gainers", query: "What are the top performing tokens on Sei today?" },
    { label: "Gas Tracker", query: "What are the current gas prices and network congestion?" }
  ];

  // Mock MCP server integration with more detailed responses
  const sendToMCPServer = async (message: string): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000));
    
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('nft') && lowerMessage.includes('analyz')) {
      return `🖼️ **NFT Collection Analysis**\n\n**Top Collections on Sei:**\n\n1. **Sei Punks** 📈\n   • Floor Price: 12.5 SEI (+8.2%)\n   • 24h Volume: 1,247 SEI\n   • Holders: 3,492\n   • Community Score: 94/100\n\n2. **Sei Dragons** 🐉\n   • Floor Price: 8.7 SEI (+15.3%)\n   • 24h Volume: 892 SEI\n   • Holders: 2,156\n   • Community Score: 87/100\n\n**Key Insights:**\n✅ Growing holder base (+12% this week)\n📊 Volume trending upward\n🚀 New collections launching daily\n💎 Strong diamond hands ratio: 78%`;
    } else if (lowerMessage.includes('token') && lowerMessage.includes('analyz')) {
      return `📊 **SEI Token Deep Analysis**\n\n**Price & Performance:**\n💰 Current Price: $0.4287 (+5.2%)\n📈 Market Cap: $892M (Rank #84)\n💹 24h Volume: $2.4M\n🔥 ATH: $0.91 (53% below)\n\n**Technical Analysis:**\n🎯 Resistance: $0.45, $0.52\n🛡️ Support: $0.38, $0.32\n📊 RSI: 58.2 (Neutral)\n📈 MACD: Bullish crossover\n\n**On-Chain Metrics:**\n👥 Active Addresses: +18.7%\n💳 Transaction Count: 1.2M (24h)\n🔄 Avg Fee: $0.001\n⚡ TPS: 20,000+\n\n**Vs Layer 1 Competitors:**\n🥇 Fastest finality (600ms)\n🥈 Lowest fees\n🥉 Growing ecosystem`;
    } else if (lowerMessage.includes('wallet') && lowerMessage.includes('analyz')) {
      return `👛 **Wallet Portfolio Analysis**\n\n**Portfolio Overview:**\n💼 Total Value: $24,567\n📊 Token Count: 12\n🏆 P&L: +$4,231 (+20.8%)\n⭐ Risk Score: Medium\n\n**Top Holdings:**\n1. SEI: $12,400 (50.5%)\n2. USDC: $6,200 (25.2%)\n3. DRAGON: $3,100 (12.6%)\n4. WETH: $2,867 (11.7%)\n\n**Trading Profile:**\n📅 First Transaction: 180 days ago\n🔄 Total Transactions: 847\n📈 Win Rate: 67%\n💎 Hold Time Avg: 45 days\n\n**Behavior Analysis:**\n✅ Diversified portfolio\n⚠️ High activity trader\n💪 Strong in bull markets\n🎯 DeFi power user`;
    } else if (lowerMessage.includes('defi') || lowerMessage.includes('yield')) {
      return `🌾 **Sei DeFi Yield Opportunities**\n\n**Top Yields Available:**\n\n1. **SEI-USDC LP** 🏆\n   • APY: 24.7%\n   • TVL: $2.1M\n   • Risk: Low\n   • IL Risk: 5.2%\n\n2. **Dragon Staking** 🐉\n   • APY: 89.3%\n   • Lock Period: 30 days\n   • Risk: Medium\n   • Auto-compound: Yes\n\n3. **Lending Protocol**\n   • Supply APY: 12.4%\n   • Borrow APY: 8.7%\n   • Utilization: 76%\n   • Risk: Low\n\n**Strategy Recommendations:**\n💡 Balanced: 60% SEI-USDC LP + 40% Lending\n🚀 Aggressive: 70% Dragon staking + 30% LP\n🛡️ Conservative: 80% Lending + 20% Staking`;
    } else if (lowerMessage.includes('sentiment')) {
      return `📊 **Sei Ecosystem Sentiment Analysis**\n\n**Overall Sentiment: BULLISH** 📈\n\n**Social Metrics:**\n🐦 Twitter Mentions: +45% (week)\n💬 Discord Activity: Very High\n📺 YouTube Content: +67%\n📰 News Sentiment: 78% Positive\n\n**Developer Activity:**\n👨‍💻 GitHub Commits: +23%\n🏗️ New Projects: 12 this month\n💼 Job Postings: +156%\n🤝 Partnerships: 3 major announcements\n\n**Institutional Interest:**\n📈 Wallet Holdings >$1M: +8\n🏦 Exchange Listings: 2 new\n💰 VC Investments: $15M raised\n📊 Analyst Coverage: 5 new reports\n\n**Community Health:**\n👥 Active Users: 94,000\n🔥 Engagement Rate: 12.4%\n💎 Diamond Hands: 82%`;
    } else if (lowerMessage.includes('gas') || lowerMessage.includes('fee')) {
      return `⛽ **Gas Optimization Guide**\n\n**Current Network State:**\n🚀 Fast: 0.015 SEI (~30s)\n⚡ Standard: 0.012 SEI (~1m)\n🐌 Slow: 0.008 SEI (~3m)\n\n**Best Times to Transact:**\n🌙 2-6 AM UTC: Lowest fees\n🌅 6-10 AM UTC: Moderate\n🌞 10 AM-8 PM UTC: Peak hours\n🌆 8 PM-2 AM UTC: Declining\n\n**Optimization Strategies:**\n📦 Batch transactions when possible\n⏰ Use off-peak hours\n🎯 Set custom gas prices\n🔄 Use DEX aggregators\n💡 Consider transaction timing\n\n**Weekly Pattern:**\n📊 Mon-Wed: Lower fees\n📈 Thu-Fri: Higher activity\n📉 Weekend: Variable\n\n**Pro Tips:**\n✅ Monitor mempool before trading\n✅ Use gas trackers for timing\n✅ Consider layer 2 solutions`;
    } else if (lowerMessage.includes('price') || lowerMessage.includes('sei')) {
      return `💰 **SEI Price Analysis**\n\n**Current Metrics:**\n🏷️ Price: $0.4287\n📈 24h Change: +5.2%\n📊 Volume: $2.4M\n🧢 Market Cap: $892M\n\n**Technical Indicators:**\n📈 Trend: Bullish\n🎯 Next Resistance: $0.45\n🛡️ Support Level: $0.38\n⚡ Momentum: Strong\n\n**Market Comparison:**\n🥇 vs BTC: +2.1%\n🥈 vs ETH: +1.8%\n🏆 vs Layer 1s: Outperforming\n\n**Key Levels:**\n🎯 Target 1: $0.45 (+5%)\n🚀 Target 2: $0.52 (+21%)\n📊 Stop Loss: $0.38 (-11%)`;
    } else {
      return `🤖 **Sei Blockchain Assistant**\n\nI can help you with:\n\n**🔍 Analytics & Research:**\n• Token deep-dive analysis\n• NFT collection insights\n• Wallet portfolio review\n• Market sentiment analysis\n\n**💹 Trading & DeFi:**\n• Yield farming opportunities\n• Gas fee optimization\n• Price predictions\n• Risk assessment\n\n**📊 Network & Data:**\n• Network health monitoring\n• Transaction analysis\n• Validator information\n• Protocol comparisons\n\nTry asking: "Analyze SEI token performance" or "What are the best yield opportunities?"`;
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!showWelcome && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showWelcome]);

  const handleSendMessage = async (content: string = inputValue) => {
    if (!content.trim()) return;
    
    setShowWelcome(false);

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
      toast.error('Failed to get response');
      
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: '❌ Sorry, I encountered an error. Please try again.',
        sender: 'bot',
        timestamp: new Date(),
        type: 'error'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = (prompt: string) => {
    setInputValue(prompt);
    handleSendMessage(prompt);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="blockchain-chat-interface">
      {showWelcome ? (
        <motion.div 
          className="welcome-screen"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Header */}
          <div className="welcome-header">
            <motion.div 
              className="sei-logo"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <div className="logo-icon">
                <Sparkles size={32} />
              </div>
              <h1 className="logo-title">
                Sei Blockchain
                <span className="logo-accent">Assistant</span>
              </h1>
            </motion.div>
            
            <motion.p 
              className="welcome-subtitle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Your AI-powered companion for Sei blockchain analysis, DeFi strategies, and market insights
            </motion.p>
          </div>

          {/* Capabilities */}
          <motion.div 
            className="capabilities-section"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <h2 className="section-title">What I Can Do</h2>
            <div className="capabilities-grid">
              {capabilities.map((capability, index) => (
                <motion.div
                  key={capability.title}
                  className="capability-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + index * 0.1 }}
                  whileHover={{ scale: 1.02, rotateY: 5 }}
                >
                  <div className="capability-icon" style={{ color: capability.color }}>
                    {capability.icon}
                  </div>
                  <h3 className="capability-title">{capability.title}</h3>
                  <p className="capability-description">{capability.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Example Prompts */}
          <motion.div 
            className="examples-section"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
          >
            <h2 className="section-title">Try These Examples</h2>
            <div className="examples-grid">
              {examplePrompts.map((example, index) => (
                <motion.button
                  key={example.id}
                  className="example-card"
                  onClick={() => handleExampleClick(example.prompt)}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.2 + index * 0.1 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="example-header">
                    <div className="example-icon">{example.icon}</div>
                    <ArrowRight className="example-arrow" size={16} />
                  </div>
                  <h4 className="example-title">{example.title}</h4>
                  <p className="example-description">{example.description}</p>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div 
            className="quick-actions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4 }}
          >
            <p className="quick-actions-label">Quick Actions:</p>
            <div className="quick-actions-buttons">
              {quickActions.map((action, index) => (
                <motion.button
                  key={action.label}
                  className="quick-action-btn"
                  onClick={() => handleExampleClick(action.query)}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.5 + index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {action.label}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      ) : (
        <div className="chat-area">
          {/* Messages */}
          <div className="messages-container">
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  className={`message-wrapper ${message.sender}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="message-avatar">
                    {message.sender === 'user' ? (
                      <User size={20} />
                    ) : (
                      <Bot size={20} />
                    )}
                  </div>
                  <div className="message-content">
                    <div className={`message-bubble ${message.type}`}>
                      <div className="message-text">
                        {message.content.split('\n').map((line, index) => (
                          <React.Fragment key={index}>
                            {line}
                            {index < message.content.split('\n').length - 1 && <br />}
                          </React.Fragment>
                        ))}
                      </div>
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
                className="message-wrapper bot"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="message-avatar">
                  <Bot size={20} />
                </div>
                <div className="message-content">
                  <div className="message-bubble">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="input-section">
        <div className="input-container">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={showWelcome ? "Ask me about Sei blockchain, DeFi, NFTs, token analysis..." : "Continue the conversation..."}
            className="message-input"
            disabled={isLoading}
            rows={1}
          />
          <motion.button
            className={`send-button ${inputValue.trim() && !isLoading ? 'active' : ''}`}
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isLoading}
            whileHover={{ scale: inputValue.trim() && !isLoading ? 1.05 : 1 }}
            whileTap={{ scale: inputValue.trim() && !isLoading ? 0.95 : 1 }}
          >
            <Send size={20} />
          </motion.button>
        </div>
        
        <div className="input-footer">
          <p className="input-hint">
            Press Enter to send • Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
// src/components/dashboard/TokenExplorer.tsx
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, TrendingUp, TrendingDown, Copy, ExternalLink, Star, Filter } from 'lucide-react';
import { toast } from 'react-hot-toast';
import './TokenExplorer.css';

interface Token {
  id: string;
  symbol: string;
  name: string;
  address: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  holders: number;
  logo?: string;
  isVerified: boolean;
  category: 'defi' | 'nft' | 'gaming' | 'meme' | 'utility';
}

const TokenExplorer: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Mock token data
  const tokens: Token[] = [
    {
      id: 'sei',
      symbol: 'SEI',
      name: 'Sei Network',
      address: '0x0000000000000000000000000000000000000000',
      price: 0.4287,
      change24h: 5.2,
      volume24h: 2400000,
      marketCap: 892000000,
      holders: 47200,
      isVerified: true,
      category: 'utility'
    },
    {
      id: 'usdc',
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1',
      price: 1.0001,
      change24h: 0.01,
      volume24h: 1800000,
      marketCap: 45000000000,
      holders: 12500,
      isVerified: true,
      category: 'defi'
    },
    {
      id: 'weth',
      symbol: 'WETH',
      name: 'Wrapped Ethereum',
      address: '0xE30feDd158A2e3b13e9badaeABaFc5516e963441',
      price: 3421.50,
      change24h: -2.8,
      volume24h: 950000,
      marketCap: 4120000000,
      holders: 8900,
      isVerified: true,
      category: 'defi'
    },
    {
      id: 'dragon',
      symbol: 'DRAGON',
      name: 'DragonSei',
      address: '0xabcdef1234567890123456789012345678901234',
      price: 0.0842,
      change24h: 18.9,
      volume24h: 340000,
      marketCap: 8420000,
      holders: 3200,
      isVerified: true,
      category: 'gaming'
    },
    {
      id: 'seinft',
      symbol: 'SNFT',
      name: 'Sei NFT Token',
      address: '0x1234567890123456789012345678901234567890',
      price: 2.45,
      change24h: 12.4,
      volume24h: 180000,
      marketCap: 2450000,
      holders: 1800,
      isVerified: false,
      category: 'nft'
    },
    {
      id: 'seicat',
      symbol: 'SCAT',
      name: 'Sei Cat',
      address: '0x9876543210987654321098765432109876543210',
      price: 0.00001234,
      change24h: -45.2,
      volume24h: 890000,
      marketCap: 123400,
      holders: 15600,
      isVerified: false,
      category: 'meme'
    }
  ];

  const filters = [
    { id: 'all', label: 'All Tokens', count: tokens.length },
    { id: 'defi', label: 'DeFi', count: tokens.filter(t => t.category === 'defi').length },
    { id: 'nft', label: 'NFT', count: tokens.filter(t => t.category === 'nft').length },
    { id: 'gaming', label: 'Gaming', count: tokens.filter(t => t.category === 'gaming').length },
    { id: 'meme', label: 'Meme', count: tokens.filter(t => t.category === 'meme').length },
    { id: 'favorites', label: 'Favorites', count: favorites.length }
  ];

  const filteredTokens = tokens.filter(token => {
    const matchesSearch = searchQuery === '' || 
      token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.address.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = selectedFilter === 'all' || 
      token.category === selectedFilter ||
      (selectedFilter === 'favorites' && favorites.includes(token.id));

    return matchesSearch && matchesFilter;
  });

  const toggleFavorite = (tokenId: string) => {
    setFavorites(prev => {
      if (prev.includes(tokenId)) {
        toast.success('Removed from favorites');
        return prev.filter(id => id !== tokenId);
      } else {
        toast.success('Added to favorites');
        return [...prev, tokenId];
      }
    });
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast.success('Address copied to clipboard!');
  };

  const formatNumber = (num: number): string => {
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  const formatPrice = (price: number): string => {
    if (price < 0.01) return `$${price.toFixed(6)}`;
    if (price < 1) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(2)}`;
  };

  const getCategoryColor = (category: string): string => {
    const colors = {
      defi: '#10b981',
      nft: '#8b5cf6',
      gaming: '#f59e0b',
      meme: '#ef4444',
      utility: '#3b82f6'
    };
    return colors[category as keyof typeof colors] || '#6b7280';
  };

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  return (
    <section className="token-explorer">
      <motion.div
        className="explorer-header"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="header-content">
          <h2 className="explorer-title">
            <span className="title-gradient">Token</span> Explorer
          </h2>
          <p className="explorer-subtitle">
            Discover and analyze tokens on the Sei blockchain
          </p>
        </div>

        {/* Search */}
        <motion.div 
          className="search-section"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="search-container">
            <Search className="search-icon" size={18} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search tokens by name, symbol, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </motion.div>
      </motion.div>

      {/* Filters */}
      <motion.div
        className="filter-tabs"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        {filters.map((filter) => (
          <motion.button
            key={filter.id}
            className={`filter-tab ${selectedFilter === filter.id ? 'active' : ''}`}
            onClick={() => setSelectedFilter(filter.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span>{filter.label}</span>
            <span className="filter-count">{filter.count}</span>
          </motion.button>
        ))}
      </motion.div>

      {/* Token List */}
      <motion.div className="token-list" layout>
        <AnimatePresence mode="popLayout">
          {filteredTokens.map((token, index) => (
            <motion.div
              key={token.id}
              className="token-card glass-card"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ 
                duration: 0.4, 
                delay: index * 0.05,
                layout: { duration: 0.3 } 
              }}
              whileHover={{ 
                scale: 1.02, 
                rotateY: 2,
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
              }}
              layout
            >
              <div className="token-header">
                <div className="token-info">
                  <div className="token-avatar">
                    <div 
                      className="avatar-bg"
                      style={{ background: getCategoryColor(token.category) }}
                    >
                      {token.symbol.slice(0, 2)}
                    </div>
                    {token.isVerified && (
                      <div className="verified-badge">✓</div>
                    )}
                  </div>
                  <div className="token-details">
                    <h3 className="token-name">{token.name}</h3>
                    <div className="token-meta">
                      <span className="token-symbol">{token.symbol}</span>
                      <span 
                        className="token-category"
                        style={{ color: getCategoryColor(token.category) }}
                      >
                        {token.category.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="token-actions">
                  <motion.button
                    className={`favorite-btn ${favorites.includes(token.id) ? 'active' : ''}`}
                    onClick={() => toggleFavorite(token.id)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Star size={16} fill={favorites.includes(token.id) ? 'currentColor' : 'none'} />
                  </motion.button>
                </div>
              </div>

              <div className="token-metrics">
                <div className="metric-row">
                  <div className="metric">
                    <span className="metric-label">Price</span>
                    <span className="metric-value price">
                      {formatPrice(token.price)}
                    </span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">24h Change</span>
                    <span className={`metric-value change ${token.change24h >= 0 ? 'positive' : 'negative'}`}>
                      {token.change24h >= 0 ? (
                        <TrendingUp size={12} />
                      ) : (
                        <TrendingDown size={12} />
                      )}
                      {Math.abs(token.change24h).toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="metric-row">
                  <div className="metric">
                    <span className="metric-label">Volume 24h</span>
                    <span className="metric-value">
                      {formatNumber(token.volume24h)}
                    </span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Market Cap</span>
                    <span className="metric-value">
                      {formatNumber(token.marketCap)}
                    </span>
                  </div>
                </div>

                <div className="metric-row">
                  <div className="metric">
                    <span className="metric-label">Holders</span>
                    <span className="metric-value">
                      {token.holders.toLocaleString()}
                    </span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Contract</span>
                    <div className="contract-actions">
                      <span className="contract-address">
                        {`${token.address.slice(0, 6)}...${token.address.slice(-4)}`}
                      </span>
                      <motion.button
                        className="copy-btn"
                        onClick={() => copyAddress(token.address)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Copy size={12} />
                      </motion.button>
                      <motion.button
                        className="external-btn"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <ExternalLink size={12} />
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>

              <div 
                className="token-glow"
                style={{ background: `${getCategoryColor(token.category)}15` }}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Empty State */}
      {filteredTokens.length === 0 && (
        <motion.div
          className="empty-state"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="empty-icon">
            <Search size={48} />
          </div>
          <h3 className="empty-title">No tokens found</h3>
          <p className="empty-description">
            {searchQuery ? 
              `No tokens match "${searchQuery}". Try adjusting your search.` :
              `No tokens in the ${selectedFilter} category.`
            }
          </p>
          {searchQuery && (
            <motion.button
              className="clear-search-btn"
              onClick={() => setSearchQuery('')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Clear Search
            </motion.button>
          )}
        </motion.div>
      )}

      {/* Loading State */}
      {isLoading && (
        <motion.div
          className="loading-state"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="loading-spinner" />
          <p>Loading tokens...</p>
        </motion.div>
      )}
    </section>
  );
};

export default TokenExplorer;
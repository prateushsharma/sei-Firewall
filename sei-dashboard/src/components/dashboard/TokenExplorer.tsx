// File Location: ~/sei-Firewall/sei-dashboard/src/components/dashboard/TokenExplorer.tsx

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  ExternalLink,
  Copy,
  Star,
  Filter,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Token {
  address: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  holders: number;
  icon: string;
}

const mockTokens: Token[] = [
  {
    address: '0x3894085ef7ff0f0aedf52e2a2704928d1ec074f1',
    symbol: 'USDC',
    name: 'USD Coin',
    price: 1.00,
    change24h: 0.02,
    volume24h: 2150000,
    marketCap: 32000000000,
    holders: 12450,
    icon: '💲'
  },
  {
    address: '0x7b79995e5f793a07bc00c21412e50ecae098e7f9',
    symbol: 'WETH',
    name: 'Wrapped Ethereum', 
    price: 1650.25,
    change24h: -2.34,
    volume24h: 1850000,
    marketCap: 19800000000,
    holders: 8920,
    icon: '⟠'
  },
  {
    address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    price: 26800.00,
    change24h: 1.23,
    volume24h: 980000,
    marketCap: 4200000000,
    holders: 5670,
    icon: '₿'
  }
];

export const TokenExplorer: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  const filteredTokens = mockTokens.filter(token =>
    token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    token.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setIsLoading(true);
    // Simulate API call to your MCP server
    setTimeout(() => {
      setIsLoading(false);
      if (filteredTokens.length > 0) {
        setSelectedToken(filteredTokens[0]);
      } else {
        toast.error('Token not found');
      }
    }, 1000);
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast.success('Address copied to clipboard');
  };

  const toggleFavorite = (address: string) => {
    setFavorites(prev => 
      prev.includes(address) 
        ? prev.filter(addr => addr !== address)
        : [...prev, address]
    );
  };

  const formatNumber = (num: number) => {
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="glass-card p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Token Explorer</h2>
        <div className="flex items-center space-x-2">
          <motion.button
            whileHover={{ scale: 1.1, rotate: 180 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 glass-card rounded-lg"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="w-5 h-5" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 glass-card rounded-lg"
          >
            <Filter className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="flex space-x-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by token name, symbol, or address..."
              className="w-full pl-10 pr-4 py-3 glass-card rounded-lg focus:outline-none focus:ring-2 focus:ring-sei-500 text-white placeholder-gray-400"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSearch}
            disabled={isLoading}
            className="btn-primary px-6 flex items-center space-x-2"
          >
            {isLoading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
            <span>Search</span>
          </motion.button>
        </div>
      </div>

      {/* Token List */}
      <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
        <AnimatePresence>
          {filteredTokens.map((token, index) => (
            <motion.div
              key={token.address}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => setSelectedToken(token)}
              className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                selectedToken?.address === token.address
                  ? 'bg-sei-500/20 border border-sei-500/50'
                  : 'bg-white/5 hover:bg-white/10 border border-transparent'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{token.icon}</div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-white">{token.symbol}</h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(token.address);
                        }}
                        className={`p-1 rounded ${
                          favorites.includes(token.address)
                            ? 'text-sei-gold'
                            : 'text-gray-400 hover:text-sei-gold'
                        }`}
                      >
                        <Star className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-400">{token.name}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-lg font-bold text-white">
                    {formatNumber(token.price)}
                  </div>
                  <div className={`flex items-center space-x-1 text-sm ${
                    token.change24h >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {token.change24h >= 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    <span>{token.change24h.toFixed(2)}%</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Token Details */}
      <AnimatePresence>
        {selectedToken && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-white/10 pt-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                <span className="text-2xl">{selectedToken.icon}</span>
                <span>{selectedToken.name} ({selectedToken.symbol})</span>
              </h3>
              <div className="flex items-center space-x-2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => copyAddress(selectedToken.address)}
                  className="p-2 glass-card rounded-lg"
                >
                  <Copy className="w-4 h-4" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 glass-card rounded-lg"
                >
                  <ExternalLink className="w-4 h-4" />
                </motion.button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-400">Price</p>
                  <p className="text-2xl font-bold text-white">
                    {formatNumber(selectedToken.price)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">24h Volume</p>
                  <p className="text-lg font-semibold text-white">
                    {formatNumber(selectedToken.volume24h)}
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-400">Market Cap</p>
                  <p className="text-lg font-semibold text-white">
                    {formatNumber(selectedToken.marketCap)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Holders</p>
                  <p className="text-lg font-semibold text-white">
                    {selectedToken.holders.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-white/5 rounded-lg">
              <p className="text-xs text-gray-400 mb-1">Contract Address</p>
              <p className="text-sm font-mono text-white break-all">
                {selectedToken.address}
              </p>
            </div>

            {/* Additional Token Actions */}
            <div className="mt-4 flex space-x-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-primary flex-1"
              >
                View on Explorer
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-glass px-4"
              >
                Add to Watchlist
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {filteredTokens.length === 0 && searchTerm && (
        <div className="text-center py-8 text-gray-400">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No tokens found matching "{searchTerm}"</p>
          <p className="text-sm mt-1">Try searching by symbol, name, or contract address</p>
        </div>
      )}
    </motion.div>
  );
};
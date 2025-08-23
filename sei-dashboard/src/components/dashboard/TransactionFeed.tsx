
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, 
  ExternalLink, 
  Copy, 
  Filter,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Zap
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  type: 'transfer' | 'swap' | 'mint' | 'burn' | 'contract';
  status: 'success' | 'failed' | 'pending';
  timestamp: Date;
  gasUsed: number;
  gasPrice: string;
}

const mockTransactions: Transaction[] = [
  {
    hash: '0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890',
    from: '0x742d35Cc6634C0532925a3b8D91d8',
    to: '0x8ba1f109551bD432803012645Hac136c',
    value: '1.5 SEI',
    type: 'transfer',
    status: 'success',
    timestamp: new Date(Date.now() - 1000 * 30),
    gasUsed: 21000,
    gasPrice: '0.025'
  },
  {
    hash: '0x2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890ab',
    from: '0x8ba1f109551bD432803012645Hac136c',
    to: '0x742d35Cc6634C0532925a3b8D91d8',
    value: '250.0 USDC',
    type: 'swap',
    status: 'success',
    timestamp: new Date(Date.now() - 1000 * 120),
    gasUsed: 45000,
    gasPrice: '0.028'
  },
  {
    hash: '0x3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890abcd',
    from: '0x1234567890abcdef1234567890abcdef',
    to: '0x0000000000000000000000000000000000000000',
    value: '1000 TOKEN',
    type: 'mint',
    status: 'pending',
    timestamp: new Date(Date.now() - 1000 * 60),
    gasUsed: 0,
    gasPrice: '0.030'
  },
  {
    hash: '0x4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    from: '0xabcdef1234567890abcdef1234567890',
    to: '0x9876543210fedcba9876543210fedcba',
    value: '0.001 SEI',
    type: 'contract',
    status: 'failed',
    timestamp: new Date(Date.now() - 1000 * 180),
    gasUsed: 32000,
    gasPrice: '0.022'
  }
];

export const TransactionFeed: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [filter, setFilter] = useState<'all' | 'success' | 'failed' | 'pending'>('all');
  const [isLive, setIsLive] = useState(true);

  // Simulate live transactions
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      const newTx: Transaction = {
        hash: `0x${Math.random().toString(16).substring(2).padStart(64, '0')}`,
        from: `0x${Math.random().toString(16).substring(2).padStart(40, '0')}`,
        to: `0x${Math.random().toString(16).substring(2).padStart(40, '0')}`,
        value: `${(Math.random() * 10).toFixed(2)} SEI`,
        type: ['transfer', 'swap', 'mint', 'contract'][Math.floor(Math.random() * 4)] as Transaction['type'],
        status: Math.random() > 0.1 ? 'success' : (Math.random() > 0.5 ? 'failed' : 'pending'),
        timestamp: new Date(),
        gasUsed: Math.floor(Math.random() * 50000) + 21000,
        gasPrice: (Math.random() * 0.05 + 0.02).toFixed(3)
      };

      setTransactions(prev => [newTx, ...prev.slice(0, 19)]); // Keep last 20
    }, 5000);

    return () => clearInterval(interval);
  }, [isLive]);

  const filteredTransactions = transactions.filter(tx => 
    filter === 'all' || tx.status === filter
  );

  const getStatusIcon = (status: Transaction['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-400 animate-pulse" />;
    }
  };

  const getTypeColor = (type: Transaction['type']) => {
    switch (type) {
      case 'transfer':
        return 'bg-blue-500/20 text-blue-400';
      case 'swap':
        return 'bg-purple-500/20 text-purple-400';
      case 'mint':
        return 'bg-green-500/20 text-green-400';
      case 'burn':
        return 'bg-red-500/20 text-red-400';
      case 'contract':
        return 'bg-yellow-500/20 text-yellow-400';
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    toast.success('Transaction hash copied');
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="glass-card p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <h2 className="text-2xl font-bold text-white">Live Transactions</h2>
          <div className={`flex items-center space-x-2 px-2 py-1 rounded-lg text-sm ${
            isLive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
            <span>{isLive ? 'Live' : 'Paused'}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Filter Buttons */}
          <div className="flex items-center space-x-1 glass-card p-1 rounded-lg">
            {['all', 'success', 'failed', 'pending'].map((filterType) => (
              <button
                key={filterType}
                onClick={() => setFilter(filterType as typeof filter)}
                className={`px-3 py-1 rounded text-sm capitalize transition-all duration-200 ${
                  filter === filterType 
                    ? 'bg-sei-500 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {filterType}
              </button>
            ))}
          </div>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsLive(!isLive)}
            className="p-2 glass-card rounded-lg"
          >
            <Zap className={`w-5 h-5 ${isLive ? 'text-green-400' : 'text-gray-400'}`} />
          </motion.button>
        </div>
      </div>

      {/* Transaction List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        <AnimatePresence>
          {filteredTransactions.map((tx, index) => (
            <motion.div
              key={tx.hash}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.02 }}
              className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-all duration-200 group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(tx.status)}
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(tx.type)}`}>
                    {tx.type}
                  </span>
                  <span className="text-sm text-gray-400">
                    {formatTimeAgo(tx.timestamp)}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => copyHash(tx.hash)}
                    className="p-1 hover:bg-white/10 rounded"
                  >
                    <Copy className="w-4 h-4 text-gray-400" />
                  </button>
                  <button className="p-1 hover:bg-white/10 rounded">
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-mono text-gray-300">
                    {formatAddress(tx.from)}
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-mono text-gray-300">
                    {formatAddress(tx.to)}
                  </span>
                </div>
                
                <div className="text-right">
                  <div className="text-sm font-semibold text-white">
                    {tx.value}
                  </div>
                  <div className="text-xs text-gray-400">
                    Gas: {tx.gasUsed.toLocaleString()}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredTransactions.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No transactions found for the selected filter</p>
        </div>
      )}
    </motion.div>
  );
};
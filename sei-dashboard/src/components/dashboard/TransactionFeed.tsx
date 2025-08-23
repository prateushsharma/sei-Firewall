// src/components/dashboard/TransactionFeed.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ArrowRight, ExternalLink, Copy, Clock, Zap, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import './TransactionFeed.css';

interface Transaction {
  id: string;
  hash: string;
  type: 'transfer' | 'swap' | 'stake' | 'contract' | 'mint' | 'burn';
  status: 'pending' | 'success' | 'failed';
  from: string;
  to: string;
  value: number;
  token: string;
  tokenSymbol: string;
  gasUsed: number;
  gasPrice: number;
  timestamp: Date;
  blockNumber: number;
  methodName?: string;
}

const TransactionFeed: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  // Generate mock transaction
  const generateTransaction = (): Transaction => {
    const types: Transaction['type'][] = ['transfer', 'swap', 'stake', 'contract', 'mint', 'burn'];
    const tokens = [
      { name: 'SEI', symbol: 'SEI' },
      { name: 'USDC', symbol: 'USDC' },
      { name: 'WETH', symbol: 'WETH' },
      { name: 'DragonSei', symbol: 'DRAGON' }
    ];
    const statuses: Transaction['status'][] = ['success', 'success', 'success', 'pending', 'failed'];
    
    const type = types[Math.floor(Math.random() * types.length)];
    const token = tokens[Math.floor(Math.random() * tokens.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    return {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      hash: `0x${Math.random().toString(16).substr(2, 64)}`,
      type,
      status,
      from: `0x${Math.random().toString(16).substr(2, 40)}`,
      to: `0x${Math.random().toString(16).substr(2, 40)}`,
      value: Math.random() * 1000,
      token: token.name,
      tokenSymbol: token.symbol,
      gasUsed: Math.floor(Math.random() * 100000) + 21000,
      gasPrice: Math.random() * 0.02 + 0.01,
      timestamp: new Date(),
      blockNumber: Math.floor(Math.random() * 1000) + 15847000,
      methodName: type === 'contract' ? ['approve', 'transfer', 'stake', 'claim'][Math.floor(Math.random() * 4)] : undefined
    };
  };

  // Initialize with some transactions
  useEffect(() => {
    const initialTxs = Array.from({ length: 15 }, () => generateTransaction());
    setTransactions(initialTxs);
  }, []);

  // Live transaction feed simulation
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      const newTx = generateTransaction();
      setTransactions(prev => [newTx, ...prev.slice(0, 49)]); // Keep only 50 transactions
    }, 2000 + Math.random() * 3000);

    return () => clearInterval(interval);
  }, [isLive]);

  const filteredTransactions = transactions.filter(tx => {
    if (filter === 'all') return true;
    return tx.type === filter;
  });

  const getTypeColor = (type: Transaction['type']): string => {
    const colors = {
      transfer: '#3b82f6',
      swap: '#10b981',
      stake: '#8b5cf6',
      contract: '#f59e0b',
      mint: '#ec4899',
      burn: '#ef4444'
    };
    return colors[type];
  };

  const getStatusIcon = (status: Transaction['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle size={16} className="status-success" />;
      case 'failed':
        return <XCircle size={16} className="status-failed" />;
      case 'pending':
        return <Clock size={16} className="status-pending" />;
      default:
        return <AlertCircle size={16} className="status-unknown" />;
    }
  };

  const formatValue = (value: number, symbol: string): string => {
    if (value < 0.001) return `${value.toFixed(6)} ${symbol}`;
    if (value < 1) return `${value.toFixed(4)} ${symbol}`;
    return `${value.toFixed(2)} ${symbol}`;
  };

  const formatAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);

    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    toast.success('Transaction hash copied!');
  };

  const filters = [
    { id: 'all', label: 'All', count: transactions.length },
    { id: 'transfer', label: 'Transfers', count: transactions.filter(tx => tx.type === 'transfer').length },
    { id: 'swap', label: 'Swaps', count: transactions.filter(tx => tx.type === 'swap').length },
    { id: 'stake', label: 'Staking', count: transactions.filter(tx => tx.type === 'stake').length },
    { id: 'contract', label: 'Contracts', count: transactions.filter(tx => tx.type === 'contract').length }
  ];

  return (
    <section className="transaction-feed">
      <motion.div
        className="feed-header"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="header-content">
          <h2 className="feed-title">
            <Activity size={24} />
            <span>Live</span> Transactions
          </h2>
          <div className="feed-controls">
            <motion.button
              className={`live-toggle ${isLive ? 'active' : ''}`}
              onClick={() => setIsLive(!isLive)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="live-dot" />
              {isLive ? 'Live' : 'Paused'}
            </motion.button>
          </div>
        </div>

        {/* Filters */}
        <div className="feed-filters">
          {filters.map((filterOption) => (
            <motion.button
              key={filterOption.id}
              className={`filter-btn ${filter === filterOption.id ? 'active' : ''}`}
              onClick={() => setFilter(filterOption.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {filterOption.label}
              <span className="filter-count">{filterOption.count}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      <motion.div className="transactions-container" layout>
        <AnimatePresence mode="popLayout">
          {filteredTransactions.map((tx, index) => (
            <motion.div
              key={tx.id}
              className={`transaction-item glass-card ${tx.status}`}
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              transition={{ 
                duration: 0.4, 
                delay: index * 0.02,
                layout: { duration: 0.3 }
              }}
              whileHover={{ 
                scale: 1.01, 
                y: -2,
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)'
              }}
              layout
            >
              <div className="tx-main">
                <div className="tx-type">
                  <div 
                    className="type-icon"
                    style={{ backgroundColor: `${getTypeColor(tx.type)}20`, color: getTypeColor(tx.type) }}
                  >
                    <Zap size={16} />
                  </div>
                  <div className="type-info">
                    <span className="type-label" style={{ color: getTypeColor(tx.type) }}>
                      {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                    </span>
                    {tx.methodName && (
                      <span className="method-name">{tx.methodName}</span>
                    )}
                  </div>
                </div>

                <div className="tx-flow">
                  <div className="address-info">
                    <span className="address-label">From</span>
                    <span className="address">{formatAddress(tx.from)}</span>
                  </div>
                  <ArrowRight size={16} className="flow-arrow" />
                  <div className="address-info">
                    <span className="address-label">To</span>
                    <span className="address">{formatAddress(tx.to)}</span>
                  </div>
                </div>

                <div className="tx-value">
                  <span className="value-amount">
                    {formatValue(tx.value, tx.tokenSymbol)}
                  </span>
                  <div className="tx-status">
                    {getStatusIcon(tx.status)}
                    <span className={`status-text status-${tx.status}`}>
                      {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="tx-details">
                <div className="detail-item">
                  <span className="detail-label">Hash</span>
                  <div className="hash-container">
                    <span className="hash">{formatAddress(tx.hash)}</span>
                    <motion.button
                      className="copy-btn"
                      onClick={() => copyHash(tx.hash)}
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

                <div className="detail-row">
                  <div className="detail-item">
                    <span className="detail-label">Block</span>
                    <span className="detail-value">{tx.blockNumber.toLocaleString()}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Gas</span>
                    <span className="detail-value">{tx.gasUsed.toLocaleString()}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Time</span>
                    <span className="detail-value">{formatTimeAgo(tx.timestamp)}</span>
                  </div>
                </div>
              </div>

              <div 
                className="tx-glow"
                style={{ background: `${getTypeColor(tx.type)}10` }}
              />

              {/* Status pulse animation */}
              {tx.status === 'pending' && (
                <div className="pending-pulse" />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Empty State */}
      {filteredTransactions.length === 0 && (
        <motion.div
          className="empty-state"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="empty-icon">
            <Activity size={48} />
          </div>
          <h3 className="empty-title">No transactions found</h3>
          <p className="empty-description">
            {filter === 'all' ? 
              'No transactions to display. Enable live mode to see new transactions.' :
              `No ${filter} transactions found. Try selecting a different filter.`
            }
          </p>
          <motion.button
            className="reset-filter-btn"
            onClick={() => setFilter('all')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Show All Transactions
          </motion.button>
        </motion.div>
      )}

      {/* Stats Footer */}
      <motion.div
        className="feed-stats glass-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <div className="stat-item">
          <span className="stat-label">Total TXs</span>
          <span className="stat-value">{transactions.length}</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-label">Success Rate</span>
          <span className="stat-value">
            {transactions.length > 0 ? 
              Math.round((transactions.filter(tx => tx.status === 'success').length / transactions.length) * 100) : 0
            }%
          </span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-label">Avg Gas</span>
          <span className="stat-value">
            {transactions.length > 0 ? 
              Math.round(transactions.reduce((sum, tx) => sum + tx.gasUsed, 0) / transactions.length).toLocaleString() : 0
            }
          </span>
        </div>
      </motion.div>
    </section>
  );
};

export default TransactionFeed;
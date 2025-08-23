// src/components/layout/Header.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Wallet, Menu, X } from 'lucide-react';
import './Header.css';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isWalletConnected, setIsWalletConnected] = useState(false);

  const navItems = [
    { label: 'Dashboard', href: '#dashboard' },
    { label: 'Explorer', href: '#explorer' },
    { label: 'DeFi', href: '#defi' },
    { label: 'NFTs', href: '#nfts' },
  ];

  const handleWalletConnect = () => {
    setIsWalletConnected(!isWalletConnected);
  };

  return (
    <motion.header 
      className="header"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <div className="header-container">
        {/* Logo */}
        <motion.div 
          className="logo"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="logo-icon">
            <div className="sei-symbol">SEI</div>
          </div>
          <span className="logo-text">Dashboard</span>
        </motion.div>

        {/* Navigation */}
        <nav className={`nav ${isMenuOpen ? 'nav-open' : ''}`}>
          {navItems.map((item, index) => (
            <motion.a
              key={item.label}
              href={item.href}
              className="nav-link"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 + 0.2 }}
              whileHover={{ scale: 1.05 }}
            >
              {item.label}
            </motion.a>
          ))}
        </nav>

        {/* Search */}
        <motion.div 
          className="search-container"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Search className="search-icon" size={18} />
          <input
            type="text"
            placeholder="Search tokens, addresses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </motion.div>

        {/* Wallet Connection */}
        <motion.button
          className={`wallet-btn ${isWalletConnected ? 'connected' : ''}`}
          onClick={handleWalletConnect}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Wallet size={18} />
          <span>
            {isWalletConnected ? 'sei1...4x7z' : 'Connect'}
          </span>
          {isWalletConnected && <div className="connection-dot" />}
        </motion.button>

        {/* Mobile Menu Toggle */}
        <motion.button
          className="menu-toggle"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          whileTap={{ scale: 0.95 }}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </motion.button>
      </div>

      {/* Gradient Border */}
      <div className="header-border" />
    </motion.header>
  );
};

export default Header;

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Wallet, 
  Settings, 
  Bell, 
  Menu, 
  X,
  TrendingUp,
  Zap
} from 'lucide-react';

export const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isWalletConnected, setIsWalletConnected] = useState(false);

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="relative z-50 glass-card m-4 p-4"
    >
      <div className="flex items-center justify-between">
        {/* Logo and Title */}
        <motion.div 
          className="flex items-center space-x-3"
          whileHover={{ scale: 1.05 }}
        >
          <div className="relative">
            <div className="w-10 h-10 bg-sei-gradient rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gradient">Sei Explorer</h1>
            <p className="text-xs text-gray-400">Blockchain Dashboard</p>
          </div>
        </motion.div>

        {/* Search Bar - Desktop */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search transactions, addresses, tokens..."
              className="w-full pl-10 pr-4 py-2 glass-card rounded-lg focus:outline-none focus:ring-2 focus:ring-sei-500 text-white placeholder-gray-400"
            />
          </div>
        </div>

        {/* Navigation Links - Desktop */}
        <nav className="hidden lg:flex items-center space-x-6">
          <NavLink href="#" icon={TrendingUp}>Dashboard</NavLink>
          <NavLink href="#" icon={Wallet}>Tokens</NavLink>
          <NavLink href="#" icon={Bell}>NFTs</NavLink>
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          {/* Notifications */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="relative p-2 glass-card rounded-lg"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-sei-500 rounded-full text-xs" />
          </motion.button>

          {/* Settings */}
          <motion.button
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 glass-card rounded-lg"
          >
            <Settings className="w-5 h-5" />
          </motion.button>

          {/* Wallet Connect */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsWalletConnected(!isWalletConnected)}
            className={`px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-all duration-200 ${
              isWalletConnected 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'btn-primary'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span className="hidden sm:block">
              {isWalletConnected ? 'Connected' : 'Connect Wallet'}
            </span>
          </motion.button>

          {/* Mobile Menu Button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 glass-card rounded-lg lg:hidden"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </motion.button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-4 pt-4 border-t border-white/10 lg:hidden"
        >
          {/* Mobile Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 glass-card rounded-lg focus:outline-none focus:ring-2 focus:ring-sei-500 text-white placeholder-gray-400"
              />
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="space-y-2">
            <MobileNavLink icon={TrendingUp}>Dashboard</MobileNavLink>
            <MobileNavLink icon={Wallet}>Tokens</MobileNavLink>
            <MobileNavLink icon={Bell}>NFTs</MobileNavLink>
          </div>
        </motion.div>
      )}
    </motion.header>
  );
};

// Desktop Navigation Link Component
const NavLink: React.FC<{ 
  href: string; 
  icon: React.ElementType; 
  children: React.ReactNode;
}> = ({ href, icon: Icon, children }) => (
  <motion.a
    href={href}
    whileHover={{ scale: 1.05 }}
    className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors duration-200"
  >
    <Icon className="w-4 h-4" />
    <span className="text-sm font-medium">{children}</span>
  </motion.a>
);

// Mobile Navigation Link Component
const MobileNavLink: React.FC<{ 
  icon: React.ElementType; 
  children: React.ReactNode;
}> = ({ icon: Icon, children }) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors duration-200 text-left"
  >
    <Icon className="w-5 h-5" />
    <span className="font-medium">{children}</span>
  </motion.button>
);
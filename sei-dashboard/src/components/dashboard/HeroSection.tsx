// src/components/dashboard/HeroSection.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Activity, DollarSign, Users } from 'lucide-react';
import './HeroSection.css';

interface LiveStat {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: React.ReactNode;
}

const HeroSection: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [blockHeight, setBlockHeight] = useState(15847293);
  const [seiPrice, setSeiPrice] = useState(0.42);
  const [gasPrice, setGasPrice] = useState(0.01);

  // Simulate live data updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      setBlockHeight(prev => prev + Math.floor(Math.random() * 3));
      setSeiPrice(prev => prev + (Math.random() - 0.5) * 0.01);
      setGasPrice(prev => Math.max(0.008, prev + (Math.random() - 0.5) * 0.002));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const liveStats: LiveStat[] = [
    {
      label: 'SEI Price',
      value: `$${seiPrice.toFixed(4)}`,
      change: '+5.2%',
      trend: 'up',
      icon: <DollarSign size={20} />
    },
    {
      label: 'Block Height',
      value: blockHeight.toLocaleString(),
      change: '+0.1%',
      trend: 'up',
      icon: <Activity size={20} />
    },
    {
      label: 'Gas Price',
      value: `${gasPrice.toFixed(3)} SEI`,
      change: '-2.1%',
      trend: 'down',
      icon: <TrendingUp size={20} />
    },
    {
      label: 'Active Users',
      value: '12.4K',
      change: '+8.7%',
      trend: 'up',
      icon: <Users size={20} />
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6 }
    }
  };

  return (
    <section className="hero-section">
      <div className="hero-bg-effects">
        <div className="hero-orb orb-1" />
        <div className="hero-orb orb-2" />
        <div className="hero-gradient" />
      </div>

      <motion.div 
        className="hero-container"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Main Title */}
        <motion.div className="hero-content" variants={itemVariants}>
          <h1 className="hero-title">
            <span className="title-main">Sei Blockchain</span>
            <span className="title-accent">Explorer</span>
          </h1>
          <p className="hero-subtitle">
            Real-time insights into the fastest Layer 1 blockchain
          </p>
          <div className="hero-timestamp">
            <div className="timestamp-dot" />
            <span>Live • {currentTime.toLocaleTimeString()}</span>
          </div>
        </motion.div>

        {/* Live Stats Grid */}
        <motion.div 
          className="stats-grid"
          variants={itemVariants}
        >
          {liveStats.map((stat, index) => (
            <motion.div
              key={stat.label}
              className="stat-card glass-card"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 + 0.5 }}
              whileHover={{ scale: 1.02, rotateY: 5 }}
            >
              <div className="stat-icon">
                {stat.icon}
              </div>
              <div className="stat-content">
                <div className="stat-label">{stat.label}</div>
                <div className="stat-value">{stat.value}</div>
                <div className={`stat-change ${stat.trend}`}>
                  <TrendingUp 
                    size={12} 
                    style={{ 
                      transform: stat.trend === 'down' ? 'rotate(180deg)' : 'none' 
                    }} 
                  />
                  {stat.change}
                </div>
              </div>
              <div className="stat-glow" />
            </motion.div>
          ))}
        </motion.div>

        {/* CTA Buttons */}
        <motion.div 
          className="hero-actions"
          variants={itemVariants}
        >
          <motion.button 
            className="btn btn-primary"
            whileHover={{ scale: 1.05, boxShadow: '0 10px 40px rgba(220, 38, 38, 0.4)' }}
            whileTap={{ scale: 0.95 }}
          >
            <span>Explore Network</span>
            <div className="btn-shine" />
          </motion.button>
          <motion.button 
            className="btn btn-ghost"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            View Analytics
          </motion.button>
        </motion.div>

        {/* Network Status */}
        <motion.div 
          className="network-status"
          variants={itemVariants}
        >
          <div className="status-indicator">
            <div className="status-dot online" />
            <span>Network Online</span>
          </div>
          <div className="status-divider" />
          <div className="status-info">
            <span>TPS: <strong>22,000</strong></span>
            <span>Finality: <strong>600ms</strong></span>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  DollarSign, 
  Users, 
  Zap 
} from 'lucide-react';

interface LiveMetric {
  label: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: React.ElementType;
}

export const HeroSection: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [blockNumber, setBlockNumber] = useState(2847392);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulate live block updates
  useEffect(() => {
    const blockTimer = setInterval(() => {
      setBlockNumber(prev => prev + Math.floor(Math.random() * 3) + 1);
    }, 12000); // New block every ~12 seconds
    return () => clearInterval(blockTimer);
  }, []);

  const liveMetrics: LiveMetric[] = [
    {
      label: 'SEI Price',
      value: '$0.4231',
      change: '+5.32%',
      isPositive: true,
      icon: DollarSign
    },
    {
      label: 'Market Cap',
      value: '$1.2B',
      change: '+2.1%',
      isPositive: true,
      icon: TrendingUp
    },
    {
      label: 'Active Validators',
      value: '125',
      change: '+3',
      isPositive: true,
      icon: Users
    },
    {
      label: 'Gas Price',
      value: '0.025 SEI',
      change: '-1.2%',
      isPositive: false,
      icon: Zap
    }
  ];

  return (
    <section className="relative py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Main Hero Content */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <motion.h1 
            className="text-5xl md:text-7xl font-bold mb-6"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <span className="text-gradient">Sei Network</span>
            <br />
            <span className="text-white">Explorer</span>
          </motion.h1>
          
          <motion.p 
            className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Real-time blockchain analytics and exploration for the fastest Layer 1
          </motion.p>

          {/* Live Stats Bar */}
          <motion.div 
            className="glass-card p-6 inline-block"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                <span className="text-sm text-gray-300">Live</span>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {blockNumber.toLocaleString()}
                </div>
                <div className="text-xs text-gray-400">Latest Block</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-sei-gold">
                  {currentTime.toLocaleTimeString()}
                </div>
                <div className="text-xs text-gray-400">Network Time</div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-green-400" />
                <span className="text-sm text-green-400">12.3s block time</span>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Live Metrics Grid */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          {liveMetrics.map((metric, index) => (
            <MetricCard key={metric.label} metric={metric} delay={index * 0.1} />
          ))}
        </motion.div>

        {/* Quick Actions */}
        <motion.div 
          className="mt-12 flex flex-wrap justify-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          <QuickActionButton icon={Activity} label="View Transactions" />
          <QuickActionButton icon={TrendingUp} label="Price Charts" />
          <QuickActionButton icon={Users} label="Validators" />
          <QuickActionButton icon={Zap} label="Network Stats" />
        </motion.div>
      </div>
    </section>
  );
};

// Metric Card Component
const MetricCard: React.FC<{ 
  metric: LiveMetric; 
  delay: number;
}> = ({ metric, delay }) => {
  const Icon = metric.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ scale: 1.05, y: -5 }}
      className="glass-card p-6 text-center group cursor-pointer"
    >
      <div className="flex items-center justify-center mb-4">
        <div className="p-3 bg-sei-gradient rounded-xl group-hover:animate-pulse">
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-white">{metric.value}</h3>
        <p className="text-sm text-gray-400">{metric.label}</p>
        <div className={`flex items-center justify-center space-x-1 text-sm ${
          metric.isPositive ? 'text-green-400' : 'text-red-400'
        }`}>
          {metric.isPositive ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          <span>{metric.change}</span>
        </div>
      </div>
    </motion.div>
  );
};

// Quick Action Button Component
const QuickActionButton: React.FC<{
  icon: React.ElementType;
  label: string;
}> = ({ icon: Icon, label }) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    className="btn-glass flex items-center space-x-2"
  >
    <Icon className="w-5 h-5" />
    <span>{label}</span>
  </motion.button>
);
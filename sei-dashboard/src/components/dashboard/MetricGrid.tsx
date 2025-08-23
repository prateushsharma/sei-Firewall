// File Location: ~/sei-Firewall/sei-dashboard/src/components/dashboard/MetricsGrid.tsx

import React from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Activity, 
  DollarSign, 
  Users, 
  Database,
  Zap,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

export const MetricsGrid: React.FC = () => {
  return (
    <section className="py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Simple metrics without charts for now */}
        <MetricCard
          title="SEI Price (24h)"
          value="$0.4231"
          change="+5.32%"
          isPositive={true}
          icon={DollarSign}
        />
        
        <MetricCard
          title="Trading Volume"
          value="$12.4M"
          change="+8.7%"
          isPositive={true}
          icon={Activity}
        />
        
        <MetricCard
          title="Transactions (24h)"
          value="84,291"
          change="+12.3%"
          isPositive={true}
          icon={Database}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <MetricCard
          title="Total Value Locked"
          value="$1.2B"
          change="+3.2%"
          isPositive={true}
          icon={TrendingUp}
        />
        <MetricCard
          title="Active Accounts"
          value="45,291"
          change="+7.8%"
          isPositive={true}
          icon={Users}
        />
        <MetricCard
          title="Network Fees"
          value="0.025 SEI"
          change="-2.1%"
          isPositive={false}
          icon={Zap}
        />
        <MetricCard
          title="Block Time"
          value="12.3s"
          change="+0.2s"
          isPositive={false}
          icon={Activity}
        />
      </div>
    </section>
  );
};

// Simple Metric Card Component
const MetricCard: React.FC<{
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: React.ElementType;
}> = ({ title, value, change, isPositive, icon: Icon }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    whileHover={{ scale: 1.05 }}
    className="glass-card p-4 text-center group cursor-pointer"
  >
    <div className="flex items-center justify-center mb-3">
      <div className="p-2 bg-sei-gradient rounded-lg group-hover:animate-pulse">
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
    
    <div className="space-y-1">
      <h3 className="text-lg font-bold text-white">{value}</h3>
      <p className="text-xs text-gray-400">{title}</p>
      <div className={`flex items-center justify-center space-x-1 text-xs ${
        isPositive ? 'text-green-400' : 'text-red-400'
      }`}>
        {isPositive ? (
          <ArrowUpRight className="w-3 h-3" />
        ) : (
          <ArrowDownRight className="w-3 h-3" />
        )}
        <span>{change}</span>
      </div>
    </div>
  </motion.div>
);
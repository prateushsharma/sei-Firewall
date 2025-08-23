// src/components/dashboard/MetricsGrid.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { TrendingUp, Activity, Zap, Globe, DollarSign, Users, Server, Clock } from 'lucide-react';
import './MetricsGrid.css';

interface ChartData {
  name: string;
  value: number;
  timestamp?: string;
}

interface MetricCard {
  id: string;
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
  chartType: 'line' | 'area' | 'pie' | 'bar';
  data: ChartData[];
  color: string;
}

const MetricsGrid: React.FC = () => {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [animatedValues, setAnimatedValues] = useState<Record<string, number>>({});

  // Generate mock data
  const generateTimeSeriesData = (points: number, baseValue: number, variance: number) => {
    return Array.from({ length: points }, (_, i) => ({
      name: `${i}h`,
      value: baseValue + (Math.random() - 0.5) * variance,
      timestamp: new Date(Date.now() - (points - i) * 3600000).toISOString()
    }));
  };

  const pieData = [
    { name: 'DeFi', value: 45, color: '#dc2626' },
    { name: 'NFTs', value: 25, color: '#ffd700' },
    { name: 'Gaming', value: 20, color: '#10b981' },
    { name: 'Other', value: 10, color: '#6366f1' }
  ];

  const metrics: MetricCard[] = [
    {
      id: 'price',
      title: 'SEI Price',
      value: '$0.4287',
      change: '+5.2%',
      trend: 'up',
      icon: <DollarSign size={20} />,
      chartType: 'area',
      data: generateTimeSeriesData(24, 0.42, 0.08),
      color: '#dc2626'
    },
    {
      id: 'tps',
      title: 'Transactions/sec',
      value: '18,420',
      change: '+12.4%',
      trend: 'up',
      icon: <Zap size={20} />,
      chartType: 'line',
      data: generateTimeSeriesData(24, 18000, 5000),
      color: '#ffd700'
    },
    {
      id: 'volume',
      title: '24h Volume',
      value: '$2.4M',
      change: '-3.1%',
      trend: 'down',
      icon: <Activity size={20} />,
      chartType: 'bar',
      data: generateTimeSeriesData(24, 2400000, 500000),
      color: '#10b981'
    },
    {
      id: 'users',
      title: 'Active Users',
      value: '47.2K',
      change: '+18.9%',
      trend: 'up',
      icon: <Users size={20} />,
      chartType: 'area',
      data: generateTimeSeriesData(24, 47200, 8000),
      color: '#6366f1'
    },
    {
      id: 'validators',
      title: 'Validators',
      value: '127',
      change: '+2',
      trend: 'up',
      icon: <Server size={20} />,
      chartType: 'line',
      data: generateTimeSeriesData(24, 127, 5),
      color: '#f59e0b'
    },
    {
      id: 'finality',
      title: 'Block Time',
      value: '380ms',
      change: '-5.2%',
      trend: 'down',
      icon: <Clock size={20} />,
      chartType: 'line',
      data: generateTimeSeriesData(24, 380, 50),
      color: '#ec4899'
    },
    {
      id: 'network',
      title: 'Network Usage',
      value: '67%',
      change: '+4.8%',
      trend: 'up',
      icon: <Globe size={20} />,
      chartType: 'pie',
      data: pieData,
      color: '#8b5cf6'
    },
    {
      id: 'gas',
      title: 'Avg Gas Price',
      value: '0.012 SEI',
      change: '-8.3%',
      trend: 'down',
      icon: <TrendingUp size={20} />,
      chartType: 'area',
      data: generateTimeSeriesData(24, 0.012, 0.005),
      color: '#ef4444'
    }
  ];

  // Animate values on mount
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedValues(prev => {
        const newValues = { ...prev };
        metrics.forEach(metric => {
          const randomChange = (Math.random() - 0.5) * 0.02;
          newValues[metric.id] = (newValues[metric.id] || 1) + randomChange;
        });
        return newValues;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  };

  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.9
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  const renderChart = (metric: MetricCard) => {
    const commonProps = {
      data: metric.chartType === 'pie' ? metric.data : metric.data.slice(-12),
      margin: { top: 5, right: 5, left: 5, bottom: 5 }
    };

    switch (metric.chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={60}>
            <LineChart {...commonProps}>
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={metric.color}
                strokeWidth={2}
                dot={false}
                strokeDasharray="0"
                style={{
                  filter: `drop-shadow(0 0 6px ${metric.color}40)`
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={60}>
            <AreaChart {...commonProps}>
              <defs>
                <linearGradient id={`gradient-${metric.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={metric.color} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={metric.color} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={metric.color}
                strokeWidth={2}
                fillOpacity={1} 
                fill={`url(#gradient-${metric.id})`}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={60}>
            <BarChart {...commonProps}>
              <Bar 
                dataKey="value" 
                fill={metric.color}
                opacity={0.8}
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={60}>
            <PieChart>
              <Pie
                data={metric.data}
                cx="50%"
                cy="50%"
                innerRadius={15}
                outerRadius={25}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
              >
                {(metric.data as any[]).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <section className="metrics-section">
      <motion.div
        className="metrics-header"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="metrics-title">
          <span className="title-glow">Live</span> Metrics
        </h2>
        <p className="metrics-subtitle">
          Real-time blockchain analytics and performance indicators
        </p>
      </motion.div>

      <motion.div
        className="metrics-grid"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.id}
            className={`metric-card glass-card ${selectedMetric === metric.id ? 'selected' : ''}`}
            variants={cardVariants}
            whileHover={{ 
              scale: 1.02,
              rotateY: 2,
              boxShadow: `0 20px 40px ${metric.color}20`
            }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedMetric(selectedMetric === metric.id ? null : metric.id)}
          >
            <div className="metric-header">
              <div className="metric-icon" style={{ backgroundColor: `${metric.color}20` }}>
                <div style={{ color: metric.color }}>
                  {metric.icon}
                </div>
              </div>
              <div className="metric-info">
                <h3 className="metric-title">{metric.title}</h3>
                <div className="metric-value">
                  {metric.value}
                  <motion.span 
                    className={`metric-change ${metric.trend}`}
                    animate={{ 
                      scale: animatedValues[metric.id] ? [1, 1.1, 1] : 1 
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    {metric.change}
                  </motion.span>
                </div>
              </div>
            </div>

            <div className="metric-chart">
              {renderChart(metric)}
            </div>

            <div className="metric-glow" style={{ background: `${metric.color}15` }} />
            
            {selectedMetric === metric.id && (
              <motion.div
                className="metric-details"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="detail-item">
                  <span>24h High:</span>
                  <span className="detail-value">
                    {metric.chartType !== 'pie' 
                      ? Math.max(...metric.data.map(d => d.value)).toLocaleString()
                      : 'N/A'
                    }
                  </span>
                </div>
                <div className="detail-item">
                  <span>24h Low:</span>
                  <span className="detail-value">
                    {metric.chartType !== 'pie' 
                      ? Math.min(...metric.data.map(d => d.value)).toLocaleString()
                      : 'N/A'
                    }
                  </span>
                </div>
              </motion.div>
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* Summary Stats */}
      <motion.div
        className="summary-stats glass-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.6 }}
      >
        <h3 className="summary-title">Network Health</h3>
        <div className="health-indicators">
          <div className="health-item">
            <div className="health-dot online" />
            <span>All Systems Operational</span>
          </div>
          <div className="health-item">
            <div className="health-dot warning" />
            <span>High Network Load</span>
          </div>
          <div className="health-item">
            <div className="health-dot good" />
            <span>Fast Finality</span>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default MetricsGrid;
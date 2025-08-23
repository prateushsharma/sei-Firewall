
import React from 'react';
import { motion } from 'framer-motion';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

// Layout Components
import { Particles } from './components/background/Particles';
import { Header } from './components/layout/Header';

// Dashboard Components
import { HeroSection } from './components/dashboard/HeroSection';
import { MetricsGrid } from './components/dashboard/MetricsGrid';
import { TokenExplorer } from './components/dashboard/TokenExplorer';
import { TransactionFeed } from './components/dashboard/TransactionFeed';

// Chat Component
import { ChatWidget } from './components/chat/ChatWidget';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds
      cacheTime: 300000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-hidden">
        {/* Animated Background */}
        <Particles />
        
        {/* Main Content */}
        <div className="relative z-10">
          {/* Header */}
          <Header />
          
          {/* Main Dashboard Content */}
          <motion.main
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="container mx-auto px-4 pb-20"
          >
            {/* Hero Section with Live Stats */}
            <HeroSection />
            
            {/* Metrics Grid */}
            <MetricsGrid />
            
            {/* Token Explorer and Transaction Feed Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
              <TokenExplorer />
              <TransactionFeed />
            </div>
          </motion.main>
        </div>
        
        {/* Floating Chat Widget */}
        <ChatWidget />
        
        {/* Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            className: 'glass-card text-white',
            style: {
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            },
          }}
        />
      </div>
    </QueryClientProvider>
  );
}

export default App;
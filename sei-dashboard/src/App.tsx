// src/App.tsx
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import Header from './components/layout/Header';
import HeroSection from './components/dashboard/HeroSection';
import MetricsGrid from './components/dashboard/MetricsGrid';
import TokenExplorer from './components/dashboard/TokenExplorer';
import TransactionFeed from './components/dashboard/TransactionFeed';
import Particles from './components/background/Particles';
import ChatWidget from './components/chat/ChatWidget';
import './styles/globals.css';
import ChatInterface from './components/chat/ChatInterface';
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: 5000,
      staleTime: 3000,
    },
  },
});

function App() {
  return (
    
    <QueryClientProvider client={queryClient}>
      <div className="app">
        <ChatInterface />
        <Particles />
        <Header />
        <main className="main-content">
          <HeroSection />
          <MetricsGrid />
          <div className="explorer-section">
            <TokenExplorer />
            <TransactionFeed />
          </div>
        </main>
        <ChatWidget />
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#fff',
            },
          }}
        />
      </div>
    </QueryClientProvider>
  );
}

export default App;
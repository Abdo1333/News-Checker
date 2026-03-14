import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import NewsPanel from './components/NewsPanel';
import MemberPanel from './components/MemberPanel';
import AdminPanel from './components/AdminPanel';
import { useWallet } from './contexts/WalletContext';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { error, setError } = useWallet();

  return (
    <div className="min-h-screen">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#e2e8f0',
            border: '1px solid #334155',
          },
        }}
      />
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-danger/10 border border-danger/30 rounded-lg p-4 flex items-center justify-between">
            <p className="text-danger text-sm">{error}</p>
            <button onClick={() => setError(null)} className="text-danger hover:text-danger/70 cursor-pointer text-sm">
              Dismiss
            </button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'news' && <NewsPanel />}
        {activeTab === 'member' && <MemberPanel />}
        {activeTab === 'admin' && <AdminPanel />}
      </main>

      <footer className="border-t border-dark-border mt-auto py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-dark-text text-sm">
          NewsChecker DApp &mdash; Decentralized News Verification on Tezos
        </div>
      </footer>
    </div>
  );
}

export default App;

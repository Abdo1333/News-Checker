import { useWallet } from '../contexts/WalletContext';
import { Wallet, LogOut, Shield, Play } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  const { address, connect, connectDemo, disconnect, loading, demoMode } = useWallet();

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'news', label: 'News' },
    { id: 'member', label: 'Member' },
    { id: 'admin', label: 'Admin' },
  ];

  const shortAddr = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';

  return (
    <nav className="bg-dark-card/80 backdrop-blur-md border-b border-dark-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary-light" />
            <span className="text-xl font-bold text-white">NewsChecker</span>
          </div>

          <div className="hidden md:flex items-center gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-primary text-white shadow-lg shadow-primary/25'
                    : 'text-dark-text hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {address ? (
              <div className="flex items-center gap-3">
                {demoMode && (
                  <span className="text-xs bg-warning/20 text-warning px-2 py-1 rounded font-bold">
                    DEMO
                  </span>
                )}
                <span className="text-sm text-dark-text bg-dark/50 px-3 py-1.5 rounded-lg font-mono">
                  {shortAddr}
                </span>
                <button
                  onClick={disconnect}
                  className="p-2 text-dark-text hover:text-danger transition-colors cursor-pointer"
                  title="Disconnect"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={connectDemo}
                  className="flex items-center gap-2 bg-warning/20 hover:bg-warning/30 text-warning px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4" />
                  Demo
                </button>
                <button
                  onClick={connect}
                  disabled={loading}
                  className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Wallet className="w-4 h-4" />
                  {loading ? 'Connecting...' : 'Connect Wallet'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mobile tabs */}
        <div className="flex md:hidden gap-1 pb-3 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-primary text-white'
                  : 'text-dark-text hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}

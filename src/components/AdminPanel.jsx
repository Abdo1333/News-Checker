import { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
import toast from 'react-hot-toast';
import { Settings, ShieldAlert, Save, Coins } from 'lucide-react';

export default function AdminPanel() {
  const { address, contract, storage, fetchStorage } = useWallet();
  const isAdmin = address && storage && address === storage.admin;

  const [params, setParams] = useState({
    new_min_stake:     '',
    new_quorum:        '',
    new_rep_threshold: '',
    new_vote_delay:    '',
    new_vote_duration: '',
    new_news_deposit:  '',
  });
  const [busy, setBusy] = useState(false);

  const loadCurrent = () => {
    if (!storage) return;
    setParams({
      new_min_stake:     String((storage.min_stake?.toNumber?.()     ?? Number(storage.min_stake     ?? 0)) / 1_000_000),
      new_quorum:        String(storage.quorum?.toNumber?.()         ?? Number(storage.quorum        ?? 0)),
      new_rep_threshold: String(storage.rep_threshold?.toNumber?.()  ?? Number(storage.rep_threshold ?? 0)),
      new_vote_delay:    String(storage.vote_delay?.toNumber?.()     ?? Number(storage.vote_delay    ?? 0)),
      new_vote_duration: String(storage.vote_duration?.toNumber?.()  ?? Number(storage.vote_duration ?? 0)),
      new_news_deposit:  String((storage.news_deposit?.toNumber?.()  ?? Number(storage.news_deposit  ?? 0)) / 1_000_000),
    });
  };

  const handleUpdate = async () => {
    if (!contract || !isAdmin) return;
    try {
      setBusy(true);
      const op = await contract.methodsObject.update_params({
        new_min_stake:     parseFloat(params.new_min_stake)     * 1_000_000,
        new_quorum:        parseInt(params.new_quorum),
        new_rep_threshold: parseInt(params.new_rep_threshold),
        new_vote_delay:    parseInt(params.new_vote_delay),
        new_vote_duration: parseInt(params.new_vote_duration),
        new_news_deposit:  parseFloat(params.new_news_deposit)  * 1_000_000,
      }).send();
      toast.loading('Updating parameters...', { id: 'tx' });
      await op.confirmation();
      toast.success('Parameters updated!', { id: 'tx' });
      await fetchStorage();
    } catch (err) {
      toast.error(err.message || 'Transaction failed', { id: 'tx' });
    } finally { setBusy(false); }
  };

  if (!address) {
    return (
      <div className="text-center py-20">
        <Settings className="w-16 h-16 text-dark-text mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Connect Your Wallet</h2>
        <p className="text-dark-text">Connect your wallet to access admin features</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="text-center py-20">
        <ShieldAlert className="w-16 h-16 text-danger mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Access Denied</h2>
        <p className="text-dark-text">Only the contract admin can access this panel</p>
        <p className="text-dark-text text-sm mt-2 font-mono">Admin: {storage?.admin}</p>
        <p className="text-dark-text text-sm font-mono">You: {address}</p>
      </div>
    );
  }

  const field = (key, label, placeholder, hint, step = '1') => (
    <div>
      <label className="block text-dark-text text-sm mb-2">{label}</label>
      <input type="number" step={step} value={params[key]}
        onChange={(e) => setParams({ ...params, [key]: e.target.value })}
        className="w-full bg-dark/50 border border-dark-border rounded-lg px-4 py-3 text-white placeholder-dark-text focus:outline-none focus:border-primary transition-colors"
        placeholder={placeholder} />
      {hint && <p className="text-dark-text text-xs mt-1">{hint}</p>}
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Admin Panel</h1>
        <p className="text-dark-text">Update contract parameters</p>
      </div>

      <div className="bg-dark-card/60 backdrop-blur border border-dark-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary-light" />Contract Parameters
          </h2>
          <button onClick={loadCurrent} className="text-sm text-primary-light hover:text-primary cursor-pointer">
            Load Current Values
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {field('new_min_stake',     'Minimum Stake (tez)',          'e.g. 1',     null,                          '0.01')}
          {field('new_quorum',        'Quorum (minimum votes)',       'e.g. 3',     null)}
          {field('new_rep_threshold', 'Reputation Threshold',        'e.g. 5',     'Min reputation for weighted votes')}
          {field('new_vote_delay',    'Vote Delay (seconds)',         'e.g. 3600',  'Min time before finalization')}
          {field('new_vote_duration', 'Vote Duration (seconds)',      'e.g. 86400', 'Max voting window')}
          <div>
            <label className="block text-dark-text text-sm mb-2 flex items-center gap-1">
              <Coins className="w-4 h-4 text-warning" /> News Deposit (tez)
            </label>
            <input type="number" step="0.01" value={params.new_news_deposit}
              onChange={(e) => setParams({ ...params, new_news_deposit: e.target.value })}
              className="w-full bg-dark/50 border border-dark-border rounded-lg px-4 py-3 text-white placeholder-dark-text focus:outline-none focus:border-primary transition-colors"
              placeholder="e.g. 0.5" />
            <p className="text-dark-text text-xs mt-1">Anti-spam deposit — kept if news is Fake</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={handleUpdate} disabled={busy}
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 cursor-pointer">
            <Save className="w-4 h-4" />{busy ? 'Updating...' : 'Update Parameters'}
          </button>
        </div>
      </div>

      {/* Current values */}
      <div className="bg-dark-card/60 backdrop-blur border border-dark-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Current Values</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
          {[
            ['Min Stake',     `${(storage.min_stake?.toNumber?.()     ?? Number(storage.min_stake     ?? 0)) / 1_000_000} tez`],
            ['Quorum',         storage.quorum?.toNumber?.()        ?? Number(storage.quorum        ?? 0)],
            ['Rep Threshold',  storage.rep_threshold?.toNumber?.() ?? Number(storage.rep_threshold ?? 0)],
            ['Vote Delay',    `${storage.vote_delay?.toNumber?.()   ?? Number(storage.vote_delay    ?? 0)}s`],
            ['Vote Duration', `${storage.vote_duration?.toNumber?.()??Number(storage.vote_duration ?? 0)}s`],
            ['News Deposit',  `${(storage.news_deposit?.toNumber?.()??Number(storage.news_deposit  ?? 0)) / 1_000_000} tez`],
          ].map(([label, value]) => (
            <div key={label}>
              <span className="text-dark-text">{label}</span>
              <p className="text-white font-medium">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

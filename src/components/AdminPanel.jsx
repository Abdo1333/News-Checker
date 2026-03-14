import { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
import toast from 'react-hot-toast';
import { Settings, ShieldAlert, Save } from 'lucide-react';

export default function AdminPanel() {
  const { address, contract, storage, fetchStorage } = useWallet();

  const isAdmin = address && storage && address === storage.admin;

  const [params, setParams] = useState({
    new_min_stake: '',
    new_quorum: '',
    new_rep_threshold: '',
    new_vote_delay: '',
    new_vote_duration: '',
  });
  const [busy, setBusy] = useState(false);

  const loadCurrent = () => {
    if (!storage) return;
    setParams({
      new_min_stake: String((storage.min_stake?.toNumber?.() ?? Number(storage.min_stake ?? 0)) / 1_000_000),
      new_quorum: String(storage.quorum?.toNumber?.() ?? Number(storage.quorum ?? 0)),
      new_rep_threshold: String(storage.rep_threshold?.toNumber?.() ?? Number(storage.rep_threshold ?? 0)),
      new_vote_delay: String(storage.vote_delay?.toNumber?.() ?? Number(storage.vote_delay ?? 0)),
      new_vote_duration: String(storage.vote_duration?.toNumber?.() ?? Number(storage.vote_duration ?? 0)),
    });
  };

  const handleUpdate = async () => {
    if (!contract || !isAdmin) return;
    try {
      setBusy(true);
      const op = await contract.methodsObject.update_params({
        new_min_stake: parseFloat(params.new_min_stake) * 1_000_000,
        new_quorum: parseInt(params.new_quorum),
        new_rep_threshold: parseInt(params.new_rep_threshold),
        new_vote_delay: parseInt(params.new_vote_delay),
        new_vote_duration: parseInt(params.new_vote_duration),
      }).send();
      toast.loading('Updating parameters...', { id: 'tx' });
      await op.confirmation();
      toast.success('Parameters updated!', { id: 'tx' });
      await fetchStorage();
    } catch (err) {
      toast.error(err.message || 'Transaction failed', { id: 'tx' });
    } finally {
      setBusy(false);
    }
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
        <p className="text-dark-text text-sm mt-2 font-mono">
          Admin: {storage?.admin}
        </p>
        <p className="text-dark-text text-sm font-mono">
          You: {address}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Admin Panel</h1>
        <p className="text-dark-text">Update contract parameters</p>
      </div>

      <div className="bg-dark-card/60 backdrop-blur border border-dark-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary-light" />
            Contract Parameters
          </h2>
          <button
            onClick={loadCurrent}
            className="text-sm text-primary-light hover:text-primary cursor-pointer"
          >
            Load Current Values
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-dark-text text-sm mb-2">Minimum Stake (tez)</label>
            <input
              type="number"
              step="0.01"
              value={params.new_min_stake}
              onChange={(e) => setParams({ ...params, new_min_stake: e.target.value })}
              className="w-full bg-dark/50 border border-dark-border rounded-lg px-4 py-3 text-white placeholder-dark-text focus:outline-none focus:border-primary transition-colors"
              placeholder="e.g. 1"
            />
          </div>

          <div>
            <label className="block text-dark-text text-sm mb-2">Quorum (minimum votes)</label>
            <input
              type="number"
              value={params.new_quorum}
              onChange={(e) => setParams({ ...params, new_quorum: e.target.value })}
              className="w-full bg-dark/50 border border-dark-border rounded-lg px-4 py-3 text-white placeholder-dark-text focus:outline-none focus:border-primary transition-colors"
              placeholder="e.g. 5"
            />
          </div>

          <div>
            <label className="block text-dark-text text-sm mb-2">Reputation Threshold</label>
            <input
              type="number"
              value={params.new_rep_threshold}
              onChange={(e) => setParams({ ...params, new_rep_threshold: e.target.value })}
              className="w-full bg-dark/50 border border-dark-border rounded-lg px-4 py-3 text-white placeholder-dark-text focus:outline-none focus:border-primary transition-colors"
              placeholder="e.g. 5"
            />
            <p className="text-dark-text text-xs mt-1">Min reputation for weighted votes</p>
          </div>

          <div>
            <label className="block text-dark-text text-sm mb-2">Vote Delay (seconds)</label>
            <input
              type="number"
              value={params.new_vote_delay}
              onChange={(e) => setParams({ ...params, new_vote_delay: e.target.value })}
              className="w-full bg-dark/50 border border-dark-border rounded-lg px-4 py-3 text-white placeholder-dark-text focus:outline-none focus:border-primary transition-colors"
              placeholder="e.g. 3600"
            />
            <p className="text-dark-text text-xs mt-1">Min time before finalization</p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-dark-text text-sm mb-2">Vote Duration (seconds)</label>
            <input
              type="number"
              value={params.new_vote_duration}
              onChange={(e) => setParams({ ...params, new_vote_duration: e.target.value })}
              className="w-full bg-dark/50 border border-dark-border rounded-lg px-4 py-3 text-white placeholder-dark-text focus:outline-none focus:border-primary transition-colors"
              placeholder="e.g. 86400"
            />
            <p className="text-dark-text text-xs mt-1">Max voting window duration</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleUpdate}
            disabled={busy}
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {busy ? 'Updating...' : 'Update Parameters'}
          </button>
        </div>
      </div>

      {/* Current values reference */}
      <div className="bg-dark-card/60 backdrop-blur border border-dark-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Current Values</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-sm">
          <div>
            <span className="text-dark-text">Min Stake</span>
            <p className="text-white font-medium">
              {(storage.min_stake?.toNumber?.() ?? Number(storage.min_stake ?? 0)) / 1_000_000} tez
            </p>
          </div>
          <div>
            <span className="text-dark-text">Quorum</span>
            <p className="text-white font-medium">{storage.quorum?.toNumber?.() ?? Number(storage.quorum ?? 0)}</p>
          </div>
          <div>
            <span className="text-dark-text">Rep Threshold</span>
            <p className="text-white font-medium">{storage.rep_threshold?.toNumber?.() ?? Number(storage.rep_threshold ?? 0)}</p>
          </div>
          <div>
            <span className="text-dark-text">Vote Delay</span>
            <p className="text-white font-medium">{storage.vote_delay?.toNumber?.() ?? Number(storage.vote_delay ?? 0)}s</p>
          </div>
          <div>
            <span className="text-dark-text">Vote Duration</span>
            <p className="text-white font-medium">{storage.vote_duration?.toNumber?.() ?? Number(storage.vote_duration ?? 0)}s</p>
          </div>
        </div>
      </div>
    </div>
  );
}

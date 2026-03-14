import { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import toast from 'react-hot-toast';
import { UserPlus, Plus, Minus, Star, Coins, Activity } from 'lucide-react';

export default function MemberPanel() {
  const { address, contract, storage, fetchStorage } = useWallet();
  const [registerAmount, setRegisterAmount] = useState('');
  const [addStakeAmount, setAddStakeAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [busy, setBusy] = useState('');
  const [member, setMember] = useState(null);

  // Async BigMap lookup — works for both real contract (Promise) and demo Map (sync)
  useEffect(() => {
    if (!storage || !address) { setMember(null); return; }
    (async () => {
      try {
        const m = await storage.members.get(address);
        setMember(m || null);
      } catch {
        setMember(null);
      }
    })();
  }, [storage, address]);

  const minStake = storage ? (storage.min_stake?.toNumber?.() ?? Number(storage.min_stake ?? 0)) / 1_000_000 : 0;

  const handleRegister = async () => {
    if (!contract || !address) return toast.error('Connect wallet first');
    const amt = parseFloat(registerAmount);
    if (!amt || amt < minStake) return toast.error(`Minimum stake is ${minStake} tez`);
    try {
      setBusy('register');
      const op = await contract.methodsObject.register().send({ amount: amt });
      toast.loading('Waiting for confirmation...', { id: 'tx' });
      await op.confirmation();
      toast.success('Registered successfully!', { id: 'tx' });
      await fetchStorage();
      setRegisterAmount('');
    } catch (err) {
      toast.error(err.message || 'Transaction failed', { id: 'tx' });
    } finally {
      setBusy('');
    }
  };

  const handleAddStake = async () => {
    if (!contract || !address) return toast.error('Connect wallet first');
    const amt = parseFloat(addStakeAmount);
    if (!amt || amt <= 0) return toast.error('Enter a valid amount');
    try {
      setBusy('addStake');
      const op = await contract.methodsObject.add_stake().send({ amount: amt });
      toast.loading('Waiting for confirmation...', { id: 'tx' });
      await op.confirmation();
      toast.success('Stake added!', { id: 'tx' });
      await fetchStorage();
      setAddStakeAmount('');
    } catch (err) {
      toast.error(err.message || 'Transaction failed', { id: 'tx' });
    } finally {
      setBusy('');
    }
  };

  const handleWithdraw = async () => {
    if (!contract || !address) return toast.error('Connect wallet first');
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt <= 0) return toast.error('Enter a valid amount');
    try {
      setBusy('withdraw');
      const op = await contract.methodsObject.withdraw_stake(amt * 1_000_000).send();
      toast.loading('Waiting for confirmation...', { id: 'tx' });
      await op.confirmation();
      toast.success('Stake withdrawn!', { id: 'tx' });
      await fetchStorage();
      setWithdrawAmount('');
    } catch (err) {
      toast.error(err.message || 'Transaction failed', { id: 'tx' });
    } finally {
      setBusy('');
    }
  };

  // Resolve member values before render (safe for both BigInt and plain number)
  const reputation = member ? (member.reputation?.toNumber?.() ?? Number(member.reputation)) : 0;
  const staked = member ? (member.staked?.toNumber?.() ?? Number(member.staked)) : 0;
  const repThreshold = storage ? (storage.rep_threshold?.toNumber?.() ?? Number(storage.rep_threshold ?? 5)) : 5;

  if (!address) {
    return (
      <div className="text-center py-20">
        <UserPlus className="w-16 h-16 text-dark-text mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Connect Your Wallet</h2>
        <p className="text-dark-text">Connect your wallet to manage your membership</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Member Panel</h1>
        <p className="text-dark-text">Manage your registration and stake</p>
      </div>

      {/* Member Profile */}
      {member ? (
        <div className="bg-dark-card/60 backdrop-blur border border-primary/20 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-warning" />
            Your Profile
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-dark/30 rounded-lg">
              <Star className="w-8 h-8 text-warning mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{reputation}</p>
              <p className="text-dark-text text-sm">Reputation</p>
              {reputation >= repThreshold ? (
                <span className="text-xs text-success mt-1 inline-block">Confirmed Voter</span>
              ) : (
                <span className="text-xs text-warning mt-1 inline-block">Probation</span>
              )}
            </div>
            <div className="text-center p-4 bg-dark/30 rounded-lg">
              <Coins className="w-8 h-8 text-accent mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">
                {(staked / 1_000_000).toFixed(2)}
              </p>
              <p className="text-dark-text text-sm">Staked (tez)</p>
            </div>
            <div className="text-center p-4 bg-dark/30 rounded-lg">
              <Activity className="w-8 h-8 text-success mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">
                {member.active ? 'Active' : 'Inactive'}
              </p>
              <p className="text-dark-text text-sm">Status</p>
            </div>
          </div>
        </div>
      ) : (
        /* Registration Form */
        <div className="bg-dark-card/60 backdrop-blur border border-dark-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary-light" />
            Register as Member
          </h2>
          <p className="text-dark-text mb-4">
            Minimum stake required: <strong className="text-white">{minStake} tez</strong>
          </p>
          <div className="flex gap-3">
            <input
              type="number"
              step="0.01"
              min={minStake}
              placeholder={`Amount in tez (min ${minStake})`}
              value={registerAmount}
              onChange={(e) => setRegisterAmount(e.target.value)}
              className="flex-1 bg-dark/50 border border-dark-border rounded-lg px-4 py-3 text-white placeholder-dark-text focus:outline-none focus:border-primary transition-colors"
            />
            <button
              onClick={handleRegister}
              disabled={busy === 'register'}
              className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 cursor-pointer"
            >
              {busy === 'register' ? 'Registering...' : 'Register'}
            </button>
          </div>
        </div>
      )}

      {/* Add Stake */}
      {member && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-dark-card/60 backdrop-blur border border-dark-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-success" />
              Add Stake
            </h2>
            <div className="flex gap-3">
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Amount in tez"
                value={addStakeAmount}
                onChange={(e) => setAddStakeAmount(e.target.value)}
                className="flex-1 bg-dark/50 border border-dark-border rounded-lg px-4 py-3 text-white placeholder-dark-text focus:outline-none focus:border-primary transition-colors"
              />
              <button
                onClick={handleAddStake}
                disabled={busy === 'addStake'}
                className="bg-success hover:bg-success/80 text-white px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 cursor-pointer"
              >
                {busy === 'addStake' ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>

          <div className="bg-dark-card/60 backdrop-blur border border-dark-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Minus className="w-5 h-5 text-danger" />
              Withdraw Stake
            </h2>
            <p className="text-dark-text text-sm mb-3">
              Must keep at least {minStake} tez staked
            </p>
            <div className="flex gap-3">
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Amount in tez"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="flex-1 bg-dark/50 border border-dark-border rounded-lg px-4 py-3 text-white placeholder-dark-text focus:outline-none focus:border-primary transition-colors"
              />
              <button
                onClick={handleWithdraw}
                disabled={busy === 'withdraw'}
                className="bg-danger hover:bg-danger/80 text-white px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 cursor-pointer"
              >
                {busy === 'withdraw' ? 'Withdrawing...' : 'Withdraw'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

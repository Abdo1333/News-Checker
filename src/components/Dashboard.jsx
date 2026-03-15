import { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { Users, Newspaper, Vote, TrendingUp, Clock, Coins, ShieldCheck } from 'lucide-react';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-dark-card/60 backdrop-blur border border-dark-border rounded-xl p-6 hover:border-primary/30 transition-all">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span className="text-dark-text text-sm">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const { storage, address } = useWallet();
  const [member, setMember] = useState(null);

  useEffect(() => {
    if (!storage || !address) { setMember(null); return; }
    (async () => {
      try {
        const m = storage.members?.get
          ? await storage.members.get(address)
          : storage.members instanceof Map
            ? storage.members.get(address)
            : null;
        setMember(m ?? null);
      } catch { setMember(null); }
    })();
  }, [storage, address]);

  if (!storage) {
    return (
      <div className="text-center py-20">
        <Newspaper className="w-16 h-16 text-dark-text mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Connect to View Dashboard</h2>
        <p className="text-dark-text">Connect your wallet and ensure the contract address is set in config.js</p>
      </div>
    );
  }

  const totalNews    = storage.next_news_id?.toNumber?.()   ?? Number(storage.next_news_id   ?? 0);
  const minStake     = storage.min_stake?.toNumber?.()      ?? Number(storage.min_stake      ?? 0);
  const quorum       = storage.quorum?.toNumber?.()         ?? Number(storage.quorum         ?? 0);
  const repThreshold = storage.rep_threshold?.toNumber?.()  ?? Number(storage.rep_threshold  ?? 0);
  const voteDelay    = storage.vote_delay?.toNumber?.()     ?? Number(storage.vote_delay     ?? 0);
  const voteDuration = storage.vote_duration?.toNumber?.()  ?? Number(storage.vote_duration  ?? 0);
  const newsDeposit  = storage.news_deposit?.toNumber?.()   ?? Number(storage.news_deposit   ?? 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-dark-text">Overview of the NewsChecker contract state</p>
      </div>

      {/* Contract Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Newspaper}   label="Total News Submitted" value={totalNews}                          color="bg-primary/20"  />
        <StatCard icon={Vote}        label="Quorum Required"       value={quorum}                            color="bg-accent/20"   />
        <StatCard icon={TrendingUp}  label="Rep. Threshold"        value={repThreshold}                      color="bg-success/20"  />
        <StatCard icon={Coins}       label="Min Stake"             value={`${minStake / 1_000_000} tez`}    color="bg-warning/20"  />
      </div>

      {/* Timing + deposit */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-dark-card/60 backdrop-blur border border-dark-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-primary-light" />
            <span className="text-dark-text text-sm">Vote Delay (min time before finalize)</span>
          </div>
          <p className="text-xl font-bold text-white">{formatDuration(voteDelay)}</p>
        </div>
        <div className="bg-dark-card/60 backdrop-blur border border-dark-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-accent" />
            <span className="text-dark-text text-sm">Vote Duration (max voting time)</span>
          </div>
          <p className="text-xl font-bold text-white">{formatDuration(voteDuration)}</p>
        </div>
        <div className="bg-dark-card/60 backdrop-blur border border-dark-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="w-5 h-5 text-warning" />
            <span className="text-dark-text text-sm">News Deposit (anti-spam)</span>
          </div>
          <p className="text-xl font-bold text-white">{newsDeposit / 1_000_000} tez</p>
          <p className="text-dark-text text-xs mt-1">Returned if Real · Kept if Fake</p>
        </div>
      </div>

      {/* Member profile */}
      {member && (
        <div className="bg-dark-card/60 backdrop-blur border border-primary/20 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-light" />
            Your Member Profile
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <span className="text-dark-text text-sm">Reputation</span>
              <p className="text-xl font-bold text-white">
                {member.reputation?.toNumber?.() ?? Number(member.reputation ?? 0)}
              </p>
            </div>
            <div>
              <span className="text-dark-text text-sm">Staked</span>
              <p className="text-xl font-bold text-white">
                {((member.staked?.toNumber?.() ?? Number(member.staked ?? 0)) / 1_000_000).toFixed(2)} tez
              </p>
            </div>
            <div>
              <span className="text-dark-text text-sm">Active Votes</span>
              <p className="text-xl font-bold text-white">
                {member.active_votes?.toNumber?.() ?? Number(member.active_votes ?? 0)}
              </p>
              {(member.active_votes?.toNumber?.() ?? Number(member.active_votes ?? 0)) > 0 && (
                <p className="text-warning text-xs mt-1">Stake locked</p>
              )}
            </div>
            <div>
              <span className="text-dark-text text-sm">Status</span>
              <p className="text-xl font-bold">
                {member.active
                  ? <span className="text-success">Active</span>
                  : <span className="text-danger">Inactive</span>}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Admin address */}
      <div className="bg-dark-card/60 backdrop-blur border border-dark-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-2">Contract Admin</h2>
        <p className="text-dark-text font-mono text-sm break-all">{storage.admin}</p>
        {address === storage.admin && (
          <span className="inline-block mt-2 text-xs bg-primary/20 text-primary-light px-2 py-1 rounded">
            You are the admin
          </span>
        )}
      </div>
    </div>
  );
}

function formatDuration(seconds) {
  if (seconds < 60)    return `${seconds}s`;
  if (seconds < 3600)  return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
}

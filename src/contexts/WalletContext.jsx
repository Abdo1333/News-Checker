import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { TezosToolkit } from '@taquito/taquito';
import { BeaconWallet } from '@taquito/beacon-wallet';
import { NetworkType } from '@airgap/beacon-dapp';
import { CONTRACT_ADDRESS, RPC_URL, NETWORK } from '../config';

const WalletContext = createContext(null);

const networkType = NETWORK === 'ghostnet' ? NetworkType.GHOSTNET : NetworkType.MAINNET;

const Tezos = new TezosToolkit(RPC_URL);
const wallet = new BeaconWallet({
  name: 'NewsChecker DApp',
  network: { type: networkType, rpcUrl: RPC_URL },
});
Tezos.setWalletProvider(wallet);

// ── Demo helpers ──────────────────────────────────────────────────────────────

const DEMO_ADMIN = 'tz1DemoAdmin000000000000000000000000';

function createInitialDemoStorage() {
  const members = new Map();
  members.set(DEMO_ADMIN, { reputation: 7, staked: 5_000_000, active: true, active_votes: 0 });

  const news = new Map();
  news.set(0, {
    author: DEMO_ADMIN, title: 'Bitcoin reaches new all-time high',
    url: 'https://example.com/btc', status: 2,
    votes_real: 10, votes_fake: 3, count_real: 4, count_fake: 1,
    submit_time: new Date(Date.now() - 86400000), deposit: 500_000,
  });
  news.set(1, {
    author: DEMO_ADMIN, title: 'New AI model claims to be sentient',
    url: 'https://example.com/ai', status: 3,
    votes_real: 2, votes_fake: 15, count_real: 1, count_fake: 5,
    submit_time: new Date(Date.now() - 43200000), deposit: 500_000,
  });
  news.set(2, {
    author: DEMO_ADMIN, title: 'Tezos launches major protocol upgrade',
    url: 'https://example.com/tezos', status: 1,
    votes_real: 3, votes_fake: 1, count_real: 2, count_fake: 1,
    submit_time: new Date(), deposit: 500_000,
  });

  return {
    admin: DEMO_ADMIN,
    min_stake:     1_000_000,
    quorum:        3,
    rep_threshold: 5,
    vote_delay:    3600,
    vote_duration: 86400,
    news_deposit:  500_000,
    next_news_id:  3,
    members,
    news,
    votes:   new Map(),   // `${news_id}-${addr}` -> bool
    claimed: new Map(),   // `${news_id}-${addr}` -> bool
  };
}

function fakeOp() {
  return { confirmation: () => new Promise((r) => setTimeout(r, 500)) };
}

function createMockContract(storageRef, setStorage) {
  function updateStorage(fn) {
    const s = { ...storageRef.current };
    fn(s);
    storageRef.current = s;
    setStorage({ ...s });
  }

  const methods = {
    register: () => ({
      send: ({ amount } = {}) => {
        const addr = storageRef.current._demoAddress;
        if (storageRef.current.members.has(addr)) throw new Error('ALREADY_REGISTERED');
        const mutez = Math.round((amount || 0) * 1_000_000);
        if (mutez < storageRef.current.min_stake) throw new Error('INSUFFICIENT_STAKE');
        updateStorage((s) => {
          s.members = new Map(s.members);
          s.members.set(addr, { reputation: 1, staked: mutez, active: true, active_votes: 0 });
        });
        return fakeOp();
      },
    }),

    add_stake: () => ({
      send: ({ amount } = {}) => {
        const addr = storageRef.current._demoAddress;
        const m = storageRef.current.members.get(addr);
        if (!m) throw new Error('NOT_REGISTERED');
        const mutez = Math.round((amount || 0) * 1_000_000);
        if (mutez <= 0) throw new Error('ZERO_AMOUNT');
        updateStorage((s) => {
          s.members = new Map(s.members);
          s.members.set(addr, { ...m, staked: m.staked + mutez });
        });
        return fakeOp();
      },
    }),

    withdraw_stake: (amount) => ({
      send: () => {
        const addr = storageRef.current._demoAddress;
        const m = storageRef.current.members.get(addr);
        if (!m) throw new Error('NOT_REGISTERED');
        if (m.active_votes > 0) throw new Error('ACTIVE_VOTES');
        const mutez = typeof amount === 'number' ? amount : Number(amount);
        if (m.staked < mutez) throw new Error('NOT_ENOUGH');
        updateStorage((s) => {
          s.members = new Map(s.members);
          s.members.set(addr, { ...m, staked: m.staked - mutez });
        });
        return fakeOp();
      },
    }),

    submit_news: (title, url) => ({
      send: ({ amount } = {}) => {
        const addr = storageRef.current._demoAddress;
        if (!storageRef.current.members.has(addr)) throw new Error('NOT_REGISTERED');
        const mutez = Math.round((amount || 0) * 1_000_000);
        if (mutez < storageRef.current.news_deposit) throw new Error('INSUFFICIENT_DEPOSIT');
        const nid = storageRef.current.next_news_id;
        updateStorage((s) => {
          s.news = new Map(s.news);
          s.news.set(nid, {
            author: addr, title, url, status: 1,
            votes_real: 0, votes_fake: 0, count_real: 0, count_fake: 0,
            submit_time: new Date(), deposit: mutez,
          });
          s.next_news_id = nid + 1;
        });
        return fakeOp();
      },
    }),

    vote: (newsId, opinion) => ({
      send: () => {
        const addr = storageRef.current._demoAddress;
        const n = storageRef.current.news.get(newsId);
        if (!n) throw new Error('NEWS_NOT_FOUND');
        if (n.status !== 1) throw new Error('NOT_IN_VOTING');
        const m = storageRef.current.members.get(addr);
        if (!m) throw new Error('NOT_REGISTERED');
        if (m.staked < storageRef.current.min_stake) throw new Error('STAKE_TOO_LOW');
        const voteKey = `${newsId}-${addr}`;
        if (storageRef.current.votes.has(voteKey)) throw new Error('ALREADY_VOTED');
        const w = m.reputation >= storageRef.current.rep_threshold ? m.reputation : 0;
        updateStorage((s) => {
          s.news    = new Map(s.news);
          s.votes   = new Map(s.votes);
          s.members = new Map(s.members);
          s.votes.set(voteKey, opinion);
          s.members.set(addr, { ...m, active_votes: m.active_votes + 1 });
          const up = { ...n };
          if (opinion) { up.votes_real += w; up.count_real += 1; }
          else         { up.votes_fake += w; up.count_fake += 1; }
          s.news.set(newsId, up);
        });
        return fakeOp();
      },
    }),

    finalize: (newsId) => ({
      send: () => {
        const n = storageRef.current.news.get(newsId);
        if (!n) throw new Error('NEWS_NOT_FOUND');
        if (n.status !== 1) throw new Error('NOT_IN_VOTING');
        if (n.count_real + n.count_fake === 0) throw new Error('NO_VOTES');
        const w = n.votes_real + n.votes_fake;
        let finalStatus = 3;
        if (w > 0) { if (n.votes_real > n.votes_fake) finalStatus = 2; }
        else       { if (n.count_real  > n.count_fake)  finalStatus = 2; }
        updateStorage((s) => {
          s.news = new Map(s.news);
          s.news.set(newsId, { ...n, status: finalStatus });
        });
        return fakeOp();
      },
    }),

    claim_reward: (newsId) => ({
      send: () => {
        const addr = storageRef.current._demoAddress;
        const n = storageRef.current.news.get(newsId);
        if (!n) throw new Error('NEWS_NOT_FOUND');
        if (n.status !== 2 && n.status !== 3) throw new Error('NOT_FINALIZED');
        const voteKey = `${newsId}-${addr}`;
        if (!storageRef.current.votes.has(voteKey)) throw new Error('NOT_A_VOTER');
        if (storageRef.current.claimed.has(voteKey)) throw new Error('ALREADY_CLAIMED');
        const opinion = storageRef.current.votes.get(voteKey);
        const isReal  = n.status === 2;
        const m = storageRef.current.members.get(addr);
        updateStorage((s) => {
          s.claimed = new Map(s.claimed);
          s.members = new Map(s.members);
          s.claimed.set(voteKey, true);
          const newActiveVotes = Math.max(0, m.active_votes - 1);
          const newRep = (opinion === isReal)
            ? m.reputation + 2
            : (m.reputation > 4 ? m.reputation - 3 : 1);
          s.members.set(addr, { ...m, reputation: newRep, active_votes: newActiveVotes });
        });
        return fakeOp();
      },
    }),

    cancel_news: (newsId) => ({
      send: () => {
        const addr = storageRef.current._demoAddress;
        const n = storageRef.current.news.get(newsId);
        if (!n) throw new Error('NEWS_NOT_FOUND');
        if (n.status !== 1) throw new Error('NOT_IN_VOTING');
        if (addr !== n.author) throw new Error('NOT_AUTHOR');
        if (n.count_real + n.count_fake > 0) throw new Error('HAS_VOTES');
        const deadline = new Date(n.submit_time.getTime() + storageRef.current.vote_duration * 1000);
        if (new Date() < deadline) throw new Error('DEADLINE_NOT_PASSED');
        updateStorage((s) => {
          s.news = new Map(s.news);
          s.news.set(newsId, { ...n, status: 4 });
        });
        return fakeOp();
      },
    }),

    update_params: (new_min_stake, new_quorum, new_rep_threshold,
                    new_vote_delay, new_vote_duration, new_news_deposit) => ({
      send: () => {
        const addr = storageRef.current._demoAddress;
        if (addr !== storageRef.current.admin) throw new Error('NOT_ADMIN');
        updateStorage((s) => {
          s.min_stake     = Number(new_min_stake);
          s.quorum        = Number(new_quorum);
          s.rep_threshold = Number(new_rep_threshold);
          s.vote_delay    = Number(new_vote_delay);
          s.vote_duration = Number(new_vote_duration);
          s.news_deposit  = Number(new_news_deposit);
        });
        return fakeOp();
      },
    }),
  };

  return {
    methods,
    get methodsObject() {
      const m = this.methods;
      return {
        register:      ()                       => m.register(),
        add_stake:     ()                       => m.add_stake(),
        withdraw_stake:(amount)                 => m.withdraw_stake(amount),
        submit_news:   ({ title, url })         => m.submit_news(title, url),
        vote:          ({ news_id, opinion })   => m.vote(news_id, opinion),
        finalize:      (news_id)                => m.finalize(news_id),
        claim_reward:  (news_id)                => m.claim_reward(news_id),
        cancel_news:   (news_id)                => m.cancel_news(news_id),
        update_params: ({
          new_min_stake, new_quorum, new_rep_threshold,
          new_vote_delay, new_vote_duration, new_news_deposit,
        }) => m.update_params(
          new_min_stake, new_quorum, new_rep_threshold,
          new_vote_delay, new_vote_duration, new_news_deposit,
        ),
      };
    },
  };
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function WalletProvider({ children }) {
  const [address,  setAddress]  = useState(null);
  const [contract, setContract] = useState(null);
  const [storage,  setStorage]  = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [demoMode, setDemoMode] = useState(false);
  const demoStorageRef = useRef(null);

  const fetchStorage = useCallback(async () => {
    if (demoStorageRef.current) {
      setStorage({ ...demoStorageRef.current });
      return demoStorageRef.current;
    }
    try {
      const c = await Tezos.wallet.at(CONTRACT_ADDRESS);
      setContract(c);
      const s = await c.storage();
      setStorage(s);
      return s;
    } catch (err) {
      console.error('Failed to fetch storage:', err);
      setError('Failed to connect to contract. Check the contract address.');
      return null;
    }
  }, []);

  const connect = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await wallet.requestPermissions();
      const addr = await wallet.getPKH();
      setAddress(addr);
      await fetchStorage();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchStorage]);

  const connectDemo = useCallback(() => {
    setError(null);
    const s = createInitialDemoStorage();
    s._demoAddress = DEMO_ADMIN;
    demoStorageRef.current = s;
    setStorage({ ...s });
    setAddress(DEMO_ADMIN);
    setContract(createMockContract(demoStorageRef, setStorage));
    setDemoMode(true);
  }, []);

  const disconnect = useCallback(async () => {
    if (demoMode) {
      demoStorageRef.current = null;
      setDemoMode(false);
      setAddress(null);
      setContract(null);
      setStorage(null);
      return;
    }
    await wallet.clearActiveAccount();
    setAddress(null);
  }, [demoMode]);

  useEffect(() => {
    (async () => {
      const active = await wallet.client.getActiveAccount();
      if (active) {
        setAddress(active.address);
        await fetchStorage();
      }
    })();
  }, [fetchStorage]);

  return (
    <WalletContext.Provider value={{
      Tezos, wallet, address, contract, storage,
      loading, error, demoMode,
      connect, connectDemo, disconnect, fetchStorage, setError,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}

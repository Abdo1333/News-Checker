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
  network: {
    type: networkType,
    rpcUrl: RPC_URL,
  },
});
Tezos.setWalletProvider(wallet);

// ── Demo Mode helpers ──

const DEMO_ADMIN = 'tz1DemoAdmin000000000000000000000000';
const DEMO_USER = 'tz1DemoUser0000000000000000000000000';

function createInitialDemoStorage() {
  const members = new Map();
  members.set(DEMO_ADMIN, { reputation: 7, staked: 5_000_000, active: true });

  const news = new Map();
  news.set(0, {
    author: DEMO_ADMIN,
    title: 'Bitcoin reaches new all-time high',
    url: 'https://example.com/btc',
    status: 2,
    votes_real: 10,
    votes_fake: 3,
    count_real: 4,
    count_fake: 1,
    submit_time: new Date(Date.now() - 86400000),
  });
  news.set(1, {
    author: DEMO_ADMIN,
    title: 'New AI model claims to be sentient',
    url: 'https://example.com/ai',
    status: 3,
    votes_real: 2,
    votes_fake: 15,
    count_real: 1,
    count_fake: 5,
    submit_time: new Date(Date.now() - 43200000),
  });
  news.set(2, {
    author: DEMO_ADMIN,
    title: 'Tezos launches major protocol upgrade',
    url: 'https://example.com/tezos',
    status: 1,
    votes_real: 3,
    votes_fake: 1,
    count_real: 2,
    count_fake: 1,
    submit_time: new Date(),
  });

  const votes = new Map();
  const voters = new Map();
  voters.set(0, [DEMO_ADMIN]);
  voters.set(1, [DEMO_ADMIN]);
  voters.set(2, [DEMO_ADMIN]);

  return {
    admin: DEMO_ADMIN,
    min_stake: 1_000_000,
    quorum: 3,
    rep_threshold: 5,
    vote_delay: 3600,
    vote_duration: 86400,
    next_news_id: 3,
    members,
    news,
    votes,
    voters,
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

  return {
    methods: {
      register: () => ({
        send: ({ amount } = {}) => {
          const addr = storageRef.current._demoAddress;
          if (storageRef.current.members.has(addr)) throw new Error('ALREADY_REGISTERED');
          const mutez = Math.round((amount || 2) * 1_000_000);
          if (mutez < storageRef.current.min_stake) throw new Error('INSUFFICIENT_STAKE');
          updateStorage((s) => {
            s.members = new Map(s.members);
            s.members.set(addr, { reputation: 1, staked: mutez, active: true });
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
          const mutez = typeof amount === 'number' ? amount : Number(amount);
          if (m.staked < mutez) throw new Error('NOT_ENOUGH');
          if (m.staked - mutez < storageRef.current.min_stake) throw new Error('BELOW_MINIMUM');
          updateStorage((s) => {
            s.members = new Map(s.members);
            s.members.set(addr, { ...m, staked: m.staked - mutez });
          });
          return fakeOp();
        },
      }),

      submit_news: (title, url) => ({
        send: () => {
          const addr = storageRef.current._demoAddress;
          if (!storageRef.current.members.has(addr)) throw new Error('NOT_REGISTERED');
          const nid = storageRef.current.next_news_id;
          updateStorage((s) => {
            s.news = new Map(s.news);
            s.news.set(nid, {
              author: addr,
              title,
              url,
              status: 1,
              votes_real: 0,
              votes_fake: 0,
              count_real: 0,
              count_fake: 0,
              submit_time: new Date(),
            });
            s.voters = new Map(s.voters);
            s.voters.set(nid, []);
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
          const voteKey = `${newsId}-${addr}`;
          if (storageRef.current.votes.has(voteKey)) throw new Error('ALREADY_VOTED');
          const w = m.reputation >= storageRef.current.rep_threshold ? m.reputation : 0;
          updateStorage((s) => {
            s.news = new Map(s.news);
            s.votes = new Map(s.votes);
            s.voters = new Map(s.voters);
            s.votes.set(voteKey, opinion);
            const voterList = [...(s.voters.get(newsId) || []), addr];
            s.voters.set(newsId, voterList);
            const updated = { ...n };
            if (opinion) {
              updated.votes_real = n.votes_real + w;
              updated.count_real = n.count_real + 1;
            } else {
              updated.votes_fake = n.votes_fake + w;
              updated.count_fake = n.count_fake + 1;
            }
            s.news.set(newsId, updated);
          });
          return fakeOp();
        },
      }),

      finalize: (newsId) => ({
        send: () => {
          const n = storageRef.current.news.get(newsId);
          if (!n) throw new Error('NEWS_NOT_FOUND');
          if (n.status !== 1) throw new Error('NOT_IN_VOTING');
          const totalCount = n.count_real + n.count_fake;
          if (totalCount === 0) throw new Error('NO_VOTES');
          const weightedTotal = n.votes_real + n.votes_fake;
          let finalStatus = 3;
          if (weightedTotal > 0) {
            if (n.votes_real > n.votes_fake) finalStatus = 2;
          } else {
            if (n.count_real > n.count_fake) finalStatus = 2;
          }
          const isReal = finalStatus === 2;
          updateStorage((s) => {
            s.news = new Map(s.news);
            s.news.set(newsId, { ...n, status: finalStatus });
            s.members = new Map(s.members);
            const voterList = s.voters.get(newsId) || [];
            for (const voter of voterList) {
              const voteKey = `${newsId}-${voter}`;
              const voterOpinion = s.votes.get(voteKey);
              const m = s.members.get(voter);
              if (m && voterOpinion !== undefined) {
                if (voterOpinion === isReal) {
                  s.members.set(voter, { ...m, reputation: m.reputation + 2 });
                } else {
                  const newRep = m.reputation > 4 ? m.reputation - 3 : 1;
                  s.members.set(voter, { ...m, reputation: newRep });
                }
              }
            }
          });
          return fakeOp();
        },
      }),

      update_params: (new_min_stake, new_quorum, new_rep_threshold, new_vote_delay, new_vote_duration) => ({
        send: () => {
          const addr = storageRef.current._demoAddress;
          if (addr !== storageRef.current.admin) throw new Error('NOT_ADMIN');
          updateStorage((s) => {
            s.min_stake = typeof new_min_stake === 'number' ? new_min_stake : Number(new_min_stake);
            s.quorum = typeof new_quorum === 'number' ? new_quorum : Number(new_quorum);
            s.rep_threshold = typeof new_rep_threshold === 'number' ? new_rep_threshold : Number(new_rep_threshold);
            s.vote_delay = typeof new_vote_delay === 'number' ? new_vote_delay : Number(new_vote_delay);
            s.vote_duration = typeof new_vote_duration === 'number' ? new_vote_duration : Number(new_vote_duration);
          });
          return fakeOp();
        },
      }),
    },

    // methodsObject: Taquito 17+ API with named/object params (used for real contract calls)
    get methodsObject() {
      const m = this.methods;
      return {
        register: () => m.register(),
        add_stake: () => m.add_stake(),
        withdraw_stake: (amount) => m.withdraw_stake(amount),
        submit_news: ({ title, url }) => m.submit_news(title, url),
        vote: ({ news_id, opinion }) => m.vote(news_id, opinion),
        finalize: (news_id) => m.finalize(news_id),
        update_params: ({ new_min_stake, new_quorum, new_rep_threshold, new_vote_delay, new_vote_duration }) =>
          m.update_params(new_min_stake, new_quorum, new_rep_threshold, new_vote_delay, new_vote_duration),
      };
    },
  };
}

// ── Provider ──

export function WalletProvider({ children }) {
  const [address, setAddress] = useState(null);
  const [contract, setContract] = useState(null);
  const [storage, setStorage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
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
      console.error('Connection failed:', err);
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

  const value = {
    Tezos,
    wallet,
    address,
    contract,
    storage,
    loading,
    error,
    demoMode,
    connect,
    connectDemo,
    disconnect,
    fetchStorage,
    setError,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}

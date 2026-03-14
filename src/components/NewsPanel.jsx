import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../contexts/WalletContext';
import toast from 'react-hot-toast';
import { STATUS_LABELS } from '../config';
import {
  Newspaper, Send, ThumbsUp, ThumbsDown, Gavel, ExternalLink,
  Clock, ChevronDown, ChevronUp, Filter, UserPlus
} from 'lucide-react';

export default function NewsPanel() {
  const { address, contract, storage, fetchStorage } = useWallet();
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState('');
  const [newsList, setNewsList] = useState([]);
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [isMember, setIsMember] = useState(false);

  // Check membership — works for both real BigMap (async) and demo Map (sync)
  useEffect(() => {
    if (!storage || !address) { setIsMember(false); return; }
    (async () => {
      try {
        const m = await storage.members.get(address);
        setIsMember(!!m);
      } catch {
        setIsMember(false);
      }
    })();
  }, [storage, address]);

  const loadNews = useCallback(async () => {
    if (!storage) return;
    const total = storage.next_news_id?.toNumber?.() ?? Number(storage.next_news_id ?? 0);
    const items = [];
    for (let i = 0; i < total; i++) {
      try {
        const news = await storage.news.get(i);
        if (news) {
          items.push({ id: i, ...serializeNews(news) });
        }
      } catch {
        // skip missing entries
      }
    }
    setNewsList(items.reverse());
  }, [storage]);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  const handleSubmit = async () => {
    if (!contract || !address) return toast.error('Connect wallet first');
    if (!isMember) return toast.error('You must be a registered member to submit news. Go to the Member tab first.');
    if (!title.trim()) return toast.error('Enter a title');
    if (!url.trim()) return toast.error('Enter a URL');
    try {
      setBusy('submit');
      const op = await contract.methodsObject.submit_news({ title: title.trim(), url: url.trim() }).send();
      toast.loading('Submitting news...', { id: 'tx' });
      await op.confirmation();
      toast.success('News submitted!', { id: 'tx' });
      setTitle('');
      setUrl('');
      await fetchStorage();
      setTimeout(loadNews, 1000);
    } catch (err) {
      toast.error(err.message || 'Transaction failed', { id: 'tx' });
    } finally {
      setBusy('');
    }
  };

  const handleVote = async (newsId, opinion) => {
    if (!contract || !address) return toast.error('Connect wallet first');
    try {
      setBusy(`vote-${newsId}`);
      const op = await contract.methodsObject.vote({ news_id: newsId, opinion }).send();
      toast.loading('Voting...', { id: 'tx' });
      await op.confirmation();
      toast.success(`Voted ${opinion ? 'Real' : 'Fake'}!`, { id: 'tx' });
      await fetchStorage();
      setTimeout(loadNews, 1000);
    } catch (err) {
      toast.error(err.message || 'Transaction failed', { id: 'tx' });
    } finally {
      setBusy('');
    }
  };

  const handleFinalize = async (newsId) => {
    if (!contract || !address) return toast.error('Connect wallet first');
    try {
      setBusy(`finalize-${newsId}`);
      const op = await contract.methodsObject.finalize(newsId).send();
      toast.loading('Finalizing...', { id: 'tx' });
      await op.confirmation();
      toast.success('News finalized!', { id: 'tx' });
      await fetchStorage();
      setTimeout(loadNews, 1000);
    } catch (err) {
      toast.error(err.message || 'Transaction failed', { id: 'tx' });
    } finally {
      setBusy('');
    }
  };

  const filtered = newsList.filter((n) => {
    if (filter === 'voting') return n.status === 1;
    if (filter === 'real') return n.status === 2;
    if (filter === 'fake') return n.status === 3;
    return true;
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">News</h1>
        <p className="text-dark-text">Submit, vote, and verify news articles</p>
      </div>

      {/* Submit News */}
      {address && (
        isMember ? (
          <div className="bg-dark-card/60 backdrop-blur border border-dark-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Send className="w-5 h-5 text-primary-light" />
              Submit News for Verification
            </h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="News title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-dark/50 border border-dark-border rounded-lg px-4 py-3 text-white placeholder-dark-text focus:outline-none focus:border-primary transition-colors"
              />
              <input
                type="url"
                placeholder="Source URL (https://...)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-dark/50 border border-dark-border rounded-lg px-4 py-3 text-white placeholder-dark-text focus:outline-none focus:border-primary transition-colors"
              />
              <button
                onClick={handleSubmit}
                disabled={busy === 'submit'}
                className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 cursor-pointer"
              >
                {busy === 'submit' ? 'Submitting...' : 'Submit News'}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-warning/10 border border-warning/30 rounded-xl p-5 flex items-start gap-3">
            <UserPlus className="w-5 h-5 text-warning mt-0.5 shrink-0" />
            <div>
              <p className="text-warning font-medium">Member registration required</p>
              <p className="text-dark-text text-sm mt-1">
                You must be a registered member to submit news.
                Go to the <strong className="text-white">Member</strong> tab, stake at least the minimum amount, and register first.
              </p>
            </div>
          </div>
        )
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-dark-text" />
        {['all', 'voting', 'real', 'fake'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all capitalize cursor-pointer ${
              filter === f
                ? 'bg-primary text-white'
                : 'text-dark-text hover:text-white bg-dark-card/40 hover:bg-dark-card/60'
            }`}
          >
            {f}
          </button>
        ))}
        <button
          onClick={loadNews}
          className="ml-auto text-dark-text hover:text-white text-sm cursor-pointer"
        >
          Refresh
        </button>
      </div>

      {/* News List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <Newspaper className="w-12 h-12 text-dark-text mx-auto mb-3" />
          <p className="text-dark-text">No news found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((news) => (
            <NewsCard
              key={news.id}
              news={news}
              expanded={expandedId === news.id}
              onToggle={() => setExpandedId(expandedId === news.id ? null : news.id)}
              onVote={handleVote}
              onFinalize={handleFinalize}
              busy={busy}
              currentAddress={address}
              storage={storage}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NewsCard({ news, expanded, onToggle, onVote, onFinalize, busy, currentAddress, storage }) {
  const statusInfo = STATUS_LABELS[news.status] || STATUS_LABELS[0];
  const totalVotes = news.count_real + news.count_fake;
  const voteDuration = storage?.vote_duration?.toNumber?.() ?? Number(storage?.vote_duration ?? 86400);
  const submitTime = news.submit_time instanceof Date ? news.submit_time : new Date(news.submit_time);
  const deadline = new Date(submitTime.getTime() + voteDuration * 1000);
  const now = new Date();
  const isExpired = now >= deadline;
  const isVoting = news.status === 1;

  return (
    <div className="bg-dark-card/60 backdrop-blur border border-dark-border rounded-xl overflow-hidden hover:border-dark-border/80 transition-all">
      <div
        className="flex items-center justify-between p-5 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${statusInfo.color}`}>
              {statusInfo.text}
            </span>
            <span className="text-dark-text text-xs">#{news.id}</span>
            {isVoting && (
              <span className={`text-xs ${isExpired ? 'text-danger' : 'text-warning'}`}>
                <Clock className="w-3 h-3 inline mr-1" />
                {isExpired ? 'Voting ended' : `Ends ${deadline.toLocaleString()}`}
              </span>
            )}
          </div>
          <h3 className="text-white font-medium truncate">{news.title}</h3>
          <p className="text-dark-text text-sm truncate font-mono">{news.author}</p>
        </div>
        <div className="flex items-center gap-4 ml-4">
          <div className="text-center">
            <p className="text-success font-bold">{news.count_real}</p>
            <p className="text-dark-text text-xs">Real</p>
          </div>
          <div className="text-center">
            <p className="text-danger font-bold">{news.count_fake}</p>
            <p className="text-dark-text text-xs">Fake</p>
          </div>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-dark-text" />
          ) : (
            <ChevronDown className="w-5 h-5 text-dark-text" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-dark-border p-5 space-y-4">
          {/* Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-dark-text">Weighted Real</span>
              <p className="text-white font-medium">{news.votes_real}</p>
            </div>
            <div>
              <span className="text-dark-text">Weighted Fake</span>
              <p className="text-white font-medium">{news.votes_fake}</p>
            </div>
            <div>
              <span className="text-dark-text">Total Votes</span>
              <p className="text-white font-medium">{totalVotes}</p>
            </div>
            <div>
              <span className="text-dark-text">Submitted</span>
              <p className="text-white font-medium">{submitTime.toLocaleString()}</p>
            </div>
          </div>

          {/* URL */}
          <a
            href={news.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-primary-light hover:text-primary text-sm transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            View Source
          </a>

          {/* Actions */}
          {isVoting && currentAddress && (
            <div className="flex flex-wrap gap-3 pt-2">
              {!isExpired && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); onVote(news.id, true); }}
                    disabled={busy === `vote-${news.id}`}
                    className="flex items-center gap-2 bg-success/20 hover:bg-success/30 text-success px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    Vote Real
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onVote(news.id, false); }}
                    disabled={busy === `vote-${news.id}`}
                    className="flex items-center gap-2 bg-danger/20 hover:bg-danger/30 text-danger px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <ThumbsDown className="w-4 h-4" />
                    Vote Fake
                  </button>
                </>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onFinalize(news.id); }}
                disabled={busy === `finalize-${news.id}`}
                className="flex items-center gap-2 bg-warning/20 hover:bg-warning/30 text-warning px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 cursor-pointer"
              >
                <Gavel className="w-4 h-4" />
                {busy === `finalize-${news.id}` ? 'Finalizing...' : 'Finalize'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function serializeNews(news) {
  return {
    author: news.author,
    title: news.title,
    url: news.url,
    status: news.status?.toNumber?.() ?? Number(news.status),
    votes_real: news.votes_real?.toNumber?.() ?? Number(news.votes_real),
    votes_fake: news.votes_fake?.toNumber?.() ?? Number(news.votes_fake),
    count_real: news.count_real?.toNumber?.() ?? Number(news.count_real),
    count_fake: news.count_fake?.toNumber?.() ?? Number(news.count_fake),
    submit_time: news.submit_time,
  };
}

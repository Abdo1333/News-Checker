# NewsChecker DApp

**Decentralized News Verification on Tezos**

A Web3 application that allows community members to submit, vote on, and verify news articles using a reputation-weighted voting system deployed as a smart contract on the Tezos blockchain (Ghostnet).

[![Netlify Status](https://api.netlify.com/api/v1/badges/placeholder/deploy-status)](https://app.netlify.com)
![Tezos](https://img.shields.io/badge/Tezos-Ghostnet-blue?logo=tezos)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react)
![License](https://img.shields.io/badge/License-MIT-green)

---

## Live Demo

🌐 **[news-checker.netlify.app](https://news-checker.netlify.app)** *(update with your Netlify URL)*

> Try it instantly without a wallet using **Demo Mode** — no installation needed.

---

## Features

- 📰 **Submit news** articles for community verification
- 🗳️ **Reputation-weighted voting** — experienced members carry more weight
- ⚖️ **Finalization engine** — dual-mode (quorum + delay, or time deadline)
- 🏦 **Stake system** — members lock tez as skin-in-the-game
- 🔐 **Anti-sybil protection** — probation period for new members (rep < 5)
- 🧪 **Demo mode** — full simulation without connecting a real wallet
- 📱 **Responsive UI** — works on desktop and mobile

---

## Smart Contract

| Property | Value |
|---|---|
| Network | Tezos Ghostnet |
| Address | [`KT1H49BAbxYfBReehN4dShGpm6jVWapXPgeq`](https://ghostnet.tzkt.io/KT1H49BAbxYfBReehN4dShGpm6jVWapXPgeq) |
| Language | SmartPy 0.20 |
| RPC | `https://ghostnet.smartpy.io` |

### Entrypoints

| Entrypoint | Description |
|---|---|
| `register` | Join as a member by staking tez |
| `add_stake` | Increase your stake |
| `withdraw_stake` | Withdraw part of your stake |
| `submit_news` | Submit a news article for verification |
| `vote` | Cast a weighted vote (Real / Fake) |
| `finalize` | Finalize voting and update reputations |
| `update_params` | Admin: update contract parameters |

### Reputation System

| Status | Reputation | Voting weight |
|---|---|---|
| Probation | < 5 | 0 (vote counted, weight = 0) |
| Confirmed | ≥ 5 | = reputation score |

- Correct vote → **+2 reputation**
- Wrong vote → **−3 reputation** (min 1)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Contract | SmartPy 0.20 on Tezos |
| Frontend | React 19 + Vite 8 |
| Styling | Tailwind CSS 4 |
| Blockchain SDK | Taquito 24.2 |
| Wallet | Beacon SDK 4.8 (Kukai, Temple, etc.) |
| Icons | Lucide React |
| Notifications | React Hot Toast |

---

## Getting Started

### Prerequisites
- Node.js 18+
- A Tezos wallet (Kukai, Temple) with Ghostnet tez — get free tez at [faucet.ghostnet.teztnets.com](https://faucet.ghostnet.teztnets.com)

### Install & Run

```bash
git clone https://github.com/Abdo1333/News-Checker.git
cd News-Checker
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Build for Production

```bash
npm run build
```

Output is in the `dist/` folder.

---

## How to Use

### With Demo Mode (no wallet needed)
1. Click **Demo** in the top-right corner
2. Explore all features with pre-populated data

### With a Real Wallet (Ghostnet)
1. Click **Connect Wallet** and select your wallet (Kukai recommended)
2. Go to **Member** tab → enter ≥ 1 tez → click **Register**
3. Once registered, go to **News** tab → submit articles
4. Vote on articles submitted by others
5. Click **Finalize** after the voting period ends

---

## Project Structure

```
src/
├── components/
│   ├── Navbar.jsx          # Navigation + wallet connect
│   ├── Dashboard.jsx       # Stats overview
│   ├── NewsPanel.jsx       # Submit / vote / finalize news
│   ├── MemberPanel.jsx     # Register / manage stake
│   └── AdminPanel.jsx      # Contract parameter management
├── contexts/
│   └── WalletContext.jsx   # Beacon wallet + demo mode
├── config.js               # Contract address + RPC
└── main.jsx
```

---

## Configuration

Edit `src/config.js` to point to your own deployed contract:

```js
export const CONTRACT_ADDRESS = 'KT1H49BAbxYfBReehN4dShGpm6jVWapXPgeq';
export const RPC_URL = 'https://ghostnet.smartpy.io';
export const NETWORK = 'ghostnet';
```

---

## License

MIT © 2025

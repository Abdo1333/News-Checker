// ⚠️ Update this address after deploying the new NewsChecker contract on Ghostnet
export const CONTRACT_ADDRESS = 'KT1H49BAbxYfBReehN4dShGpm6jVWapXPgeq';

// Tezos RPC node (SmartPy Ghostnet node)
export const RPC_URL = 'https://ghostnet.smartpy.io';

// Network
export const NETWORK = 'ghostnet';

// Status labels — matches NewsChecker contract:
// 1 = Voting  2 = Real  3 = Fake  4 = Cancelled
export const STATUS_LABELS = {
  0: { text: 'Unknown',   color: 'bg-gray-500'   },
  1: { text: 'Voting',    color: 'bg-yellow-500' },
  2: { text: 'Real',      color: 'bg-green-500'  },
  3: { text: 'Fake',      color: 'bg-red-500'    },
  4: { text: 'Cancelled', color: 'bg-gray-400'   },
};

export const LoanStatus = ["INITIAL", "FUNDED", "ACTIVE", "REPAID", "CLOSED"];

export const HARDHAT_LOCAL_NETWORK = {
  chainId: "0x7A69",
  chainName: "Hardhat Local Node",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: ["http://localhost:8545"],
};

export const env = process.env.REACT_APP_ENV;

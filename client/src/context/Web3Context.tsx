import { ethers } from "ethers";
import React, {
  useState,
  useEffect,
  useMemo,
  useContext,
  useCallback,
} from "react";
import {
  LoaNFT,
  LoanRequestStructOutput,
  LoanStructOutput,
} from "../generated/contract-types/LoaNFT";
import { TestNFT } from "../generated/contract-types/TestNFT";
import { useLoaNFTContract } from "../hooks/useLoaNFTContract";
import { useTestNFTContract } from "../hooks/useTestNFTContract";
import { useWeb3modal } from "../hooks/useWeb3Modal";

interface IWeb3Context {
  error?: Error;
  ethersProvider?: ethers.providers.Web3Provider;
  connected: boolean;
  selectedAddress?: string;
  contracts: { loaNFT?: LoaNFT; testNFT?: TestNFT };
  loanRequests: LoanRequestStructOutput[];
  loans: LoanStructOutput[];
  isLoading: boolean;
  connect?: () => void;
  getAllLoans: () => void;
  getAllLoanRequests: () => void;
  missingContracts?: { [key: string]: boolean };
}

export const Web3Context = React.createContext<IWeb3Context>({
  connected: false,
  loanRequests: [],
  loans: [],
  isLoading: true,
  contracts: {},
  getAllLoans: () => {},
  getAllLoanRequests: () => {},
});

export const Web3ContextProvider: React.FC = ({ children }) => {
  const { error, ethersProvider, connected, selectedAddress, connect } =
    useWeb3modal();

  const { contractInstance: loaNFT, deployed: loaNFTDeployed } =
    useLoaNFTContract(ethersProvider);
  const { contractInstance: testNFT, deployed: testNFTDeployed } =
    useTestNFTContract(ethersProvider);

  const [loanRequests, setLoanRequests] = useState<LoanRequestStructOutput[]>(
    []
  );

  const [loans, setLoans] = useState<LoanStructOutput[]>([]);

  const isLoading = useMemo(
    () => !connected || !loaNFT || !testNFT,
    [connected, loaNFT, testNFT]
  );

  const getAllLoanRequests = useCallback(() => {
    if (!loaNFT || !loaNFTDeployed) return;
    loaNFT.getAllLoanRequests().then((requests) => {
      setLoanRequests(requests);
    });
  }, [loaNFT, loaNFTDeployed]);

  useEffect(() => {
    if (!loaNFT || !loaNFTDeployed) return;
    getAllLoanRequests();
    const onLoanRequested = () => {
      getAllLoanRequests();
    };
    loaNFT.on("LoanRequested", onLoanRequested);

    return () => {
      loaNFT.off("LoanRequested", onLoanRequested);
    };
  }, [loaNFT, getAllLoanRequests, loaNFTDeployed]);

  const getAllLoans = useCallback(() => {
    if (!loaNFT || !loaNFTDeployed) return;
    loaNFT.getAllLoans().then((loans) => {
      setLoans(loans);
    });
  }, [loaNFT, loaNFTDeployed]);

  useEffect(() => {
    getAllLoans();
  }, [getAllLoans]);

  return (
    <Web3Context.Provider
      value={{
        error,
        ethersProvider,
        connected,
        selectedAddress,
        loanRequests,
        loans,
        isLoading,
        contracts: { loaNFT, testNFT },
        connect,
        getAllLoans,
        getAllLoanRequests,
        missingContracts: {
          loaNFT: loaNFTDeployed,
          testNFT: testNFTDeployed,
        },
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error("useWeb3 can only be used inside Web3ContextProvider");
  }
  return context;
};

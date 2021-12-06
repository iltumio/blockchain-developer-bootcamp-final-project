import { useEffect, useState } from "react";
import { ethers } from "ethers";

import ContractAddresses from "../generated/contracts/contract-address.json";
import TestNFTAbi from "../generated/contracts/TestNFT-abi.json";
import { TestNFT } from "../generated/contract-types/TestNFT";

export function useTestNFTContract(provider?: ethers.providers.Web3Provider) {
  const [contractInstance, setContractInstance] = useState<TestNFT>();

  useEffect(() => {
    if (provider && !contractInstance) {
      setContractInstance(
        new ethers.Contract(
          ContractAddresses.TestNFT,
          TestNFTAbi,
          provider.getSigner()
        ) as TestNFT
      );
    }
  }, [provider, contractInstance]);

  return contractInstance;
}

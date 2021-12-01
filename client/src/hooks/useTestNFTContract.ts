import { useState } from "react";
import { ethers } from "ethers";

import ContractAddresses from "../generated/contracts/contract-address.json";
import TestNFTAbi from "../generated/contracts/LoaNFT-abi.json";
import { TestNFT } from "../generated/contract-types/TestNFT";

export function useTestNFTContract(provider?: ethers.providers.Web3Provider) {
  const [contractInstance, setContractInstance] = useState<TestNFT>();

  if (provider && !contractInstance) {
    setContractInstance(
      new ethers.Contract(
        ContractAddresses.LoaNFT,
        TestNFTAbi,
        provider
      ) as TestNFT
    );
  }

  return contractInstance;
}

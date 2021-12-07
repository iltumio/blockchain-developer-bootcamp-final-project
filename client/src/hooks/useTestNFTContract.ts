import { useEffect, useState } from "react";
import { ethers } from "ethers";

import ContractAddresses from "../generated/contracts/contract-address.json";
import TestNFTAbi from "../generated/contracts/TestNFT-abi.json";
import { TestNFT } from "../generated/contract-types/TestNFT";

export function useTestNFTContract(provider?: ethers.providers.Web3Provider) {
  const [contractInstance, setContractInstance] = useState<TestNFT>();
  const [deployed, setDeployed] = useState(false);

  useEffect(() => {
    if (provider && !contractInstance) {
      const contract = new ethers.Contract(
        ContractAddresses.TestNFT,
        TestNFTAbi,
        provider.getSigner()
      ) as TestNFT;

      contract
        .deployed()
        .then(() => {
          setContractInstance(contract);
          setDeployed(true);
        })
        .catch(() => setDeployed(false));
    }
  }, [provider, contractInstance]);

  return { contractInstance, deployed };
}

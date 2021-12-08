import { useEffect, useState } from "react";
import { ethers } from "ethers";

import TestNFTAbi from "../generated/contracts/TestNFT-abi.json";
import { TestNFT } from "../generated/contract-types/TestNFT";
import { env } from "../constants";

const ContractAddresses = require("../generated/contracts/contract-address.json");
const testNFTAddress = env ? ContractAddresses[env].TestNFT : "";

export function useTestNFTContract(provider?: ethers.providers.Web3Provider) {
  const [contractInstance, setContractInstance] = useState<TestNFT>();
  const [deployed, setDeployed] = useState(false);

  useEffect(() => {
    if (provider && !contractInstance) {
      const contract = new ethers.Contract(
        testNFTAddress,
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

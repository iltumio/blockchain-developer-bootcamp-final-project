import { useEffect, useState } from "react";
import { ethers } from "ethers";

import ContractAddresses from "../generated/contracts/contract-address.json";
import LoaNFTAbi from "../generated/contracts/LoaNFT-abi.json";
import { LoaNFT } from "../generated/contract-types/LoaNFT";

export function useLoaNFTContract(provider?: ethers.providers.Web3Provider) {
  const [contractInstance, setContractInstance] = useState<LoaNFT>();

  useEffect(() => {
    if (provider && !contractInstance) {
      setContractInstance(
        new ethers.Contract(
          ContractAddresses.LoaNFT,
          LoaNFTAbi,
          provider.getSigner()
        ) as LoaNFT
      );
    }
  }, [provider, contractInstance]);

  return contractInstance;
}

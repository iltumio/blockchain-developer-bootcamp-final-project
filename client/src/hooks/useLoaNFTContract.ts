import { useEffect, useState } from "react";
import { ethers } from "ethers";

import ContractAddresses from "../generated/contracts/contract-address.json";
import LoaNFTAbi from "../generated/contracts/LoaNFT-abi.json";
import { LoaNFT } from "../generated/contract-types/LoaNFT";

export function useLoaNFTContract(provider?: ethers.providers.Web3Provider) {
  const [contractInstance, setContractInstance] = useState<LoaNFT>();
  const [deployed, setDeployed] = useState(false);

  useEffect(() => {
    if (provider && !contractInstance) {
      const contract = new ethers.Contract(
        ContractAddresses.LoaNFT,
        LoaNFTAbi,
        provider.getSigner()
      ) as LoaNFT;

      console.log(ContractAddresses.LoaNFT);

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

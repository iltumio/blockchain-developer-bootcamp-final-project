import { useEffect, useState } from "react";
import { ethers } from "ethers";

import LoaNFTAbi from "../generated/contracts/LoaNFT-abi.json";
import { LoaNFT } from "../generated/contract-types/LoaNFT";
import { env } from "../constants";

const ContractAddresses = require("../generated/contracts/contract-address.json");
const loaNFTAddress = env ? ContractAddresses[env].LoaNFT : "";

export function useLoaNFTContract(provider?: ethers.providers.Web3Provider) {
  const [contractInstance, setContractInstance] = useState<LoaNFT>();
  const [deployed, setDeployed] = useState(false);

  useEffect(() => {
    if (provider && !contractInstance) {
      const contract = new ethers.Contract(
        loaNFTAddress,
        LoaNFTAbi,
        provider.getSigner()
      ) as LoaNFT;

      console.log(loaNFTAddress);

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

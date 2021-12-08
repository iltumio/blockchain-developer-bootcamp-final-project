import React, { useEffect, useState } from "react";
import { BigNumber, ethers } from "ethers";
import { LoaNFT } from "../../generated/contract-types/LoaNFT";

interface LiveEarningsProps {
  contract?: LoaNFT;
  loanId: string;
  interval?: number;
}

export const LiveEarnings: React.FC<LiveEarningsProps> = ({
  contract,
  loanId,
  interval = 5000,
}) => {
  const [interests, setInterests] = useState<BigNumber>();

  useEffect(() => {
    if (!contract) return;

    contract
      .getLoanInterests(loanId)
      .then((_interests) => setInterests(_interests));

    const _interval = setInterval(() => {
      contract
        .getLoanInterests(loanId)
        .then((_interests) => setInterests(_interests))
        .catch((e) => console.log(e.data.message));
    }, interval);

    return () => {
      clearInterval(_interval);
    };
  }, [contract, interval, loanId]);
  return <div>{ethers.utils.formatEther(interests?.toString() || "0")}</div>;
};

import { Flex, Code } from "@chakra-ui/react";
import React from "react";
import { LoanRequestList } from "../../components/LoanRequestList";
import { LoanList } from "../../components/LoanList";
import { useWeb3 } from "../../context/Web3Context";
import { NetworkInfo } from "../../components/networkInfo/NetworkInfo";
import { HARDHAT_LOCAL_NETWORK } from "../../constants";
import { Contract } from "@ethersproject/contracts";

type HomePageProps = {};

export const HomePage: React.FC<HomePageProps> = () => {
  const { connected, loanRequests, loans, missingContracts, contracts } =
    useWeb3();

  const anyContractMissing =
    missingContracts &&
    !Object.values(missingContracts).reduce((acc, next) => acc || next, false);

  const contractsReady =
    contracts.loaNFT?.address && contracts.testNFT?.address;

  return (
    <Flex h="100%" bg="gray.100" flexDirection="column" p={5}>
      {connected && !anyContractMissing && contractsReady && (
        <>
          <LoanRequestList
            title="Loan Requests"
            items={loanRequests}
            onAdd={() => {
              console.log("add");
            }}
          />
          <LoanList title="Loans" items={loans} />
        </>
      )}
      {!connected && (
        <Flex direction="column">
          <Flex>
            If you want to connect to the local hardhat network, configure
            Metamask using these params:
          </Flex>
          <NetworkInfo info={HARDHAT_LOCAL_NETWORK} />
        </Flex>
      )}
      {connected && anyContractMissing && (
        <Flex direction="column">
          <Flex>
            Contract not deployed. Run{" "}
            <Code colorScheme="red">yarn deploy:local</Code> command first
          </Flex>
        </Flex>
      )}
    </Flex>
  );
};

import { Flex, Spinner } from "@chakra-ui/react";
import React from "react";
import { LoanRequestList } from "../../components/LoanRequestList";
import { LoanList } from "../../components/LoanList";
import { useWeb3 } from "../../context/Web3Context";

type HomePageProps = {};

export const HomePage: React.FC<HomePageProps> = () => {
  const { isLoading, loanRequests, loans } = useWeb3();
  return (
    <>
      {isLoading && <Spinner />}
      {!isLoading && (
        <Flex h="100%" bg="gray.100" flexDirection="column">
          <LoanRequestList
            title="Loan Requests"
            items={loanRequests}
            onAdd={() => {
              console.log("add");
            }}
          />
          <LoanList title="Loans" items={loans} />
        </Flex>
      )}
    </>
  );
};

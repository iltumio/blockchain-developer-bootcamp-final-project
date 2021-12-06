import {
  Box,
  Button,
  HStack,
  useColorModeValue as mode,
} from "@chakra-ui/react";
import React, { useCallback } from "react";
import { RiTimerFill } from "react-icons/ri";
import {
  FaEthereum,
  FaFileContract,
  FaPercentage,
  FaUserCircle,
} from "react-icons/fa";

import { LoanRequestStructOutput } from "../generated/contract-types/LoaNFT";
import { ethers } from "ethers";
import { useWeb3 } from "../context/Web3Context";

interface LoanRequestItemProps {
  loanRequest: LoanRequestStructOutput;
}

export const LoanRequestItem: React.FC<LoanRequestItemProps> = (props) => {
  const { contracts, getAllLoanRequests, getAllLoans } = useWeb3();
  const { loanRequest } = props;

  const requestId = ethers.utils.solidityKeccak256(
    ["address", "address", "uint256"],
    [loanRequest.applicant, loanRequest.erc721contract, loanRequest.tokenId]
  );

  const handleLoan = useCallback(() => {
    if (!contracts.loaNFT) return;

    contracts.loaNFT
      .provideLiquidityForALoan(requestId, { value: loanRequest.amount })
      .then((tx) => tx.wait())
      .then((receipt) => {
        console.log(receipt);
        getAllLoanRequests();
        getAllLoans();
      })
      .catch((e) => console.log(e.data));
  }, [
    contracts.loaNFT,
    requestId,
    loanRequest.amount,
    getAllLoanRequests,
    getAllLoans,
  ]);

  return (
    <Box position="relative">
      <Box fontWeight="bold" maxW="xl">
        Request no. {requestId.slice(0, 10)}...
        {requestId.slice(requestId.length - 11, requestId.length - 1)}
      </Box>
      <HStack
        fontSize="sm"
        fontWeight="medium"
        color={mode("gray.500", "white")}
        mt="1"
      >
        <Box as={FaFileContract} fontSize="md" color="gray.400" />
        <span>{loanRequest.erc721contract}</span>
      </HStack>
      <HStack
        fontSize="sm"
        fontWeight="medium"
        color={mode("gray.500", "white")}
        mt="1"
      >
        <Box as={FaUserCircle} fontSize="md" color="gray.400" />
        <span>{loanRequest.applicant}</span>
      </HStack>
      <HStack
        fontSize="sm"
        fontWeight="medium"
        color={mode("gray.500", "white")}
        mt="1"
      >
        <Box as={FaEthereum} fontSize="md" color="gray.400" />
        <span>{ethers.utils.formatEther(loanRequest.amount)}</span>
      </HStack>
      <HStack
        fontSize="sm"
        fontWeight="medium"
        color={mode("gray.500", "white")}
        mt="1"
      >
        <Box as={FaPercentage} fontSize="md" color="gray.400" />
        <span>{ethers.utils.formatEther(loanRequest.yearlyInterestRate)}</span>
      </HStack>
      <HStack
        fontSize="sm"
        fontWeight="medium"
        color={mode("gray.500", "white")}
        mt="1"
      >
        <Box as={RiTimerFill} fontSize="md" color="gray.400" />
        <span>{loanRequest.loanDuration.toString()}s</span>
      </HStack>
      <HStack
        position={{ sm: "absolute" }}
        top={{ sm: "0" }}
        insetEnd={{ sm: "0" }}
        mt={{ base: "4", sm: "0" }}
      >
        <Button aria-label="Loan" size="sm" onClick={handleLoan}>
          Provide liquidity
        </Button>
        {/* <IconButton
          aria-label="Delete"
          icon={<HiTrash />}
          rounded="full"
          size="sm"
        /> */}
      </HStack>
    </Box>
  );
};

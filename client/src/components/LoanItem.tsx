import {
  Box,
  Button,
  HStack,
  useColorModeValue as mode,
  Badge,
  useToast,
} from "@chakra-ui/react";
import React, { useCallback, useMemo, useState } from "react";
import { RiTimerFill } from "react-icons/ri";
import {
  FaEthereum,
  FaFileContract,
  FaPercentage,
  FaQuestionCircle,
  FaUserCircle,
} from "react-icons/fa";
import { GrMoney } from "react-icons/gr";

import { LoanStructOutput } from "../generated/contract-types/LoaNFT";
import { ethers } from "ethers";
import { useWeb3 } from "../context/Web3Context";
import { LoanStatus } from "../constants";
import dayjs from "dayjs";
import { LiveEarnings } from "./LiveEarnings/LiveEarnings";

interface LoanItemProps {
  loan: LoanStructOutput;
}

export const LoanItem: React.FC<LoanItemProps> = (props) => {
  const { contracts, selectedAddress, getAllLoans } = useWeb3();
  const toast = useToast();
  const { loan } = props;

  const [isLoading, setIsLoading] = useState(false);

  const loanId = ethers.utils.solidityKeccak256(
    ["address", "address", "uint256"],
    [loan.applicant, loan.erc721contract, loan.tokenId]
  );

  const isApplicant = useMemo(
    () =>
      selectedAddress &&
      ethers.utils.getAddress(selectedAddress) ===
        ethers.utils.getAddress(loan.applicant),
    [selectedAddress, loan.applicant]
  );

  const isSupplier = useMemo(
    () =>
      selectedAddress &&
      ethers.utils.getAddress(selectedAddress) ===
        ethers.utils.getAddress(loan.supplier),
    [selectedAddress, loan.supplier]
  );

  const isOnTime = dayjs(loan.deadline.toNumber() * 1000).isAfter(dayjs());

  const handleStartLoan = useCallback(() => {
    if (!contracts.loaNFT) return;

    setIsLoading(true);
    contracts.loaNFT
      .widthrawLoan(loanId)
      .then((tx) => tx.wait())
      .then((receipt) => {
        console.log(receipt);
        getAllLoans();
        setIsLoading(false);
      })
      .catch((e) => {
        console.log(e.data);
        setIsLoading(false);
        toast({
          title: "An error occurred with the transaction. Pleas retry",
          status: "error",
          isClosable: true,
          position: "top",
        });
      });
  }, [contracts.loaNFT, loanId, getAllLoans, toast]);

  const handleRepayLoan = useCallback(async () => {
    if (!contracts.loaNFT) return;

    const interests = await contracts.loaNFT.getLoanInterests(loanId);

    const interestsWithTollerance = interests.mul(2);

    const finalAmount = loan.amount.add(interestsWithTollerance);

    setIsLoading(true);
    contracts.loaNFT
      .repayLoan(loanId, { value: finalAmount })
      .then((tx) => tx.wait())
      .then((receipt) => {
        console.log(receipt);
        getAllLoans();
        setIsLoading(false);
      })
      .catch((e) => {
        console.log(e.data);
        setIsLoading(false);
        toast({
          title: "An error occurred with the transaction. Pleas retry",
          status: "error",
          isClosable: true,
          position: "top",
        });
      });
  }, [contracts.loaNFT, loanId, getAllLoans, loan.amount, toast]);

  const handleRedeemLoan = useCallback(async () => {
    if (!contracts.loaNFT) return;

    setIsLoading(true);
    contracts.loaNFT
      .redeemLoanOrNFT(loanId)
      .then((tx) => tx.wait())
      .then((receipt) => {
        console.log(receipt);
        getAllLoans();
        setIsLoading(false);
      })
      .catch((e) => {
        console.log(e.data);
        setIsLoading(false);
        toast({
          title: "An error occurred with the transaction. Pleas retry",
          status: "error",
          isClosable: true,
          position: "top",
        });
      });
  }, [contracts.loaNFT, loanId, getAllLoans, toast]);

  return (
    <Box position="relative">
      <Box fontWeight="bold" maxW="xl">
        Loan no. {loanId.slice(0, 10)}...
        {loanId.slice(loanId.length - 11, loanId.length - 1)}
      </Box>
      <HStack
        fontSize="sm"
        fontWeight="medium"
        color={mode("gray.500", "white")}
        mt="1"
      >
        <Box as={FaFileContract} fontSize="md" color="gray.400" />
        <span>{loan.erc721contract}</span>
      </HStack>
      <HStack
        fontSize="sm"
        fontWeight="medium"
        color={mode("gray.500", "white")}
        mt="1"
      >
        <Box as={FaUserCircle} fontSize="md" color="gray.400" />
        <span>{loan.applicant}</span>
      </HStack>
      <HStack
        fontSize="sm"
        fontWeight="medium"
        color={mode("gray.500", "white")}
        mt="1"
      >
        <Box as={FaEthereum} fontSize="md" color="gray.400" />
        <span>{ethers.utils.formatEther(loan.amount)}</span>
      </HStack>
      <HStack
        fontSize="sm"
        fontWeight="medium"
        color={mode("gray.500", "white")}
        mt="1"
      >
        <Box as={FaPercentage} fontSize="md" color="gray.400" />
        <span>{ethers.utils.formatEther(loan.yearlyInterestRate)}</span>
      </HStack>
      <HStack
        fontSize="sm"
        fontWeight="medium"
        color={mode("gray.500", "white")}
        mt="1"
      >
        <Box as={RiTimerFill} fontSize="md" color="gray.400" />
        <span>{dayjs(loan.deadline.toNumber() * 1000).toString()}</span>
      </HStack>
      <HStack
        fontSize="sm"
        fontWeight="medium"
        color={mode("gray.500", "white")}
        mt="1"
      >
        <Box as={FaQuestionCircle} fontSize="md" color="gray.400" />
        <Badge colorScheme="green">{LoanStatus[loan.status]}</Badge>
      </HStack>
      <HStack
        fontSize="sm"
        fontWeight="medium"
        color={mode("gray.500", "white")}
        mt="1"
      >
        <Box as={GrMoney} fontSize="md" color="gray.400" />
        <span>
          <LiveEarnings contract={contracts.loaNFT} loanId={loanId} />
        </span>
      </HStack>
      <HStack
        position={{ sm: "absolute" }}
        top={{ sm: "0" }}
        insetEnd={{ sm: "0" }}
        mt={{ base: "4", sm: "0" }}
      >
        {isApplicant && loan.status === 1 && (
          <Button
            aria-label="Loan"
            size="sm"
            onClick={handleStartLoan}
            isLoading={isLoading}
          >
            Start loan
          </Button>
        )}
        {isApplicant && loan.status === 2 && isOnTime && (
          <Button
            aria-label="Repay"
            size="sm"
            onClick={handleRepayLoan}
            isLoading={isLoading}
          >
            Repay loan
          </Button>
        )}
        {isSupplier && (!isOnTime || loan.status === 3) && (
          <Button
            aria-label="Redeem"
            size="sm"
            onClick={handleRedeemLoan}
            isLoading={isLoading}
          >
            Redeem
          </Button>
        )}
      </HStack>
    </Box>
  );
};

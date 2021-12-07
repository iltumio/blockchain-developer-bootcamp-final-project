import React, { useCallback, useState, useEffect } from "react";
import {
  Button,
  FormControl,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  NumberInput,
  NumberInputField,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { useWeb3 } from "../../context/Web3Context";
import { useForm } from "react-hook-form";
import { ethers } from "ethers";

interface NewLoanRequestProps {
  onRequest?: (request: {
    contractAddress: string;
    tokenId: number;
    amount: number;
    interests: number;
    loanDuration: number;
  }) => void;
}

export const NewLoanRequest: React.FC<NewLoanRequestProps> = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { contracts, selectedAddress, ethersProvider, getAllLoanRequests } =
    useWeb3();
  const [approving, setApproving] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);
  const toast = useToast();

  const defaultValues = {
    contractAddress: contracts.testNFT?.address || "",
    tokenId: 0,
    amount: 0,
    interests: 0,
    loanDuration: 24 * 60 * 60, // 1 day by default
  };

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues,
  });

  const tokenId = watch("tokenId");

  const handleRequest = useCallback(
    async (data: typeof defaultValues) => {
      console.log("submit", data);
      if (
        !contracts.testNFT ||
        !contracts.loaNFT ||
        !selectedAddress ||
        !ethersProvider
      )
        return;

      try {
        const tokenOwner = await contracts.testNFT.ownerOf(data.tokenId);

        if (
          ethers.utils.getAddress(tokenOwner) !==
          ethers.utils.getAddress(selectedAddress)
        ) {
          toast({
            title: "This NFT does not belong to you",
            status: "error",
            isClosable: true,
            position: "top",
          });

          return;
        }

        const approved = await contracts.testNFT.getApproved(data.tokenId);

        if (
          ethers.utils.getAddress(approved) !==
          ethers.utils.getAddress(contracts.loaNFT.address)
        ) {
          toast({
            title: "You have to approve the NFT first",
            status: "error",
            isClosable: true,
            position: "top",
          });

          return;
        }
      } catch (e) {
        console.log("error", e);
        return;
      }

      setSendingRequest(true);
      contracts.loaNFT
        .requestLoan(
          ethers.utils.parseEther(data.amount.toString()),
          data.contractAddress,
          data.tokenId,
          data.loanDuration,
          ethers.utils.parseEther(data.interests.toString())
        )
        .then((tx) => tx.wait())
        .then((receipt) => {
          console.log(receipt);
          setSendingRequest(false);
          getAllLoanRequests();
          onClose();
        })
        .catch((e) => {
          console.log(e);
          setSendingRequest(false);
        });
    },
    [
      contracts.testNFT,
      selectedAddress,
      toast,
      ethersProvider,
      contracts.loaNFT,
      onClose,
      getAllLoanRequests,
    ]
  );

  const handleApprove = useCallback(() => {
    console.log("approve");
    if (!contracts.testNFT || !contracts.loaNFT) return;

    setApproving(true);
    contracts.testNFT
      .approve(contracts.loaNFT.address, tokenId)
      .then((tx) => tx.wait())
      .then((receipt) => {
        console.log(receipt);
        setApproving(false);
      })
      .catch((e) => {
        console.log(e);
        setApproving(false);
      });

    console.log(contracts.loaNFT.address, tokenId);
  }, [contracts.testNFT, contracts.loaNFT, tokenId]);

  useEffect(() => {
    if (!contracts.loaNFT) return;

    contracts.loaNFT
      .getAllLoanRequests()
      .then((r) => console.log(r))
      .catch((e) => console.log(e));
  }, [contracts.loaNFT]);

  if (!contracts.testNFT) return <div />;

  return (
    <>
      <Button onClick={onOpen}>Add</Button>

      <Modal isOpen={isOpen} onClose={onClose}>
        <form onSubmit={handleSubmit(handleRequest)}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Request a Loan</ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <FormControl>
                <FormLabel>Contract address</FormLabel>
                <Input
                  placeholder="0x73f87bc..."
                  disabled
                  defaultValue={contracts.testNFT.address}
                  {...register("contractAddress")}
                />
              </FormControl>

              <FormControl mt={4}>
                <FormLabel>Token Id</FormLabel>
                <NumberInput>
                  <NumberInputField placeholder="1" {...register("tokenId")} />
                </NumberInput>
              </FormControl>

              <FormControl mt={4}>
                <FormLabel>Amount (ETH)</FormLabel>
                <NumberInput>
                  <NumberInputField placeholder="10" {...register("amount")} />
                </NumberInput>
              </FormControl>

              <FormControl mt={4}>
                <FormLabel>Yearly Interest (%)</FormLabel>
                <NumberInput>
                  <NumberInputField
                    placeholder="3"
                    {...register("interests")}
                  />
                </NumberInput>
              </FormControl>

              <FormControl mt={4}>
                <FormLabel>Loan duration (s)</FormLabel>
                <NumberInput>
                  <NumberInputField
                    placeholder={`${24 * 60 * 60} s`}
                    {...register("loanDuration")}
                  />
                </NumberInput>
              </FormControl>
            </ModalBody>

            <ModalFooter>
              <Button
                colorScheme="blue"
                mr={3}
                onClick={handleApprove}
                isLoading={approving}
              >
                Approve
              </Button>
              <Button
                colorScheme="blue"
                mr={3}
                type="submit"
                isLoading={sendingRequest}
              >
                Request
              </Button>
              <Button onClick={onClose}>Cancel</Button>
            </ModalFooter>
          </ModalContent>
        </form>
      </Modal>
    </>
  );
};

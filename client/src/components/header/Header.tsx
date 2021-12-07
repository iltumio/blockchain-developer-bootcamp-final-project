import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@chakra-ui/button";
import { Flex, Heading } from "@chakra-ui/layout";
import { Avatar, useToast } from "@chakra-ui/react";
import { useWeb3 } from "../../context/Web3Context";
// import { HARDHAT_LOCAL_NETWORK } from "../../constants";

type HeaderProps = {};

export const Header: React.FC<HeaderProps> = () => {
  const toast = useToast();

  const {
    connected,
    connect,
    selectedAddress,
    contracts: { testNFT },
  } = useWeb3();

  const [nftBalance, setNFTBalance] = useState(0);

  useEffect(() => {
    if (!connected || !testNFT || !selectedAddress) return;

    testNFT.balanceOf(selectedAddress).then((balance) => {
      setNFTBalance(balance.toNumber());

      if (balance.toNumber() === 0) {
        toast({
          title: "You have no NFT to put as collateral",
          status: "error",
          isClosable: true,
          position: "top",
        });
      }
    });
  }, [connected, testNFT, selectedAddress, toast]);

  const [isMinting, setIsMinting] = useState(false);

  const mintNFT = useCallback(() => {
    if (isMinting || !testNFT) return;

    setIsMinting(true);

    testNFT
      .mint()
      .then((tx) => tx.wait())
      .then((receipt) => {
        console.log(receipt);

        setIsMinting(false);
      });
  }, [isMinting, testNFT]);

  // const addNetwork = useCallback(() => {
  //   if (!window.ethereum) return;

  //   window.ethereum.request({
  //     method: "wallet_addEthereumChain",
  //     params: [HARDHAT_LOCAL_NETWORK],
  //   });
  // }, []);

  return (
    <Flex flex={1} p={5}>
      <Flex flex={3}>LoaNFT - Get loans using your NFTs as collateral</Flex>
      <Flex flex={8} justifyContent="flex-end" alignItems="center">
        {!connected && (
          <>
            {/* <Button size="xs" onClick={addNetwork} ml={10}>
              Add Network
            </Button> */}
            <Button onClick={connect} size="xs" ml={10}>
              Connect
            </Button>
          </>
        )}
        {connected && (
          <>
            <Button size="xs" onClick={mintNFT} ml={10}>
              Mint NFT
            </Button>
            <Heading size="xs" ml={10}>
              NFTs: {nftBalance}
            </Heading>
            <Heading size="md" ml={10}>
              {selectedAddress?.slice(0, 6)}...{selectedAddress?.slice(38, 42)}
            </Heading>
            <Avatar size={"xs"} ml={5} />
          </>
        )}
      </Flex>
    </Flex>
  );
};

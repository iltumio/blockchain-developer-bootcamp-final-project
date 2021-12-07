import React from "react";
import { Table, Tbody, Tr, Th, Td, Badge } from "@chakra-ui/react";
import { BigNumber } from "@ethersproject/bignumber";

export interface INetworkInfo {
  chainId: string;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
}

type NetworkInfoProps = {
  info: INetworkInfo;
};

export const NetworkInfo: React.FC<NetworkInfoProps> = ({ info }) => {
  return (
    <Table variant="simple">
      <Tbody>
        <Tr>
          <Th>Name</Th>
          <Td>{info.chainName}</Td>
        </Tr>
        <Tr>
          <Th>Chain Id</Th>
          <Td>{`${info.chainId} (${BigNumber.from(
            info.chainId
          ).toNumber()})`}</Td>
        </Tr>
        <Tr>
          <Th>Currency Name</Th>
          <Td>{info.nativeCurrency.name}</Td>
        </Tr>
        <Tr>
          <Th>Currency Symbol</Th>
          <Td>{info.nativeCurrency.symbol}</Td>
        </Tr>
        <Tr>
          <Th>Currency Decimals</Th>
          <Td>{info.nativeCurrency.decimals}</Td>
        </Tr>
        <Tr>
          <Th>RPC Urls</Th>
          <Td>
            {info.rpcUrls.map((url) => (
              <Badge key={url} colorScheme="green">
                {url}
              </Badge>
            ))}
          </Td>
        </Tr>
      </Tbody>
    </Table>
  );
};

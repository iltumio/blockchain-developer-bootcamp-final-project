import * as React from "react";
import {
  Box,
  Divider,
  Flex,
  Stack,
  StackDivider,
  Text,
  useColorModeValue as mode,
} from "@chakra-ui/react";
import { NewLoanRequest } from "./modals/NewLoanRequest";
import { LoanRequestStructOutput } from "../generated/contract-types/LoaNFT";
import { LoanRequestItem } from "./LoanRequestItem";

type LoanRequestListProps = {
  title: string;
  items: LoanRequestStructOutput[];
  onAdd?: () => void;
};

export const LoanRequestList = ({
  title,
  items,
  onAdd,
}: LoanRequestListProps) => {
  return (
    <Box as="section" py="12" bg={mode("gray.100", "gray.800")}>
      <Box maxW={{ base: "xl", md: "7xl" }} mx="auto" px={{ md: "8" }}>
        <Box
          rounded={{ lg: "lg" }}
          bg={mode("white", "gray.700")}
          maxW="3xl"
          mx="auto"
          shadow="base"
          overflow="hidden"
        >
          <Flex align="center" justify="space-between" px="6" py="4">
            <Text as="h3" fontWeight="bold" fontSize="lg">
              {title}
            </Text>
            <NewLoanRequest />
          </Flex>
          <Divider />
          <Stack spacing="6" py="5" px="8" divider={<StackDivider />}>
            {
              // cycle on loan requests
              items.length === 0 && (
                <Box>
                  <Box fontWeight="bold" maxW="xl" textAlign="center">
                    No loan requests at the moment
                  </Box>
                </Box>
              )
            }
            {items.map((item) => (
              <LoanRequestItem
                key={`${item.applicant}${item.erc721contract}${item.tokenId}`}
                loanRequest={item}
              />
            ))}
          </Stack>
        </Box>
      </Box>
    </Box>
  );
};

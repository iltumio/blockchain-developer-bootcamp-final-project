import {
  Box,
  Button,
  Divider,
  Flex,
  Stack,
  StackDivider,
  Text,
  useColorModeValue as mode,
} from "@chakra-ui/react";
import * as React from "react";
import { HiPlus } from "react-icons/hi";
import { LoanItem } from "./LoanItem";

type LoanListProps = {
  title: string;
  items: any[];
  onAdd?: () => void;
};

export const LoanList = ({ title, items, onAdd }: LoanListProps) => {
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
            {onAdd && (
              <Button colorScheme="blue" minW="20" leftIcon={<HiPlus />}>
                Add
              </Button>
            )}
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
            {/* <LoanItem
              title="UX Strategist &amp; Sales Funnel Designer"
              location="Los Angeles, United States"
            >
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Commodi,
              totam at reprehenderit maxime aut beatae ad.
            </LoanItem>
            <LoanItem
              title="Freelance Graphic &amp; Web Designer"
              location="Stockholm, Sweden"
            >
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Commodi,
              totam at reprehenderit maxime aut beatae ad.
            </LoanItem> */}
          </Stack>
        </Box>
      </Box>
    </Box>
  );
};

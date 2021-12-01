import { useMemo } from "react";
import "./App.css";
import { useLoaNFTContract } from "./hooks/useLoaNFTContract";
import { useTestNFTContract } from "./hooks/useTestNFTContract";
import { useWeb3modal } from "./hooks/useWeb3Modal";
import { ChakraProvider, extendTheme, Flex, Spinner } from "@chakra-ui/react";
import { LoanList } from "./components/LoanList";

const theme = extendTheme({
  colors: {
    brand: {
      900: "#1a365d",
      800: "#153e75",
      700: "#2a69ac",
    },
  },
});

function App() {
  const { error, ethersProvider, connected, selectedAddress } = useWeb3modal();

  const loaNFT = useLoaNFTContract(ethersProvider);
  const testNFT = useTestNFTContract(ethersProvider);

  const isLoading = useMemo(
    () => !connected || !loaNFT || !testNFT,
    [connected, loaNFT, testNFT]
  );

  return (
    <ChakraProvider theme={theme}>
      <div className="App">
        <Flex flex={1}>{selectedAddress}</Flex>
        {isLoading && <Spinner />}

        <LoanList title="Loan Requests" items={[]} />
      </div>
    </ChakraProvider>
  );
}

export default App;

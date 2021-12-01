import { useState } from "react";
import Web3Modal from "web3modal";
import { ethers } from "ethers";

const providerOptions = {
  /* See Provider Options Section */
};

const web3Modal = new Web3Modal({
  network: "mainnet", // optional
  cacheProvider: true, // optional
  providerOptions, // required
});

export function useWeb3modal() {
  const [ethersProvider, setEthersProvider] =
    useState<ethers.providers.Web3Provider>();

  const [error, setError] = useState<Error>();

  const [connected, setConnected] = useState(false);

  const [selectedAddress, setSelectedAddress] = useState("");

  if (!ethersProvider) {
    web3Modal
      .connect()
      .then((provider) => {
        // Reload on account change
        provider.on("accountsChanged", (accounts: string[]) => {
          window.location.reload();
        });

        // Subscribe to chainId change
        provider.on("chainChanged", (chainId: number) => {
          window.location.reload();
        });

        // Subscribe to provider connection
        provider.on("connect", (info: { chainId: number }) => {
          console.log(info);
          setConnected(true);
        });

        // Subscribe to provider disconnection
        provider.on(
          "disconnect",
          (error: { code: number; message: string }) => {
            setConnected(false);
          }
        );

        setEthersProvider(new ethers.providers.Web3Provider(provider));
        setConnected(true);
        setSelectedAddress(provider.selectedAddress);
      })
      .catch((e) => setError(e));
  }

  return { ethersProvider, error, connected, selectedAddress };
}

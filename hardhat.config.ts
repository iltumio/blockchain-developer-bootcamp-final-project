import { utils } from "ethers";
import "@typechain/hardhat";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-ethers";

import * as fs from "fs";

import { HardhatUserConfig, task } from "hardhat/config";

const { isAddress, getAddress, formatUnits, parseUnits } = utils;

//
// Select the network you want to deploy to here:
//
const defaultNetwork = "localhost";

const getMnemonic = () => {
  try {
    return fs.readFileSync("./mnemonic.secret").toString().trim();
  } catch (e) {
    // @ts-ignore
    if (defaultNetwork !== "localhost") {
      console.log(
        "☢️ WARNING: No mnemonic file created for a deploy account. Try `yarn run generate` and then `yarn run account`."
      );
    }
  }
  return "";
};

const config: HardhatUserConfig = {
  networks: {
    localhost: {
      url: "http://localhost:8545",
      /*
        if there is no mnemonic, it will just use account 0 of the hardhat node to deploy
        (you can put in a mnemonic here to set the deployer locally)
      */
      // accounts: {
      //   mnemonic: mnemonic(),
      // },
    },
    rinkeby: {
      url: "https://rinkeby.infura.io/v3/460f40a260564ac4a4f4b3fffb032dad",
      accounts: {
        mnemonic: getMnemonic(),
      },
    },
    kovan: {
      url: "https://kovan.infura.io/v3/460f40a260564ac4a4f4b3fffb032dad",
      accounts: {
        mnemonic: getMnemonic(),
      },
    },
    mainnet: {
      url: "https://mainnet.infura.io/v3/460f40a260564ac4a4f4b3fffb032dad",
      accounts: {
        mnemonic: getMnemonic(),
      },
    },
    ropsten: {
      url: "https://ropsten.infura.io/v3/460f40a260564ac4a4f4b3fffb032dad",
      accounts: {
        mnemonic: getMnemonic(),
      },
    },
    goerli: {
      url: "https://goerli.infura.io/v3/460f40a260564ac4a4f4b3fffb032dad",
      accounts: {
        mnemonic: getMnemonic(),
      },
    },
    xdai: {
      url: "https://rpc.xdaichain.com/",
      gasPrice: 1000000000,
      accounts: {
        mnemonic: getMnemonic(),
      },
    },
    matic: {
      url: "https://rpc-mainnet.maticvigil.com/",
      gasPrice: 1000000000,
      accounts: {
        mnemonic: getMnemonic(),
      },
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.8.9",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  paths: {
    cache: "./generated/cache",
    artifacts: "./generated/artifacts",
  },
  typechain: {
    outDir: "./client/src/generated/contract-types",
  },
};

export default config;

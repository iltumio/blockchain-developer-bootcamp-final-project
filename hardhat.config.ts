require("dotenv").config();
import { utils } from "ethers";
import "@typechain/hardhat";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-ethers";

import * as fs from "fs";

import { HardhatUserConfig, task } from "hardhat/config";

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

const USE_HARDHAT_LOCALHOST_CONFIG = process.env.USE_HARDHAT_LOCALHOST_CONFIG;

const config: HardhatUserConfig = {
  networks: {
    hardhat: USE_HARDHAT_LOCALHOST_CONFIG
      ? {
          mining: {
            auto: false,
            interval: 1000,
          },
          accounts: {
            mnemonic: getMnemonic(),
          },
        }
      : {},
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

import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import { ethers, network, artifacts } from "hardhat";
import { Contract } from "ethers";

// This is a script for deploying your contracts. You can adapt it to deploy
// yours, or create new ones.
async function main() {
  // This is just a convenience check
  if (network.name === "hardhat") {
    console.warn(
      "You are trying to deploy a contract to the Hardhat Network, which" +
        "gets automatically created and destroyed every time. Use the Hardhat" +
        " option '--network localhost'"
    );
  }

  // ethers is avaialble in the global scope
  const [deployer] = await ethers.getSigners();
  console.log(
    "Deploying the contracts with the account:",
    await deployer.getAddress()
  );

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const LoaNFT = await ethers.getContractFactory("LoaNFT");
  const loaNFT = await LoaNFT.deploy();
  await loaNFT.deployed();

  console.log("LoaNFT address:", loaNFT.address);

  // We also save the contract's artifacts and address in the frontend directory
  saveFrontendFiles("LoaNFT", loaNFT);

  const TestNFT = await ethers.getContractFactory("TestNFT");
  const testNFT = await TestNFT.deploy("TestNFT", "TNFT");
  await testNFT.deployed();

  console.log("TestNFT address:", testNFT.address);

  // We also save the contract's artifacts and address in the frontend directory
  saveFrontendFiles("TestNFT", testNFT);
}

function saveFrontendFiles(contractName: string, contract: Contract) {
  const fs = require("fs");
  const contractsDir = __dirname + "/../client/src/generated/contracts";

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }

  const rawContent = fs.readFileSync(contractsDir + "/contract-address.json");
  const jsonContent = JSON.parse(rawContent);

  fs.writeFileSync(
    contractsDir + "/contract-address.json",
    JSON.stringify(
      { ...jsonContent, [contractName]: contract.address },
      undefined,
      2
    )
  );

  const ContractArtifact = artifacts.readArtifactSync(contractName);

  fs.writeFileSync(
    `${contractsDir}/${contractName}-abi.json`,
    JSON.stringify(ContractArtifact.abi, null, 2)
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

# blockchain-developer-bootcamp-final-project

## Deployed version
[https://loanft.netlify.app/](https://loanft.netlify.app/)

## How to run the project locally
[https://youtu.be/6wrXtbsvHIg](https://youtu.be/6wrXtbsvHIg)
### Prerequisites
* Node >= 16
* Yarn

### Steps
1. Install contracts dependencies

```bash
yarn install
```

2. Paste the mnemonic phrase you want to use in the following file (use the same seed phrase in Metamask so you will have money in the first 20 accounts for testing purpose)

```bash
mnemonic.secret
```

3. Start a local network

```bash
yarn chain
```

4. Deploy contracts

```bash
yarn deploy:local
```

5. Install Dapp dependencies

```bash
yarn dapp:install
```

6. Start front end app

```bash
yarn start:local
```

7. Connect Metamask to the local network provided by Hardhat using the following params:

```
Chain Name: "Hardhat Local Network"
Chain Id: 31337 (0x7A69)
Rpc url: http://localhost:8545
Native currency: ETH
```


The app will automatically use the latest contract addresses.

## Screencast link
[https://youtu.be/8aT7kRngyI4](https://youtu.be/8aT7kRngyI4)
## Ethereum wallet for certification
`0x115E06bC8f052aA99af5D48D961FeF6656d7F242`
## Problem

Even if you own a rare and valuable NFT token, it is very hard to use it as collateral to a loan with currently available protocols. The main problem is that the value value of an NFT is hard to be determined and to predict over time. What is the current value of this NFT? What could the value be at the end of the loan?

## Solution

A protocol managed by a smart contract or a set of smart contracts in which the NFT owner can propose his "loan request" generating a marketplace of profitable loans.

## Future upgrades
### Needed for V1
There are some functionalities that are not yet available in this V1 that should be added before going in production. In particular:
- possibility to edit/remove a loan request (with all the restrictions based on the request status)
- UI improvements

### Ideas for the future
In the future it is possible to create a mechanism that is similar to liquidity pools in which more people can invest their money in a loan they consider profitable and have a share of the interest rates. To proceed with this implementation a mechanism to split the ownership of an NFT across all the participants in case of the loan not being repaid must be designed. A possible solution could be a DAO with a voting mechanism that allows to place NFTs on sale at the price the majority of the holders voted on.
Another interesting idea for the future is to create auctions in which the liquidity providers that offers the lowest interest rate wins and can start the loan flow.

## Example flow

1. The NFT Owner creates a "loan request" specifying:
   - the contract address and the token id of the NFT that he wants to use as collateral for the loan
   - the amount of ETH he wants to borrow
   - the interest rate he is willing to pay for the loan
   - the loan duration (expressed in seconds)

2. Someone who consider the offer valid and profitable, can decide to loan his money at the conditions proposed by the NFT Owner, so he provide the liquidity for the loan

3. The user that initially proposed the loan, can now start the loan and get the money.

4. The user that initially proposed the loan can repay the loan with interests at any time before the deadline.

5. When the deadline has passed, the user who provided the liquidity can start the redeem phase with 2 possible outputs:
   - if the loan has been repaid on time, he gets the money back
   - if the loan han not been repaid, he gets back the NFT that was used as collateral for the loan

## Directory structure

* `client`: Front end application in React
* `contracts`: Contains the LoaNFT smart contract and an ERC721 contract that is needed for testing purposes
* `test`: Smart contract tests

## Environment variables (needed if you want to deploy on public testnets or mainnet)

```
INFURA_KEY=<infura_key_here>
```
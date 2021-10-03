# blockchain-developer-bootcamp-final-project

## Problem

Even if you own a rare and valuable NFT token, it is very hard to use it as collateral to a loan with currently available protocols. The main problem is that the value value of an NFT is hard to be determined and to predict over time. What is the current value of this NFT? What could the value be at the end of the loan?

## Solution

A protocol managed by a smart contract or a set of smart contracts in which the NFT owner can propose his "loan request" generating a marketplace of profitable loans.

## Example flow

1. The NFT Owner propose his "loan request" specifying:
   - the amount of tokens he wants to borrow
   - the interest rate he is willing to pay for the loan
   - the NFT he want to place as collateral to the loan

2. Someone who consider the offer valid and profitable, can decide to loan his money at the conditions proposed by the NFT Owner

## Future upgrades

In the future it is possible to create a mechanism that is similar to liquidity pools in which more people can invest their money in a loan they consider profitable and have a share of the interest rates. To proceed with this implementation a mechanism to divide the ownership of an NFT across all the participants in case of the loan not being repaid must be designed. A possible solution could be a DAO with a voting mechanism that allows to place NFTs on sale at the price the majority of the holders voted on.

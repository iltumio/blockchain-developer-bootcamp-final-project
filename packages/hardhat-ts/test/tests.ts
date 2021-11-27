import { Contract, ContractFactory } from '@ethersproject/contracts';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import * as dayjs from 'dayjs';
import { BigNumber } from '@ethersproject/bignumber';

const getBlockAverageTime = async (span = 10) => {
  const times = [];
  const currentNumber = await ethers.provider.getBlockNumber();
  const firstBlock = await ethers.provider.getBlock(currentNumber - span);
  let prevTimestamp = firstBlock.timestamp;

  for (let i = currentNumber - span + 1; i <= currentNumber; i++) {
    const block = await ethers.provider.getBlock(i);
    let time = block.timestamp - prevTimestamp;
    prevTimestamp = block.timestamp;
    times.push(time);
  }

  return Math.round(times.reduce((a, b) => a + b) / times.length);
};

describe('LoaNFT', function () {
  let LoaNFTFactory: ContractFactory;
  let TestNFTFactory: ContractFactory;

  let loaNFT: Contract;
  let testNFT: Contract;

  let loaNFTinstance: Contract;
  let testNFTinstance: Contract;

  before(async function () {
    LoaNFTFactory = await ethers.getContractFactory('LoaNFT');
    TestNFTFactory = await ethers.getContractFactory('TestNFT');
  });

  beforeEach(async function () {
    loaNFT = await LoaNFTFactory.deploy();
    loaNFTinstance = await loaNFT.deployed().catch();

    testNFT = await TestNFTFactory.deploy('TestNFT', 'TNFT');
    testNFTinstance = await testNFT.deployed().catch();
  });

  it('Should be deployed', async function () {
    expect(loaNFTinstance).not.to.be.undefined;
    expect(testNFTinstance).not.to.be.undefined;
  });

  it('Should be able to receive a loan request with an NFT as collateral', async function () {
    const [owner] = await ethers.getSigners();

    const expectedTokenId = 1;
    const expectedAmount = 1;
    const expectedLoanDuration = 31536000; // loan duration in seconds (1 year)
    const expectedYearlyInterestRate = ethers.utils.parseEther('1');

    const ownerOfFirstBefore = await testNFT.ownerOf(expectedTokenId);

    expect(ownerOfFirstBefore).not.to.equal(ethers.constants.AddressZero, 'The owner of the first minted token is the address zero');
    expect(ownerOfFirstBefore).to.equal(owner.address, 'The owner of the first NFT is not the sender');

    await testNFT.approve(loaNFT.address, expectedTokenId);

    await loaNFT.requestLoan(expectedAmount, testNFT.address, expectedTokenId, expectedLoanDuration, expectedYearlyInterestRate);

    const ownerOfFirstAfter = await testNFT.ownerOf(expectedTokenId);

    expect(ownerOfFirstAfter).to.equal(loaNFT.address, 'The NFT has not been transfered');

    const requestId = ethers.utils.solidityKeccak256(['address', 'address', 'uint256'], [owner.address, testNFT.address, expectedTokenId]);

    const { amount, tokenId, applicant, yearlyInterestRate, loanDuration } = await loaNFT.getLoanRequest(requestId);

    expect(amount.toNumber()).to.equal(expectedAmount, 'Amount does not match');
    expect(tokenId.toNumber()).to.equal(expectedTokenId, 'TokenId does not match');
    expect(applicant.toString()).to.equal(owner.address, 'Applicant does not match');
    expect(yearlyInterestRate).to.equal(expectedYearlyInterestRate, 'Yearly interest rate does not match');
    expect(loanDuration).to.equal(expectedLoanDuration, 'Number of days does not match');
  });

  it('Should not be possible to send the same request twice', async function () {
    const [owner] = await ethers.getSigners();

    const expectedTokenId = 1;
    const expectedAmount = 1;
    const expectedLoanDuration = 31536000; // loan duration in seconds (1 year)
    const expectedYearlyInterestRate = ethers.utils.parseEther('1');

    const ownerOfFirstBefore = await testNFT.ownerOf(expectedTokenId);

    expect(ownerOfFirstBefore).not.to.equal(ethers.constants.AddressZero, 'The owner of the first minted token is the address zero');
    expect(ownerOfFirstBefore).to.equal(owner.address, 'The owner of the first NFT is not the sender');

    await testNFT.approve(loaNFT.address, expectedTokenId);

    await loaNFT.requestLoan(expectedAmount, testNFT.address, expectedTokenId, expectedLoanDuration, expectedYearlyInterestRate);

    const ownerOfFirstAfter = await testNFT.ownerOf(expectedTokenId);

    expect(ownerOfFirstAfter).to.equal(loaNFT.address, 'The NFT has not been transfered');

    let error = null;
    try {
      await loaNFT.requestLoan(expectedAmount, testNFT.address, expectedTokenId, expectedLoanDuration, expectedYearlyInterestRate);
    } catch (e) {
      error = e;
    }

    expect(error).not.to.be.null;
  });

  it('Should be possible to provide liquidity for a loan', async function () {
    const [owner, supplier] = await ethers.getSigners();

    const expectedTokenId = 1;
    const expectedAmount = 1;
    const expectedLoanDuration = 31536000; // loan duration in seconds (1 year)
    const expectedYearlyInterestRate = ethers.utils.parseEther('1');

    await testNFT.approve(loaNFT.address, expectedTokenId);

    await loaNFT.requestLoan(expectedAmount, testNFT.address, expectedTokenId, expectedLoanDuration, expectedYearlyInterestRate);

    const requestId = ethers.utils.solidityKeccak256(['address', 'address', 'uint256'], [owner.address, testNFT.address, expectedTokenId]);

    const balanceBefore = await ethers.provider.getBalance(loaNFT.address);

    await loaNFT.connect(supplier).provideLiquidityForALoan(requestId, { value: ethers.utils.parseEther(expectedAmount.toString()) });

    const balanceAfter = await ethers.provider.getBalance(loaNFT.address);

    expect(balanceBefore).to.be.lte(balanceAfter, 'Balance has not increased');
  });

  it('Should be possible to receive the loan when the liquidity has been provided', async function () {
    const [owner, supplier] = await ethers.getSigners();

    const expectedTokenId = 1;
    const expectedAmount = 1;
    const expectedLoanDuration = 31536000; // loan duration in seconds (1 year)
    const expectedYearlyInterestRate = ethers.utils.parseEther('1');

    await testNFT.approve(loaNFT.address, expectedTokenId);

    await loaNFT.requestLoan(expectedAmount, testNFT.address, expectedTokenId, expectedLoanDuration, expectedYearlyInterestRate);

    const requestId = ethers.utils.solidityKeccak256(['address', 'address', 'uint256'], [owner.address, testNFT.address, expectedTokenId]);

    await loaNFT.connect(supplier).provideLiquidityForALoan(requestId, { value: ethers.utils.parseEther(expectedAmount.toString()) });

    const balanceBefore = await ethers.provider.getBalance(owner.address);
    await loaNFT.connect(owner).widthrawLoan(requestId);
    const balanceAfter = await ethers.provider.getBalance(owner.address);

    expect(balanceBefore).to.be.lte(balanceAfter, "You didn't got the money for the loan");

    const { status } = await loaNFT.getLoan(requestId);

    expect(status).to.be.equal(2, 'Status has not been updated properly');
  });

  it('Should be possible to repay the loan', async function () {
    const [owner, supplier] = await ethers.getSigners();

    const expectedTokenId = 1;
    const expectedAmount = 1;
    const expectedLoanDuration = 31536000; // loan duration in seconds (1 year)
    const expectedYearlyInterestRate = ethers.utils.parseEther('1');

    await testNFT.approve(loaNFT.address, expectedTokenId);

    await loaNFT.requestLoan(expectedAmount, testNFT.address, expectedTokenId, expectedLoanDuration, expectedYearlyInterestRate);

    const requestId = ethers.utils.solidityKeccak256(['address', 'address', 'uint256'], [owner.address, testNFT.address, expectedTokenId]);

    await loaNFT.connect(supplier).provideLiquidityForALoan(requestId, { value: ethers.utils.parseEther(expectedAmount.toString()) });

    await loaNFT.connect(owner).widthrawLoan(requestId);

    await ethers.provider.send('evm_increaseTime', [expectedLoanDuration - 536000]);
    await ethers.provider.send('evm_mine', []);

    const interests: BigNumber = await loaNFT.getLoanInterests(requestId);

    const tolleranceMultiplier = 4;

    const contractBalanceBefore = await ethers.provider.getBalance(loaNFT.address);

    await loaNFT.connect(owner).repayLoan(requestId, { value: ethers.utils.parseEther(expectedAmount.toString()).add(interests.mul(tolleranceMultiplier)) });

    const contractBalanceAfter = await ethers.provider.getBalance(loaNFT.address);

    expect(contractBalanceBefore).to.be.lt(contractBalanceAfter, 'You got no money back');
  });

  it('Should be possible to get the money back if the loan has been repaid', async function () {
    const [owner, supplier] = await ethers.getSigners();

    const expectedTokenId = 1;
    const expectedAmount = 1;
    const expectedLoanDuration = 31536000; // loan duration in seconds (1 year)
    const expectedYearlyInterestRate = ethers.utils.parseEther('1');

    await testNFT.approve(loaNFT.address, expectedTokenId);

    await loaNFT.requestLoan(expectedAmount, testNFT.address, expectedTokenId, expectedLoanDuration, expectedYearlyInterestRate);

    const requestId = ethers.utils.solidityKeccak256(['address', 'address', 'uint256'], [owner.address, testNFT.address, expectedTokenId]);

    await loaNFT.connect(supplier).provideLiquidityForALoan(requestId, { value: ethers.utils.parseEther(expectedAmount.toString()) });

    await loaNFT.connect(owner).widthrawLoan(requestId);

    await ethers.provider.send('evm_increaseTime', [expectedLoanDuration - 536000]);
    await ethers.provider.send('evm_mine', []);

    const interests: BigNumber = await loaNFT.getLoanInterests(requestId);

    const tolleranceMultiplier = 4;

    await loaNFT.connect(owner).repayLoan(requestId, { value: ethers.utils.parseEther(expectedAmount.toString()).add(interests.mul(tolleranceMultiplier)) });

    const balanceBefore = await ethers.provider.getBalance(supplier.address);

    await loaNFT.connect(supplier).redeemLoanOrNFT(requestId);

    const balanceAfter = await ethers.provider.getBalance(supplier.address);

    expect(balanceBefore).to.be.lt(balanceAfter, 'You got no money back');
  });

  it('Should be possible to get the NFT back if the loan has not been repaid within the deadline', async function () {
    const [owner, supplier] = await ethers.getSigners();

    const expectedTokenId = 1;
    const expectedAmount = 1;
    const expectedLoanDuration = 31536000; // loan duration in seconds (1 year)
    const expectedYearlyInterestRate = ethers.utils.parseEther('1');

    await testNFT.approve(loaNFT.address, expectedTokenId);

    await loaNFT.requestLoan(expectedAmount, testNFT.address, expectedTokenId, expectedLoanDuration, expectedYearlyInterestRate);

    const requestId = ethers.utils.solidityKeccak256(['address', 'address', 'uint256'], [owner.address, testNFT.address, expectedTokenId]);

    await loaNFT.connect(supplier).provideLiquidityForALoan(requestId, { value: ethers.utils.parseEther(expectedAmount.toString()) });

    await loaNFT.connect(owner).widthrawLoan(requestId);

    await ethers.provider.send('evm_increaseTime', [expectedLoanDuration + 10]);
    await ethers.provider.send('evm_mine', []);

    const nftOwnerBefore = await testNFT.ownerOf(expectedTokenId);

    await loaNFT.connect(supplier).redeemLoanOrNFT(requestId);

    const nftOwnerAfter = await testNFT.ownerOf(expectedTokenId);

    expect(nftOwnerBefore).to.be.equal(loaNFT.address, 'NFT was not owned by the contract');
    expect(nftOwnerAfter).to.be.equal(supplier.address, 'NFT has not been sent to the supplier');
  });
});

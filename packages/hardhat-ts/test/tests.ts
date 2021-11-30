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
    const expectedAmount = ethers.utils.parseEther('1');
    const expectedLoanDuration = 31536000; // loan duration in seconds (1 year)
    const expectedYearlyInterestRate = ethers.utils.parseEther('1');

    const ownerOfFirstBefore = await testNFT.ownerOf(expectedTokenId);

    expect(ownerOfFirstBefore).not.to.equal(ethers.constants.AddressZero, 'The owner of the first minted token is the address zero');
    expect(ownerOfFirstBefore).to.equal(owner.address, 'The owner of the first NFT is not the sender');

    await testNFT.approve(loaNFT.address, expectedTokenId);

    expect(loaNFT.requestLoan(expectedAmount, testNFT.address, expectedTokenId, expectedLoanDuration, expectedYearlyInterestRate))
      .to.emit(loaNFT, 'LoanRequested')
      .withArgs(testNFT.address.toString(), expectedTokenId, owner.address.toString(), expectedAmount, expectedLoanDuration, expectedYearlyInterestRate);

    const ownerOfFirstAfter = await testNFT.ownerOf(expectedTokenId);

    expect(ownerOfFirstAfter).to.equal(loaNFT.address, 'The NFT has not been transfered');

    const requestId = ethers.utils.solidityKeccak256(['address', 'address', 'uint256'], [owner.address, testNFT.address, expectedTokenId]);

    const { amount, tokenId, applicant, yearlyInterestRate, loanDuration } = await loaNFT.getLoanRequest(requestId);

    expect(amount).to.eq(expectedAmount, 'Amount does not match');
    expect(tokenId.toNumber()).to.equal(expectedTokenId, 'TokenId does not match');
    expect(applicant.toString()).to.equal(owner.address, 'Applicant does not match');
    expect(yearlyInterestRate).to.equal(expectedYearlyInterestRate, 'Yearly interest rate does not match');
    expect(loanDuration).to.equal(expectedLoanDuration, 'Number of days does not match');
  });

  it('Should not be possible to send the same request twice', async function () {
    const [owner] = await ethers.getSigners();

    const expectedTokenId = 1;
    const expectedAmount = ethers.utils.parseEther('1');
    const expectedLoanDuration = 31536000; // loan duration in seconds (1 year)
    const expectedYearlyInterestRate = ethers.utils.parseEther('1');

    const ownerOfFirstBefore = await testNFT.ownerOf(expectedTokenId);

    expect(ownerOfFirstBefore).not.to.equal(ethers.constants.AddressZero, 'The owner of the first minted token is the address zero');
    expect(ownerOfFirstBefore).to.equal(owner.address, 'The owner of the first NFT is not the sender');

    await testNFT.approve(loaNFT.address, expectedTokenId);

    await loaNFT.requestLoan(expectedAmount, testNFT.address, expectedTokenId, expectedLoanDuration, expectedYearlyInterestRate);

    const ownerOfFirstAfter = await testNFT.ownerOf(expectedTokenId);

    expect(ownerOfFirstAfter).to.equal(loaNFT.address, 'The NFT has not been transfered');

    expect(loaNFT.requestLoan(expectedAmount, testNFT.address, expectedTokenId, expectedLoanDuration, expectedYearlyInterestRate)).to.be.revertedWith(
      'A loan request is already active for this request. Remove it first'
    );
  });

  it('Should not be possible to send a loan request for the same asset if there is a loan already active', async function () {
    const [owner, supplier] = await ethers.getSigners();

    const expectedTokenId = 1;
    const expectedAmount = ethers.utils.parseEther('1');
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

    await loaNFT.connect(supplier).provideLiquidityForALoan(requestId, { value: expectedAmount.toString() });

    expect(loaNFT.requestLoan(expectedAmount, testNFT.address, expectedTokenId, expectedLoanDuration, expectedYearlyInterestRate)).to.be.revertedWith(
      'A loan is already active for this NFT'
    );
  });

  it('Should be possible to provide liquidity for a loan', async function () {
    const [owner, supplier] = await ethers.getSigners();

    const expectedTokenId = 1;
    const expectedAmount = ethers.utils.parseEther('1');
    const expectedLoanDuration = 31536000; // loan duration in seconds (1 year)
    const expectedYearlyInterestRate = ethers.utils.parseEther('1');

    await testNFT.approve(loaNFT.address, expectedTokenId);

    await loaNFT.requestLoan(expectedAmount, testNFT.address, expectedTokenId, expectedLoanDuration, expectedYearlyInterestRate);

    const requestId = ethers.utils.solidityKeccak256(['address', 'address', 'uint256'], [owner.address, testNFT.address, expectedTokenId]);

    const balanceBefore = await ethers.provider.getBalance(loaNFT.address);

    await loaNFT.connect(supplier).provideLiquidityForALoan(requestId, { value: expectedAmount.toString() });

    const balanceAfter = await ethers.provider.getBalance(loaNFT.address);

    expect(balanceBefore).to.be.lte(balanceAfter, 'Balance has not increased');
  });

  it('Should not be possible to provide liquidity for a loan twice', async function () {
    const [owner, supplier] = await ethers.getSigners();

    const expectedTokenId = 1;
    const expectedAmount = ethers.utils.parseEther('1');
    const expectedLoanDuration = 31536000; // loan duration in seconds (1 year)
    const expectedYearlyInterestRate = ethers.utils.parseEther('1');

    await testNFT.approve(loaNFT.address, expectedTokenId);

    await loaNFT.requestLoan(expectedAmount, testNFT.address, expectedTokenId, expectedLoanDuration, expectedYearlyInterestRate);

    const requestId = ethers.utils.solidityKeccak256(['address', 'address', 'uint256'], [owner.address, testNFT.address, expectedTokenId]);

    await loaNFT.connect(supplier).provideLiquidityForALoan(requestId, { value: expectedAmount.toString() });

    await expect(loaNFT.connect(supplier).provideLiquidityForALoan(requestId, { value: expectedAmount.toString() })).to.be.revertedWith(
      'A loan is already active for this NFT'
    );
  });

  // qui
  it('Should not be possible to provide wrong amount of eth for a loan request', async function () {
    const [owner, supplier] = await ethers.getSigners();

    const expectedTokenId = 1;
    const wrongAmount = 2;
    const expectedAmount = ethers.utils.parseEther('1');
    const expectedLoanDuration = 31536000; // loan duration in seconds (1 year)
    const expectedYearlyInterestRate = ethers.utils.parseEther('1');

    await testNFT.approve(loaNFT.address, expectedTokenId);

    await loaNFT.requestLoan(expectedAmount, testNFT.address, expectedTokenId, expectedLoanDuration, expectedYearlyInterestRate);

    const requestId = ethers.utils.solidityKeccak256(['address', 'address', 'uint256'], [owner.address, testNFT.address, expectedTokenId]);

    await expect(loaNFT.connect(supplier).provideLiquidityForALoan(requestId, { value: ethers.utils.parseEther(wrongAmount.toString()) })).to.be.revertedWith(
      'You are providing the wrong amount of money for this loan'
    );
  });

  it('Should not be possible to provide liquidity for a non existent loan request', async function () {
    const [owner, supplier] = await ethers.getSigners();

    const expectedTokenId = 1;
    const expectedAmount = ethers.utils.parseEther('1');

    const requestId = ethers.utils.solidityKeccak256(['address', 'address', 'uint256'], [owner.address, testNFT.address, expectedTokenId]);

    await expect(loaNFT.connect(supplier).provideLiquidityForALoan(requestId, { value: expectedAmount.toString() })).to.be.revertedWith(
      'The loan request does not exist'
    );
  });

  it('Should be possible to receive the loan when the liquidity has been provided', async function () {
    const [owner, supplier] = await ethers.getSigners();

    const expectedTokenId = 1;
    const expectedAmount = ethers.utils.parseEther('1');
    const expectedLoanDuration = 31536000; // loan duration in seconds (1 year)
    const expectedYearlyInterestRate = ethers.utils.parseEther('1');

    await testNFT.approve(loaNFT.address, expectedTokenId);

    await loaNFT.requestLoan(expectedAmount, testNFT.address, expectedTokenId, expectedLoanDuration, expectedYearlyInterestRate);

    const requestId = ethers.utils.solidityKeccak256(['address', 'address', 'uint256'], [owner.address, testNFT.address, expectedTokenId]);

    await loaNFT.connect(supplier).provideLiquidityForALoan(requestId, { value: expectedAmount.toString() });

    const balanceBefore = await ethers.provider.getBalance(owner.address);

    await loaNFT.connect(owner).widthrawLoan(requestId);

    const balanceAfter = await ethers.provider.getBalance(owner.address);

    expect(balanceBefore).to.be.lte(balanceAfter, "You didn't got the money for the loan");

    const { status } = await loaNFT.getLoan(requestId);

    expect(status).to.be.equal(2, 'Status has not been updated properly');
  });

  it('Should not be possible to receive a loan twice', async function () {
    const [owner, supplier] = await ethers.getSigners();

    const expectedTokenId = 1;
    const expectedAmount = ethers.utils.parseEther('1');
    const expectedLoanDuration = 31536000; // loan duration in seconds (1 year)
    const expectedYearlyInterestRate = ethers.utils.parseEther('1');

    await testNFT.approve(loaNFT.address, expectedTokenId);

    await loaNFT.requestLoan(expectedAmount, testNFT.address, expectedTokenId, expectedLoanDuration, expectedYearlyInterestRate);

    const requestId = ethers.utils.solidityKeccak256(['address', 'address', 'uint256'], [owner.address, testNFT.address, expectedTokenId]);

    await loaNFT.connect(supplier).provideLiquidityForALoan(requestId, { value: expectedAmount.toString() });

    await loaNFT.connect(owner).widthrawLoan(requestId);

    expect(loaNFT.widthrawLoan(requestId)).to.be.revertedWith('The loan is in the wrong state');
  });

  it('Should not be possible to receive a loan that does not belong to you', async function () {
    const [owner, supplier, thirdParty] = await ethers.getSigners();

    const expectedTokenId = 1;
    const expectedAmount = ethers.utils.parseEther('1');
    const expectedLoanDuration = 31536000; // loan duration in seconds (1 year)
    const expectedYearlyInterestRate = ethers.utils.parseEther('1');

    await testNFT.approve(loaNFT.address, expectedTokenId);

    await loaNFT.requestLoan(expectedAmount, testNFT.address, expectedTokenId, expectedLoanDuration, expectedYearlyInterestRate);

    const requestId = ethers.utils.solidityKeccak256(['address', 'address', 'uint256'], [owner.address, testNFT.address, expectedTokenId]);

    await loaNFT.connect(supplier).provideLiquidityForALoan(requestId, { value: expectedAmount.toString() });

    expect(loaNFT.connect(thirdParty).widthrawLoan(requestId)).to.be.revertedWith('This loan does not belong to you');
  });

  it('Should not be possible to withdraw a non existent loan', async function () {
    const [owner, supplier, thirdParty] = await ethers.getSigners();

    const expectedTokenId = 1;
    const wrongTokenId = 2;
    const expectedAmount = ethers.utils.parseEther('1');
    const expectedLoanDuration = 31536000; // loan duration in seconds (1 year)
    const expectedYearlyInterestRate = ethers.utils.parseEther('1');

    await testNFT.approve(loaNFT.address, expectedTokenId);

    await loaNFT.requestLoan(expectedAmount, testNFT.address, expectedTokenId, expectedLoanDuration, expectedYearlyInterestRate);

    const requestId = ethers.utils.solidityKeccak256(['address', 'address', 'uint256'], [owner.address, testNFT.address, expectedTokenId]);

    const wrongRequestId = ethers.utils.solidityKeccak256(['address', 'address', 'uint256'], [owner.address, testNFT.address, wrongTokenId]);

    await loaNFT.connect(supplier).provideLiquidityForALoan(requestId, { value: expectedAmount.toString() });

    expect(loaNFT.connect(owner).widthrawLoan(wrongRequestId)).to.be.revertedWith('The loan does not exist');
  });

  it('Should be possible to repay the loan', async function () {
    const [owner, supplier] = await ethers.getSigners();

    const expectedTokenId = 1;
    const expectedAmount = ethers.utils.parseEther('1');
    const expectedLoanDuration = 31536000; // loan duration in seconds (1 year)
    const expectedYearlyInterestRate = ethers.utils.parseEther('1');

    await testNFT.approve(loaNFT.address, expectedTokenId);

    await loaNFT.requestLoan(expectedAmount, testNFT.address, expectedTokenId, expectedLoanDuration, expectedYearlyInterestRate);

    const requestId = ethers.utils.solidityKeccak256(['address', 'address', 'uint256'], [owner.address, testNFT.address, expectedTokenId]);

    await loaNFT.connect(supplier).provideLiquidityForALoan(requestId, { value: expectedAmount.toString() });

    await loaNFT.connect(owner).widthrawLoan(requestId);

    await ethers.provider.send('evm_increaseTime', [expectedLoanDuration - 536000]);
    await ethers.provider.send('evm_mine', []);

    const interests: BigNumber = await loaNFT.getLoanInterests(requestId);

    const tolleranceMultiplier = 2;

    const contractBalanceBefore = await ethers.provider.getBalance(loaNFT.address);

    await loaNFT.connect(owner).repayLoan(requestId, { value: expectedAmount.add(interests.mul(tolleranceMultiplier)) });

    const contractBalanceAfter = await ethers.provider.getBalance(loaNFT.address);

    expect(contractBalanceBefore).to.be.lt(contractBalanceAfter, 'You got no money back');
  });

  it('Should not be possible to repay the loan twice', async function () {
    const [owner, supplier] = await ethers.getSigners();

    const expectedTokenId = 1;
    const expectedAmount = ethers.utils.parseEther('1');
    const expectedLoanDuration = 31536000; // loan duration in seconds (1 year)
    const expectedYearlyInterestRate = ethers.utils.parseEther('1');

    await testNFT.approve(loaNFT.address, expectedTokenId);

    await loaNFT.requestLoan(expectedAmount, testNFT.address, expectedTokenId, expectedLoanDuration, expectedYearlyInterestRate);

    const requestId = ethers.utils.solidityKeccak256(['address', 'address', 'uint256'], [owner.address, testNFT.address, expectedTokenId]);

    await loaNFT.connect(supplier).provideLiquidityForALoan(requestId, { value: expectedAmount.toString() });

    await loaNFT.connect(owner).widthrawLoan(requestId);

    await ethers.provider.send('evm_increaseTime', [expectedLoanDuration - 536000]);
    await ethers.provider.send('evm_mine', []);

    const interests: BigNumber = await loaNFT.getLoanInterests(requestId);

    const tolleranceMultiplier = 4;

    await loaNFT.connect(owner).repayLoan(requestId, { value: expectedAmount.add(interests.mul(tolleranceMultiplier)) });

    expect(loaNFT.connect(owner).repayLoan(requestId, { value: expectedAmount.add(interests.mul(tolleranceMultiplier)) })).to.be.revertedWith(
      'The loan is not active. Nothing to repay'
    );
  });

  it('Should not be possible to repay a non existent loan', async function () {
    const [owner, supplier] = await ethers.getSigners();

    const expectedTokenId = 1;
    const wrongTokenId = 2;
    const expectedAmount = ethers.utils.parseEther('1');
    const expectedLoanDuration = 31536000; // loan duration in seconds (1 year)
    const expectedYearlyInterestRate = ethers.utils.parseEther('1');

    await testNFT.approve(loaNFT.address, expectedTokenId);

    await loaNFT.requestLoan(expectedAmount, testNFT.address, expectedTokenId, expectedLoanDuration, expectedYearlyInterestRate);

    const requestId = ethers.utils.solidityKeccak256(['address', 'address', 'uint256'], [owner.address, testNFT.address, expectedTokenId]);

    const wrongRequestId = ethers.utils.solidityKeccak256(['address', 'address', 'uint256'], [owner.address, testNFT.address, wrongTokenId]);

    await loaNFT.connect(supplier).provideLiquidityForALoan(requestId, { value: expectedAmount.toString() });

    await loaNFT.connect(owner).widthrawLoan(requestId);

    await ethers.provider.send('evm_increaseTime', [expectedLoanDuration - 536000]);
    await ethers.provider.send('evm_mine', []);

    const interests: BigNumber = await loaNFT.getLoanInterests(requestId);

    const tolleranceMultiplier = 4;

    expect(loaNFT.connect(owner).repayLoan(wrongRequestId, { value: expectedAmount.add(interests.mul(tolleranceMultiplier)) })).to.be.revertedWith(
      'The loan does not exist'
    );
  });

  it('Should not be possible to repay a loan that does not belong to you', async function () {
    const [owner, supplier, thirdParty] = await ethers.getSigners();

    const expectedTokenId = 1;
    const expectedAmount = ethers.utils.parseEther('1');
    const expectedLoanDuration = 31536000; // loan duration in seconds (1 year)
    const expectedYearlyInterestRate = ethers.utils.parseEther('1');

    await testNFT.approve(loaNFT.address, expectedTokenId);

    await loaNFT.requestLoan(expectedAmount, testNFT.address, expectedTokenId, expectedLoanDuration, expectedYearlyInterestRate);

    const requestId = ethers.utils.solidityKeccak256(['address', 'address', 'uint256'], [owner.address, testNFT.address, expectedTokenId]);

    await loaNFT.connect(supplier).provideLiquidityForALoan(requestId, { value: expectedAmount.toString() });

    await loaNFT.connect(owner).widthrawLoan(requestId);

    await ethers.provider.send('evm_increaseTime', [expectedLoanDuration - 536000]);
    await ethers.provider.send('evm_mine', []);

    const interests: BigNumber = await loaNFT.getLoanInterests(requestId);

    const tolleranceMultiplier = 4;

    expect(loaNFT.connect(thirdParty).repayLoan(requestId, { value: expectedAmount.add(interests.mul(tolleranceMultiplier)) })).to.be.revertedWith(
      'This loan does not belong to you'
    );
  });

  it('Should not be possible to repay a loan if the deadline has passed', async function () {
    const [owner, supplier] = await ethers.getSigners();

    const expectedTokenId = 1;
    const expectedAmount = ethers.utils.parseEther('1');
    const expectedLoanDuration = 31536000; // loan duration in seconds (1 year)
    const expectedYearlyInterestRate = ethers.utils.parseEther('1');

    await testNFT.approve(loaNFT.address, expectedTokenId);

    await loaNFT.requestLoan(expectedAmount, testNFT.address, expectedTokenId, expectedLoanDuration, expectedYearlyInterestRate);

    const requestId = ethers.utils.solidityKeccak256(['address', 'address', 'uint256'], [owner.address, testNFT.address, expectedTokenId]);

    await loaNFT.connect(supplier).provideLiquidityForALoan(requestId, { value: expectedAmount.toString() });

    await loaNFT.connect(owner).widthrawLoan(requestId);

    await ethers.provider.send('evm_increaseTime', [expectedLoanDuration + 536000]);
    await ethers.provider.send('evm_mine', []);

    const interests: BigNumber = await loaNFT.getLoanInterests(requestId);

    const tolleranceMultiplier = 4;

    expect(loaNFT.connect(owner).repayLoan(requestId, { value: expectedAmount.add(interests.mul(tolleranceMultiplier)) })).to.be.revertedWith('Too late');
  });

  it('Should be possible to get the money back if the loan has been repaid', async function () {
    const [owner, supplier] = await ethers.getSigners();

    const expectedTokenId = 1;
    const expectedAmount = ethers.utils.parseEther('1');
    const expectedLoanDuration = 31536000; // loan duration in seconds (1 year)
    const expectedYearlyInterestRate = ethers.utils.parseEther('1');

    await testNFT.approve(loaNFT.address, expectedTokenId);

    await loaNFT.requestLoan(expectedAmount, testNFT.address, expectedTokenId, expectedLoanDuration, expectedYearlyInterestRate);

    const requestId = ethers.utils.solidityKeccak256(['address', 'address', 'uint256'], [owner.address, testNFT.address, expectedTokenId]);

    await loaNFT.connect(supplier).provideLiquidityForALoan(requestId, { value: expectedAmount.toString() });

    await loaNFT.connect(owner).widthrawLoan(requestId);

    await ethers.provider.send('evm_increaseTime', [expectedLoanDuration - 536000]);
    await ethers.provider.send('evm_mine', []);

    const interests: BigNumber = await loaNFT.getLoanInterests(requestId);

    const tolleranceMultiplier = 4;

    await loaNFT.connect(owner).repayLoan(requestId, { value: expectedAmount.add(interests.mul(tolleranceMultiplier)) });

    const balanceBefore = await ethers.provider.getBalance(supplier.address);

    await loaNFT.connect(supplier).redeemLoanOrNFT(requestId);

    const balanceAfter = await ethers.provider.getBalance(supplier.address);

    expect(balanceBefore).to.be.lt(balanceAfter, 'You got no money back');

    const contractBalance = await ethers.provider.getBalance(loaNFT.address);

    expect(contractBalance).to.be.eq(0, 'Contract balance is not zero');
  });

  it('Should not be possible to get the money back twice', async function () {
    const [owner, supplier] = await ethers.getSigners();

    const expectedTokenId = 1;
    const expectedAmount = ethers.utils.parseEther('1');
    const expectedLoanDuration = 31536000; // loan duration in seconds (1 year)
    const expectedYearlyInterestRate = ethers.utils.parseEther('1');

    await testNFT.approve(loaNFT.address, expectedTokenId);

    await loaNFT.requestLoan(expectedAmount, testNFT.address, expectedTokenId, expectedLoanDuration, expectedYearlyInterestRate);

    const requestId = ethers.utils.solidityKeccak256(['address', 'address', 'uint256'], [owner.address, testNFT.address, expectedTokenId]);

    await loaNFT.connect(supplier).provideLiquidityForALoan(requestId, { value: expectedAmount.toString() });

    await loaNFT.connect(owner).widthrawLoan(requestId);

    await ethers.provider.send('evm_increaseTime', [expectedLoanDuration - 536000]);
    await ethers.provider.send('evm_mine', []);

    const interests: BigNumber = await loaNFT.getLoanInterests(requestId);

    const tolleranceMultiplier = 4;

    await loaNFT.connect(owner).repayLoan(requestId, { value: expectedAmount.add(interests.mul(tolleranceMultiplier)) });

    await loaNFT.connect(supplier).redeemLoanOrNFT(requestId);

    expect(loaNFT.connect(supplier).redeemLoanOrNFT(requestId)).to.be.revertedWith('The loan does not exist');
  });

  it('Should be possible to get the NFT back if the loan has not been repaid within the deadline', async function () {
    const [owner, supplier] = await ethers.getSigners();

    const expectedTokenId = 1;
    const expectedAmount = ethers.utils.parseEther('1');
    const expectedLoanDuration = 31536000; // loan duration in seconds (1 year)
    const expectedYearlyInterestRate = ethers.utils.parseEther('1');

    await testNFT.approve(loaNFT.address, expectedTokenId);

    await loaNFT.requestLoan(expectedAmount, testNFT.address, expectedTokenId, expectedLoanDuration, expectedYearlyInterestRate);

    const requestId = ethers.utils.solidityKeccak256(['address', 'address', 'uint256'], [owner.address, testNFT.address, expectedTokenId]);

    await loaNFT.connect(supplier).provideLiquidityForALoan(requestId, { value: expectedAmount.toString() });

    await loaNFT.connect(owner).widthrawLoan(requestId);

    await ethers.provider.send('evm_increaseTime', [expectedLoanDuration + 10]);
    await ethers.provider.send('evm_mine', []);

    const nftOwnerBefore = await testNFT.ownerOf(expectedTokenId);

    await loaNFT.connect(supplier).redeemLoanOrNFT(requestId);

    const nftOwnerAfter = await testNFT.ownerOf(expectedTokenId);

    expect(nftOwnerBefore).to.be.equal(loaNFT.address, 'NFT was not owned by the contract');
    expect(nftOwnerAfter).to.be.equal(supplier.address, 'NFT has not been sent to the supplier');
  });

  it('Should not be possible to get the NFT back twice', async function () {
    const [owner, supplier] = await ethers.getSigners();

    const expectedTokenId = 1;
    const expectedAmount = ethers.utils.parseEther('1');
    const expectedLoanDuration = 31536000; // loan duration in seconds (1 year)
    const expectedYearlyInterestRate = ethers.utils.parseEther('1');

    await testNFT.approve(loaNFT.address, expectedTokenId);

    await loaNFT.requestLoan(expectedAmount, testNFT.address, expectedTokenId, expectedLoanDuration, expectedYearlyInterestRate);

    const requestId = ethers.utils.solidityKeccak256(['address', 'address', 'uint256'], [owner.address, testNFT.address, expectedTokenId]);

    await loaNFT.connect(supplier).provideLiquidityForALoan(requestId, { value: expectedAmount.toString() });

    await loaNFT.connect(owner).widthrawLoan(requestId);

    await ethers.provider.send('evm_increaseTime', [expectedLoanDuration + 10]);
    await ethers.provider.send('evm_mine', []);

    await loaNFT.connect(supplier).redeemLoanOrNFT(requestId);

    expect(loaNFT.connect(supplier).redeemLoanOrNFT(requestId)).to.be.revertedWith('The loan does not exist');
  });

  it('Should not be possible to get back an NFT from a loan that does not belong to you', async function () {
    const [owner, supplier, thirdParty] = await ethers.getSigners();

    const expectedTokenId = 1;
    const expectedAmount = ethers.utils.parseEther('1');
    const expectedLoanDuration = 31536000; // loan duration in seconds (1 year)
    const expectedYearlyInterestRate = ethers.utils.parseEther('1');

    await testNFT.approve(loaNFT.address, expectedTokenId);

    await loaNFT.requestLoan(expectedAmount, testNFT.address, expectedTokenId, expectedLoanDuration, expectedYearlyInterestRate);

    const requestId = ethers.utils.solidityKeccak256(['address', 'address', 'uint256'], [owner.address, testNFT.address, expectedTokenId]);

    await loaNFT.connect(supplier).provideLiquidityForALoan(requestId, { value: expectedAmount.toString() });

    await loaNFT.connect(owner).widthrawLoan(requestId);

    await ethers.provider.send('evm_increaseTime', [expectedLoanDuration + 10]);
    await ethers.provider.send('evm_mine', []);

    expect(loaNFT.connect(thirdParty).redeemLoanOrNFT(requestId)).to.be.revertedWith('This loan has not been funded by you');
  });

  it('Should be possible to handle multiple loans at the same time', async function () {
    const [firstOwner, firstSupplier, secondOwner, secondSupplier] = await ethers.getSigners();

    const expectedTokenId = 1;
    const expectedAmount = ethers.utils.parseEther('2');
    const expectedLoanDuration = 31536000; // loan duration in seconds (1 year)
    const expectedYearlyInterestRate = ethers.utils.parseEther('1');

    await testNFT.approve(loaNFT.address, expectedTokenId);

    await loaNFT.requestLoan(expectedAmount, testNFT.address, expectedTokenId, expectedLoanDuration, expectedYearlyInterestRate);

    await testNFT.connect(secondOwner).mint();

    const secondTokenIdBignumber = await testNFT.connect(secondOwner).getLastId();

    const secondTokenId = secondTokenIdBignumber.toNumber();

    await testNFT.connect(secondOwner).approve(loaNFT.address, secondTokenId);

    await loaNFT.connect(secondOwner).requestLoan(expectedAmount, testNFT.address, secondTokenId, expectedLoanDuration, expectedYearlyInterestRate);

    const firstRequestId = ethers.utils.solidityKeccak256(['address', 'address', 'uint256'], [firstOwner.address, testNFT.address, expectedTokenId]);

    const secondRequestId = ethers.utils.solidityKeccak256(['address', 'address', 'uint256'], [secondOwner.address, testNFT.address, secondTokenId]);

    await loaNFT.connect(secondSupplier).provideLiquidityForALoan(secondRequestId, { value: expectedAmount.toString() });

    await loaNFT.connect(firstSupplier).provideLiquidityForALoan(firstRequestId, { value: expectedAmount.toString() });

    let firstBalanceBefore = await ethers.provider.getBalance(firstOwner.address);

    await loaNFT.connect(firstOwner).widthrawLoan(firstRequestId);

    let firstBalanceAfter = await ethers.provider.getBalance(firstOwner.address);

    expect(firstBalanceBefore).to.be.lt(firstBalanceAfter, 'Balance has not increased');

    await ethers.provider.send('evm_increaseTime', [expectedLoanDuration - 1000000]);
    await ethers.provider.send('evm_mine', []);

    let secondBalanceBefore = await ethers.provider.getBalance(secondOwner.address);

    await loaNFT.connect(secondOwner).widthrawLoan(secondRequestId);

    let secondBalanceAfter = await ethers.provider.getBalance(secondOwner.address);

    expect(secondBalanceBefore).to.be.lt(secondBalanceAfter, 'Balance has not increased');

    await ethers.provider.send('evm_increaseTime', [10000]);
    await ethers.provider.send('evm_mine', []);

    const secondInterests: BigNumber = await loaNFT.getLoanInterests(secondRequestId);

    const tolleranceMultiplier = 4;

    secondBalanceBefore = await ethers.provider.getBalance(secondOwner.address);

    await loaNFT.connect(secondOwner).repayLoan(secondRequestId, { value: expectedAmount.add(secondInterests.mul(tolleranceMultiplier)) });

    await loaNFT.connect(secondSupplier).redeemLoanOrNFT(secondRequestId);

    secondBalanceAfter = await ethers.provider.getBalance(secondOwner.address);

    expect(secondBalanceBefore).to.be.gt(secondBalanceAfter, 'Loan has not been repaid');

    await ethers.provider.send('evm_increaseTime', [10000]);
    await ethers.provider.send('evm_mine', []);

    const firstInterests: BigNumber = await loaNFT.getLoanInterests(firstRequestId);

    firstBalanceBefore = await ethers.provider.getBalance(firstOwner.address);

    let cb = await ethers.provider.getBalance(loaNFT.address);

    await loaNFT.connect(firstOwner).repayLoan(firstRequestId, { value: expectedAmount.add(firstInterests.mul(tolleranceMultiplier)) });

    await loaNFT.connect(firstSupplier).redeemLoanOrNFT(firstRequestId);

    firstBalanceAfter = await ethers.provider.getBalance(firstOwner.address);

    expect(firstBalanceBefore).to.be.gt(firstBalanceAfter, 'Loan has not been repaid');

    const contractBalanceAtTheEnd = await ethers.provider.getBalance(loaNFT.address);

    expect(contractBalanceAtTheEnd).to.be.eq(0, 'Balance is not zero');
  });
});

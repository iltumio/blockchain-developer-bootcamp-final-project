pragma solidity 0.8.9;
//SPDX-License-Identifier: MIT

import "hardhat/console.sol";

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./lib/InterestHelper.sol";

contract LoaNFT is Ownable, IERC721Receiver, Interest {
    enum LoanStatus {
        INITIAL,
        FUNDED,
        ACTIVE,
        REPAID,
        CLOSED
    }

    struct LoanRequest {
        address applicant; // person who wants to receive a loan using an NFT as collateral
        uint256 amount; // requested amount in eth
        address erc721contract; // address of the ERC721 NFT contract
        uint256 tokenId; // tokenid of the NFT the user is willing to put as collateral for the loan
        uint32 loanDuration; // loan duration in number of blocks
        uint256 yearlyInterestRate; // interest rate on a yearly basis
    }

    struct Loan {
        address applicant; // person who wants to receive a loan using an NFT as collateral
        address supplier; // person who provide liquidity accepting an NFT as collateral
        uint256 amount; // requested amount in eth
        address erc721contract; // address of the ERC721 NFT contract
        uint256 tokenId; // tokenid of the NFT placed as collateral for the loan
        uint256 yearlyInterestRate; // interest rate on a yearly basis
        uint256 deadline; // deadline to repay the loan. Only available when the loan is active
        uint256 startedAt; // timestamp when to start counting the interests
        uint256 finalInterests; // interests computed during the repay
        LoanStatus status; // current state of the loan
    }

    // Mapping of all the loan requests
    LoanRequest[] public loanRequests;

    // Tracks the index of each loan request inside the mapping
    mapping(bytes32 => uint256) private loanRequestsTracker;

    // List of all the active loans
    Loan[] public loans;

    // Tracks the index of each loan inside the mapping
    mapping(bytes32 => uint256) private loansTracker;

    uint256 constant MAX_UINT =
        0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;

    event LoanRequested(
        bytes32 indexed requestId,
        address indexed applicant,
        uint256 amount,
        uint32 loanDuration,
        uint256 yearlyInterestRate
    );

    event LiquidityProvided(
        bytes32 indexed requestId,
        address indexed applicant,
        address indexed supplier,
        uint256 amount,
        uint32 loanDuration,
        uint256 yearlyInterestRate
    );

    event LoanWithdraw(
        bytes32 indexed requestId,
        address indexed applicant,
        address indexed supplier
    );

    event LoanRepaid(
        bytes32 indexed requestId,
        address indexed applicant,
        address indexed supplier
    );

    event LoanExtinguishedWithMoney(
        bytes32 indexed requestId,
        address indexed applicant,
        address indexed supplier
    );

    event LoanExtinguishedWithNFT(
        bytes32 indexed requestId,
        address indexed applicant,
        address indexed supplier
    );

    /**
     * Returns a loan request using the given requestId
     */
    function getLoanRequest(bytes32 _requestId)
        public
        view
        returns (LoanRequest memory)
    {
        uint256 index = loanRequestsTracker[_requestId];
        require(index != 0, "Request does not exist");
        return loanRequests[index - 1];
    }

    /**
     * Adds a new loan request to the loanRequests mapping
     */
    function _addLoanRequest(bytes32 requestId, LoanRequest memory _loanRequest)
        internal
    {
        loanRequests.push(_loanRequest);
        uint256 index = loanRequests.length;
        loanRequestsTracker[requestId] = index;
    }

    /**
     * Removes the loan request with the given requestId from the loanRequests mapping
     */
    function _removeRequest(bytes32 requestId) internal {
        require(loanRequests.length > 0, "There are no requests to remove");
        // Index of the element to remove
        uint256 index = loanRequestsTracker[requestId] - 1;
        uint256 lastIndex = loanRequests.length - 1;

        if (index != lastIndex) {
            // Last friend inside the array
            LoanRequest memory last = loanRequests[lastIndex];
            // Change the last with the element to remove
            loanRequests[index] = last;
            // Compute the request id for the last request
            bytes32 lastRequestId = _computeRequestId(
                last.applicant,
                last.erc721contract,
                last.tokenId
            );
            // Update the Index
            loanRequestsTracker[lastRequestId] = index + 1;
        }

        // Clear the previous index by setting the maximum integer
        loanRequestsTracker[requestId] = MAX_UINT;

        // Reduce the size of the array by 1
        loanRequests.pop();
    }

    /**
     * Returns a loan from the loans mapping
     */
    function getLoan(bytes32 _loanId) public view returns (Loan memory) {
        uint256 index = loansTracker[_loanId];
        require(index != 0, "Loan does not exist");
        return loans[index - 1];
    }

    /**
     * Adds a loan to the loans mapping
     */
    function _addLoan(bytes32 _loanId, Loan memory _loan) internal {
        loans.push(_loan);
        uint256 index = loans.length;
        loansTracker[_loanId] = index;
    }

    /**
     * Removes a loan from the loans mapping
     */
    function _removeLoan(bytes32 _loanId) internal {
        require(loans.length > 0, "There are no loans to remove");
        // Index of the element to remove
        uint256 index = loansTracker[_loanId] - 1;
        uint256 lastIndex = loans.length - 1;

        if (index != lastIndex) {
            // Last friend inside the array
            Loan memory last = loans[lastIndex];
            // Change the last with the element to remove
            loans[index] = last;
            // Compute the loan id for the last request
            bytes32 lastLoanId = _computeRequestId(
                last.applicant,
                last.erc721contract,
                last.tokenId
            );
            // Update the Index
            loansTracker[lastLoanId] = index + 1;
        }

        // Clear the previous index by setting the maximum integer
        loansTracker[_loanId] = MAX_UINT;

        // Reduce the size of the array by 1
        loans.pop();
    }

    function _computeRequestId(
        address sender,
        address erc721contract,
        uint256 tokenId
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(sender, erc721contract, tokenId));
    }

    function getLoanInterests(bytes32 loanId) public view returns (uint256) {
        require(
            loansTracker[loanId] != 0 && loansTracker[loanId] != MAX_UINT,
            "The loan does not exist"
        );
        Loan memory loan = getLoan(loanId);

        uint256 effectiveRatePerSecond = yearlyRateToRay(
            loan.yearlyInterestRate
        );

        uint256 elapsedTime = block.timestamp - loan.startedAt;

        return
            accrueInterest(loan.amount, effectiveRatePerSecond, elapsedTime) -
            loan.amount;
    }

    function requestLoan(
        uint256 amount,
        address erc721contract,
        uint256 tokenId,
        uint32 loanDuration,
        uint256 yearlyInterestRate
    ) public {
        bytes32 requestId = _computeRequestId(
            msg.sender,
            erc721contract,
            tokenId
        );
        require(
            loanRequestsTracker[requestId] == 0 ||
                loanRequestsTracker[requestId] == MAX_UINT,
            "A loan request is already active for this request. Remove it first"
        );
        require(
            loansTracker[requestId] == 0 || loansTracker[requestId] == MAX_UINT,
            "A loan is already active for this NFT"
        );

        // Instanciate the ERC721 contract for the transfer
        IERC721 nftContract = IERC721(erc721contract);

        _addLoanRequest(
            requestId,
            LoanRequest({
                applicant: msg.sender,
                erc721contract: erc721contract,
                amount: amount,
                tokenId: tokenId,
                loanDuration: loanDuration,
                yearlyInterestRate: yearlyInterestRate
            })
        );

        // Transfer the NFT from the user to the contract
        nftContract.safeTransferFrom(msg.sender, address(this), tokenId);

        emit LoanRequested(
            requestId,
            msg.sender,
            amount,
            loanDuration,
            yearlyInterestRate
        );
    }

    function provideLiquidityForALoan(bytes32 requestId) public payable {
        require(
            loansTracker[requestId] == 0 || loansTracker[requestId] == MAX_UINT,
            "A loan is already active for this NFT"
        );
        require(
            loanRequestsTracker[requestId] != 0 &&
                loanRequestsTracker[requestId] != MAX_UINT,
            "The loan request does not exist"
        );
        LoanRequest memory loanRequest = getLoanRequest(requestId);

        require(
            msg.value == loanRequest.amount,
            "You are providing the wrong amount of money for this loan"
        );

        Loan memory loan = Loan({
            applicant: loanRequest.applicant,
            supplier: msg.sender,
            erc721contract: loanRequest.erc721contract,
            amount: loanRequest.amount,
            tokenId: loanRequest.tokenId,
            yearlyInterestRate: loanRequest.yearlyInterestRate,
            deadline: block.timestamp + loanRequest.loanDuration,
            startedAt: 0,
            finalInterests: 0,
            status: LoanStatus.FUNDED
        });

        _addLoan(requestId, loan);
        _removeRequest(requestId);

        emit LiquidityProvided(
            requestId,
            loan.applicant,
            msg.sender,
            loanRequest.amount,
            loanRequest.loanDuration,
            loanRequest.yearlyInterestRate
        );
    }

    function widthrawLoan(bytes32 loanId) public {
        require(
            loansTracker[loanId] != 0 && loansTracker[loanId] != MAX_UINT,
            "The loan does not exist"
        );

        Loan memory loan = getLoan(loanId);

        require(
            loan.applicant == msg.sender,
            "This loan does not belong to you"
        );
        require(
            loan.status == LoanStatus.FUNDED,
            "The loan is in the wrong state"
        );

        loans[loansTracker[loanId] - 1].status = LoanStatus.ACTIVE;
        loans[loansTracker[loanId] - 1].startedAt = block.timestamp;

        payable(loan.applicant).transfer(loan.amount);

        emit LoanWithdraw(loanId, loan.applicant, loan.supplier);
    }

    function repayLoan(bytes32 loanId) public payable {
        require(
            loansTracker[loanId] != 0 && loansTracker[loanId] != MAX_UINT,
            "The loan does not exist"
        );

        Loan memory loan = getLoan(loanId);

        require(
            loan.applicant == msg.sender,
            "This loan does not belong to you"
        );
        require(
            loan.status == LoanStatus.ACTIVE,
            "The loan is not active. Nothing to repay"
        );
        require(block.timestamp < loan.deadline, "Too late");

        uint256 interests = getLoanInterests(loanId);

        require(
            msg.value >= loan.amount + interests,
            "You must repay the amount + the interests"
        );

        loans[loansTracker[loanId] - 1].status = LoanStatus.REPAID;
        loans[loansTracker[loanId] - 1].finalInterests = interests;

        // Pay back the extra amount that has been sent as tollerance
        uint256 difference = msg.value - (loan.amount + interests);

        payable(msg.sender).transfer(difference);

        emit LoanRepaid(loanId, loan.applicant, loan.supplier);
    }

    function redeemLoanOrNFT(bytes32 loanId) public payable {
        require(
            loansTracker[loanId] != 0 && loansTracker[loanId] != MAX_UINT,
            "The loan does not exist"
        );

        Loan memory loan = getLoan(loanId);

        require(
            loan.supplier == msg.sender,
            "This loan has not been funded by you"
        );
        require(
            loan.status == LoanStatus.REPAID ||
                (loan.status == LoanStatus.ACTIVE &&
                    block.timestamp > loan.deadline),
            "Conditions to redeem the loan doesn't match"
        );

        if (loan.status == LoanStatus.REPAID) {
            _payLoanBack(loanId);
        } else if (
            loan.status == LoanStatus.ACTIVE && block.timestamp >= loan.deadline
        ) {
            _sendNFTToTheSupplier(loanId);
        }

        _removeLoan(loanId);
    }

    function _payLoanBack(bytes32 loanId) internal {
        Loan memory loan = getLoan(loanId);

        uint256 amount = loan.amount + loan.finalInterests;

        loans[loansTracker[loanId] - 1].status = LoanStatus.CLOSED;

        payable(msg.sender).transfer(amount);

        emit LoanExtinguishedWithMoney(loanId, loan.applicant, loan.supplier);
    }

    function _sendNFTToTheSupplier(bytes32 loanId) internal {
        Loan memory loan = getLoan(loanId);

        loans[loansTracker[loanId] - 1].status = LoanStatus.CLOSED;

        IERC721(loan.erc721contract).safeTransferFrom(
            address(this),
            msg.sender,
            loan.tokenId
        );

        emit LoanExtinguishedWithNFT(loanId, loan.applicant, loan.supplier);
    }

    /**
     * Always returns `IERC721Receiver.onERC721Received.selector`.
     */
    function onERC721Received(
        address,
        address,
        uint256,
        bytes memory
    ) public virtual override returns (bytes4) {
        return this.onERC721Received.selector;
    }
}

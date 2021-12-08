pragma solidity 0.8.9;
//SPDX-License-Identifier: MIT

import "hardhat/console.sol";

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./lib/InterestHelper.sol";

/// @title LoaNFT - NFTs as collateral for loans
/// @author Manuel Tumiati
/// @notice Users can request and obtain loans using their NFTs as collateral
/// @dev There are 2 structs for Loan requests and Loans. The active requests and loans are
/// stored in arrays and tracked using mappings for gas optimization.
/// requestId and loanId are the same and are computed by hashing the sender address,
/// the NFT contract address and the tokenId together
/// This contract makes use of solidity-interests-helper by Nick Ward
/// https://github.com/wolflo/solidity-interest-helper
contract LoaNFT is Ownable, Pausable, IERC721Receiver, Interest {
    // Keeps track of the state when a request become effectively a loan
    enum LoanStatus {
        INITIAL,
        FUNDED,
        ACTIVE,
        REPAID,
        CLOSED
    }

    // Definition of a request object
    struct LoanRequest {
        address applicant; // person who wants to receive a loan using an NFT as collateral
        uint256 amount; // requested amount in eth
        address erc721contract; // address of the ERC721 NFT contract
        uint256 tokenId; // tokenid of the NFT the user is willing to put as collateral for the loan
        uint32 loanDuration; // loan duration in number of blocks
        uint256 yearlyInterestRate; // interest rate on a yearly basis
    }

    // Definition of a loan object
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

    // Constant used to mark a request or a loan as removed inside the trackers
    uint256 constant MAX_UINT =
        0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;

    /// @notice Loan Request created event
    /// @param requestId Id of the request
    /// @param applicant User who requested the loan
    /// @param amount Amount of money the user is requesting
    /// @param loanDuration Max duration of the loan (in seconds)
    /// @param yearlyInterestRate Yearly interest rate the user is willing to pay for the loan
    event LoanRequested(
        bytes32 indexed requestId,
        address indexed applicant,
        uint256 amount,
        uint32 loanDuration,
        uint256 yearlyInterestRate
    );

    /// @notice Liquidity Provided event
    /// @param requestId Id of the request
    /// @param applicant User who requested the loan
    /// @param supplier User who provided liquidity for the loan
    /// @param amount Amount of money the user is requesting
    /// @param loanDuration Max duration of the loan (in seconds)
    /// @param yearlyInterestRate Yearly interest rate the user is willing to pay for the loan
    event LiquidityProvided(
        bytes32 indexed requestId,
        address indexed applicant,
        address indexed supplier,
        uint256 amount,
        uint32 loanDuration,
        uint256 yearlyInterestRate
    );

    /// @notice Loan Withdraw event. It's fired whenever the applicant starts the loan
    /// @param requestId Id of the request
    /// @param applicant User who requested the loan
    /// @param supplier User who provided liquidity for the loan
    event LoanWithdraw(
        bytes32 indexed requestId,
        address indexed applicant,
        address indexed supplier
    );

    /// @notice Loan Repaid event. It's fired whenever the applicant repays the loan
    /// @param requestId Id of the request
    /// @param applicant User who requested the loan
    /// @param supplier User who provided liquidity for the loan
    event LoanRepaid(
        bytes32 indexed requestId,
        address indexed applicant,
        address indexed supplier
    );

    /// @notice Loan Extinguished with money event. It's fired whenever the supplier calls the redeem functions and the
    /// loan was repaid by the applicant. In this case the supplier gets money + interests back
    /// @param requestId Id of the request
    /// @param applicant User who requested the loan
    /// @param supplier User who provided liquidity for the loan
    event LoanExtinguishedWithMoney(
        bytes32 indexed requestId,
        address indexed applicant,
        address indexed supplier
    );

    /// @notice Loan Extinguished with NFT event. It's fired whenever the supplier calls the redeem functions, but the
    /// loan was not repaid by the applicant. In this case the supplier gets the NFT that was placed as collateral
    /// @param requestId Id of the request
    /// @param applicant User who requested the loan
    /// @param supplier User who provided liquidity for the loan
    event LoanExtinguishedWithNFT(
        bytes32 indexed requestId,
        address indexed applicant,
        address indexed supplier
    );

    /// @notice Returns a loan request from the mapping
    /// @param _requestId Id of the request to return
    function getLoanRequest(bytes32 _requestId)
        public
        view
        returns (LoanRequest memory)
    {
        uint256 index = loanRequestsTracker[_requestId];
        require(index != 0, "Request does not exist");
        return loanRequests[index - 1];
    }

    /// @notice Returns a loan from the mapping
    /// @param _loanId Id of the loan to return
    function getLoan(bytes32 _loanId) public view returns (Loan memory) {
        uint256 index = loansTracker[_loanId];
        require(index != 0, "Loan does not exist");
        return loans[index - 1];
    }

    /// @notice Public function that returns the list af all loan requests
    /// @dev it's used by the UI to show the list of requests
    function getAllLoanRequests() public view returns (LoanRequest[] memory) {
        return loanRequests;
    }

    /// @notice Public function that returns the list af all loans
    /// @dev it's used by the UI to show the list of loans
    function getAllLoans() public view returns (Loan[] memory) {
        return loans;
    }

    /// @notice Adds a loan request to the array and keeps track of it in the mapping
    /// @param _requestId Id of the request to add
    /// @param _loanRequest Request object to add
    function _addLoanRequest(
        bytes32 _requestId,
        LoanRequest memory _loanRequest
    ) internal {
        loanRequests.push(_loanRequest);
        uint256 index = loanRequests.length;
        loanRequestsTracker[_requestId] = index;
    }

    /// @notice Removes the loan request with the given requestId from the array and updates the tracker
    /// @param _requestId Id of the request to remove
    function _removeRequest(bytes32 _requestId) internal {
        require(loanRequests.length > 0, "There are no requests to remove");
        // Index of the element to remove
        uint256 index = loanRequestsTracker[_requestId] - 1;
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
        loanRequestsTracker[_requestId] = MAX_UINT;

        // Reduce the size of the array by 1
        loanRequests.pop();
    }

    /// @notice Adds a loan to the array and keeps track of it in the mapping
    /// @param _loanId Id of the loan to add
    /// @param _loan Loan object to add
    function _addLoan(bytes32 _loanId, Loan memory _loan) internal {
        loans.push(_loan);
        uint256 index = loans.length;
        loansTracker[_loanId] = index;
    }

    /// @notice Removes the loan with the given loanId from the array and updates the tracker
    /// @param _loanId Id of the loan to remove
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

    /// @notice Utility function to compute a requestId
    /// @param sender The address of the user who owns the NFT
    /// @param erc721contract The address of the NFT contract
    /// @param tokenId The id of the token the user wants to place as collateral for a loan
    function _computeRequestId(
        address sender,
        address erc721contract,
        uint256 tokenId
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(sender, erc721contract, tokenId));
    }

    /// @notice Utility function that returns the computed interests for the given loan id
    /// @param loanId Id of the loan you want to compute the accrued interests
    function getLoanInterests(bytes32 loanId) public view returns (uint256) {
        require(
            loansTracker[loanId] != 0 && loansTracker[loanId] != MAX_UINT,
            "The loan does not exist"
        );
        Loan memory loan = getLoan(loanId);

        uint256 effectiveRatePerSecond = yearlyRateToRay(
            loan.yearlyInterestRate
        );

        uint256 elapsedTime;

        if (block.timestamp >= loan.deadline) {
            elapsedTime = loan.deadline - loan.startedAt;
        } else {
            elapsedTime = block.timestamp - loan.startedAt;
        }

        return
            accrueInterest(loan.amount, effectiveRatePerSecond, elapsedTime) -
            loan.amount;
    }

    /// @notice Allow the user to request a Loan
    /// @param amount Amount of money the user wants to receive on loan
    /// @param erc721contract The address of the NFT contract
    /// @param tokenId The id of the token the user wants to place as collateral for a loan
    /// @param loanDuration Max duration of the loan (in seconds)
    /// @param yearlyInterestRate Yearly interest rate the user is willing to pay for the loan
    function requestLoan(
        uint256 amount,
        address erc721contract,
        uint256 tokenId,
        uint32 loanDuration,
        uint256 yearlyInterestRate
    ) public whenNotPaused {
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

    /// @notice Allow another user to provide liquidity for the loan
    /// @param requestId id of the request you want to provide liquidity for
    function provideLiquidityForALoan(bytes32 requestId)
        public
        payable
        whenNotPaused
    {
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

    /// @notice Allow the originator of the request to withdraw the money he got on loan
    /// @param loanId id of the loan you want to withdraw
    function widthrawLoan(bytes32 loanId) public whenNotPaused {
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

    /// @notice Allow the originator of the request to repay the loan
    /// @param loanId id of the loan you want to repay
    function repayLoan(bytes32 loanId) public payable whenNotPaused {
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

        // Instanciate the ERC721 contract for the transfer
        IERC721 nftContract = IERC721(getLoan(loanId).erc721contract);

        nftContract.safeTransferFrom(
            address(this),
            msg.sender,
            getLoan(loanId).tokenId
        );

        emit LoanRepaid(loanId, loan.applicant, loan.supplier);
    }

    /// @notice Allow the liquidity provider for the loan to get the money back if the loan has been repaid or
    /// get back the collateral NFT if it hasn't
    /// @param loanId id of the loan you want to redeem
    function redeemLoanOrNFT(bytes32 loanId) public payable whenNotPaused {
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

    /// @notice Utility function that sends money back for a specific loan
    /// @param loanId id of the loan to pay back
    function _payLoanBack(bytes32 loanId) internal {
        Loan memory loan = getLoan(loanId);

        uint256 amount = loan.amount + loan.finalInterests;

        loans[loansTracker[loanId] - 1].status = LoanStatus.CLOSED;

        payable(msg.sender).transfer(amount);

        emit LoanExtinguishedWithMoney(loanId, loan.applicant, loan.supplier);
    }

    /// @notice Utility function that sends the NFT back for a specific loan
    /// @param loanId id of the loan to pay back
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

    /// @notice Emergency function that pauses the contract preventig the execution
    /// in case of bugs or attacks
    function emergencyPause() public onlyOwner {
        _pause();
    }

    /// @notice Emergency function that resumes the state of the contract
    function emergencyResume() public onlyOwner {
        _unpause();
    }

    /// @notice Emergency function that allows the contract owner to withdraw all the money
    /// in case of bugs or attacks
    function emengencyWithdraw() public onlyOwner whenPaused {
        payable(owner()).transfer(address(this).balance);
    }

    /// @notice Function needed to let the contract being able to receive ERC721 NFTs
    /// @dev Mandatory for IERC721Receiver
    function onERC721Received(
        address,
        address,
        uint256,
        bytes memory
    ) public virtual override returns (bytes4) {
        return this.onERC721Received.selector;
    }
}

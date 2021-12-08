# Design patterns used

## Access Control Design Patterns

- `Ownable` design pattern used in three functions: `emergencyPause()`, `emergencyResume()` and `emengencyWithdraw()`. These functions do not need to be used by anyone else apart from the contract creator, in case of emergency to prevent an attacker to drain all the money.

## Optimizing Gas

- To keep track of elements in arrays a tracking mechanism with mappings has been applied. `loanRequestsTracker` and `loansTracker` tracks the index of each item inside the corresponding array avoiding the need to cycle for the search and for the removal of an item.

## Contract derivation
- The `LoaNFT` focuses on the business logic of the application and inherit from third-party contract for specific functionalities like NFT, access control and interests calculation.
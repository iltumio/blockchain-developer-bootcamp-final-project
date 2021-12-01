pragma solidity 0.8.9;
//SPDX-License-Identifier: MIT

import 'hardhat/console.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol';
import '@openzeppelin/contracts/utils/Counters.sol';

contract TestNFT is ERC721URIStorage {
  using Counters for Counters.Counter;

  Counters.Counter private _tokenIds;

  constructor(string memory name, string memory symbol) ERC721(name, symbol) {
    // Immediately mint some tokens to the sender
    // NB: for testing purpuse only
    _mintMultiple(5, msg.sender);
  }

  function _mintMultiple(uint256 amount, address destination) internal {
    for (uint256 i = 0; i < amount; i++) {
      _mintOne(destination);
    }
  }

  function _mintOne(address destination) internal {
    _tokenIds.increment();
    _mint(destination, _tokenIds.current());
    _setTokenURI(_tokenIds.current(), 'testuri');
  }

  function mint() public {
    _mintOne(msg.sender);
  }

  function getLastId() public view returns (uint256) {
    return _tokenIds.current();
  }
}

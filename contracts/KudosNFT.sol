// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract KudosNFT is ERC721URIStorage, Ownable {
    event KudosMinted(address indexed to, uint256 indexed tokenId, string castHash, string castUrl);

    uint256 private _nextTokenId;
    string private _baseTokenURI;

    constructor() ERC721("ClawKudos", "KUDOS") Ownable(msg.sender) {
        _nextTokenId = 1;
    }

    function setBaseURI(string memory newBaseURI) external onlyOwner {
        _baseTokenURI = newBaseURI;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function mint(address to, string memory tokenURI, string memory castHash, string memory castUrl)
        external
        onlyOwner
        returns (uint256)
    {
        uint256 tokenId = _nextTokenId;
        _nextTokenId += 1;

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);

        emit KudosMinted(to, tokenId, castHash, castUrl);
        return tokenId;
    }
}

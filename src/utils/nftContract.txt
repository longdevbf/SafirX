// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFT is ERC721, ERC721URIStorage, Ownable {
    uint256 private _nextIDToken;

    uint256 public constant MAX_NFT = 10000; 
    uint256 public constant MAX_BATCH_SIZE = 20;

    mapping(uint256 => address) public tokenCreators;

    event NFTCreated(uint256 indexed tokenID, address indexed to, address indexed creator, string tokenURI);
    event BatchNFTMinted(uint256[] tokenIDs, address indexed to, address indexed creator);

    constructor(address initialOwner) ERC721("MyNFT", "MNFT") Ownable(initialOwner) {
        _nextIDToken = 1;
    }

    // ✅ Mint 1 NFT
    function mintNFT(string memory metadataURI) public returns (uint256) {
        require(_nextIDToken <= MAX_NFT, "Maximum NFT limit reached");
        require(bytes(metadataURI).length > 0, "Metadata cannot be empty");
        
        uint256 tokenID = _nextIDToken;
        _nextIDToken++;

        _mint(msg.sender, tokenID);
        _setTokenURI(tokenID, metadataURI);
        tokenCreators[tokenID] = msg.sender;

        emit NFTCreated(tokenID, msg.sender, msg.sender, metadataURI);

        return tokenID;
    }

    // ✅ Mint NFT cho address khác
    function mintSingleNFT(address toAddress, string memory metadata) public returns (uint256) {
        require(_nextIDToken <= MAX_NFT, "Maximum NFT limit reached");
        require(bytes(metadata).length > 0, "Metadata cannot be empty");
        
        uint256 tokenID = _nextIDToken;
        _nextIDToken++;

        _mint(toAddress, tokenID);
        _setTokenURI(tokenID, metadata);
        tokenCreators[tokenID] = msg.sender;

        emit NFTCreated(tokenID, toAddress, msg.sender, metadata);

        return tokenID;
    }

    // ✅ Mint Collection cho chính mình
    function mintMyCollection(string[] memory metadataURIs) public returns (uint256[] memory) {
        return mintNFTCollection(msg.sender, metadataURIs);
    }

    // ✅ Mint Collection cho address khác
    function mintNFTCollection(
        address to,
        string[] memory metadataURIs
    ) public returns (uint256[] memory) {
        require(metadataURIs.length > 0, "Metadata URIs cannot be empty");
        require(metadataURIs.length <= MAX_BATCH_SIZE, "Exceeds maximum batch size");
        require(_nextIDToken + metadataURIs.length - 1 <= MAX_NFT, "Exceeds maximum NFT limit");

        uint256[] memory tokenIDs = new uint256[](metadataURIs.length);

        for (uint256 i = 0; i < metadataURIs.length; i++) {
            string memory metadata = metadataURIs[i];
            require(bytes(metadata).length > 0, "Metadata cannot be empty");

            uint256 tokenID = _nextIDToken;
            _nextIDToken++;

            _mint(to, tokenID);
            _setTokenURI(tokenID, metadata);
            tokenCreators[tokenID] = msg.sender;

            tokenIDs[i] = tokenID;
        }
        
        emit BatchNFTMinted(tokenIDs, to, msg.sender);
        return tokenIDs;
    }

    // ✅ Mint Collection với Base URI (tùy chọn)
    function mintCollectionWithBaseURI(
        address to,
        uint256 quantity,
        string memory baseURI
    ) public returns (uint256[] memory) {
        require(quantity > 0, "Must mint at least 1 NFT");
        require(quantity <= MAX_BATCH_SIZE, "Exceeds max batch size");
        require(_nextIDToken + quantity - 1 <= MAX_NFT, "Would exceed max supply");
        require(bytes(baseURI).length > 0, "Base URI cannot be empty");
        
        uint256[] memory tokenIds = new uint256[](quantity);
        
        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenID = _nextIDToken;
            _nextIDToken++;
            
            _mint(to, tokenID);
            
            string memory metadataURI = string(abi.encodePacked(baseURI, "/", _toString(tokenID), ".json"));
            _setTokenURI(tokenID, metadataURI);
            tokenCreators[tokenID] = msg.sender;
            
            tokenIds[i] = tokenID;
        }
        
        emit BatchNFTMinted(tokenIds, to, msg.sender);
        return tokenIds;
    }

    // ✅ View functions
    function getTotalNFT() public view returns (uint256) {
        return _nextIDToken - 1;
    }

    function getRemainingSupply() public view returns (uint256) {
        return MAX_NFT - (_nextIDToken - 1);
    }

    function getTokenCreator(uint256 tokenID) public view returns (address) {
        require(_ownerOf(tokenID) != address(0), "Token does not exist");
        return tokenCreators[tokenID];
    }

    function getTokensOfOwner(address owner) public view returns (uint256[] memory) {
        uint256 tokenCount = balanceOf(owner);
        uint256[] memory tokenIds = new uint256[](tokenCount);
        uint256 index = 0;
        
        for (uint256 i = 1; i < _nextIDToken && index < tokenCount; i++) {
            try this.ownerOf(i) returns (address tokenOwner) {
                if (tokenOwner == owner) {
                    tokenIds[index] = i;
                    index++;
                }
            } catch {
                continue;
            }
        }
        
        return tokenIds;
    }

    // ✅ Required overrides
    function tokenURI(uint256 tokenID) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenID);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    // ✅ Helper function
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
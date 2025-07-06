// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFTMarket is ReentrancyGuard, Ownable {
    
    // ✅ Enum để phân biệt loại listing
    enum ListingType {
        SINGLE,                 // List 1 NFT đơn lẻ
        COLLECTION_BUNDLE,      // List collection với 1 giá cho cả bundle
        COLLECTION_INDIVIDUAL   // List collection với giá riêng cho từng NFT
    }

    // ✅ Struct để lưu thông tin listing đơn lẻ
    struct Listing {
        uint256 tokenId;        // ID của NFT
        address nftContract;    // Địa chỉ contract NFT
        address seller;         // Người bán
        uint256 price;          // Giá bán (wei)
        bool isActive;          // Còn đang bán không
        uint256 createdAt;      // Thời gian tạo listing
        uint256 collectionId;   // ID của collection (0 nếu là single listing)
    }

    // ✅ Struct để lưu thông tin collection listing
    struct CollectionListing {
        uint256 collectionId;       // ID của collection
        address nftContract;        // Địa chỉ contract NFT  
        address seller;             // Người bán
        uint256[] tokenIds;         // Danh sách token IDs
        uint256[] prices;           // Danh sách giá tương ứng (empty nếu là bundle)
        uint256 bundlePrice;        // Giá cho cả bundle (0 nếu là individual pricing)
        uint256 totalItems;         // Tổng số NFT trong collection
        uint256 soldItems;          // Số NFT đã bán (chỉ dùng cho individual)
        bool isActive;              // Collection còn active không
        bool isBundleType;          // true = bundle, false = individual
        uint256 createdAt;          // Thời gian tạo
        string collectionName;      // Tên collection
        ListingType listingType;    // Loại listing
    }

    // ✅ State variables
    uint256 private _listingIdCounter;              // Đếm số listing
    uint256 private _collectionIdCounter;           // Đếm số collection
    uint256 public marketplaceFee = 250;            // Phí marketplace (2.5% = 250/10000)
    uint256 public constant MAX_FEE = 1000;         // Phí tối đa 10%
    uint256 public constant MAX_COLLECTION_SIZE = 100; // Giới hạn số NFT trong 1 collection
    
    // ✅ Mappings để lưu data
    mapping(uint256 => Listing) public listings;                           // listingId => Listing
    mapping(uint256 => CollectionListing) public collectionListings;       // collectionId => CollectionListing
    mapping(address => mapping(uint256 => uint256)) public tokenToListingId; // contract => tokenId => listingId
    mapping(address => uint256[]) public sellerListings;                   // seller => array listingIds
    mapping(address => uint256[]) public sellerCollections;                // seller => array collectionIds
    
    // ✅ Events để frontend có thể lắng nghe
    event NFTListed(
        uint256 indexed listingId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address seller,
        uint256 price,
        ListingType listingType
    );

    event CollectionBundleListed(
        uint256 indexed collectionId,
        address indexed nftContract,
        address indexed seller,
        uint256[] tokenIds,
        uint256 bundlePrice,
        string collectionName
    );

    event CollectionIndividualListed(
        uint256 indexed collectionId,
        address indexed nftContract,
        address indexed seller,
        uint256[] tokenIds,
        uint256[] prices,
        string collectionName
    );
    
    event NFTSold(
        uint256 indexed listingId,
        address indexed seller,
        address indexed buyer,
        uint256 price,
        ListingType listingType
    );

    event CollectionBundleSold(
        uint256 indexed collectionId,
        address indexed seller,
        address indexed buyer,
        uint256[] tokenIds,
        uint256 bundlePrice
    );

    event CollectionItemSold(
        uint256 indexed collectionId,
        uint256 indexed listingId,
        address indexed seller,
        address buyer,
        uint256 tokenId,
        uint256 price
    );
    
    event ListingCancelled(
        uint256 indexed listingId,
        address indexed seller,
        ListingType listingType
    );

    event CollectionCancelled(
        uint256 indexed collectionId,
        address indexed seller,
        ListingType listingType
    );
    
    event PriceUpdated(
        uint256 indexed listingId,
        uint256 oldPrice,
        uint256 newPrice
    );

    event BundlePriceUpdated(
        uint256 indexed collectionId,
        uint256 oldPrice,
        uint256 newPrice
    );

    // ✅ Constructor
    constructor(address initialOwner) Ownable(initialOwner) {
        _listingIdCounter = 1;
        _collectionIdCounter = 1;
    }

    // ✅ 1. LIST SINGLE NFT FOR SALE
    function listSingleNFT(
        address nftContract,
        uint256 tokenId,
        uint256 price
    ) external nonReentrant whenNotPaused {
        _validateSingleListing(nftContract, tokenId, price);
        
        uint256 listingId = _listingIdCounter++;
        
        listings[listingId] = Listing({
            tokenId: tokenId,
            nftContract: nftContract,
            seller: msg.sender,
            price: price,
            isActive: true,
            createdAt: block.timestamp,
            collectionId: 0
        });
        
        tokenToListingId[nftContract][tokenId] = listingId;
        sellerListings[msg.sender].push(listingId);
        
        emit NFTListed(listingId, nftContract, tokenId, msg.sender, price, ListingType.SINGLE);
    }

    // ✅ 2. LIST COLLECTION AS BUNDLE (1 giá cho cả collection)
    function listCollectionBundle(
        address nftContract,
        uint256[] calldata tokenIds,
        uint256 bundlePrice,
        string calldata collectionName
    ) external nonReentrant whenNotPaused {
        require(tokenIds.length > 1, "Bundle must have at least 2 NFTs");
        require(tokenIds.length <= MAX_COLLECTION_SIZE, "Collection too large");
        require(bundlePrice > 0, "Bundle price must be greater than 0");
        require(bytes(collectionName).length > 0, "Collection name required");
        
        // Validate ownership và approval cho tất cả NFTs
        for (uint256 i = 0; i < tokenIds.length; i++) {
            _validateSingleListing(nftContract, tokenIds[i], bundlePrice);
        }
        
        uint256 collectionId = _collectionIdCounter++;
        
        // Tạo empty prices array cho bundle type
        uint256[] memory emptyPrices = new uint256[](0);
        
        // Tạo collection listing
        collectionListings[collectionId] = CollectionListing({
            collectionId: collectionId,
            nftContract: nftContract,
            seller: msg.sender,
            tokenIds: tokenIds,
            prices: emptyPrices,  // Empty cho bundle type
            bundlePrice: bundlePrice,
            totalItems: tokenIds.length,
            soldItems: 0,
            isActive: true,
            isBundleType: true,
            createdAt: block.timestamp,
            collectionName: collectionName,
            listingType: ListingType.COLLECTION_BUNDLE
        });
        
        // Không tạo individual listings cho bundle type
        // Chỉ mark tokens là đã được list
        for (uint256 i = 0; i < tokenIds.length; i++) {
            tokenToListingId[nftContract][tokenIds[i]] = collectionId; // Dùng collectionId
        }
        
        sellerCollections[msg.sender].push(collectionId);
        
        emit CollectionBundleListed(collectionId, nftContract, msg.sender, tokenIds, bundlePrice, collectionName);
    }

    // ✅ 3. LIST COLLECTION WITH INDIVIDUAL PRICES
    function listCollectionIndividual(
        address nftContract,
        uint256[] calldata tokenIds,
        uint256[] calldata prices,
        string calldata collectionName
    ) external nonReentrant whenNotPaused {
        require(tokenIds.length > 0, "Empty collection");
        require(tokenIds.length == prices.length, "Arrays length mismatch");
        require(tokenIds.length <= MAX_COLLECTION_SIZE, "Collection too large");
        require(bytes(collectionName).length > 0, "Collection name required");
        
        // Validate ownership và approval cho tất cả NFTs
        for (uint256 i = 0; i < tokenIds.length; i++) {
            _validateSingleListing(nftContract, tokenIds[i], prices[i]);
        }
        
        uint256 collectionId = _collectionIdCounter++;
        
        // Tạo collection listing
        collectionListings[collectionId] = CollectionListing({
            collectionId: collectionId,
            nftContract: nftContract,
            seller: msg.sender,
            tokenIds: tokenIds,
            prices: prices,
            bundlePrice: 0,  // 0 cho individual type
            totalItems: tokenIds.length,
            soldItems: 0,
            isActive: true,
            isBundleType: false,
            createdAt: block.timestamp,
            collectionName: collectionName,
            listingType: ListingType.COLLECTION_INDIVIDUAL
        });
        
        // Tạo individual listings cho mỗi NFT trong collection
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 listingId = _listingIdCounter++;
            
            listings[listingId] = Listing({
                tokenId: tokenIds[i],
                nftContract: nftContract,
                seller: msg.sender,
                price: prices[i],
                isActive: true,
                createdAt: block.timestamp,
                collectionId: collectionId
            });
            
            tokenToListingId[nftContract][tokenIds[i]] = listingId;
            sellerListings[msg.sender].push(listingId);
        }
        
        sellerCollections[msg.sender].push(collectionId);
        
        emit CollectionIndividualListed(collectionId, nftContract, msg.sender, tokenIds, prices, collectionName);
    }

    // ✅ 4. LIST COLLECTION WITH SAME PRICE (helper function)
    function listCollectionSamePrice(
        address nftContract,
        uint256[] calldata tokenIds,
        uint256 pricePerItem,
        string calldata collectionName
    ) external {
        require(tokenIds.length > 0, "Empty collection");
        require(pricePerItem > 0, "Price must be greater than 0");
        
        // Tạo array prices với giá giống nhau
        uint256[] memory prices = new uint256[](tokenIds.length);
        for (uint256 i = 0; i < tokenIds.length; i++) {
            prices[i] = pricePerItem;
        }
        
        // Gọi listCollectionIndividual
        this.listCollectionIndividual(nftContract, tokenIds, prices, collectionName);
    }

    // ✅ BUY SINGLE NFT
    function buyNFT(uint256 listingId) external payable nonReentrant whenNotPaused {
        Listing storage listing = listings[listingId];
        
        require(listing.isActive, "This listing is not active");
        require(msg.value >= listing.price, "Insufficient payment");
        require(msg.sender != listing.seller, "Cannot buy your own NFT");
        
        require(
            IERC721(listing.nftContract).ownerOf(listing.tokenId) == listing.seller,
            "Seller no longer owns this NFT"
        );
        
        listing.isActive = false;
        
        // Nếu NFT thuộc về collection individual, cập nhật collection status
        if (listing.collectionId > 0) {
            CollectionListing storage collection = collectionListings[listing.collectionId];
            if (!collection.isBundleType) {  // Chỉ cập nhật nếu là individual listing
                collection.soldItems++;
                
                // Nếu tất cả items đã bán, đánh dấu collection không active
                if (collection.soldItems >= collection.totalItems) {
                    collection.isActive = false;
                }
                
                emit CollectionItemSold(
                    listing.collectionId,
                    listingId,
                    listing.seller,
                    msg.sender,
                    listing.tokenId,
                    listing.price
                );
            }
        }
        
        // Xử lý payment và transfer
        _processPayment(listing.seller, listing.price);
        
        IERC721(listing.nftContract).safeTransferFrom(
            listing.seller,
            msg.sender,
            listing.tokenId
        );
        
        delete tokenToListingId[listing.nftContract][listing.tokenId];
        
        ListingType listingType = listing.collectionId > 0 ? ListingType.COLLECTION_INDIVIDUAL : ListingType.SINGLE;
        emit NFTSold(listingId, listing.seller, msg.sender, listing.price, listingType);
    }

    // ✅ BUY COLLECTION BUNDLE (mua cả collection với 1 giá)
    function buyCollectionBundle(uint256 collectionId) external payable nonReentrant whenNotPaused {
        CollectionListing storage collection = collectionListings[collectionId];
        
        require(collection.isActive, "Collection is not active");
        require(collection.isBundleType, "This is not a bundle listing");
        require(msg.value >= collection.bundlePrice, "Insufficient payment");
        require(msg.sender != collection.seller, "Cannot buy your own collection");
        
        // Verify seller vẫn sở hữu tất cả NFTs
        for (uint256 i = 0; i < collection.tokenIds.length; i++) {
            require(
                IERC721(collection.nftContract).ownerOf(collection.tokenIds[i]) == collection.seller,
                "Seller no longer owns all NFTs in collection"
            );
        }
        
        collection.isActive = false;
        
        // Transfer tất cả NFTs
        for (uint256 i = 0; i < collection.tokenIds.length; i++) {
            IERC721(collection.nftContract).safeTransferFrom(
                collection.seller,
                msg.sender,
                collection.tokenIds[i]
            );
            
            delete tokenToListingId[collection.nftContract][collection.tokenIds[i]];
        }
        
        // Xử lý payment
        _processPayment(collection.seller, collection.bundlePrice);
        
        emit CollectionBundleSold(
            collectionId,
            collection.seller,
            msg.sender,
            collection.tokenIds,
            collection.bundlePrice
        );
    }

    // ✅ CANCEL SINGLE LISTING
    function cancelListing(uint256 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];
        
        require(
            msg.sender == listing.seller || msg.sender == owner(),
            "Not authorized to cancel this listing"
        );
        require(listing.isActive, "Listing already inactive");
        
        listing.isActive = false;
        
        // Nếu thuộc collection individual, cập nhật collection
        if (listing.collectionId > 0) {
            CollectionListing storage collection = collectionListings[listing.collectionId];
            if (!collection.isBundleType) {
                _updateCollectionAfterCancel(listing.collectionId);
            }
        }
        
        delete tokenToListingId[listing.nftContract][listing.tokenId];
        
        ListingType listingType = listing.collectionId > 0 ? ListingType.COLLECTION_INDIVIDUAL : ListingType.SINGLE;
        emit ListingCancelled(listingId, listing.seller, listingType);
    }

    // ✅ CANCEL COLLECTION
    function cancelCollection(uint256 collectionId) external nonReentrant {
        CollectionListing storage collection = collectionListings[collectionId];
        
        require(
            msg.sender == collection.seller || msg.sender == owner(),
            "Not authorized to cancel this collection"
        );
        require(collection.isActive, "Collection already inactive");
        
        collection.isActive = false;
        
        if (collection.isBundleType) {
            // Bundle type: chỉ cần clear tokenToListingId
            for (uint256 i = 0; i < collection.tokenIds.length; i++) {
                delete tokenToListingId[collection.nftContract][collection.tokenIds[i]];
            }
        } else {
            // Individual type: cancel tất cả listings trong collection
            for (uint256 i = 0; i < collection.tokenIds.length; i++) {
                uint256 tokenId = collection.tokenIds[i];
                uint256 listingId = tokenToListingId[collection.nftContract][tokenId];
                
                if (listingId > 0 && listings[listingId].isActive) {
                    listings[listingId].isActive = false;
                    delete tokenToListingId[collection.nftContract][tokenId];
                }
            }
        }
        
        emit CollectionCancelled(collectionId, collection.seller, collection.listingType);
    }

    // ✅ UPDATE SINGLE NFT PRICE
    function updatePrice(uint256 listingId, uint256 newPrice) external nonReentrant {
        Listing storage listing = listings[listingId];
        
        require(msg.sender == listing.seller, "Only seller can update price");
        require(listing.isActive, "Listing not active");
        require(newPrice > 0, "Price must be greater than 0");
        
        uint256 oldPrice = listing.price;
        listing.price = newPrice;
        
        // Nếu thuộc collection individual, cập nhật price trong collection
        if (listing.collectionId > 0) {
            CollectionListing storage collection = collectionListings[listing.collectionId];
            if (!collection.isBundleType) {
                for (uint256 i = 0; i < collection.tokenIds.length; i++) {
                    if (collection.tokenIds[i] == listing.tokenId) {
                        collection.prices[i] = newPrice;
                        break;
                    }
                }
            }
        }
        
        emit PriceUpdated(listingId, oldPrice, newPrice);
    }

    // ✅ UPDATE BUNDLE PRICE
    function updateBundlePrice(uint256 collectionId, uint256 newBundlePrice) external nonReentrant {
        CollectionListing storage collection = collectionListings[collectionId];
        
        require(msg.sender == collection.seller, "Only seller can update price");
        require(collection.isActive, "Collection not active");
        require(collection.isBundleType, "This is not a bundle listing");
        require(newBundlePrice > 0, "Price must be greater than 0");
        
        uint256 oldPrice = collection.bundlePrice;
        collection.bundlePrice = newBundlePrice;
        
        emit BundlePriceUpdated(collectionId, oldPrice, newBundlePrice);
    }

    // ✅ VIEW FUNCTIONS

    function getListing(uint256 listingId) external view returns (Listing memory) {
        return listings[listingId];
    }

    function getCollection(uint256 collectionId) external view returns (CollectionListing memory) {
        return collectionListings[collectionId];
    }
    
    // ✅ FIXED: Trả về tất cả listings (individual + bundle collections)
    function getActiveListings() external view returns (uint256[] memory) {
        uint256 activeCount = 0;
        
        // Đếm individual listings
        for (uint256 i = 1; i < _listingIdCounter; i++) {
            if (listings[i].isActive) {
                activeCount++;
            }
        }
        
        // Đếm bundle collections (sẽ hiển thị như 1 listing)
        for (uint256 i = 1; i < _collectionIdCounter; i++) {
            if (collectionListings[i].isActive && collectionListings[i].isBundleType) {
                activeCount++;
            }
        }
        
        uint256[] memory activeListingIds = new uint256[](activeCount);
        uint256 index = 0;
        
        // Thêm individual listings
        for (uint256 i = 1; i < _listingIdCounter; i++) {
            if (listings[i].isActive) {
                activeListingIds[index] = i;
                index++;
            }
        }
        
        // Thêm bundle collections (với ID đặc biệt để phân biệt)
        for (uint256 i = 1; i < _collectionIdCounter; i++) {
            if (collectionListings[i].isActive && collectionListings[i].isBundleType) {
                // Sử dụng ID > 1000000 để phân biệt bundle collections
                activeListingIds[index] = i + 1000000;
                index++;
            }
        }
        
        return activeListingIds;
    }

    function getActiveCollections() external view returns (uint256[] memory) {
        uint256 activeCount = 0;
        
        for (uint256 i = 1; i < _collectionIdCounter; i++) {
            if (collectionListings[i].isActive) {
                activeCount++;
            }
        }
        
        uint256[] memory activeCollectionIds = new uint256[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 1; i < _collectionIdCounter; i++) {
            if (collectionListings[i].isActive) {
                activeCollectionIds[index] = i;
                index++;
            }
        }
        
        return activeCollectionIds;
    }

    function getBundleCollections() external view returns (uint256[] memory) {
        uint256 bundleCount = 0;
        
        for (uint256 i = 1; i < _collectionIdCounter; i++) {
            if (collectionListings[i].isActive && collectionListings[i].isBundleType) {
                bundleCount++;
            }
        }
        
        uint256[] memory bundleCollectionIds = new uint256[](bundleCount);
        uint256 index = 0;
        
        for (uint256 i = 1; i < _collectionIdCounter; i++) {
            if (collectionListings[i].isActive && collectionListings[i].isBundleType) {
                bundleCollectionIds[index] = i;
                index++;
            }
        }
        
        return bundleCollectionIds;
    }

    function getIndividualCollections() external view returns (uint256[] memory) {
        uint256 individualCount = 0;
        
        for (uint256 i = 1; i < _collectionIdCounter; i++) {
            if (collectionListings[i].isActive && !collectionListings[i].isBundleType) {
                individualCount++;
            }
        }
        
        uint256[] memory individualCollectionIds = new uint256[](individualCount);
        uint256 index = 0;
        
        for (uint256 i = 1; i < _collectionIdCounter; i++) {
            if (collectionListings[i].isActive && !collectionListings[i].isBundleType) {
                individualCollectionIds[index] = i;
                index++;
            }
        }
        
        return individualCollectionIds;
    }
    
    function getSellerListings(address seller) external view returns (uint256[] memory) {
        return sellerListings[seller];
    }

    function getSellerCollections(address seller) external view returns (uint256[] memory) {
        return sellerCollections[seller];
    }

    function getCollectionItems(uint256 collectionId) external view returns (uint256[] memory) {
        CollectionListing memory collection = collectionListings[collectionId];
        
        if (collection.isBundleType) {
            // Bundle type không có individual listings
            return new uint256[](0);
        }
        
        uint256[] memory activeItems = new uint256[](collection.tokenIds.length);
        uint256 count = 0;
        
        for (uint256 i = 0; i < collection.tokenIds.length; i++) {
            uint256 listingId = tokenToListingId[collection.nftContract][collection.tokenIds[i]];
            if (listingId > 0 && listings[listingId].isActive) {
                activeItems[count] = listingId;
                count++;
            }
        }
        
        // Resize array to actual count
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = activeItems[i];
        }
        
        return result;
    }
    
    function isTokenListed(address nftContract, uint256 tokenId) external view returns (bool, uint256) {
        uint256 listingId = tokenToListingId[nftContract][tokenId];
        if (listingId == 0) {
            return (false, 0);
        }
        
        // ✅ FIXED: Kiểm tra đúng logic
        // Nếu listingId < _listingIdCounter, đây là individual listing
        if (listingId < _listingIdCounter) {
            return (listings[listingId].isActive, listingId);
        }
        
        // ✅ FIXED: Nếu listingId >= _listingIdCounter, đây là bundle collection
        // (vì trong bundle, tokenToListingId[nftContract][tokenId] = collectionId)
        if (listingId < _collectionIdCounter) {
            CollectionListing memory collection = collectionListings[listingId];
            return (collection.isActive, listingId);
        }
        
        return (false, 0);
    }
    
    function getTotalListings() external view returns (uint256) {
        return _listingIdCounter - 1;
    }

    function getTotalCollections() external view returns (uint256) {
        return _collectionIdCounter - 1;
    }

    // ✅ FIXED: Thêm pagination cho view functions
    function getActiveListingsPaginated(uint256 offset, uint256 limit) 
        external view returns (uint256[] memory, uint256 totalCount) {
        
        uint256 totalActive = 0;
        
        // Đếm tổng số active listings
        for (uint256 i = 1; i < _listingIdCounter; i++) {
            if (listings[i].isActive) {
                totalActive++;
            }
        }
        
        // Đếm bundle collections
        for (uint256 i = 1; i < _collectionIdCounter; i++) {
            if (collectionListings[i].isActive && collectionListings[i].isBundleType) {
                totalActive++;
            }
        }
        
        // Tính toán pagination
        uint256 startIndex = offset;
        uint256 endIndex = offset + limit;
        if (endIndex > totalActive) {
            endIndex = totalActive;
        }
        
        uint256 resultCount = endIndex > startIndex ? endIndex - startIndex : 0;
        uint256[] memory result = new uint256[](resultCount);
        
        uint256 currentIndex = 0;
        uint256 resultIndex = 0;
        
        // Thêm individual listings
        for (uint256 i = 1; i < _listingIdCounter && resultIndex < resultCount; i++) {
            if (listings[i].isActive) {
                if (currentIndex >= startIndex) {
                    result[resultIndex] = i;
                    resultIndex++;
                }
                currentIndex++;
            }
        }
        
        // Thêm bundle collections
        for (uint256 i = 1; i < _collectionIdCounter && resultIndex < resultCount; i++) {
            if (collectionListings[i].isActive && collectionListings[i].isBundleType) {
                if (currentIndex >= startIndex) {
                    result[resultIndex] = i + 1000000;
                    resultIndex++;
                }
                currentIndex++;
            }
        }
        
        return (result, totalActive);
    }
    
    // ✅ FIXED: Thêm function để get marketplace statistics
    function getMarketplaceStats() external view returns (
        uint256 totalListings,
        uint256 totalCollections,
        uint256 activeListings,
        uint256 activeBundles,
        uint256 activeIndividualCollections
    ) {
        totalListings = _listingIdCounter - 1;
        totalCollections = _collectionIdCounter - 1;
        
        uint256 _activeListings = 0;
        uint256 _activeBundles = 0;
        uint256 _activeIndividualCollections = 0;
        
        for (uint256 i = 1; i < _listingIdCounter; i++) {
            if (listings[i].isActive) {
                _activeListings++;
            }
        }
        
        for (uint256 i = 1; i < _collectionIdCounter; i++) {
            if (collectionListings[i].isActive) {
                if (collectionListings[i].isBundleType) {
                    _activeBundles++;
                } else {
                    _activeIndividualCollections++;
                }
            }
        }
        
        return (totalListings, totalCollections, _activeListings, _activeBundles, _activeIndividualCollections);
    }

    // ✅ HELPER FUNCTIONS để Frontend dễ sử dụng
    
    // Kiểm tra ID có phải là bundle collection không
    function isBundleCollectionId(uint256 id) external pure returns (bool) {
        return id > 1000000;
    }
    
    // Lấy collection ID thực từ special ID
    function getRealCollectionId(uint256 specialId) external pure returns (uint256) {
        return specialId > 1000000 ? specialId - 1000000 : specialId;
    }
    
    // Lấy thông tin listing từ bất kỳ ID nào (listing hoặc bundle collection)
    function getListingInfo(uint256 id) external view returns (
        bool isBundle,
        uint256 tokenId,
        address nftContract,
        address seller,
        uint256 price,
        bool isActive,
        string memory collectionName,
        uint256[] memory tokenIds
    ) {
        if (id > 1000000) {
            // Đây là bundle collection
            uint256 collectionId = id - 1000000;
            CollectionListing memory collection = collectionListings[collectionId];
            
            return (
                true,
                0, // Bundle không có tokenId đơn lẻ
                collection.nftContract,
                collection.seller,
                collection.bundlePrice,
                collection.isActive,
                collection.collectionName,
                collection.tokenIds
            );
        } else {
            // Đây là listing thông thường
            Listing memory listing = listings[id];
            uint256[] memory emptyArray = new uint256[](0);
            
            return (
                false,
                listing.tokenId,
                listing.nftContract,
                listing.seller,
                listing.price,
                listing.isActive,
                "", // Single listing không có collection name
                emptyArray
            );
        }
    }
    
    // Lấy tất cả NFT có thể mua (bao gồm individual và bundle)
    function getAllAvailableNFTs() external view returns (uint256[] memory) {
        // Tái sử dụng logic từ getActiveListings()
        uint256 activeCount = 0;
        
        // Đếm individual listings
        for (uint256 i = 1; i < _listingIdCounter; i++) {
            if (listings[i].isActive) {
                activeCount++;
            }
        }
        
        // Đếm bundle collections
        for (uint256 i = 1; i < _collectionIdCounter; i++) {
            if (collectionListings[i].isActive && collectionListings[i].isBundleType) {
                activeCount++;
            }
        }
        
        uint256[] memory activeListingIds = new uint256[](activeCount);
        uint256 index = 0;
        
        // Thêm individual listings
        for (uint256 i = 1; i < _listingIdCounter; i++) {
            if (listings[i].isActive) {
                activeListingIds[index] = i;
                index++;
            }
        }
        
        // Thêm bundle collections
        for (uint256 i = 1; i < _collectionIdCounter; i++) {
            if (collectionListings[i].isActive && collectionListings[i].isBundleType) {
                activeListingIds[index] = i + 1000000;
                index++;
            }
        }
        
        return activeListingIds;
    }

    // ✅ INTERNAL FUNCTIONS
    
    function _validateSingleListing(address nftContract, uint256 tokenId, uint256 price) internal view {
        require(price > 0, "Price must be greater than 0");
        require(IERC721(nftContract).ownerOf(tokenId) == msg.sender, "You don't own this NFT");
        require(tokenToListingId[nftContract][tokenId] == 0, "NFT already listed");
        
        require(
            IERC721(nftContract).isApprovedForAll(msg.sender, address(this)) || 
            IERC721(nftContract).getApproved(tokenId) == address(this), 
            "Marketplace not approved to transfer this NFT"
        );
    }

    function _processPayment(address seller, uint256 price) internal {
        uint256 feeAmount = (price * marketplaceFee) / 10000;
        uint256 sellerAmount = price - feeAmount;
        
        payable(seller).transfer(sellerAmount);
        
        if (feeAmount > 0) {
            payable(owner()).transfer(feeAmount);
        }
        
        if (msg.value > price) {
            payable(msg.sender).transfer(msg.value - price);
        }
    }

    function _updateCollectionAfterCancel(uint256 collectionId) internal {
        CollectionListing storage collection = collectionListings[collectionId];
        
        // Đếm số items còn active
        uint256 activeItems = 0;
        for (uint256 i = 0; i < collection.tokenIds.length; i++) {
            uint256 listingId = tokenToListingId[collection.nftContract][collection.tokenIds[i]];
            if (listingId > 0 && listings[listingId].isActive) {
                activeItems++;
            }
        }
        
        // Nếu không còn item nào active, đánh dấu collection inactive
        if (activeItems == 0) {
            collection.isActive = false;
        }
    }

    // ✅ ADMIN FUNCTIONS
    
    function setMarketplaceFee(uint256 newFee) external onlyOwner {
        require(newFee <= MAX_FEE, "Fee cannot exceed maximum");
        marketplaceFee = newFee;
    }
    
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        payable(owner()).transfer(balance);
    }
    
    function getFeesBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // ✅ EMERGENCY FUNCTIONS
    
    bool public paused = false;
    
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }
    
    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }
    
    // ✅ UNIFIED BUY FUNCTION - Mua NFT từ bất kỳ ID nào
    function buyNFTUnified(uint256 id) external payable nonReentrant whenNotPaused {
        if (id > 1000000) {
            // Đây là bundle collection - Copy logic từ buyCollectionBundle
            uint256 collectionId = id - 1000000;
            CollectionListing storage collection = collectionListings[collectionId];
            
            require(collection.isActive, "Collection is not active");
            require(collection.isBundleType, "This is not a bundle listing");
            require(msg.value >= collection.bundlePrice, "Insufficient payment");
            require(msg.sender != collection.seller, "Cannot buy your own collection");
            
            // Verify seller vẫn sở hữu tất cả NFTs
            for (uint256 i = 0; i < collection.tokenIds.length; i++) {
                require(
                    IERC721(collection.nftContract).ownerOf(collection.tokenIds[i]) == collection.seller,
                    "Seller no longer owns all NFTs in collection"
                );
            }
            
            collection.isActive = false;
            
            // Transfer tất cả NFTs
            for (uint256 i = 0; i < collection.tokenIds.length; i++) {
                IERC721(collection.nftContract).safeTransferFrom(
                    collection.seller,
                    msg.sender,
                    collection.tokenIds[i]
                );
                
                delete tokenToListingId[collection.nftContract][collection.tokenIds[i]];
            }
            
            // Xử lý payment
            _processPayment(collection.seller, collection.bundlePrice);
            
            emit CollectionBundleSold(
                collectionId,
                collection.seller,
                msg.sender,
                collection.tokenIds,
                collection.bundlePrice
            );
        } else {
            // Đây là listing thông thường - Copy logic từ buyNFT
            Listing storage listing = listings[id];
            
            require(listing.isActive, "This listing is not active");
            require(msg.value >= listing.price, "Insufficient payment");
            require(msg.sender != listing.seller, "Cannot buy your own NFT");
            
            require(
                IERC721(listing.nftContract).ownerOf(listing.tokenId) == listing.seller,
                "Seller no longer owns this NFT"
            );
            
            listing.isActive = false;
            
            // Nếu NFT thuộc về collection individual, cập nhật collection status
            if (listing.collectionId > 0) {
                CollectionListing storage collection = collectionListings[listing.collectionId];
                if (!collection.isBundleType) {
                    collection.soldItems++;
                    
                    if (collection.soldItems >= collection.totalItems) {
                        collection.isActive = false;
                    }
                    
                    emit CollectionItemSold(
                        listing.collectionId,
                        id,
                        listing.seller,
                        msg.sender,
                        listing.tokenId,
                        listing.price
                    );
                }
            }
            
            // Xử lý payment và transfer
            _processPayment(listing.seller, listing.price);
            
            IERC721(listing.nftContract).safeTransferFrom(
                listing.seller,
                msg.sender,
                listing.tokenId
            );
            
            delete tokenToListingId[listing.nftContract][listing.tokenId];
            
            ListingType listingType = listing.collectionId > 0 ? ListingType.COLLECTION_INDIVIDUAL : ListingType.SINGLE;
            emit NFTSold(id, listing.seller, msg.sender, listing.price, listingType);
        }
    }
    
    // ✅ UNIFIED CANCEL FUNCTION - Hủy listing từ bất kỳ ID nào
    function cancelListingUnified(uint256 id) external nonReentrant {
        if (id > 1000000) {
            // Đây là bundle collection - Copy logic từ cancelCollection
            uint256 collectionId = id - 1000000;
            CollectionListing storage collection = collectionListings[collectionId];
            
            require(
                msg.sender == collection.seller || msg.sender == owner(),
                "Not authorized to cancel this collection"
            );
            require(collection.isActive, "Collection already inactive");
            
            collection.isActive = false;
            
            if (collection.isBundleType) {
                // Bundle type: chỉ cần clear tokenToListingId
                for (uint256 i = 0; i < collection.tokenIds.length; i++) {
                    delete tokenToListingId[collection.nftContract][collection.tokenIds[i]];
                }
            } else {
                // Individual type: cancel tất cả listings trong collection
                for (uint256 i = 0; i < collection.tokenIds.length; i++) {
                    uint256 tokenId = collection.tokenIds[i];
                    uint256 listingId = tokenToListingId[collection.nftContract][tokenId];
                    
                    if (listingId > 0 && listings[listingId].isActive) {
                        listings[listingId].isActive = false;
                        delete tokenToListingId[collection.nftContract][tokenId];
                    }
                }
            }
            
            emit CollectionCancelled(collectionId, collection.seller, collection.listingType);
        } else {
            // Đây là listing thông thường - Copy logic từ cancelListing
            Listing storage listing = listings[id];
            
            require(
                msg.sender == listing.seller || msg.sender == owner(),
                "Not authorized to cancel this listing"
            );
            require(listing.isActive, "Listing already inactive");
            
            listing.isActive = false;
            
            // Nếu thuộc collection individual, cập nhật collection
            if (listing.collectionId > 0) {
                CollectionListing storage collection = collectionListings[listing.collectionId];
                if (!collection.isBundleType) {
                    _updateCollectionAfterCancel(listing.collectionId);
                }
            }
            
            delete tokenToListingId[listing.nftContract][listing.tokenId];
            
            ListingType listingType = listing.collectionId > 0 ? ListingType.COLLECTION_INDIVIDUAL : ListingType.SINGLE;
            emit ListingCancelled(id, listing.seller, listingType);
        }
    }
}
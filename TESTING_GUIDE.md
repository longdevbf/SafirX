# Testing Guide - Database Caching Implementation

## 🧪 Kiểm Tra Implementation

### 1. Test Database Connection
```bash
# Kiểm tra kết nối database
curl http://localhost:3000/api/test-db
```

Expected response:
```json
{
  "success": true,
  "message": "Database connection successful!",
  "data": {
    "currentTime": "2024-01-15T10:30:00.000Z",
    "dbVersion": "PostgreSQL 14.x...",
    "databaseUrl": "Configured"
  }
}
```

### 2. Initialize Database Tables
```bash
# Tạo tables cho cache
curl http://localhost:3000/api/cache/init
```

Expected response:
```json
{
  "success": true,
  "message": "Database tables initialized successfully",
  "tables": ["cache_listings", "cache_auctions", "cache_views"]
}
```

### 3. Test Workflow

#### A. Profile Page - Sell NFT (Cần kết nối ví)
1. Kết nối wallet trước
2. Vào Profile page
3. Click "Sell" trên một NFT
4. Nhập giá và confirm transaction
5. Sau khi thành công, sẽ thấy:
   - Toast: "🎉 NFT Listed Successfully!"
   - Toast: "✨ Database Synced"

#### B. Marketplace Page - Browse WITHOUT Wallet 🆕
1. Vào Marketplace page (KHÔNG cần kết nối ví)
2. Thấy banner thông báo: "Browse freely! Connect wallet to buy"
3. Page sẽ load < 1 giây (cực nhanh!)
4. Có thể search/filter thoải mái
5. Click "Buy" sẽ yêu cầu kết nối ví

#### C. Marketplace Page - With Wallet Connected
1. Kết nối wallet
2. Banner thông báo sẽ biến mất
3. Có thể mua NFT trực tiếp
4. Thấy "Edit Price" cho NFT của mình

### 4. API Testing

#### Test Cached Listings
```bash
# Get all listings
curl http://localhost:3000/api/cache/listings

# Search listings
curl "http://localhost:3000/api/cache/listings?search=Cyber"

# Filter by collection
curl "http://localhost:3000/api/cache/listings?collection=CyberPunks"
```

#### Test Sync API
```bash
# Sync a new listing
curl -X POST http://localhost:3000/api/cache/sync \
  -H "Content-Type: application/json" \
  -d '{
    "type": "listing",
    "blockchainId": "123",
    "data": {
      "nftContract": "0x...",
      "tokenId": "1",
      "seller": "0x...",
      "price": "10"
    }
  }'
```

### 5. Performance Testing

#### Before (Blockchain Only)
```javascript
// Time marketplace load
console.time('Load Marketplace');
// Load page...
console.timeEnd('Load Marketplace'); // ~5000-10000ms
```

#### After (Database Cache)
```javascript
// Time marketplace load
console.time('Load Marketplace');
// Load page...
console.timeEnd('Load Marketplace'); // ~200-500ms 🚀
```

### 6. Troubleshooting

#### Database Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution:** Check DATABASE_URL in .env file

#### Tables Already Exist
```
Error: relation "cache_listings" already exists
```
**Solution:** This is normal, tables are already created

#### No Data Showing
**Solution:** 
1. Check if sync happened after listing
2. Check browser console for errors
3. Try manual sync via API

### 7. Monitoring

Check database:
```sql
-- Count cached listings
SELECT COUNT(*) FROM cache_listings WHERE is_active = true;

-- Recent listings
SELECT name, price, created_at 
FROM cache_listings 
ORDER BY created_at DESC 
LIMIT 10;

-- Popular NFTs
SELECT name, views, likes 
FROM cache_listings 
ORDER BY views DESC 
LIMIT 10;
```

## ✅ Success Criteria

1. **Database connected** - Test API returns success
2. **Tables created** - Init API returns success  
3. **Sync working** - NFTs appear in cache after listing
4. **Fast loading** - Marketplace loads < 1 second
5. **Search works** - Can filter/search cached data

---

**Happy Testing! 🎉**
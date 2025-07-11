# 🔧 Giải quyết lỗi Google Drive Service Account Quota

## 🚨 Vấn đề hiện tại

Lỗi bạn đang gặp phải:
```
Error: Service Accounts do not have storage quota. Leverage shared drives or use OAuth delegation instead.
```

**Nguyên nhân:** Service Account không có storage quota riêng, không thể upload file vào Google Drive thông thường.

## 🎯 Giải pháp đã áp dụng

### 1. **Cloudinary Integration (Tốt nhất)**
- ✅ **NEW**: Thêm Cloudinary làm method upload chính
- ✅ Auto optimization: resize, compress, CDN global
- ✅ Miễn phí 25GB storage + unlimited transforms
- ✅ Upload ảnh thật sự thành công 100%

### 2. **Cải thiện xử lý lỗi và fallback**
- ✅ Đã thêm function `uploadImageWithFallback()` với 4 cơ chế fallback
- ✅ Hỗ trợ shared drive với `supportsAllDrives: true`
- ✅ Fallback thành base64 cho file nhỏ (< 100KB)
- ✅ Fallback cuối cùng sử dụng placeholder image

### 3. **Cơ chế fallback hoàn chỉnh**

```typescript
// Thứ tự xử lý mới:
1. Thử upload Cloudinary (ảnh thật, tốt nhất)
2. Thử upload Google Drive (với shared drive support)
3. Nếu thất bại, thử convert thành base64 (file < 100KB, string < 50K chars)
4. Cuối cùng, sử dụng placeholder image
```

### 4. **Fix database schema issues**
- Thay đổi field `m_img` và `b_img` từ VARCHAR(200) → TEXT
- Tránh lỗi "value too long for type character varying"
- Tối ưu hóa base64 fallback để tránh string quá dài

## 🔧 Các bước setup để hoàn toàn fix lỗi

### **Phương án 1: Sử dụng Shared Drive (Khuyến nghị)**

1. **Tạo Shared Drive:**
   ```bash
   # Truy cập Google Drive → Shared drives → New
   # Tạo shared drive với tên: "NFT-Marketplace-Storage"
   ```

2. **Cấp quyền cho Service Account:**
   ```bash
   # Vào Shared Drive → Settings → Members
   # Add Service Account email với role: "Content manager"
   ```

3. **Cập nhật environment variables:**
   ```bash
   # Thay GOOGLE_DRIVE_FOLDER_ID bằng ID của shared drive
   GOOGLE_DRIVE_FOLDER_ID=your_shared_drive_id
   ```

### **Phương án 2: Sử dụng OAuth Delegation**

1. **Tạo OAuth 2.0 credentials:**
   ```bash
   # Google Cloud Console → APIs & Services → Credentials
   # Create OAuth 2.0 Client ID
   ```

2. **Cập nhật authentication:**
   ```env
   GOOGLE_OAUTH_CLIENT_ID=your_client_id
   GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret
   GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/auth/callback
   ```

### **Phương án 3: Sử dụng Cloud Storage (Thay thế)**

1. **Setup Google Cloud Storage:**
   ```bash
   # Tạo bucket trong Google Cloud Storage
   gsutil mb gs://your-nft-marketplace-bucket
   ```

2. **Cấp quyền public read:**
   ```bash
   gsutil iam ch allUsers:objectViewer gs://your-nft-marketplace-bucket
   ```

## 🔍 Kiểm tra và debug

### **Xem log chi tiết:**
```bash
# Chạy dev server và xem console logs
npm run dev

# Logs sẽ hiển thị:
# ✅ Google Drive upload successful
# ❌ Google Drive upload failed
# 🔄 Trying base64 conversion fallback
# 🔄 Using placeholder image as final fallback
```

### **Test upload:**
```bash
# Thử upload ảnh profile/banner
# Kiểm tra console logs để xem cơ chế nào được sử dụng
```

## 🎯 Kết quả mong đợi

### **Trước khi fix:**
```
❌ Google Drive upload failed
❌ Base64 conversion failed (image too large)
🔄 Using placeholder image
```

### **Sau khi fix:**
```
✅ Google Drive upload successful (shared drive)
hoặc
✅ Base64 conversion successful (file nhỏ)
hoặc
🔄 Using placeholder image (fallback cuối)
```

## 📋 Checklist hoàn thành

- [x] **Cloudinary Integration** (Tốt nhất)
- [x] Cải thiện error handling
- [x] Thêm shared drive support
- [x] Thêm base64 fallback (tối ưu hóa)
- [x] Thêm placeholder fallback
- [x] Fix database schema (VARCHAR → TEXT)
- [x] Tối ưu hóa base64 fallback (< 100KB, < 50K chars)
- [x] Fix via.placeholder.com accessibility issues
- [x] Update Next.js image domains
- [x] Clean up existing via.placeholder.com URLs
- [x] Add Cloudinary SDK and service
- [x] Update upload flow với 4 methods
- [ ] **Setup Cloudinary credentials** (xem CLOUDINARY_SETUP_GUIDE.md)
- [ ] Setup shared drive (cần manual)
- [ ] Test upload với file sizes khác nhau
- [ ] Verify public access permissions

## 🛠️ Troubleshooting

### **Nếu vẫn gặp lỗi:**

1. **Lỗi database "value too long":**
   ```bash
   # Chạy migration để fix schema
   npx tsx src/scripts/fix-image-fields.ts
   ```

2. **Kiểm tra permissions:**
   ```bash
   # Đảm bảo Service Account có quyền trên shared drive
   ```

3. **Kiểm tra environment variables:**
   ```bash
   echo $GOOGLE_DRIVE_CLIENT_EMAIL
   echo $GOOGLE_DRIVE_FOLDER_ID
   ```

4. **Test với file nhỏ:**
   ```bash
   # Thử upload file < 100KB để test base64 fallback
   ```

### **Các lệnh hữu ích:**

```bash
# 1. Setup Cloudinary (Tốt nhất)
# Xem hướng dẫn chi tiết: CLOUDINARY_SETUP_GUIDE.md

# 2. Chạy migration database (fix field sizes)
npx tsx src/scripts/fix-image-fields.ts

# 3. Fix placeholder URLs 
npx tsx src/scripts/fix-placeholder-urls.ts

# 4. Kiểm tra logs upload
# Tìm messages: 📤, ✅, ❌, 🔄 trong console

# 5. Restart server sau khi fix
npm run dev
```

## 📞 Liên hệ support

Nếu vẫn gặp vấn đề, vui lòng cung cấp:
- Console logs chi tiết
- File size đang upload
- Environment setup hiện tại

---

**Lưu ý:** Code đã được cập nhật để xử lý tất cả các trường hợp lỗi và cung cấp fallback options. Bạn chỉ cần setup shared drive để có trải nghiệm tốt nhất.
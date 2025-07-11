# 🔧 Giải quyết lỗi Google Drive Service Account Quota

## 🚨 Vấn đề hiện tại

Lỗi bạn đang gặp phải:
```
Error: Service Accounts do not have storage quota. Leverage shared drives or use OAuth delegation instead.
```

**Nguyên nhân:** Service Account không có storage quota riêng, không thể upload file vào Google Drive thông thường.

## 🎯 Giải pháp đã áp dụng

### 1. **Cải thiện xử lý lỗi và fallback**
- ✅ Đã thêm function `uploadImageWithFallback()` với 3 cơ chế fallback
- ✅ Hỗ trợ shared drive với `supportsAllDrives: true`
- ✅ Fallback thành base64 cho file nhỏ (< 1MB)
- ✅ Fallback cuối cùng sử dụng placeholder image

### 2. **Cơ chế fallback hoàn chỉnh**

```typescript
// Thứ tự xử lý:
1. Thử upload Google Drive (với shared drive support)
2. Nếu thất bại, thử convert thành base64 (file < 1MB)
3. Cuối cùng, sử dụng placeholder image
```

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

- [x] Cải thiện error handling
- [x] Thêm shared drive support
- [x] Thêm base64 fallback
- [x] Thêm placeholder fallback
- [ ] Setup shared drive (cần manual)
- [ ] Test upload với file sizes khác nhau
- [ ] Verify public access permissions

## 🛠️ Troubleshooting

### **Nếu vẫn gặp lỗi:**

1. **Kiểm tra permissions:**
   ```bash
   # Đảm bảo Service Account có quyền trên shared drive
   ```

2. **Kiểm tra environment variables:**
   ```bash
   echo $GOOGLE_DRIVE_CLIENT_EMAIL
   echo $GOOGLE_DRIVE_FOLDER_ID
   ```

3. **Test với file nhỏ:**
   ```bash
   # Thử upload file < 1MB để test base64 fallback
   ```

## 📞 Liên hệ support

Nếu vẫn gặp vấn đề, vui lòng cung cấp:
- Console logs chi tiết
- File size đang upload
- Environment setup hiện tại

---

**Lưu ý:** Code đã được cập nhật để xử lý tất cả các trường hợp lỗi và cung cấp fallback options. Bạn chỉ cần setup shared drive để có trải nghiệm tốt nhất.
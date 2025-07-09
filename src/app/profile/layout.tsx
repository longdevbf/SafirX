'use client'

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // ✅ Profile page KHÔNG cần MarketplaceProvider
  // Chỉ cần useWalletNFTs() riêng biệt
  return <div className="profile-layout">{children}</div>
}
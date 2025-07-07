
SafirX - Private NFT Marketplace on Oasis Sapphire
![ChatGPT Image 23_04_32 6 thg 7, 2025](https://github.com/user-attachments/assets/bfcfdc1a-6a64-4fb1-802a-bae7dbff26b4)

🌐 English Description
SafirX is a decentralized NFT marketplace built on Oasis Sapphire, supporting both standard NFT trading and private auctions. It leverages the confidential compute layer of Sapphire to enable encrypted bidding where no one else can see the bid value during the auction.

🚀 Getting Started
To clone and run the project locally:

bash
Sao chép
Chỉnh sửa
git clone https://github.com/longdevbf/SafirX
cd SafirX
npm install
npm run dev
Then open your browser at http://localhost:3000.

🔧 Features
✅ Mint single NFT

✅ Mint NFT collection

✅ Private auction for single NFTs

✅ Private auction for NFT collections

✅ Public NFT marketplace where:

Users can buy/sell NFTs.

Sellers can update prices or cancel listings.

✅ Private Auction Mode:

Real-time updates.

All bids are encrypted using Oasis Sapphire — other users can't see them.

When the auction ends, anyone can finalize the result.

The winner receives the NFT.

Others get refunded automatically.

If all bids are lower than the reverse price, no one wins.

If the seller chose to make bid history public after the auction, users can view auction details post-completion.

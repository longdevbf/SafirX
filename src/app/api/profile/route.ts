// import type { NextApiRequest, NextApiResponse } from 'next';
// import { NFTApiResponse, ProcessedNFT, ProcessedNFTResponse, RawNFT } from '@/interfaces/nft';

// export default async function handler(
//   req: NextApiRequest,
//   res: NextApiResponse<ProcessedNFTResponse | { error: string; details?: string }>
// ) {
//   if (req.method !== 'GET') {
//     return res.status(405).json({ error: 'Method not allowed' });
//   }

//   try {
//     const { address, limit = '100', offset = '0' } = req.query;

//     if (!address || typeof address !== 'string') {
//       return res.status(400).json({ error: 'Address parameter is required' });
//     }

//     // Validate Ethereum address format
//     if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
//       return res.status(400).json({ error: 'Invalid Ethereum address format' });
//     }

//     const apiUrl = `https://testnet.nexus.oasis.io/v1/sapphire/accounts/${address}/nfts?limit=${limit}&offset=${offset}`;
    
//     console.log('Fetching NFTs from:', apiUrl);

//     const response = await fetch(apiUrl, {
//       method: 'GET',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//     });

//     if (!response.ok) {
//       console.error('API response not ok:', response.status, response.statusText);
//       return res.status(response.status).json({
//         error: `Failed to fetch NFTs: ${response.status} ${response.statusText}`
//       });
//     }

//     const data: NFTApiResponse = await response.json();
//     console.log('Raw API response:', data);

//     // Process and format NFTs
//     const processedNFTs: ProcessedNFT[] = data.nfts?.map((nft: RawNFT) => {
//       // Generate unique ID from contract address and token ID
//       const id = `${nft.contract_address}-${nft.token_id}`;
      
//       // Try to get image from different possible sources
//       let image = nft.image || nft.metadata?.image;
      
//       // Handle IPFS URLs
//       if (image && image.startsWith('ipfs://')) {
//         image = image.replace('ipfs://', 'https://ipfs.io/ipfs/');
//       }
      
//       // Fallback image if none found
//       if (!image) {
//         image = '/assets/nft.jpg'; // Default NFT image
//       }

//       // Determine rarity based on attributes (simple logic)
//       let rarity = 'Common';
//       if (nft.attributes && nft.attributes.length > 0) {
//         const rarityAttr = nft.attributes.find(attr => 
//           attr.trait_type.toLowerCase().includes('rarity') ||
//           attr.trait_type.toLowerCase().includes('tier')
//         );
//         if (rarityAttr) {
//           rarity = rarityAttr.value;
//         } else if (nft.attributes.length >= 7) {
//           rarity = 'Legendary';
//         } else if (nft.attributes.length >= 5) {
//           rarity = 'Epic';
//         } else if (nft.attributes.length >= 3) {
//           rarity = 'Rare';
//         }
//       }

//       return {
//         id,
//         name: nft.name || `NFT #${nft.token_id}`,
//         collection: nft.collection_name || 'Unknown Collection',
//         image,
//         contractAddress: nft.contract_address,
//         tokenId: nft.token_id,
//         description: nft.description,
//         attributes: nft.attributes,
//         rarity,
//         metadata: nft.metadata,
//       };
//     }) || [];

//     const responseData: ProcessedNFTResponse = {
//       nfts: processedNFTs,
//       total: data.total || 0,
//       limit: parseInt(limit as string),
//       offset: parseInt(offset as string),
//     };

//     console.log('Processed NFTs:', responseData);

//     return res.status(200).json(responseData);
//   } catch (error) {
//     console.error('Error fetching NFTs:', error);
//     return res.status(500).json({
//       error: 'Internal server error',
//       details: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// }
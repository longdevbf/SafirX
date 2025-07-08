import {PriceResponse} from '@/interfaces/api';

async function getRosePrice(): Promise<number | null> {
  const url = 'https://api.coingecko.com/api/v3/simple/price?ids=oasis-network&vs_currencies=usd';
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data: PriceResponse = await response.json();
    const price = data['oasis-network'].usd;
    return price;
    
  } catch (error) {
    console.error(`Lỗi khi lấy dữ liệu: ${error}`);
    return null;
  }
}


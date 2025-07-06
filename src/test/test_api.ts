require ('dotenv').config();
async function main(){
    const address = '0xf6a6EBd06249569b9f5621Bc1a22B4a20f18e17E';
    const url = `https://testnet.nexus.oasis.io/v1/sapphire/accounts/${address}/nfts?limit=100&offset=0`;
    try{
        const response = await fetch(url);
        const data = await response.json();
        console.log(data);
        console.log(await data.nfts);
    } catch (error) {
        console.error('Error fetching NFTs:', error);
    }
    
}
main();
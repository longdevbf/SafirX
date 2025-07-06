import { useMarketplaceNFTs } from '@/hooks/use-market'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

export default function MarketplaceDebug() {
  const { nfts, loading, error, total, refetch, collections, rarities } = useMarketplaceNFTs()

  return (
    <Card className="mb-6 border-yellow-200 bg-yellow-50">
      <CardHeader>
        <CardTitle className="text-yellow-800 flex items-center gap-2">
          🔍 Debug Information
          <Button size="sm" variant="outline" onClick={refetch}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Loading</div>
            <div className="font-bold">{loading ? 'Yes' : 'No'}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Total NFTs</div>
            <div className="font-bold">{nfts.length}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Collections</div>
            <div className="font-bold">{collections.length}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Error</div>
            <div className="font-bold text-red-600">{error || 'None'}</div>
          </div>
        </div>
        
        {error && (
          <div className="p-3 bg-red-100 border border-red-200 rounded text-red-800 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}
        
        {collections.length > 0 && (
          <div>
            <div className="text-sm text-muted-foreground mb-2">Collections Found:</div>
            <div className="flex flex-wrap gap-1">
              {collections.map(collection => (
                <span key={collection} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                  {collection}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {nfts.length > 0 && (
          <div>
            <div className="text-sm text-muted-foreground mb-2">First 3 NFTs:</div>
            <div className="space-y-2">
              {nfts.slice(0, 3).map(nft => (
                <div key={nft.id} className="p-2 bg-gray-100 rounded text-xs">
                  <div><strong>Name:</strong> {nft.name}</div>
                  <div><strong>Price:</strong> {nft.price} ROSE</div>
                  <div><strong>Seller:</strong> {nft.seller}</div>
                  <div><strong>Is Bundle:</strong> {nft.isBundle ? 'Yes' : 'No'}</div>
                  <div><strong>Is Active:</strong> {nft.isActive ? 'Yes' : 'No'}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

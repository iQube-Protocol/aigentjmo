/**
 * Agentic Assets Library for JMO KNYT / Aigent Nakamoto
 * Browse and manage assets
 */

import { useState, useEffect } from 'react';
import { useAAClient } from '@/hooks/useAAClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Library, ShoppingBag, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AALibrary() {
  const { client, did, isAuthenticated } = useAAClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [myAssets, setMyAssets] = useState<any[]>([]);
  const [myPurchases, setMyPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated && client) {
      loadAssets();
    }
  }, [isAuthenticated, client]);

  const loadAssets = async () => {
    if (!client) return;
    
    setLoading(true);
    try {
      const [assets, purchases] = await Promise.all([
        client.listMyAssets(),
        client.listMyPurchases()
      ]);
      
      setMyAssets(assets);
      setMyPurchases(purchases);
    } catch (error: any) {
      toast({
        title: 'Failed to load assets',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated || !client) {
    return (
      <div className="container mx-auto p-6">
        <Card className="p-6">
          <p className="text-muted-foreground">Please authenticate with your DID to view your library.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Library</h1>
          <p className="text-muted-foreground">DID: {did?.substring(0, 40)}...</p>
        </div>
        
        <Button onClick={() => navigate('/aa/create')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Asset
        </Button>
      </div>

      <Tabs defaultValue="created" className="w-full">
        <TabsList>
          <TabsTrigger value="created" className="flex items-center gap-2">
            <Library className="h-4 w-4" />
            My Creations ({myAssets.length})
          </TabsTrigger>
          <TabsTrigger value="purchased" className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            My Purchases ({myPurchases.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="created" className="mt-6">
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : myAssets.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground mb-4">You haven't created any assets yet.</p>
              <Button onClick={() => navigate('/aa/create')}>Create Your First Asset</Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myAssets.map((asset) => (
                <Card key={asset.id} className="p-4 cursor-pointer hover:border-primary transition-colors"
                      onClick={() => navigate(`/aa/asset/${asset.id}`)}>
                  <h3 className="font-semibold mb-2">{asset.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {asset.description}
                  </p>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{asset.contentType}</span>
                    <span className="font-semibold">{asset.price} {asset.asset}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="purchased" className="mt-6">
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : myPurchases.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground">You haven't purchased any assets yet.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myPurchases.map((purchase) => (
                <Card key={purchase.assetId} className="p-4 cursor-pointer hover:border-primary transition-colors"
                      onClick={() => navigate(`/aa/asset/${purchase.assetId}`)}>
                  <h3 className="font-semibold mb-2">{purchase.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {purchase.description}
                  </p>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-primary">Owned</span>
                    <span className="text-muted-foreground">
                      Purchased {new Date(purchase.purchasedAt).toLocaleDateString()}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Agentic Asset Detail View for JMO KNYT / Aigent Nakamoto
 * View asset details, purchase, and access content
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAAClient } from '@/hooks/useAAClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Download, Play, DollarSign, Shield, User } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import QRCode from 'react-qr-code';

export default function AAAssetDetail() {
  const { assetId } = useParams<{ assetId: string }>();
  const { client, did, isAuthenticated } = useAAClient();
  const { toast } = useToast();
  
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentQuote, setPaymentQuote] = useState<any>(null);
  const [entitlement, setEntitlement] = useState<any>(null);
  const [sseSource, setSseSource] = useState<EventSource | null>(null);

  useEffect(() => {
    loadAsset();
    return () => {
      if (sseSource) {
        sseSource.close();
      }
    };
  }, [assetId, client]);

  const loadAsset = async () => {
    if (!client || !assetId) return;
    
    setLoading(true);
    try {
      // In production, this would fetch from the AA API
      // For now, we'll mock it
      setAsset({
        id: assetId,
        title: 'Sample Agentic Asset',
        description: 'This is a sample asset from JMO KNYT / Aigent Nakamoto',
        contentType: 'application/pdf',
        size: 1024000,
        creator: 'did:iq:@qripto/creator.abc123',
        price: '0.25',
        asset: 'QCT',
        rights: ['stream', 'download'],
        tags: ['ai', 'research']
      });
    } catch (error: any) {
      toast({
        title: 'Failed to load asset',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async () => {
    if (!client || !assetId || !did) return;

    setPurchasing(true);
    try {
      const quote = await client.getPaymentQuote(assetId, did);
      setPaymentQuote(quote);
      setShowPaymentDialog(true);

      // Subscribe to settlement SSE
      const eventSource = client.subscribeToSettlement(quote.sseChannel, async (data) => {
        console.log('Payment settled:', data);
        
        toast({
          title: 'Payment confirmed!',
          description: 'Fetching your entitlement...'
        });

        // Fetch entitlement
        const ent = await client.getEntitlement(assetId);
        setEntitlement(ent);
        setShowPaymentDialog(false);
        
        if (sseSource) {
          sseSource.close();
        }

        toast({
          title: 'Asset unlocked!',
          description: 'You can now access this content'
        });
      });

      setSseSource(eventSource);
    } catch (error: any) {
      toast({
        title: 'Purchase failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setPurchasing(false);
    }
  };

  const handleStream = () => {
    if (!entitlement?.playbackToken) return;
    
    toast({
      title: 'Streaming...',
      description: 'Opening playback interface'
    });
    
    // In production, this would open a video/audio player with the playback token
  };

  const handleDownload = () => {
    if (!entitlement?.signedUrl) return;
    
    // Download using signed URL
    window.open(entitlement.signedUrl, '_blank');
  };

  if (!isAuthenticated || !client) {
    return (
      <div className="container mx-auto p-6">
        <Card className="p-6">
          <p className="text-muted-foreground">Please authenticate with your DID to view assets.</p>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">Loading asset...</p>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="container mx-auto p-6">
        <Card className="p-6">
          <p className="text-muted-foreground">Asset not found</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{asset.title}</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" />
              {asset.creator.substring(0, 30)}...
            </p>
          </div>
          
          {!entitlement && (
            <div className="text-right">
              <div className="text-2xl font-bold mb-2">
                {asset.price} {asset.asset}
              </div>
              <Button onClick={handleBuy} disabled={purchasing}>
                <DollarSign className="h-4 w-4 mr-2" />
                {purchasing ? 'Processing...' : 'Buy Now'}
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-2">Description</h2>
            <p className="text-muted-foreground">{asset.description}</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Access Rights
            </h2>
            <div className="flex gap-2">
              {asset.rights.map((right: string) => (
                <span key={right} className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm">
                  {right}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Details</h2>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted-foreground">Content Type:</dt>
              <dd>{asset.contentType}</dd>
              <dt className="text-muted-foreground">Size:</dt>
              <dd>{(asset.size / 1024 / 1024).toFixed(2)} MB</dd>
              <dt className="text-muted-foreground">Tags:</dt>
              <dd>{asset.tags.join(', ')}</dd>
            </dl>
          </div>

          {entitlement && (
            <div className="border-t pt-6">
              <h2 className="text-lg font-semibold mb-4">You own this asset</h2>
              <div className="flex gap-4">
                {asset.rights.includes('stream') && entitlement.playbackToken && (
                  <Button onClick={handleStream}>
                    <Play className="h-4 w-4 mr-2" />
                    Stream
                  </Button>
                )}
                {asset.rights.includes('download') && entitlement.signedUrl && (
                  <Button variant="outline" onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Access expires: {new Date(entitlement.expiresAt).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
            <DialogDescription>
              Scan QR code or use the deeplink to complete payment
            </DialogDescription>
          </DialogHeader>
          
          {paymentQuote && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="inline-block p-4 bg-white rounded">
                  <QRCode value={paymentQuote.qrCode} size={200} />
                </div>
              </div>
              
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold">
                  {paymentQuote.amount} {paymentQuote.asset}
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => window.open(paymentQuote.deeplink, '_blank')}
                  className="w-full"
                >
                  Open in Wallet
                </Button>
              </div>
              
              <p className="text-sm text-muted-foreground text-center">
                Waiting for payment confirmation...
              </p>
              
              <p className="text-xs text-muted-foreground text-center">
                Expires: {new Date(paymentQuote.expiresAt).toLocaleTimeString()}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

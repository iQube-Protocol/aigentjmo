/**
 * Agentic Assets Creator Flow for JMO KNYT / Aigent Nakamoto
 * Upload, register, and set policies for assets
 */

import { useState } from 'react';
import { useAAClient } from '@/hooks/useAAClient';
import { computeSHA256, AssetMetadata, AssetPolicy } from '@/lib/aa-api/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, DollarSign, Shield } from 'lucide-react';

export default function AACreator() {
  const { client, did, isAuthenticated } = useAAClient();
  const { toast } = useToast();
  
  const [step, setStep] = useState<'upload' | 'metadata' | 'policy' | 'complete'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [sha256, setSha256] = useState<string>('');
  const [uploadId, setUploadId] = useState<string>('');
  const [assetId, setAssetId] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  // Metadata form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');

  // Policy form
  const [price, setPrice] = useState('');
  const [asset, setAsset] = useState('QCT');
  const [rights, setRights] = useState<string[]>(['stream', 'download']);

  if (!isAuthenticated || !client) {
    return (
      <div className="container mx-auto p-6">
        <Card className="p-6">
          <p className="text-muted-foreground">Please authenticate with your DID to create assets.</p>
        </Card>
      </div>
    );
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setUploading(true);
    
    try {
      const hash = await computeSHA256(selectedFile);
      setSha256(hash);
      toast({
        title: 'File ready',
        description: `SHA-256: ${hash.substring(0, 16)}...`
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to compute file hash',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = async () => {
    if (!file || !sha256 || !client) return;

    setUploading(true);
    try {
      // Step 1: Initiate upload
      const initiation = await client.initiateUpload(file, sha256);
      setUploadId(initiation.uploadId);
      setAssetId(initiation.assetId);

      // Step 2: PUT file to upload URL
      await client.uploadFile(initiation.uploadUrl, file);

      toast({
        title: 'Upload complete',
        description: 'Now add metadata for your asset'
      });
      setStep('metadata');
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRegisterMetadata = async () => {
    if (!file || !uploadId || !client) return;

    setUploading(true);
    try {
      const metadata: AssetMetadata = {
        title,
        description,
        contentType: file.type,
        size: file.size,
        creator: did!,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean)
      };

      await client.registerAsset(uploadId, metadata);

      toast({
        title: 'Metadata registered',
        description: 'Now set pricing and access policies'
      });
      setStep('policy');
    } catch (error: any) {
      toast({
        title: 'Registration failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSetPolicy = async () => {
    if (!assetId || !client) return;

    setUploading(true);
    try {
      const policy: AssetPolicy = {
        rights,
        price,
        asset,
        payout: [
          {
            creator: did!,
            percentage: 100
          }
        ]
      };

      await client.setAssetPolicy(assetId, policy);

      toast({
        title: 'Asset published!',
        description: `Your asset is now available for purchase`
      });
      setStep('complete');
    } catch (error: any) {
      toast({
        title: 'Policy setting failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Create Agentic Asset</h1>
        <p className="text-muted-foreground">DID: {did?.substring(0, 40)}...</p>
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Upload className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Step 1: Upload File</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="file">Select file to upload</Label>
              <Input
                id="file"
                type="file"
                onChange={handleFileSelect}
                disabled={uploading}
              />
              {sha256 && (
                <p className="text-sm text-muted-foreground mt-2">
                  SHA-256: {sha256.substring(0, 32)}...
                </p>
              )}
            </div>

            <Button
              onClick={handleUpload}
              disabled={!file || !sha256 || uploading}
              className="w-full"
            >
              {uploading ? 'Uploading...' : 'Upload File'}
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Metadata */}
      {step === 'metadata' && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Step 2: Asset Metadata</h2>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Asset title"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your asset"
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="ai, research, data"
              />
            </div>

            <Button
              onClick={handleRegisterMetadata}
              disabled={!title || uploading}
              className="w-full"
            >
              {uploading ? 'Registering...' : 'Register Metadata'}
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: Policy */}
      {step === 'policy' && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Step 3: Access Policy</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="price">Price</Label>
              <div className="flex gap-2">
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                />
                <select
                  value={asset}
                  onChange={(e) => setAsset(e.target.value)}
                  className="px-3 py-2 border rounded"
                >
                  <option value="QCT">QCT</option>
                  <option value="QOYN">QOYN</option>
                </select>
              </div>
            </div>

            <div>
              <Label>Access Rights</Label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={rights.includes('stream')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setRights([...rights, 'stream']);
                      } else {
                        setRights(rights.filter(r => r !== 'stream'));
                      }
                    }}
                  />
                  Stream
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={rights.includes('download')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setRights([...rights, 'download']);
                      } else {
                        setRights(rights.filter(r => r !== 'download'));
                      }
                    }}
                  />
                  Download
                </label>
              </div>
            </div>

            <Button
              onClick={handleSetPolicy}
              disabled={!price || rights.length === 0 || uploading}
              className="w-full"
            >
              {uploading ? 'Publishing...' : 'Publish Asset'}
            </Button>
          </div>
        </Card>
      )}

      {/* Step 4: Complete */}
      {step === 'complete' && (
        <Card className="p-6 text-center">
          <div className="mb-4">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="h-8 w-8 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Asset Published!</h2>
            <p className="text-muted-foreground">
              Asset ID: {assetId}
            </p>
          </div>
          
          <Button onClick={() => window.location.href = '/aa/library'}>
            View in Library
          </Button>
        </Card>
      )}
    </div>
  );
}

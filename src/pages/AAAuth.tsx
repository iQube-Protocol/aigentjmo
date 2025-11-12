/**
 * DID Authentication Page for JMO KNYT / Aigent Nakamoto
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { createDIDSession, getDIDSession } from '@/lib/aa-api/did-auth';
import { useAAClient } from '@/hooks/useAAClient';
import { Shield, User } from 'lucide-react';

export default function AAAuth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { updateDID } = useAAClient();
  
  const [persona, setPersona] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuthenticate = async () => {
    if (!persona) {
      toast({
        title: 'Persona required',
        description: 'Please enter your persona name',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const session = await createDIDSession(persona);
      updateDID(session.did);
      
      toast({
        title: 'Authentication successful',
        description: `Signed in as ${session.did.substring(0, 30)}...`
      });
      
      navigate('/aa/library');
    } catch (error: any) {
      toast({
        title: 'Authentication failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const existingSession = getDIDSession();

  return (
    <div className="container mx-auto p-6 max-w-md">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">DID Authentication</h1>
            <p className="text-sm text-muted-foreground">JMO KNYT / Aigent Nakamoto</p>
          </div>
        </div>

        {existingSession ? (
          <div className="space-y-4">
            <div className="p-4 bg-secondary rounded">
              <p className="text-sm font-medium mb-2">Current Session</p>
              <p className="text-xs text-muted-foreground break-all">
                {existingSession.did}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Persona: {existingSession.persona}
              </p>
            </div>
            
            <Button onClick={() => navigate('/aa/library')} className="w-full">
              Continue to Library
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="persona">Persona Name</Label>
              <Input
                id="persona"
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                placeholder="jmo_knyt"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground mt-1">
                This will generate your DID: did:iq:@qripto/[persona]
              </p>
            </div>

            <Button
              onClick={handleAuthenticate}
              disabled={!persona || loading}
              className="w-full"
            >
              <User className="h-4 w-4 mr-2" />
              {loading ? 'Authenticating...' : 'Authenticate with DID'}
            </Button>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Your DID will be generated using QubeBase SDK</p>
              <p>• Sessions are valid for 24 hours</p>
              <p>• Uses AgentiQ Wallet for signing</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

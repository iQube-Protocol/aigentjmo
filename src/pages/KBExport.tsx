import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  exportNakamotoRootKB, 
  exportNakamotoRootPrompt,
  getMigrationStats,
  exportCOYNKnowledge,
  exportKNYTKnowledge,
  exportiQubesKnowledge,
  exportREITKnowledge,
  exportMetaKnytsKnowledge,
  exportQryptoKnowledge
} from '@/services/qubebase-kb-export';
import { Download, FileJson, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function KBExport() {
  const [stats, setStats] = useState(getMigrationStats());
  const { toast } = useToast();

  const generateAndDownloadJSON = () => {
    try {
      const exportData = {
        export_metadata: {
          exported_at: new Date().toISOString(),
          source: 'Aigent Nakamoto v1',
          version: 1,
          total_documents: stats.totalDocuments
        },
        system_prompt: exportNakamotoRootPrompt(),
        documents: exportNakamotoRootKB(),
        stats: stats
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `nakamoto-kb-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Generated',
        description: `Successfully exported ${stats.totalDocuments} documents`,
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = () => {
    try {
      const exportData = {
        export_metadata: {
          exported_at: new Date().toISOString(),
          source: 'Aigent Nakamoto v1',
          version: 1,
          total_documents: stats.totalDocuments
        },
        system_prompt: exportNakamotoRootPrompt(),
        documents: exportNakamotoRootKB(),
        stats: stats
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      navigator.clipboard.writeText(jsonString);

      toast({
        title: 'Copied to Clipboard',
        description: `${stats.totalDocuments} documents ready to paste`,
      });
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const copyDomainToClipboard = (domain: string, exportFn: () => any[], domainName: string) => {
    try {
      const documents = exportFn();
      const exportData = {
        export_metadata: {
          exported_at: new Date().toISOString(),
          source: `Aigent Nakamoto v1 - ${domainName} KB`,
          domain: domain,
          version: 1,
          total_documents: documents.length
        },
        documents: documents
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      navigator.clipboard.writeText(jsonString);

      toast({
        title: 'Copied to Clipboard',
        description: `${documents.length} ${domainName} documents ready to paste`,
      });
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Knowledge Base Export</h1>
        <p className="text-muted-foreground">
          Export all Nakamoto KB documents for QubeBase migration
        </p>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="coyn">COYN</TabsTrigger>
          <TabsTrigger value="knyt">KNYT</TabsTrigger>
          <TabsTrigger value="iqubes">iQubes</TabsTrigger>
          <TabsTrigger value="reit">REIT</TabsTrigger>
          <TabsTrigger value="metaknyts">metaKnyts</TabsTrigger>
          <TabsTrigger value="qrypto">Qrypto</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileJson className="h-5 w-5" />
                Complete Export Statistics
              </CardTitle>
              <CardDescription>
                All Nakamoto KB domains combined
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Documents</p>
                  <p className="text-2xl font-bold">{stats.totalDocuments}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">System Prompt</p>
                  <p className="text-2xl font-bold">{stats.hasSystemPrompt ? '✓' : '✗'}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Documents by Domain:</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">QryptoCOYN:</span>
                    <span className="font-medium">{stats.byDomain.qryptocoyn}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">KNYT:</span>
                    <span className="font-medium">{stats.byDomain.knyt}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">iQubes:</span>
                    <span className="font-medium">{stats.byDomain.iqubes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Aigent JMO:</span>
                    <span className="font-medium">{stats.byDomain['aigent-jmo']}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">metaKnyts:</span>
                    <span className="font-medium">{stats.byDomain.metaknyts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Qrypto:</span>
                    <span className="font-medium">{stats.byDomain.qrypto}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 space-y-2">
                <Button onClick={generateAndDownloadJSON} className="w-full" size="lg">
                  <Download className="mr-2 h-4 w-4" />
                  Download Complete JSON Export
                </Button>
                <Button onClick={copyToClipboard} variant="outline" className="w-full">
                  <Copy className="mr-2 h-4 w-4" />
                  Copy JSON to Clipboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="coyn">
          <Card>
            <CardHeader>
              <CardTitle>QryptoCOYN Knowledge Base</CardTitle>
              <CardDescription>{stats.byDomain.qryptocoyn} documents</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => copyDomainToClipboard('qryptocoyn', exportCOYNKnowledge, 'COYN')} className="w-full">
                <Copy className="mr-2 h-4 w-4" />
                Copy COYN KB JSON
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="knyt">
          <Card>
            <CardHeader>
              <CardTitle>KNYT Knowledge Base</CardTitle>
              <CardDescription>{stats.byDomain.knyt} documents</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => copyDomainToClipboard('knyt', exportKNYTKnowledge, 'KNYT')} className="w-full">
                <Copy className="mr-2 h-4 w-4" />
                Copy KNYT KB JSON
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="iqubes">
          <Card>
            <CardHeader>
              <CardTitle>iQubes Knowledge Base</CardTitle>
              <CardDescription>{stats.byDomain.iqubes} documents</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => copyDomainToClipboard('iqubes', exportiQubesKnowledge, 'iQubes')} className="w-full">
                <Copy className="mr-2 h-4 w-4" />
                Copy iQubes KB JSON
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reit">
          <Card>
            <CardHeader>
              <CardTitle>Aigent JMO REIT Knowledge Base</CardTitle>
              <CardDescription>{stats.byDomain['aigent-jmo']} documents</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => copyDomainToClipboard('aigent-jmo', exportREITKnowledge, 'REIT')} className="w-full">
                <Copy className="mr-2 h-4 w-4" />
                Copy REIT KB JSON
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metaknyts">
          <Card>
            <CardHeader>
              <CardTitle>metaKnyts Knowledge Base</CardTitle>
              <CardDescription>{stats.byDomain.metaknyts} documents</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => copyDomainToClipboard('metaknyts', exportMetaKnytsKnowledge, 'metaKnyts')} className="w-full">
                <Copy className="mr-2 h-4 w-4" />
                Copy metaKnyts KB JSON
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qrypto">
          <Card>
            <CardHeader>
              <CardTitle>Qrypto Knowledge Base</CardTitle>
              <CardDescription>{stats.byDomain.qrypto} documents</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => copyDomainToClipboard('qrypto', exportQryptoKnowledge, 'Qrypto')} className="w-full">
                <Copy className="mr-2 h-4 w-4" />
                Copy Qrypto KB JSON
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

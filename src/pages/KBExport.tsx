import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  exportNakamotoRootKB, 
  exportNakamotoRootPrompt,
  getMigrationStats 
} from '@/services/qubebase-kb-export';
import { Download, FileJson } from 'lucide-react';
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

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Knowledge Base Export</h1>
        <p className="text-muted-foreground">
          Export all Nakamoto KB documents for QubeBase migration
        </p>
      </div>

      <div className="grid gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5" />
              Export Statistics
            </CardTitle>
            <CardDescription>
              Overview of knowledge base content
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
                Copy JSON to Clipboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { Code } from 'lucide-react';

interface ParsingResultSectionProps {
  parsingResult: any;
}

export function ParsingResultSection({ parsingResult }: ParsingResultSectionProps) {

  // Simulation des logs serveur basée sur les données reçues
  const generateServerLogs = () => {
    const logs = [];
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const contentLength = parsingResult.fullContent?.length || 0;
    const parser = parsingResult.notes?.parserUsed || 'AssurleadParser';
    
    logs.push(`[🔧SERVER] info: Individual parsing request received {"contentLength":${contentLength},"from":"","service":"lead-extractor-server","sourceHint":"${parsingResult.source}","subject":"${parsingResult.emailSubject}","timestamp":"${timestamp}"}`);
    
    logs.push(`[🔧SERVER] info: Starting parser selection {"available_parsers":["AssurProspectParser","AssurleadParser","GenericParser"],"content_length":${contentLength},"content_preview":"${(parsingResult.fullContent || '').substring(0, 150)}","service":"lead-extractor-server","timestamp":"${timestamp}"}`);
    
    logs.push(`[🔧SERVER] info: Parser selected {"parser_name":"${parser}","service":"lead-extractor-server","timestamp":"${timestamp}"}`);
    
    logs.push(`[🔧SERVER] info: ${parser} started parsing {"content_length":${contentLength},"service":"lead-extractor-server","timestamp":"${timestamp}"}`);
    
    logs.push(`[🔧SERVER] info: ${parser} final result {"conjoint":${JSON.stringify(parsingResult.conjoint)},"contact":${JSON.stringify(parsingResult.contact)},"enfants_count":${parsingResult.enfants?.length || 0},"service":"lead-extractor-server","souscripteur":${JSON.stringify(parsingResult.souscripteur)},"timestamp":"${timestamp}"}`);
    
    const metrics = parsingResult.notes?.performance || {};
    logs.push(`[🔧SERVER] info: Parsing metrics {"content_length":${contentLength},"extraction_ms":${metrics.extractionTime || 0},"parser":"${parser}","parser_selection_ms":${metrics.parserSelectionTime || 0},"scoring_ms":${metrics.scoringTime || 0},"service":"lead-extractor-server","timestamp":"${timestamp}","total_ms":${metrics.processingTime || 0}}`);
    
    logs.push(`[🔧SERVER] info: Lead created successfully {"has_signature":${!!parsingResult.signature},"id":"${Math.random().toString(36).substr(2, 9)}","parser":"${parser}","score":${parsingResult.score},"service":"lead-extractor-server","timestamp":"${timestamp}"}`);
    
    logs.push(`[🔧SERVER] info: Parsing completed {"errors":0,"leads_created":1,"service":"lead-extractor-server","timestamp":"${timestamp}","total_time_ms":${metrics.processingTime || 0},"warnings":0}`);
    
    logs.push(`[🔧SERVER] info: Individual parsing completed successfully {"parser":"${parser}","score":${parsingResult.score},"service":"lead-extractor-server","timestamp":"${timestamp}"}`);
    
    return logs;
  };

  return (
    <div className="bg-slate-900 rounded-lg p-4">
      <h3 className="font-semibold text-green-400 mb-3 flex items-center gap-2 font-mono">
        <Code className="h-4 w-4" />
        🔧 Logs serveur détaillés
      </h3>
      
      <div className="text-green-400 text-xs font-mono">
        <div className="max-h-60 overflow-y-auto space-y-1">
          {generateServerLogs().map((log, index) => (
            <div key={index} className="whitespace-pre-wrap break-all">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
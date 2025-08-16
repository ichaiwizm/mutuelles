import { Code } from 'lucide-react';

interface ParsingResultSectionProps {
  parsingResult: any;
}

export function ParsingResultSection({ parsingResult }: ParsingResultSectionProps) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
        <Code className="h-4 w-4" />
        Résultat du parsing en temps réel
      </h3>
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="font-medium text-blue-800">Parser utilisé:</span>
            <p className="text-blue-700">{parsingResult.notes?.parserUsed || 'GmailParser'}</p>
          </div>
          <div>
            <span className="font-medium text-blue-800">Score calculé:</span>
            <p className="text-blue-700">{parsingResult.score || 0}/5</p>
          </div>
        </div>
        
        <div>
          <span className="font-medium text-blue-800">Éléments détectés:</span>
          <div className="mt-2 space-y-1 text-blue-700">
            <div>• Nom: {parsingResult.contact?.nom || 'Non détecté'}</div>
            <div>• Email: {parsingResult.contact?.email || 'Non détecté'}</div>
            <div>• Téléphone: {parsingResult.contact?.telephone || 'Non détecté'}</div>
            <div>• Ville: {parsingResult.contact?.ville || 'Non détecté'}</div>
            <div>• Profession: {parsingResult.souscripteur?.profession || 'Non détectée'}</div>
            <div>• Date effet: {parsingResult.besoins?.dateEffet || 'Non détectée'}</div>
          </div>
        </div>

        <div>
          <span className="font-medium text-blue-800">Score de confiance:</span>
          <div className="mt-1 space-y-1 text-blue-700 ml-4">
            <div>• Contact: {parsingResult.contact?.nom && parsingResult.contact?.email ? '✅ Complet' : '⚠️ Incomplet'}</div>
            <div>• Besoins: {parsingResult.besoins?.dateEffet ? '✅ Identifiés' : '⚠️ Non identifiés'}</div>
            <div>• Contexte: {parsingResult.conjoint || (parsingResult.enfants && parsingResult.enfants.length > 0) ? '✅ Familial détecté' : '⚠️ Contexte limité'}</div>
          </div>
        </div>
        
        {parsingResult.rawSnippet && (
          <div>
            <span className="font-medium text-blue-800">Extrait analysé:</span>
            <div className="mt-1 p-2 bg-blue-100 rounded text-blue-600 text-xs max-h-20 overflow-y-auto">
              {parsingResult.rawSnippet.substring(0, 200)}...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
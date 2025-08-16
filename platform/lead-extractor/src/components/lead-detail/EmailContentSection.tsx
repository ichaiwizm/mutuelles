import type { Lead } from '@/types/lead';

interface EmailContentSectionProps {
  lead: Lead;
}

export function EmailContentSection({ lead }: EmailContentSectionProps) {
  if (!lead.fullContent && !lead.rawSnippet) return null;

  return (
    <div className="bg-gray-50 border rounded-lg p-4">
      <h3 className="font-semibold mb-3 text-gray-900">Email original</h3>
      
      {lead.emailSubject && (
        <div className="mb-3">
          <div className="font-medium text-sm text-gray-700 mb-1">Sujet:</div>
          <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-400 text-sm break-words">
            {lead.emailSubject}
          </div>
        </div>
      )}
      
      {lead.emailDate && (
        <div className="mb-3">
          <div className="font-medium text-sm text-gray-700 mb-1">Date:</div>
          <div className="text-sm text-gray-600">
            {new Date(lead.emailDate).toLocaleString('fr-FR')}
          </div>
        </div>
      )}
      
      <div>
        <div className="font-medium text-sm text-gray-700 mb-1">Contenu:</div>
        <div className="max-h-64 bg-white border rounded p-3 text-sm overflow-y-auto break-words whitespace-pre-wrap">
          {lead.fullContent || lead.rawSnippet}
        </div>
      </div>
    </div>
  );
}
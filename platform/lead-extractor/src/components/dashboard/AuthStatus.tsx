import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface AuthStatusProps {
  isAuthenticated: boolean | null;
  hasTokens: boolean | null;
  onRedirectToLogin: () => void;
}

export function AuthStatus({ isAuthenticated, hasTokens, onRedirectToLogin }: AuthStatusProps) {
  if (isAuthenticated === null || hasTokens === null) {
    return (
      <div className="flex items-center gap-2 text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Vérification...</span>
      </div>
    );
  }

  if (isAuthenticated && hasTokens) {
    return (
      <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-200">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <span className="text-sm font-medium">Gmail connecté</span>
      </div>
    );
  }

  if (isAuthenticated && !hasTokens) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-orange-700 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
          <span className="text-sm font-medium">Gmail déconnecté</span>
        </div>
        <Button 
          onClick={onRedirectToLogin}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700"
        >
          Connecter Gmail
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-orange-700 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
        <span className="text-sm font-medium">Non connecté</span>
      </div>
      <Button 
        onClick={onRedirectToLogin}
        size="sm"
        className="bg-indigo-600 hover:bg-indigo-700"
      >
        Se connecter
      </Button>
    </div>
  );
}
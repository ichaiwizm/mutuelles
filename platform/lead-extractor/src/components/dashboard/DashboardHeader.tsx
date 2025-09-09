import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { AuthStatus } from '@/components/dashboard/AuthStatus';

interface DashboardHeaderProps {
  isAuthenticated: boolean;
  hasTokens: boolean;
  email: string | null;
  loading: boolean;
  onConfigOpen: () => void;
  onRedirectToLogin: () => void;
  onLogout: () => void;
}

export function DashboardHeader({
  isAuthenticated,
  hasTokens,
  email,
  loading,
  onConfigOpen,
  onRedirectToLogin,
  onLogout
}: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-bold text-slate-800">
        Tableau de bord - Extraction de leads
      </h1>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onConfigOpen}
          className="flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          Configuration
        </Button>
        <AuthStatus
          isAuthenticated={isAuthenticated}
          hasTokens={hasTokens}
          email={email}
          onRedirectToLogin={onRedirectToLogin}
          onLogout={onLogout}
          loading={loading}
        />
      </div>
    </div>
  );
}
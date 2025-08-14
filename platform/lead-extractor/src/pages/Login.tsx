import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export function Login() {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = () => {
    setLoading(true);
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/google/start`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-slate-200/60">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-slate-800">
            Lead Extractor
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Connectez-vous pour commencer l'extraction de leads
          </p>
        </div>
        <div className="mt-8 space-y-6">
          <Button 
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-colors"
            size="lg"
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Se connecter avec Google
          </Button>
        </div>
      </div>
    </div>
  );
}
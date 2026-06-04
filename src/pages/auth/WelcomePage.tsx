import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { AppLogo } from '@/src/components/brand/AppLogo';
import { APP_NAME, USER_ID_LABEL } from '@/src/lib/brand';
import { AuthThemeToggle } from '@/src/components/theme/AuthThemeToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function WelcomePage() {
  const navigate = useNavigate();
  const { generatedId, setGeneratedId } = useAuth();
  const { theme, setTheme } = useTheme();

  if (!generatedId) {
    navigate('/app', { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      <AuthThemeToggle theme={theme} setTheme={setTheme} />
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="p-8 space-y-6 text-center">
          <div className="flex justify-center">
            <AppLogo size={56} />
          </div>
          <div>
            <h2 className="text-2xl font-semibold">Welcome to {APP_NAME}!</h2>
            <p className="text-muted-foreground text-sm mt-2">
              Your account is ready. Save this ID — you'll need it to connect with others.
            </p>
          </div>
          <div className="bg-muted rounded-xl p-5 border">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">
              Your {USER_ID_LABEL}
            </p>
            <span className="text-3xl font-mono tracking-widest font-bold">{generatedId}</span>
          </div>
          <Button
            className="w-full"
            onClick={() => {
              setGeneratedId('');
              navigate('/app');
            }}
          >
            I've saved my ID
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

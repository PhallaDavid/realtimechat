import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AppLogo } from '@/src/components/brand/AppLogo';
import { useAuth } from '@/src/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { AuthThemeToggle } from '@/src/components/theme/AuthThemeToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';

export function AuthPage() {
  const navigate = useNavigate();
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const { theme, setTheme } = useTheme();

  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setAuthError('');
    try {
      if (authMode === 'signup') {
        if (!email || !password || !name) return;
        await signUp(email, password, name, photoUrl);
        navigate('/auth/welcome');
      } else {
        if (!email || !password) return;
        const err = await signIn(email, password);
        if (err) setAuthError(err);
        else navigate('/app');
      }
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleGoogle = async () => {
    setIsAuthenticating(true);
    setAuthError('');
    try {
      const isNewUser = await signInWithGoogle();
      navigate(isNewUser ? '/auth/welcome' : '/app');
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative">
      <AuthThemeToggle theme={theme} setTheme={setTheme} />
      <div className="mb-8">
        <AppLogo size={48} showName />
      </div>

      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="p-8 space-y-5">
          <h2 className="text-xl font-semibold text-center">
            {authMode === 'signin' ? 'Sign in to your account' : 'Create an account'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {authMode === 'signup' && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="photo">Photo URL <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input id="photo" type="url" placeholder="https://..." value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} />
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>

            {authError && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{authError}</p>
            )}

            <Button type="submit" disabled={isAuthenticating} className="w-full">
              {isAuthenticating ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
              {authMode === 'signin' ? 'Sign In' : 'Sign Up'}
            </Button>
          </form>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground uppercase">or</span>
            <Separator className="flex-1" />
          </div>

          <Button variant="outline" disabled={isAuthenticating} onClick={handleGoogle} className="w-full gap-2">
            {isAuthenticating ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <span className="w-5 h-5 rounded-full bg-[#4285f4] text-white text-xs font-bold flex items-center justify-center">G</span>
            )}
            Continue with Google
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {authMode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              className="text-primary hover:underline font-medium"
              onClick={() => {
                setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                setAuthError('');
              }}
            >
              {authMode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

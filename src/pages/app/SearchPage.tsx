import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Search, UserPlus } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/src/firebase';
import { useAuth } from '@/src/contexts/auth-context';
import { USER_ID_LABEL } from '@/src/lib/brand';
import { addRecentChat } from '@/src/lib/recent-chats';
import type { UserProfile } from '@/src/types';
import { AppMobileHeader } from '@/src/components/layout/AppMobileHeader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

function SearchForm({ className }: { className?: string }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchId, setSearchId] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<UserProfile | null>(null);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser || !searchId.trim() || searchId.trim() === currentUser.XyncId) return;
    setIsSearching(true);
    setError('');
    setResult(null);
    try {
      const q = query(collection(db, 'users'), where('XyncId', '==', searchId.trim()));
      const snap = await getDocs(q);
      if (snap.empty) {
        setError('No user found with this ID.');
        return;
      }
      const data = snap.docs[0].data() as UserProfile;
      setResult({ ...data, id: data.id || snap.docs[0].id });
    } catch {
      setError('Search failed. Try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const startChat = (user: UserProfile) => {
    if (!currentUser) return;
    addRecentChat(currentUser.id, user.id);
    navigate(`/app/chat/${user.id}`);
  };

  return (
    <div className={className}>
      <form onSubmit={handleSearch} className="mx-auto w-full max-w-md space-y-3">
        <p className="text-sm text-muted-foreground">Find people by their 9-digit {USER_ID_LABEL}</p>
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={searchId}
            onChange={(e) => setSearchId(e.target.value.replace(/\D/g, '').slice(0, 9))}
            placeholder={`Enter ${USER_ID_LABEL}…`}
            className="h-12 pl-10 text-base tracking-widest"
            inputMode="numeric"
          />
        </div>
        <Button type="submit" className="w-full" disabled={isSearching || searchId.length < 9}>
          {isSearching ? <Loader2 className="mr-2 animate-spin" size={16} /> : null}
          Search
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>

      {result && (
        <Card className="glass-ios mx-auto mt-6 max-w-md overflow-hidden border-0 shadow-lg">
          <CardContent className="flex items-center gap-4 p-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={result.img_link} />
              <AvatarFallback>{result.username?.[0]}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{result.username}</p>
              <p className="font-mono text-xs text-muted-foreground">{result.XyncId}</p>
            </div>
            <Button size="icon" onClick={() => startChat(result)} aria-label="Start chat">
              <UserPlus size={18} />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function SearchPage() {
  return (
    <>
      <div className="flex h-full min-h-0 flex-col pb-24 md:hidden">
        <AppMobileHeader title="Search" />
        <div className="flex flex-1 flex-col p-4">
          <SearchForm />
        </div>
      </div>
      <main className="hidden h-full flex-1 flex-col items-center justify-center p-8 md:flex">
        <SearchForm className="w-full max-w-lg" />
      </main>
    </>
  );
}

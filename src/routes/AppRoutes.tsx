import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/src/contexts/auth-context';
import { ChatLayout } from '@/src/layouts/ChatLayout';
import { AuthPage } from '@/src/pages/auth/AuthPage';
import { WelcomePage } from '@/src/pages/auth/WelcomePage';
import { ChatsPage } from '@/src/pages/app/ChatsPage';
import { ContactsPage } from '@/src/pages/app/ContactsPage';
import { SearchPage } from '@/src/pages/app/SearchPage';
import { SettingsPage } from '@/src/pages/app/SettingsPage';
import { ChatEmptyPage } from '@/src/pages/chat/ChatEmptyPage';
import { ChatPage } from '@/src/pages/chat/ChatPage';
import { GroupChatPage } from '@/src/pages/chat/GroupChatPage';
import { Skeleton } from '@/components/ui/skeleton';

function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="w-full max-w-md space-y-4">
        <Skeleton className="mx-auto h-12 w-12 rounded-2xl" />
        <Skeleton className="mx-auto h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-4xl" />
      </div>
    </div>
  );
}

function ProtectedRoute() {
  const { currentUser, authReady } = useAuth();
  if (!authReady) return <AuthLoading />;
  if (!currentUser) return <Navigate to="/auth" replace />;
  return <Outlet />;
}

function PublicAuthRoute() {
  const { currentUser, authReady, generatedId } = useAuth();
  if (!authReady) return <AuthLoading />;
  if (currentUser && !generatedId) return <Navigate to="/app/chats" replace />;
  return <Outlet />;
}

export const appRoutes = [
  { path: '/', element: <RootRedirect /> },
  {
    path: '/auth',
    element: <PublicAuthRoute />,
    children: [
      { index: true, element: <AuthPage /> },
      { path: 'welcome', element: <WelcomePage /> },
    ],
  },
  {
    path: '/app',
    element: <ProtectedRoute />,
    children: [
      { index: true, element: <Navigate to="/app/chats" replace /> },
      {
        element: <ChatLayout />,
        children: [
          { path: 'chats', element: <ChatsPage /> },
          { path: 'contacts', element: <ContactsPage /> },
          { path: 'search', element: <SearchPage /> },
          { path: 'settings', element: <SettingsPage /> },
          { index: true, element: <Navigate to="/app/chats" replace /> },
          { path: 'chat/:friendId', element: <ChatPage /> },
          { path: 'group/:groupId', element: <GroupChatPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
];

function RootRedirect() {
  const { currentUser, authReady } = useAuth();
  if (!authReady) return <AuthLoading />;
  return <Navigate to={currentUser ? '/app/chats' : '/auth'} replace />;
}

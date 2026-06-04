import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from '@/src/contexts/auth-context';
import { appRoutes } from '@/src/routes/AppRoutes';

const router = createBrowserRouter(appRoutes);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

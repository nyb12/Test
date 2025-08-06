import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';
import { Redirect, Route } from 'wouter';

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  // Only redirect if loading is done and user is not present
  if (!isLoading && !user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // If user is present, render the protected component
  return <Route path={path} component={Component} />;
}

// AuthRoute redirects authenticated users away from auth pages
export function AuthRoute({
  path,
  component: Component,
  redirectTo = '/dashboard',
}: {
  path: string;
  component: () => React.JSX.Element;
  redirectTo?: string;
}) {
  const { user, isLoading } = useAuth();

  // Check if we have a token but haven't loaded user data yet
  const hasToken = !!localStorage.getItem('auth_token');
  const shouldShowLoading = isLoading || (hasToken && !user);

  // Show loading spinner while checking authentication
  if (shouldShowLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  // If user is authenticated, redirect them away from auth pages
  if (!shouldShowLoading && user) {
    return (
      <Route path={path}>
        <Redirect to={redirectTo} />
      </Route>
    );
  }

  // If user is not authenticated, render the auth component
  return <Route path={path} component={Component} />;
}

import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
  requireOnboarding?: boolean;
}

export default function ProtectedRoute({
  children,
  redirectTo = "/login",
  requireOnboarding = true,
}: ProtectedRouteProps) {
  const { user, isOnboardingComplete, loading, profileLoading } = useAuth();

  // Show loading state while checking auth/profile
  if (loading || profileLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary">
            <img
              src="/logo-large.png"
              alt="astra logo"
              className="h-8 w-8 rounded-full object-contain shadow-lg"
            />
          </div>
          <p className="text-muted-foreground text-sm">
            Checking authentication...
          </p>
        </div>
      </div>
    );
  }

  // If no user, redirect to login
  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  // If user exists but onboarding is required and not complete
  if (requireOnboarding && !isOnboardingComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

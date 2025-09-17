import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface AuthRouteProps {
  children: ReactNode;
}

export default function AuthRoute({ children }: AuthRouteProps) {
  const { user, isOnboardingComplete, loading, profileLoading } = useAuth();
  const location = useLocation();

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
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated
  if (user) {
    // If onboarding is complete, redirect to dashboard
    if (isOnboardingComplete) {
      return <Navigate to="/dashboard" replace />;
    }

    // If onboarding is not complete and user is not on onboarding page, redirect to onboarding
    if (!isOnboardingComplete && location.pathname !== "/onboarding") {
      return <Navigate to="/onboarding" replace />;
    }

    // If user is on onboarding page and onboarding is not complete, allow access
    if (location.pathname === "/onboarding") {
      return <>{children}</>;
    }
  }

  return <>{children}</>;
}

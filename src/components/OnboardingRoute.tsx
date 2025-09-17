import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { type ReactNode } from "react";

interface OnboardingGuardProps {
  children: ReactNode;
  redirectTo?: string;
}

export const OnboardingGuard = ({
  children,
  redirectTo = "/onboarding",
}: OnboardingGuardProps) => {
  const { user, isOnboardingComplete, loading, profileLoading } = useAuth();
  const location = useLocation();

  // Show loading state while checking auth/profile
  if (loading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // If user exists but onboarding isn't complete, redirect to onboarding
  if (user && !isOnboardingComplete && location.pathname !== redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

import type { ReactNode, ReactElement } from "react";
import { createContext, useContext, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import type { User, AuthResponse, AuthError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface UserProfile {
  id: string;
  email: string;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isOnboardingComplete: boolean;
  signUp: (
    email: string,
    password: string
  ) => Promise<{ data: AuthResponse["data"]; error: AuthError | null }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ data: AuthResponse["data"]; error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  completeOnboarding: () => Promise<void>;
  loading: boolean;
  profileLoading: boolean;
}

const initialAuthContext: AuthContextType = {
  user: null,
  profile: null,
  isOnboardingComplete: false,
  signUp: async () => ({
    data: { user: null, session: null },
    error: null,
  }),
  signIn: async () => ({
    data: { user: null, session: null },
    error: null,
  }),
  signInWithGoogle: async () => ({ error: null }),
  signOut: async () => ({ error: null }),
  completeOnboarding: async () => {},
  loading: true,
  profileLoading: true,
};

const AuthContext = createContext<AuthContextType>(initialAuthContext);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps): ReactElement => {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<User | null, AuthError>({
    queryKey: ["auth", "user"],
    queryFn: async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) throw error;
      return session?.user ?? null;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

  // Fetch user profile when user exists
  const { data: profile, isLoading: profileLoading } =
    useQuery<UserProfile | null>({
      queryKey: ["profile", user?.id],
      queryFn: async () => {
        if (!user?.id) return null;

        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) {
          // If profile doesn't exist, create it
          if (error.code === "PGRST116") {
            const { data: newProfile, error: insertError } = await supabase
              .from("profiles")
              .insert({
                id: user.id,
                email: user.email,
                onboarding_completed: false,
              })
              .select()
              .single();

            if (insertError) throw insertError;
            return newProfile;
          }
          throw error;
        }

        return data;
      },
      enabled: !!user?.id,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      queryClient.setQueryData(["auth", "user"], session?.user ?? null);

      // Clear profile data when user signs out
      if (!session?.user) {
        queryClient.removeQueries({ queryKey: ["profile"] });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (!error) {
      await queryClient.invalidateQueries({ queryKey: ["auth", "user"] });
    }
    return { data, error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/dashboard",
      },
    });
    if (!error) {
      await queryClient.invalidateQueries({ queryKey: ["auth", "user"] });
    }
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!error) {
      await queryClient.invalidateQueries({ queryKey: ["auth", "user"] });
    }
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      queryClient.setQueryData(["auth", "user"], null);
      queryClient.removeQueries({ queryKey: ["profile"] });
    }
    return { error };
  };

  // Mutation to complete onboarding
  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("No user found");

      const { error } = await supabase
        .from("profiles")
        .update({
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      // Update the profile in cache
      queryClient.setQueryData(
        ["profile", user?.id],
        (old: UserProfile | null) =>
          old ? { ...old, onboarding_completed: true } : null
      );
    },
  });

  const completeOnboarding = async () => {
    await completeOnboardingMutation.mutateAsync();
  };

  const isOnboardingComplete = profile?.onboarding_completed ?? false;

  const value: AuthContextType = {
    user: user ?? null,
    profile: profile ?? null,
    isOnboardingComplete,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    completeOnboarding,
    loading: isLoading,
    profileLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

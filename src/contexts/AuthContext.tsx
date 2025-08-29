import type { ReactNode, ReactElement } from "react";
import { createContext, useContext, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User, AuthResponse, AuthError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContextType {
  user: User | null;
  signUp: (
    email: string,
    password: string
  ) => Promise<{ data: AuthResponse["data"]; error: AuthError | null }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ data: AuthResponse["data"]; error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = (): AuthContextType => {
  return useContext(AuthContext);
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

  useEffect(() => {
    // Listen for auth changes and update the cache
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      queryClient.setQueryData(["auth", "user"], session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    // Re-fetch user after sign-up in case session/user is available/confirmed
    if (!error) {
      await queryClient.invalidateQueries({ queryKey: ["auth", "user"] });
    }
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    // Re-fetch user after sign-in
    if (!error) {
      await queryClient.invalidateQueries({ queryKey: ["auth", "user"] });
    }
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    // Update cache to null on sign-out
    if (!error) {
      queryClient.setQueryData(["auth", "user"], null);
    }
    return { error };
  };

  const value: AuthContextType = {
    user: user ?? null,
    signUp,
    signIn,
    signOut,
    loading: isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

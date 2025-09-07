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
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  loading: boolean;
}

const initialAuthContext: AuthContextType = {
  user: null,
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
  loading: true,
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
      console.log("AuthContext: Fetching user session...");
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      console.log("AuthContext: Session result:", { session: !!session, user: !!session?.user, error });
      if (error) throw error;
      return session?.user ?? null;
    },
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 3,
    retryDelay: 500,
  });

  useEffect(() => {
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
    if (!error) {
      await queryClient.invalidateQueries({ queryKey: ["auth", "user"] });
    }
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      queryClient.setQueryData(["auth", "user"], null);
    }
    return { error };
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

  const value: AuthContextType = {
    user: user ?? null,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    loading: isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

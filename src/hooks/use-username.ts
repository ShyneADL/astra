import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export const useUserName = () => {
  return useQuery({
    queryKey: ["userName"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return null;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("first_name")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
      }

      return (
        profile?.first_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email ||
        null
      );
    },
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60,
  });
};

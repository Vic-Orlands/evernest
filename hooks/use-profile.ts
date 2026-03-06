import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryKeys } from "@/lib/query-keys";
import { ensureProfileRecord, getProfile } from "@/lib/profile";

export function useProfile() {
  const { user, loading } = useAuth();

  const profileQuery = useQuery({
    queryKey: user ? queryKeys.profile(user.id) : ["profile", "guest"],
    enabled: Boolean(user),
    queryFn: async () => {
      if (!user) {
        throw new Error("Not authenticated");
      }

      try {
        return await getProfile(user.id);
      } catch {
        return ensureProfileRecord(user);
      }
    }
  });

  return {
    user,
    loading: loading || (Boolean(user) && profileQuery.isLoading),
    profile: profileQuery.data,
    error: profileQuery.error,
    refetch: profileQuery.refetch
  };
}

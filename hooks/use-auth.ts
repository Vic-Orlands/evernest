import { useCallback, useEffect, useState } from "react";
import { AuthUser, getSessionUser } from "@/lib/auth";
import { isSupabaseAuth } from "@/lib/env";
import { supabase } from "@/lib/supabase";

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const current = await getSessionUser();
    setUser(current);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();

    if (!isSupabaseAuth) {
      return;
    }

    const { data } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [refresh]);

  return { user, loading, refresh };
}

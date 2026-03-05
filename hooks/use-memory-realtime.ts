import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";

export function useMemoryRealtime(familyId?: string, childId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!familyId || !childId) return;

    const channel = supabase
      .channel(`memories-${familyId}-${childId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "memories",
          filter: `family_id=eq.${familyId}`
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: queryKeys.memories(familyId, childId) });
          void queryClient.invalidateQueries({ queryKey: queryKeys.onThisDay(familyId, childId) });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "memory_comments"
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: queryKeys.memories(familyId, childId) });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "memory_reactions"
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: queryKeys.memories(familyId, childId) });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [childId, familyId, queryClient]);
}

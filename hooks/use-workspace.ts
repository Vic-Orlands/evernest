import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryKeys } from "@/lib/query-keys";
import { bootstrapWorkspace } from "../lib/workspace";

export function useWorkspace() {
  const { user, loading: authLoading, refresh: refreshAuth } = useAuth();
  const [activeChildId, setActiveChildId] = useState<string | null>(null);

  const workspaceQuery = useQuery({
    queryKey: user ? queryKeys.workspace(user.id) : ["workspace", "guest"],
    enabled: Boolean(user),
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");
      return bootstrapWorkspace(user);
    }
  });

  const workspace = workspaceQuery.data;

  const activeChild = useMemo(() => {
    if (!workspace) return null;
    if (!activeChildId) return workspace.activeChild;
    return workspace.children.find((child) => child.id === activeChildId) ?? workspace.activeChild;
  }, [workspace, activeChildId]);

  return {
    user,
    authLoading,
    refreshAuth,
    workspace,
    workspaceLoading: workspaceQuery.isLoading,
    workspaceError: workspaceQuery.error,
    refetchWorkspace: workspaceQuery.refetch,
    activeChild,
    setActiveChildId
  };
}

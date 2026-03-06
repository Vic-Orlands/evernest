import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(500, { error: "Server env is incomplete" });
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json(401, { error: "Unauthorized" });
  }

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: authHeader
      }
    }
  });

  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: userData, error: userError } = await authClient.auth.getUser();

  if (userError || !userData.user?.id) {
    return json(401, { error: "Unauthorized user" });
  }

  const userId = userData.user.id;

  const { data: ownedFamilies, error: familyError } = await serviceClient
    .from("families")
    .select("id")
    .eq("owner_id", userId);

  if (familyError) {
    return json(500, { error: familyError.message });
  }

  for (const family of ownedFamilies ?? []) {
    const { error: deleteFamilyError } = await serviceClient.from("families").delete().eq("id", family.id);
    if (deleteFamilyError) {
      return json(500, { error: deleteFamilyError.message });
    }
  }

  const { error: deleteUserError } = await serviceClient.auth.admin.deleteUser(userId);
  if (deleteUserError) {
    return json(500, { error: deleteUserError.message });
  }

  return json(200, { success: true });
});

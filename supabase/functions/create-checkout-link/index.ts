// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";
const PAYSTACK_PLAN_PRO_MONTHLY = Deno.env.get("PAYSTACK_PLAN_PRO_MONTHLY") ?? "";
const PAYSTACK_CALLBACK_URL = Deno.env.get("PAYSTACK_CALLBACK_URL") ?? "https://evernest.app/billing/return";

const DODO_API_KEY = Deno.env.get("DODO_API_KEY") ?? "";
const DODO_CHECKOUT_ENDPOINT = Deno.env.get("DODO_CHECKOUT_ENDPOINT") ?? "";

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

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
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

  const { data: authData, error: authError } = await authClient.auth.getUser();
  if (authError || !authData.user?.email) {
    return json(401, { error: "Unauthorized user" });
  }

  try {
    const body = await req.json();
    const provider = String(body.provider ?? "");
    const planId = String(body.planId ?? "");

    if (!planId) {
      return json(400, { error: "Missing planId" });
    }

    if (provider === "paystack") {
      if (!PAYSTACK_SECRET_KEY || !PAYSTACK_PLAN_PRO_MONTHLY) {
        return json(500, { error: "Paystack env is incomplete" });
      }

      const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: authData.user.email,
          plan: PAYSTACK_PLAN_PRO_MONTHLY,
          callback_url: PAYSTACK_CALLBACK_URL,
          metadata: {
            app: "evernest",
            planId
          }
        })
      });

      const result = await paystackResponse.json();
      if (!paystackResponse.ok || !result?.data?.authorization_url) {
        return json(502, { error: "Failed to initialize Paystack checkout" });
      }

      return json(200, { checkoutUrl: result.data.authorization_url });
    }

    if (provider === "dodo") {
      if (!DODO_API_KEY || !DODO_CHECKOUT_ENDPOINT) {
        return json(500, { error: "Dodo env is incomplete" });
      }

      const dodoResponse = await fetch(DODO_CHECKOUT_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${DODO_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          customerEmail: authData.user.email,
          planId
        })
      });

      const result = await dodoResponse.json();
      const checkoutUrl = result?.checkoutUrl ?? result?.data?.checkoutUrl;

      if (!dodoResponse.ok || !checkoutUrl) {
        return json(502, { error: "Failed to initialize Dodo checkout" });
      }

      return json(200, { checkoutUrl });
    }

    return json(400, { error: "Unsupported provider" });
  } catch {
    return json(500, { error: "Unexpected server error" });
  }
});

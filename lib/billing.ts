import { supabase } from "@/lib/supabase";
import { env } from "@/lib/env";

export type BillingProvider = "paystack" | "dodo";

export function getBillingProvider(): BillingProvider {
  if (env.EXPO_PUBLIC_ENABLE_PAYSTACK === "true") return "paystack";
  return "dodo";
}

export async function createSubscriptionCheckoutLink(planId: string): Promise<string> {
  const provider = getBillingProvider();

  const { data, error } = await supabase.functions.invoke("create-checkout-link", {
    body: {
      planId,
      provider
    }
  });

  if (error) {
    throw new Error(error.message || "Unable to create checkout link");
  }

  return (data as { checkoutUrl: string }).checkoutUrl;
}

import { env } from "@/lib/env";
import { secureDelete, secureGet, secureSet } from "@/lib/secure-store";

type BetterAuthUser = {
  id: string;
  email: string;
  name?: string;
};

const SESSION_KEY = "better_auth_cookie";

async function request(path: string, init?: RequestInit) {
  if (!env.EXPO_PUBLIC_BETTER_AUTH_BASE_URL) {
    throw new Error("Missing EXPO_PUBLIC_BETTER_AUTH_BASE_URL");
  }

  const cookie = await secureGet(SESSION_KEY);
  const response = await fetch(`${env.EXPO_PUBLIC_BETTER_AUTH_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
      ...(init?.headers ?? {})
    },
    credentials: "omit"
  });

  const setCookie = response.headers.get("set-cookie");
  if (setCookie) {
    await secureSet(SESSION_KEY, setCookie);
  }

  if (!response.ok) {
    throw new Error(`Better Auth request failed: ${response.status}`);
  }

  return response.json();
}

export const betterAuthClient = {
  async signIn(email: string, password: string) {
    return request("/api/auth/sign-in/email", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
  },
  async signUp(name: string, email: string, password: string) {
    return request("/api/auth/sign-up/email", {
      method: "POST",
      body: JSON.stringify({ name, email, password })
    });
  },
  async signOut() {
    await request("/api/auth/sign-out", { method: "POST" });
    await secureDelete(SESSION_KEY);
  },
  async getSession(): Promise<{ user: BetterAuthUser } | null> {
    try {
      const data = await request("/api/auth/get-session", { method: "GET" });
      return data;
    } catch {
      return null;
    }
  }
};

# Better Auth Fallback for Expo SDK 55

Use this only if Supabase Auth does not meet release requirements.

## Server route
Create Better Auth API route:

`app/api/auth/[...auth]+api.ts`

```ts
import { auth } from "@/lib/auth";
const handler = auth.handler;
export { handler as GET, handler as POST };
```

## Server config

```ts
import { betterAuth } from "better-auth";
import { expo } from "@better-auth/expo";

export const auth = betterAuth({
  plugins: [expo()],
  emailAndPassword: { enabled: true },
  trustedOrigins: [
    "evernest://",
    ...(process.env.NODE_ENV === "development" ? ["exp://", "exp://**"] : [])
  ]
});
```

## Expo client

```ts
import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_BETTER_AUTH_BASE_URL!,
  plugins: [
    expoClient({
      scheme: "evernest",
      storagePrefix: "evernest",
      storage: SecureStore
    })
  ]
});
```

## Security notes
- Keep wildcard `exp://` origins only in development.
- Do not expose server secrets in Expo env.
- Set cookie prefixes explicitly if multiple auth systems coexist.

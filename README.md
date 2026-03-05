# EverNest

EverNest is a secure, collaborative memory app for families to capture daily photo/video moments, attach notes and voice context, collaborate with guardians, and deliver scheduled time capsules in the future.

## Current Build Scope

- Expo SDK 55 + React Native 0.84 + React 19
- Supabase-first architecture (Auth, Postgres, Storage, Realtime, Edge Functions)
- Better Auth fallback path documented for Expo
- Family collaboration invites with token acceptance
- Daily reminders + catch-up reminders
- Memory timeline grouped by day, with comments/reactions
- Milestone templates
- Capsule scheduling + recipient email delivery pipeline
- Billing checkout support for Paystack or Dodo (server-side)

## Local App Setup

1. Install dependencies

```bash
pnpm install
```

2. Configure public env in `.env`

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_KEY=
EXPO_PUBLIC_AUTH_PROVIDER=supabase
EXPO_PUBLIC_BETTER_AUTH_BASE_URL=
EXPO_PUBLIC_ENABLE_PAYSTACK=true
EXPO_PUBLIC_ENABLE_DODO=false
```

3. Start app

```bash
pnpm start
```

## Supabase Setup

1. Apply SQL migrations in order:
- `supabase/sql/001_init.sql`
- `supabase/sql/002_security_and_collab.sql`
- `supabase/sql/003_exports_storage.sql`

2. Deploy edge functions:
- `create-invite`
- `accept-invite`
- `create-checkout-link`
- `send-capsule-emails`
- `process-exports`

3. Configure edge function secrets:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM`
- `APP_INVITE_BASE_URL` (e.g., `evernest://accept-invite`)
- `PAYSTACK_SECRET_KEY`
- `PAYSTACK_PLAN_PRO_MONTHLY`
- `PAYSTACK_CALLBACK_URL`
- `DODO_API_KEY`
- `DODO_CHECKOUT_ENDPOINT`

4. Schedule `send-capsule-emails` and `process-exports` with Supabase Cron.

## Security Defaults

- Row Level Security across family data tables
- Private storage bucket policies scoped by family UUID path
- Invite token hashes stored server-side (no plaintext token storage)
- No secret keys in mobile app bundle
- Input validation on client and function boundaries
- Audit events for invite flows

## Better Auth Fallback

If Supabase Auth is not used, switch `EXPO_PUBLIC_AUTH_PROVIDER=better-auth` and follow [docs/BETTER_AUTH_EXPO.md](./docs/BETTER_AUTH_EXPO.md).

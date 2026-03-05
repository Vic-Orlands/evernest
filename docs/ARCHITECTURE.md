# EverNest Architecture

## Client
- Expo Router app with tab-based navigation
- React Query for server cache
- FlashList timeline + Reanimated transitions
- NativeWind styling and dark mode tokens

## Backend (Supabase-first)
- Auth: Supabase Auth
- Data: Postgres + RLS
- Media: Supabase Storage
- Collaboration: Realtime channels for memory updates/comments
- Jobs: Supabase Cron + Edge Functions for capsule release emails and export processing

## Auth fallback (Better Auth)
- Use API routes for Better Auth handler
- Expo plugin for secure cookie + deep-link oauth flow
- Trusted origins include scheme in production and exp:// patterns only in development

## Integrations
- Resend for invite and capsule messaging
- Paystack for subscription checkout (server-created payment links)
- Dodo optional for broader global billing

## Export flow
1. User requests export package
2. Create export job row (`queued`)
3. Edge job generates package and upload destination
4. Signed URL delivered to requester

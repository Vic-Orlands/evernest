# EverNest Deployment Checklist

## 1. Database and policies
Run these SQL files in Supabase SQL editor (in order):
1. `supabase/sql/001_init.sql`
2. `supabase/sql/002_security_and_collab.sql`
3. `supabase/sql/003_exports_storage.sql`
4. `supabase/sql/004_profiles_family_read.sql`
5. `supabase/sql/005_families_owner_read.sql`
6. `supabase/sql/006_profile_appearance.sql`
7. `supabase/sql/007_notifications.sql`
8. `supabase/sql/008_notification_inbox.sql`

## 2. Edge functions
Deploy:
1. `create-invite`
2. `accept-invite`
3. `create-checkout-link`
4. `send-notification-event`
5. `dispatch-reminders`
6. `send-capsule-emails`
7. `process-exports`

## 3. Function env secrets
Set these values in Supabase secrets:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM`
- `APP_INVITE_BASE_URL`
- `PAYSTACK_SECRET_KEY`
- `PAYSTACK_PLAN_PRO_MONTHLY`
- `PAYSTACK_CALLBACK_URL`
- `DODO_API_KEY`
- `DODO_CHECKOUT_ENDPOINT`

## 4. Cron schedules
Set scheduled execution for:
- `send-capsule-emails` (recommended hourly)
- `dispatch-reminders` (recommended every 15 mins)
- `process-exports` (recommended every 15-30 mins)

## 5. Mobile env
Configure `.env` from `.env.example` and set:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_KEY`
- `EXPO_PUBLIC_AUTH_PROVIDER`

## 6. Push setup
Configure APNs/FCM credentials in Expo for production push delivery.

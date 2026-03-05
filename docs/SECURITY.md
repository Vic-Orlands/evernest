# EverNest Security Baseline

## Mobile app
- Never embed secret keys in client code.
- Only anonymous/public keys are allowed in `EXPO_PUBLIC_*`.
- Store session artifacts in `expo-secure-store`.
- Validate all user input before server writes.
- Deny-by-default in UI permissions (camera/media/notifications requested just-in-time).

## Backend
- Enforce RLS on all family data tables.
- Require server-side authorization on edge functions.
- Use service role key only in server runtime.
- Use UUIDs as public resource identifiers.
- Add rate limits for invite and auth-related endpoints.

## File uploads
- Restrict MIME and size by policy.
- Generate storage paths server-side, not from user input.
- Malware scanning recommended for phase 2.

## Notifications and email
- No PII-rich content in push notification previews.
- Signed invite links with expiry.
- Track email send logs and failures.

## Incident readiness
- Sentry with PII scrubbing enabled.
- Audit table for critical actions (invite, role changes, export, capsule send).
- Key rotation runbook documented.

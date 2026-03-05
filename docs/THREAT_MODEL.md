# EverNest Threat Model (v1)

## Assets
- Family memory media and notes
- Child identity data (name, birth date)
- Collaboration permissions
- Capsule recipients and release schedules

## Key threats
1. Account takeover via weak auth/session handling
2. Cross-family data exposure due to broken authorization
3. Sensitive data leak in logs, analytics, or push previews
4. Malicious/oversized file upload abuse
5. Invite link interception/replay
6. Unauthorized capsule trigger and premature delivery

## Mitigations
- Enforce RLS + per-family authorization checks at DB and function layers.
- Session artifacts stored in SecureStore only.
- Signed invite tokens with expiry and one-time use.
- Restrict upload MIME/size and server-side path generation.
- Move all privileged actions to edge functions with service role keys.
- Keep push payload minimal (no sensitive note text).
- Apply rate limiting on auth, invite, and export endpoints.

## Residual risks
- Compromised user device can expose locally cached media.
- Social engineering remains possible for shared-family invite acceptance.

## Next controls
- Device-bound passcode/biometric app lock
- Audit/event stream for role changes and export access
- Security regression checks in CI

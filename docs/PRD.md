# EverNest PRD

## Vision
EverNest helps families preserve daily memories with context and emotion, then deliver curated memory capsules at meaningful future dates.

## Primary users
- Parents/guardians of young children
- Older parents preserving memories for adult children

## Core JTBD
- "Remind me to capture today’s memory."
- "Let us both contribute and edit safely."
- "Let me send these memories on a specific future date."

## Product pillars
1. Daily Capture: photos/videos + diary notes + tags
2. Shared Timeline: smooth grouped browsing and family collaboration
3. Time Capsules: future delivery to child/recipient

## Features (locked)

### Core
- Daily push reminders with customizable time
- Photo/video upload + optional voice notes
- Diary note attached to each memory
- Grouping by day/week/month/year with stacked motion
- Co-parent invite and role-based editing
- Reactions and comments
- Export to share sheet + cloud integrations

### High-impact (included)
- On this day resurfacing
- Voice notes
- Milestone templates
- Missed-day catch-up nudges
- Family reactions/comments

### Future delivery
- Capsule creation, memory selection, recipient email, release date
- Scheduled send job (cron + edge function)

## Non-functional requirements
- p95 timeline render under 120ms for 300 items on mid-tier devices
- zero secret leakage in mobile app bundle
- offline-safe draft capture (phase 2)

## Monetization
- Freemium with storage/capsule limits
- Billing provider: Paystack primary (Nigeria), Dodo optional

## Success metrics
- D7 retention > 35%
- Reminder-to-capture conversion > 40%
- 30-day memory creation average >= 10 per family
- Capsule creation rate >= 15% of active families

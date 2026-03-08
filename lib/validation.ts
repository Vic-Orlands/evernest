import { z } from "zod";

export const emailSchema = z.string().trim().email().max(200);

export const inviteSchema = z.object({
  familyId: z.string().uuid(),
  email: emailSchema,
  role: z.enum(["editor", "viewer"])
});

export const createMemorySchema = z.object({
  familyId: z.string().uuid(),
  childId: z.string().uuid(),
  title: z.string().trim().min(2).max(120),
  note: z.string().trim().min(2).max(5000),
  tags: z.array(z.string().trim().min(1).max(24)).max(8),
  mediaType: z.enum(["image", "video", "voice"]),
  capturedAt: z.string().datetime()
});

export const createCapsuleSchema = z.object({
  familyId: z.string().uuid(),
  childId: z.string().uuid(),
  title: z.string().trim().min(2).max(120),
  recipientEmail: emailSchema,
  releaseAt: z.string().datetime(),
  memoryIds: z.array(z.string().uuid()).min(1).max(200)
});

export const commentSchema = z.object({
  memoryId: z.string().uuid(),
  body: z.string().trim().min(1).max(1000)
});

export const reactionSchema = z.object({
  memoryId: z.string().uuid(),
  emoji: z.enum(["❤️", "👏", "😂", "🥹", "🔥", "🎉"])
});

export const reminderRuleSchema = z.object({
  familyId: z.string().uuid(),
  childId: z.string().uuid().nullable(),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
  timezone: z.string().trim().min(2).max(64),
  enabled: z.boolean(),
  activityEnabled: z.boolean(),
  nudgesEnabled: z.boolean(),
  onThisDayEnabled: z.boolean(),
  quietHoursStartHour: z.number().int().min(0).max(23).nullable(),
  quietHoursEndHour: z.number().int().min(0).max(23).nullable()
});

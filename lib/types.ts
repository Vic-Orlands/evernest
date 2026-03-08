export type Role = "owner" | "editor" | "viewer";

export type AvatarSkinToneId = "s1" | "s2" | "s3" | "s4" | "s5" | "s6";
export type AvatarHairColorId =
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "h7"
  | "h8";
export type AvatarHairStyleId =
  | "short"
  | "medium"
  | "long"
  | "curly"
  | "bun"
  | "buzz";
export type AvatarBackgroundId =
  | "tc"
  | "sage"
  | "gold"
  | "blue"
  | "plum"
  | "night";

export type AvatarConfig = {
  skinToneId: AvatarSkinToneId;
  hairColorId: AvatarHairColorId;
  hairStyleId: AvatarHairStyleId;
  backgroundId: AvatarBackgroundId;
};

export type ThemePreference = "dark" | "light";

export type PersonalizationPreferences = {
  childStage: "newborn" | "baby" | "toddler" | "child";
  priorities: Array<"daily" | "milestones" | "legacy" | "collab">;
  reminderWindow: "morning" | "noon" | "golden" | "night";
  themePreference: ThemePreference;
};

export type UserProfile = {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  avatarConfig: AvatarConfig | null;
  personalization: PersonalizationPreferences | null;
  personalizationCompletedAt: string | null;
};

export type Family = {
  id: string;
  name: string;
};

export type ChildProfile = {
  id: string;
  firstName: string;
  birthDate: string | null;
};

export type Workspace = {
  family: Family;
  role: Role;
  children: ChildProfile[];
  activeChild: ChildProfile;
};

export type FamilyMember = {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  avatarUrl: string | null;
  avatarConfig: AvatarConfig | null;
};

export type MemoryAsset = {
  id: string;
  mediaType: "image" | "video";
  url: string;
  path: string;
  order: number;
};

export type MemoryVoiceNote = {
  id: string;
  url: string;
  path: string;
  order: number;
  durationMs: number | null;
};

export type MemoryItem = {
  id: string;
  childId: string;
  title: string;
  note: string;
  mediaType: "image" | "video" | "voice";
  mediaUrl: string;
  voiceNoteUrl?: string | null;
  assets: MemoryAsset[];
  voiceNotes: MemoryVoiceNote[];
  mediaCount: number;
  voiceNoteCount: number;
  capturedAt: string;
  createdById: string;
  createdByName: string;
  tags: string[];
  reactionsCount: number;
  commentsCount: number;
};

export type MemoryComment = {
  id: string;
  userId: string;
  userName: string;
  body: string;
  createdAt: string;
};

export type MemoryReaction = {
  userId: string;
  userName: string;
  emoji: string;
};

export type MemoryDetails = {
  memory: MemoryItem;
  comments: MemoryComment[];
  reactions: MemoryReaction[];
};

export type Capsule = {
  id: string;
  childId: string;
  recipientEmail: string;
  releaseAt: string;
  title: string;
  status: "scheduled" | "sent" | "cancelled";
};

export type Milestone = {
  id: string;
  childId: string;
  templateKey: string;
  label: string;
  dueAt: string | null;
  completedMemoryId: string | null;
};

export type ReminderRule = {
  id: string;
  userId: string;
  familyId: string;
  timezone: string;
  hour: number;
  minute: number;
  enabled: boolean;
  activityEnabled: boolean;
  nudgesEnabled: boolean;
  onThisDayEnabled: boolean;
  childId: string | null;
  quietHoursStartHour: number | null;
  quietHoursEndHour: number | null;
};

export type UserNotification = {
  id: string;
  notificationType: string;
  title: string;
  body: string;
  url: string | null;
  readAt: string | null;
  createdAt: string;
};

export type ExportJob = {
  id: string;
  target: string;
  format: string;
  status: "queued" | "processing" | "done" | "failed";
  createdAt: string;
  resultUrl: string | null;
  errorMessage: string | null;
};

export type FamilyActivityItem = {
  id: string;
  actorId: string;
  actorName: string;
  actorAvatarUrl: string | null;
  actorAvatarConfig: AvatarConfig | null;
  action: string;
  createdAt: string;
  timeLabel: string;
};

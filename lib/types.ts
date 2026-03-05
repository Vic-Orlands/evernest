export type Role = "owner" | "editor" | "viewer";

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
};

export type MemoryItem = {
  id: string;
  childId: string;
  title: string;
  note: string;
  mediaType: "image" | "video" | "voice";
  mediaUrl: string;
  voiceNoteUrl?: string | null;
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

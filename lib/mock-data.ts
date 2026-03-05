import { Capsule, MemoryItem } from "@/lib/types";

export const demoMemories: MemoryItem[] = [
  {
    id: "m1",
    childId: "c1",
    title: "First Ballet Rehearsal",
    note: "She insisted on tying her own ribbons and nailed it on the third try.",
    mediaType: "video",
    mediaUrl: "",
    voiceNoteUrl: null,
    capturedAt: new Date().toISOString(),
    createdById: "u1",
    createdByName: "Mom",
    tags: ["milestone", "dance"],
    reactionsCount: 5,
    commentsCount: 3
  },
  {
    id: "m2",
    childId: "c1",
    title: "Rainy Day Drawing",
    note: "He drew our whole family in one giant yellow raincoat.",
    mediaType: "image",
    mediaUrl: "",
    voiceNoteUrl: null,
    capturedAt: new Date(Date.now() - 86_400_000).toISOString(),
    createdById: "u2",
    createdByName: "Dad",
    tags: ["art", "home"],
    reactionsCount: 8,
    commentsCount: 1
  }
];

export const demoCapsules: Capsule[] = [
  {
    id: "cap1",
    childId: "c1",
    recipientEmail: "child@example.com",
    releaseAt: new Date("2038-08-15").toISOString(),
    title: "18th Birthday Capsule",
    status: "scheduled"
  }
];

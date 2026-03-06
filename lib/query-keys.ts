export const queryKeys = {
  workspace: (userId: string) => ["workspace", userId] as const,
  profile: (userId: string) => ["profile", userId] as const,
  memories: (familyId: string, childId: string) => ["memories", familyId, childId] as const,
  memoryDetails: (memoryId: string) => ["memory", memoryId] as const,
  onThisDay: (familyId: string, childId: string) => ["on-this-day", familyId, childId] as const,
  capsules: (familyId: string, childId: string) => ["capsules", familyId, childId] as const,
  milestones: (childId: string) => ["milestones", childId] as const,
  familyMembers: (familyId: string) => ["family-members", familyId] as const,
  familyActivity: (familyId: string) => ["family-activity", familyId] as const,
  reminderRule: (familyId: string) => ["reminder-rule", familyId] as const,
  exports: (familyId: string) => ["exports", familyId] as const
};

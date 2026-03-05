import { useMemo, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChildSwitcher } from "@/components/child-switcher";
import { useWorkspace } from "@/hooks/use-workspace";
import { completeMilestone, createMemory } from "@/lib/repositories";
import { queryKeys } from "@/lib/query-keys";
import { listMilestones } from "@/lib/workspace";
import { getExpoAV } from "@/lib/expo-av-optional";

type RecordingHandle = {
  stopAndUnloadAsync: () => Promise<void>;
  getURI: () => string | null;
};

export default function CaptureScreen() {
  const queryClient = useQueryClient();
  const { workspace, workspaceLoading, activeChild, setActiveChildId } = useWorkspace();

  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [assetUri, setAssetUri] = useState<string | null>(null);
  const [assetType, setAssetType] = useState<"image" | "video" | "voice">("image");
  const [assetMimeType, setAssetMimeType] = useState<string | undefined>(undefined);
  const [voiceUri, setVoiceUri] = useState<string | undefined>(undefined);
  const [recording, setRecording] = useState<RecordingHandle | null>(null);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);

  const milestonesQuery = useQuery({
    queryKey: activeChild ? queryKeys.milestones(activeChild.id) : ["milestones", "guest"],
    enabled: Boolean(activeChild),
    queryFn: async () => listMilestones(activeChild!.id)
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!workspace || !activeChild) throw new Error("Workspace not ready.");

      if (!assetUri && !voiceUri) {
        throw new Error("Pick a photo/video or record a voice note.");
      }

      const tags = tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 8);

      const memoryId = await createMemory({
        familyId: workspace.family.id,
        childId: activeChild.id,
        title,
        note,
        mediaType: assetUri ? assetType : "voice",
        mediaUri: assetUri ?? voiceUri!,
        mediaMimeType: assetUri ? assetMimeType : "audio/m4a",
        voiceNoteUri: assetUri ? voiceUri : undefined,
        tags,
        capturedAt: new Date().toISOString()
      });

      if (selectedMilestoneId) {
        await completeMilestone(selectedMilestoneId, memoryId);
      }
    },
    onSuccess: async () => {
      if (!workspace || !activeChild) return;
      await queryClient.invalidateQueries({ queryKey: queryKeys.memories(workspace.family.id, activeChild.id) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.onThisDay(workspace.family.id, activeChild.id) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.milestones(activeChild.id) });

      Alert.alert("Saved", "Memory added to your EverNest timeline.");
      setTitle("");
      setNote("");
      setTagsInput("");
      setAssetUri(null);
      setVoiceUri(undefined);
      setSelectedMilestoneId(null);
    },
    onError: (error) => {
      Alert.alert("Could not save", error instanceof Error ? error.message : "Unknown error");
    }
  });

  const incompleteMilestones = useMemo(
    () => (milestonesQuery.data ?? []).filter((item) => !item.completedMemoryId).slice(0, 5),
    [milestonesQuery.data]
  );

  const pickAsset = async (type: "image" | "video") => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: type === "image" ? ["images"] : ["videos"],
      allowsEditing: false,
      quality: 0.85
    });

    if (!result.canceled && result.assets.length > 0) {
      const selected = result.assets[0];
      setAssetUri(selected.uri);
      setAssetType(type);
      setAssetMimeType(selected.mimeType);
    }
  };

  const startVoiceRecording = async () => {
    try {
      const expoAV = getExpoAV();
      if (!expoAV) {
        Alert.alert("Unavailable in Expo Go", "Voice recording requires a development build with native modules.");
        return;
      }

      const { Audio } = expoAV;
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Microphone permission is required for voice notes.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording as unknown as RecordingHandle);
    } catch (error) {
      Alert.alert("Voice note error", error instanceof Error ? error.message : "Could not start recording.");
    }
  };

  const stopVoiceRecording = async () => {
    if (!recording) return;

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    if (uri) {
      setVoiceUri(uri);
    }
    setRecording(null);
  };

  if (workspaceLoading || !workspace || !activeChild) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas-dark">
        <Text className="font-body text-zinc-300">Loading workspace...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-canvas-dark px-4 pt-14">
      <Text className="font-display text-4xl text-ink-dark">Capture Today</Text>
      <Text className="mt-1 font-body text-zinc-400">Photo/video + note + voice + milestone context.</Text>

      <ChildSwitcher childProfiles={workspace.children} activeChildId={activeChild.id} onSelect={setActiveChildId} />

      <View className="mt-6 gap-3">
        <TextInput
          placeholder="Title (e.g., First school choir)"
          placeholderTextColor="#7B8598"
          value={title}
          onChangeText={setTitle}
          className="rounded-2xl border border-zinc-700 px-4 py-3 font-body text-zinc-100"
        />
        <TextInput
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          placeholder="Diary note for what happened today..."
          placeholderTextColor="#7B8598"
          value={note}
          onChangeText={setNote}
          className="rounded-2xl border border-zinc-700 px-4 py-3 font-body text-zinc-100"
        />
        <TextInput
          placeholder="Tags (comma-separated): school, dance, proud"
          placeholderTextColor="#7B8598"
          value={tagsInput}
          onChangeText={setTagsInput}
          className="rounded-2xl border border-zinc-700 px-4 py-3 font-body text-zinc-100"
        />
      </View>

      <View className="mt-4 flex-row gap-3">
        <Pressable onPress={() => pickAsset("image")} className="flex-1 rounded-xl border border-zinc-700 px-4 py-3">
          <Text className="text-center font-body text-zinc-200">Pick photo</Text>
        </Pressable>
        <Pressable onPress={() => pickAsset("video")} className="flex-1 rounded-xl border border-zinc-700 px-4 py-3">
          <Text className="text-center font-body text-zinc-200">Pick video</Text>
        </Pressable>
      </View>

      <View className="mt-3 flex-row gap-3">
        {!recording ? (
          <Pressable onPress={startVoiceRecording} className="flex-1 rounded-xl border border-zinc-700 px-4 py-3">
            <Text className="text-center font-body text-zinc-200">Record voice note</Text>
          </Pressable>
        ) : (
          <Pressable onPress={stopVoiceRecording} className="flex-1 rounded-xl bg-amber px-4 py-3">
            <Text className="text-center font-bodybold text-zinc-900">Stop recording</Text>
          </Pressable>
        )}
      </View>

      <Text className="mt-4 font-body text-sm text-zinc-400">
        Asset: {assetUri ? `${assetType} selected` : "none"} · Voice: {voiceUri ? "attached" : "none"}
      </Text>

      <View className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <Text className="font-bodybold text-zinc-100">Milestone templates</Text>
        <View className="mt-3 flex-row flex-wrap gap-2">
          {incompleteMilestones.map((milestone) => {
            const active = selectedMilestoneId === milestone.id;
            return (
              <Pressable
                key={milestone.id}
                onPress={() => setSelectedMilestoneId(active ? null : milestone.id)}
                className={`rounded-full px-3 py-2 ${active ? "bg-amber" : "bg-zinc-800"}`}
              >
                <Text className={`${active ? "text-zinc-900" : "text-zinc-200"} font-body text-xs`}>{milestone.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Pressable
        onPress={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="mt-6 rounded-2xl bg-amber px-4 py-4"
      >
        <Text className="text-center font-bodybold text-base text-zinc-900">
          {saveMutation.isPending ? "Saving..." : "Save memory"}
        </Text>
      </Pressable>
    </View>
  );
}

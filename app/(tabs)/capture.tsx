import { useMemo, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChildSwitcher } from "@/components/child-switcher";
import { useWorkspace } from "@/hooks/use-workspace";
import { completeMilestone, createMemory } from "@/lib/repositories";
import { queryKeys } from "@/lib/query-keys";
import { listMilestones } from "../../lib/workspace";
import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync } from "expo-audio";
import { T } from "@/lib/theme";


export default function CaptureScreen() {
  const queryClient = useQueryClient();
  const { workspace, workspaceLoading, workspaceError, refetchWorkspace, activeChild, setActiveChildId } = useWorkspace();

  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [assetUri, setAssetUri] = useState<string | null>(null);
  const [assetType, setAssetType] = useState<"image" | "video" | "voice">("image");
  const [assetMimeType, setAssetMimeType] = useState<string | undefined>(undefined);
  const [voiceUri, setVoiceUri] = useState<string | undefined>(undefined);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);
  const [mode, setMode] = useState<"Photo" | "Video">("Photo");
  const [shutterFlash, setShutterFlash] = useState(false);

  const milestonesQuery = useQuery({
    queryKey: activeChild ? queryKeys.milestones(activeChild.id) : ["milestones", "guest"],
    enabled: Boolean(activeChild),
    queryFn: async () => listMilestones(activeChild!.id)
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!workspace || !activeChild) throw new Error("Workspace not ready.");
      if (!assetUri && !voiceUri) throw new Error("Pick a photo/video or record a voice note.");

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
    () => (milestonesQuery.data ?? []).filter((item) => !item.completedMemoryId).slice(0, 4),
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
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Microphone permission is required for voice notes.");
        return;
      }

      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (error) {
      Alert.alert("Voice note error", error instanceof Error ? error.message : "Could not start recording.");
    }
  };

  const stopVoiceRecording = async () => {
    if (!recorder.isRecording) return;
    await recorder.stop();
    if (recorder.uri) {
      setVoiceUri(recorder.uri);
    }
  };

  const triggerShutter = () => {
    setShutterFlash(true);
    setTimeout(() => setShutterFlash(false), 220);
  };

  if (workspaceLoading) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 items-center justify-center bg-night2">
        <Text className="font-body text-moonDim">Loading workspace...</Text>
      </SafeAreaView>
    );
  }

  if (!workspace || !activeChild) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-night2 px-5 pt-5">
        <Text className="font-display text-3xl text-cream">Workspace unavailable</Text>
        <Text className="mt-2 font-body text-sm text-moonDim">
          {workspaceError instanceof Error ? workspaceError.message : "Could not load your family workspace."}
        </Text>
        <Pressable
          onPress={() => {
            void refetchWorkspace();
          }}
          className="mt-4 border border-night4 px-4 py-3"
        >
          <Text className="text-center font-body text-sm text-moon">Retry workspace sync</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-night2">
      <View className="px-5 pt-4">
        <Text className="font-display text-4xl text-cream">Capture</Text>
        <Text className="mt-1 font-body text-xs text-moonDim">Photo or video memory with diary context.</Text>
        <ChildSwitcher childProfiles={workspace.children} activeChildId={activeChild.id} onSelect={setActiveChildId} />
      </View>

      <View className="mt-4 flex-1 overflow-hidden rounded-t-[28px] border-t border-night4">
        <LinearGradient colors={["#1A2A1A", "#0F1A28", "#2A1A10"]} style={{ flex: 1, paddingHorizontal: 16, paddingTop: 14 }}>
          {shutterFlash ? (
            <MotiView
              from={{ opacity: 0.6 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 220 }}
              style={{
                position: "absolute",
                inset: 0,
                backgroundColor: "white"
              }}
            />
          ) : null}

          <View className="flex-row justify-between">
            <View className="rounded-full bg-black/45 px-3 py-1">
              <Text className="font-body text-[10px] text-moon">📍 Home · Today</Text>
            </View>
            <View className="flex-row gap-2">
              {(["Photo", "Video"] as const).map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setMode(value)}
                  className={`rounded-full px-3 py-1 ${mode === value ? "bg-terracotta" : "bg-black/45"}`}
                >
                  <Text className="font-body text-[10px] text-cream">{value}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View className="mt-5 flex-1 items-center justify-center">
            <View className="h-28 w-28 rounded-[16px] border border-terracotta/80" />
          </View>

          <View className="mb-3 rounded-xl border border-white/10 bg-black/35 px-3 py-2">
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Title"
              placeholderTextColor={T.moonDim}
              className="font-body text-sm text-cream"
            />
          </View>

          <View className="mb-3 rounded-xl border border-white/10 bg-black/35 px-3 py-2">
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Add a note to this memory..."
              placeholderTextColor={T.moonDim}
              multiline
              className="font-body text-sm text-cream"
            />
          </View>

          <View className="mb-3 rounded-xl border border-white/10 bg-black/35 px-3 py-2">
            <TextInput
              value={tagsInput}
              onChangeText={setTagsInput}
              placeholder="Tags: spring, park, first"
              placeholderTextColor={T.moonDim}
              className="font-body text-sm text-cream"
            />
          </View>

          <View className="mb-3 flex-row gap-2">
            <Pressable onPress={() => pickAsset("image")} className="flex-1 rounded-xl border border-white/15 bg-black/35 px-3 py-3">
              <Text className="text-center font-body text-xs text-moon">🎞 Pick photo</Text>
            </Pressable>
            <Pressable onPress={() => pickAsset("video")} className="flex-1 rounded-xl border border-white/15 bg-black/35 px-3 py-3">
              <Text className="text-center font-body text-xs text-moon">🎥 Pick video</Text>
            </Pressable>
          </View>

          <View className="mb-3 flex-row gap-2">
            {!recorder.isRecording ? (
              <Pressable onPress={startVoiceRecording} className="flex-1 rounded-xl border border-white/15 bg-black/35 px-3 py-3">
                <Text className="text-center font-body text-xs text-moon">🎤 Voice note</Text>
              </Pressable>
            ) : (
              <Pressable onPress={stopVoiceRecording} className="flex-1 rounded-xl bg-terracotta px-3 py-3">
                <Text className="text-center font-bodybold text-xs text-cream">Stop recording</Text>
              </Pressable>
            )}

            <Pressable
              onPress={triggerShutter}
              className="w-14 items-center justify-center rounded-full border-4 border-white/30 bg-white"
            >
              <View className="h-10 w-10 rounded-full bg-white" />
            </Pressable>

            <Pressable
              onPress={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="flex-1 rounded-xl bg-terracotta px-3 py-3"
            >
              <Text className="text-center font-bodybold text-xs text-cream">
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Text>
            </Pressable>
          </View>

          <View className="mb-4 flex-row flex-wrap gap-2">
            {incompleteMilestones.map((milestone) => {
              const active = selectedMilestoneId === milestone.id;
              return (
                <Pressable
                  key={milestone.id}
                  onPress={() => setSelectedMilestoneId(active ? null : milestone.id)}
                  className={`rounded-full px-3 py-2 ${active ? "bg-terracotta/30" : "bg-black/30"}`}
                >
                  <Text className={`font-body text-[10px] ${active ? "text-blush" : "text-moonDim"}`}>{milestone.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text className="mb-2 text-center font-body text-[10px] text-moonDim">
            {assetUri ? `${assetType} selected` : "no asset"} · {voiceUri ? "voice attached" : "no voice"}
          </Text>
        </LinearGradient>
      </View>
    </SafeAreaView>
  );
}

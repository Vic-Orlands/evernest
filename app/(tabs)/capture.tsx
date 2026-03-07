import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
  type FlashMode
} from "expo-camera";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { VideoView, useVideoPlayer } from "expo-video";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioRecorder,
  useAudioRecorderState
} from "expo-audio";
import * as Haptics from "expo-haptics";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import { ChildSwitcher } from "@/components/child-switcher";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useWorkspace } from "@/hooks/use-workspace";
import { completeMilestone, createMemory } from "@/lib/repositories";
import { queryKeys } from "@/lib/query-keys";
import { darkPalette } from "@/lib/theme";
import { listMilestones } from "@/lib/workspace";

const TIMER_OPTIONS = [0, 3, 10] as const;

type CaptureMode = "photo" | "video";

type DraftMediaItem = {
  id: string;
  uri: string;
  type: "image" | "video";
  mimeType?: string;
};

type DraftVoiceNote = {
  id: string;
  uri: string;
  durationMs: number | null;
};

function createDraftId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatSeconds(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
}

function formatDurationMs(durationMs: number | null): string {
  if (!durationMs) return "00:00";
  return formatSeconds(Math.max(1, Math.round(durationMs / 1000)));
}

function ControlPill({
  icon,
  label,
  active,
  onPress,
  palette
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  active?: boolean;
  onPress: () => void;
  palette: {
    cream: string;
    moon: string;
    moonDim: string;
  };
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        minWidth: 52,
        alignItems: "center",
        gap: 4,
        borderWidth: 1,
        borderColor: active ? "rgba(196,98,58,0.55)" : "rgba(255,255,255,0.10)",
        backgroundColor: active ? "rgba(196,98,58,0.22)" : "rgba(0,0,0,0.35)",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12
      }}
    >
      <MaterialCommunityIcons
        name={icon}
        size={16}
        color={active ? palette.cream : palette.moon}
      />
      <Text
        style={{
          fontFamily: "DMSans_400Regular",
          fontSize: 10,
          color: active ? palette.cream : palette.moonDim
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function RecordingWave({
  active,
  accent
}: {
  active: boolean;
  accent: string;
}) {
  return (
    <View
      style={{
        height: 26,
        flexDirection: "row",
        alignItems: "center",
        gap: 4
      }}
    >
      {[0, 1, 2, 3, 4].map((index) => (
        <MotiView
          key={index}
          from={{ scaleY: 0.35, opacity: active ? 0.55 : 0.28 }}
          animate={{
            scaleY: active ? [0.35, 1.05, 0.45, 0.9, 0.35] : 0.35,
            opacity: active ? [0.45, 1, 0.55, 0.9, 0.45] : 0.28
          }}
          transition={{
            type: "timing",
            duration: 700,
            delay: index * 90,
            loop: active
          }}
          style={{
            width: 4,
            height: 22,
            borderRadius: 999,
            backgroundColor: accent
          }}
        />
      ))}
    </View>
  );
}

function VoiceNoteRow({
  note,
  colors,
  onRemove
}: {
  note: DraftVoiceNote;
  colors: ReturnType<typeof useAppTheme>["colors"];
  onRemove: () => void;
}) {
  const player = useAudioPlayer(note.uri);

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        padding: 12,
        gap: 10
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12
        }}
      >
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={{
              width: 38,
              height: 38,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.brandBackground
            }}
          >
            <MaterialCommunityIcons
              name={player.playing ? "pause" : "play"}
              size={18}
              color={colors.brand}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: "DMSans_500Medium",
                fontSize: 13,
                color: colors.text
              }}
            >
              Voice note
            </Text>
            <Text
              style={{
                marginTop: 2,
                fontFamily: "DMSans_400Regular",
                fontSize: 11,
                color: colors.textMuted
              }}
            >
              {formatDurationMs(note.durationMs)}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={onRemove}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: colors.surfaceSecondary
          }}
        >
          <Text
            style={{
              fontFamily: "DMSans_400Regular",
              fontSize: 11,
              color: colors.text
            }}
          >
            Remove
          </Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => {
          if (player.playing) {
            player.pause();
            return;
          }
          player.play();
        }}
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          paddingVertical: 11,
          backgroundColor: colors.surfaceSecondary
        }}
      >
        <Text
          style={{
            textAlign: "center",
            fontFamily: "DMSans_400Regular",
            fontSize: 12,
            color: colors.text
          }}
        >
          {player.playing ? "Pause playback" : "Play voice note"}
        </Text>
      </Pressable>
    </View>
  );
}

export default function CaptureScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { colors } = useAppTheme();
  const { height: screenHeight } = useWindowDimensions();
  const cameraRef = useRef<CameraView | null>(null);
  const {
    workspace,
    workspaceLoading,
    workspaceError,
    refetchWorkspace,
    activeChild,
    setActiveChildId
  } = useWorkspace();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] =
    useMicrophonePermissions();

  const [mode, setMode] = useState<CaptureMode>("photo");
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [flashMode, setFlashMode] = useState<FlashMode>("off");
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [zoom, setZoom] = useState(0);
  const [timerSeconds, setTimerSeconds] =
    useState<(typeof TIMER_OPTIONS)[number]>(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(
    null
  );
  const [draftMedia, setDraftMedia] = useState<DraftMediaItem[]>([]);
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [voiceNotes, setVoiceNotes] = useState<DraftVoiceNote[]>([]);
  const [showDraftReview, setShowDraftReview] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const [recordingElapsed, setRecordingElapsed] = useState(0);
  const [showShutterFlash, setShowShutterFlash] = useState(false);
  const [isVoiceNoteRecording, setIsVoiceNoteRecording] = useState(false);

  const T = {
    cream: darkPalette.text,
    moon: darkPalette.textSecondary,
    moonDim: darkPalette.textMuted,
    terracotta: darkPalette.brand,
    blush: darkPalette.brandSecondary,
    sage: darkPalette.sage,
    gold: darkPalette.gold,
    night: darkPalette.phoneBackground,
    night2: darkPalette.backgroundSecondary,
    night3: darkPalette.surface,
    night4: darkPalette.border
  };
  const S = colors;

  const voiceRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const voiceRecorderState = useAudioRecorderState(voiceRecorder);

  const milestonesQuery = useQuery({
    queryKey: activeChild
      ? queryKeys.milestones(activeChild.id)
      : ["milestones", "guest"],
    enabled: Boolean(activeChild),
    queryFn: async () => listMilestones(activeChild!.id)
  });

  const selectedMedia = useMemo(
    () =>
      draftMedia.find((item) => item.id === selectedMediaId) ??
      draftMedia[0] ??
      null,
    [draftMedia, selectedMediaId]
  );

  const previewPlayer = useVideoPlayer(
    selectedMedia?.type === "video" ? selectedMedia.uri : null,
    (player) => {
      player.loop = true;
      player.play();
    }
  );

  useEffect(() => {
    if (!selectedMedia && draftMedia.length > 0) {
      setSelectedMediaId(draftMedia[0].id);
    }
  }, [draftMedia, selectedMedia]);

  useEffect(() => {
    if (!isRecording) {
      setRecordingElapsed(0);
      return;
    }
    const startedAt = Date.now();
    const interval = setInterval(() => {
      setRecordingElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 250);
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: false
    }).catch(() => undefined);
  }, []);

  const incompleteMilestones = useMemo(
    () =>
      (milestonesQuery.data ?? [])
        .filter((item) => !item.completedMemoryId)
        .slice(0, 6),
    [milestonesQuery.data]
  );

  const recordingLabel = useMemo(
    () => formatSeconds(recordingElapsed),
    [recordingElapsed]
  );

  const composerHeight = Math.min(
    Math.max(screenHeight * 0.52, 360),
    screenHeight - insets.top - 88
  );

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      zoomBase.current = zoom;
    })
    .onUpdate((event) => {
      const scaleDelta = (event.scale - 1) * 0.5;
      const newZoom = Math.max(0, Math.min(1, zoomBase.current + scaleDelta));
      setZoom(Number(newZoom.toFixed(2)));
    });

  const zoomBase = useRef(0);

  const cycleFlashMode = () => {
    setFlashMode((current) =>
      current === "off" ? "on" : current === "on" ? "auto" : "off"
    );
  };

  const cycleTimer = () => {
    setTimerSeconds((current) => {
      const index = TIMER_OPTIONS.indexOf(current);
      return TIMER_OPTIONS[(index + 1) % TIMER_OPTIONS.length];
    });
  };

  const adjustZoom = (delta: number) => {
    setZoom((current) =>
      Math.max(0, Math.min(1, Number((current + delta).toFixed(2))))
    );
  };

  const addDraftMedia = async (
    uri: string,
    mediaType: "image" | "video",
    mimeType?: string,
    options?: { openReview?: boolean }
  ) => {
    const nextItem = {
      id: createDraftId("media"),
      uri,
      type: mediaType,
      mimeType
    } satisfies DraftMediaItem;

    const shouldOpenReview =
      options?.openReview ?? draftMedia.length === 0;

    setDraftMedia((current) => [...current, nextItem]);
    setSelectedMediaId(nextItem.id);
    setSelectedMilestoneId(null);
    if (shouldOpenReview) {
      setShowDraftReview(true);
    }
    await Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success
    ).catch(() => undefined);
  };

  const removeDraftMedia = (mediaId: string) => {
    setDraftMedia((current) => {
      const nextMedia = current.filter((item) => item.id !== mediaId);
      if (nextMedia.length === 0) {
        previewPlayer.pause();
        setSelectedMediaId(null);
        setShowDraftReview(false);
        return [];
      }
      if (selectedMediaId === mediaId) {
        setSelectedMediaId(nextMedia[0].id);
      }
      return nextMedia;
    });
  };

  const clearDraft = () => {
    previewPlayer.pause();
    setDraftMedia([]);
    setSelectedMediaId(null);
    setTitle("");
    setNote("");
    setTagsInput("");
    setSelectedMilestoneId(null);
    setShowDraftReview(false);
    setIsRecording(false);
    setCameraBusy(false);
    setCountdownSeconds(null);
    setRecordingElapsed(0);
    setVoiceNotes([]);
    setIsVoiceNoteRecording(false);
  };

  const startVoiceNoteRecording = async () => {
    if (isVoiceNoteRecording) return;
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Microphone access is required for voice notes."
      );
      return;
    }
    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: true
    }).catch(() => undefined);
    await voiceRecorder.prepareToRecordAsync();
    voiceRecorder.record();
    setIsVoiceNoteRecording(true);
  };

  const stopVoiceNoteRecording = async () => {
    if (!isVoiceNoteRecording) return;
    await voiceRecorder.stop();
    const nextUri = voiceRecorder.uri ?? voiceRecorderState.url;
    if (nextUri) {
      setVoiceNotes((current) => [
        ...current,
        {
          id: createDraftId("voice"),
          uri: nextUri,
          durationMs: voiceRecorderState.durationMillis ?? null
        }
      ]);
    }
    setIsVoiceNoteRecording(false);
    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: false
    }).catch(() => undefined);
  };

  const pickFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Allow photo library access to import media."
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsEditing: false,
      quality: 0.92,
      videoMaxDuration: 90
    });
    if (!result.canceled && result.assets[0]) {
      const selected = result.assets[0];
      await addDraftMedia(
        selected.uri,
        selected.type === "video" ? "video" : "image",
        selected.mimeType,
        { openReview: showDraftReview || draftMedia.length === 0 }
      );
    }
  };

  const runWithTimer = async (action: () => Promise<void>) => {
    if (timerSeconds === 0) {
      await action();
      return;
    }
    setCountdownSeconds(timerSeconds);
    for (let remaining = timerSeconds; remaining > 0; remaining -= 1) {
      setCountdownSeconds(remaining);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
        () => undefined
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    setCountdownSeconds(null);
    await action();
  };

  const takePhoto = async () => {
    if (!cameraRef.current || cameraBusy || !cameraReady) return;
    try {
      setCameraBusy(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
        () => undefined
      );
      setShowShutterFlash(true);
      setTimeout(() => setShowShutterFlash(false), 280);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (photo?.uri) {
        await addDraftMedia(photo.uri, "image", "image/jpeg");
      }
    } catch (error) {
      Alert.alert(
        "Could not take photo",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setCameraBusy(false);
    }
  };

  const startRecording = async () => {
    if (!cameraRef.current || isRecording || cameraBusy || !cameraReady) return;
    try {
      if (!microphonePermission?.granted) {
        const permission = await requestMicrophonePermission();
        if (!permission.granted) {
          Alert.alert(
            "Permission needed",
            "Microphone access is required for video recording."
          );
          return;
        }
      }
      setCameraBusy(true);
      setIsRecording(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(
        () => undefined
      );
      const recording = await cameraRef.current.recordAsync({
        maxDuration: 90
      });
      if (recording?.uri) {
        await addDraftMedia(recording.uri, "video", "video/mp4");
      }
    } catch (error) {
      Alert.alert(
        "Could not record video",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setIsRecording(false);
      setCameraBusy(false);
    }
  };

  const stopRecording = async () => {
    if (!cameraRef.current || !isRecording) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
      () => undefined
    );
    cameraRef.current.stopRecording();
  };

  const handlePrimaryCapture = async () => {
    if (countdownSeconds !== null) return;
    if (mode === "photo") {
      await runWithTimer(takePhoto);
      return;
    }
    if (isRecording) {
      await stopRecording();
      return;
    }
    await runWithTimer(startRecording);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!workspace || !activeChild || draftMedia.length === 0) {
        throw new Error("Capture at least one photo or video first.");
      }

      const coverMedia = draftMedia[0];
      const safeTitle =
        title.trim().length >= 2
          ? title.trim()
          : coverMedia.type === "image"
            ? `${activeChild.firstName} memory`
            : `${activeChild.firstName} video memory`;
      const safeNote =
        note.trim().length >= 2 ? note.trim() : "Captured in EverNest.";
      const tags = tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 8);

      const memoryId = await createMemory({
        familyId: workspace.family.id,
        childId: activeChild.id,
        title: safeTitle,
        note: safeNote,
        media: draftMedia.map((item) => ({
          uri: item.uri,
          type: item.type,
          mimeType: item.mimeType
        })),
        voiceNotes: voiceNotes.map((voiceNote) => ({
          uri: voiceNote.uri,
          durationMs: voiceNote.durationMs
        })),
        tags,
        capturedAt: new Date().toISOString()
      });

      if (selectedMilestoneId) {
        await completeMilestone(selectedMilestoneId, memoryId);
      }
    },
    onSuccess: async () => {
      if (!workspace || !activeChild) return;
      await queryClient.invalidateQueries({
        queryKey: queryKeys.memories(workspace.family.id, activeChild.id)
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.onThisDay(workspace.family.id, activeChild.id)
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.milestones(activeChild.id)
      });
      await queryClient.invalidateQueries({
        queryKey: ["memory"]
      });
      clearDraft();
      Alert.alert("Saved ✨", "Memory added to your EverNest timeline.");
    },
    onError: (error) => {
      Alert.alert(
        "Could not save",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  });

  if (workspaceLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: T.night2,
          alignItems: "center",
          justifyContent: "center",
          paddingTop: insets.top
        }}
      >
        <Text
          style={{
            fontFamily: "DMSans_400Regular",
            color: T.moonDim
          }}
        >
          Loading workspace...
        </Text>
      </View>
    );
  }

  if (!workspace || !activeChild) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: T.night2,
          paddingTop: insets.top + 20,
          paddingHorizontal: 20
        }}
      >
        <Text
          style={{
            fontFamily: "InstrumentSerif_400Regular",
            fontSize: 30,
            color: T.cream
          }}
        >
          Workspace unavailable
        </Text>
        <Text
          style={{
            fontFamily: "DMSans_400Regular",
            fontSize: 13,
            color: T.moonDim,
            marginTop: 8
          }}
        >
          {workspaceError instanceof Error
            ? workspaceError.message
            : "Could not load your family workspace."}
        </Text>
        <Pressable
          onPress={() => {
            void refetchWorkspace();
          }}
          style={{
            marginTop: 16,
            borderWidth: 1,
            borderColor: T.night4,
            paddingHorizontal: 16,
            paddingVertical: 12
          }}
        >
          <Text
            style={{
              fontFamily: "DMSans_400Regular",
              textAlign: "center",
              fontSize: 13,
              color: T.moon
            }}
          >
            Retry workspace sync
          </Text>
        </Pressable>
      </View>
    );
  }

  if (!cameraPermission?.granted) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: T.night2,
          paddingTop: insets.top + 20,
          paddingHorizontal: 20,
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <MaterialCommunityIcons
          name="camera-off-outline"
          size={56}
          color={T.moonDim}
        />
        <Text
          style={{
            fontFamily: "InstrumentSerif_400Regular",
            fontSize: 28,
            color: T.cream,
            marginTop: 16,
            textAlign: "center"
          }}
        >
          Camera access
        </Text>
        <Text
          style={{
            fontFamily: "DMSans_400Regular",
            fontSize: 13,
            color: T.moonDim,
            marginTop: 8,
            textAlign: "center"
          }}
        >
          Camera access is required to take photos and videos.
        </Text>
        <Pressable
          onPress={() => void requestCameraPermission()}
          style={{
            marginTop: 24,
            backgroundColor: T.terracotta,
            paddingHorizontal: 32,
            paddingVertical: 14,
            borderRadius: 16
          }}
        >
          <Text
            style={{
              fontFamily: "DMSans_500Medium",
              textAlign: "center",
              fontSize: 14,
              color: T.cream
            }}
          >
            Grant camera access
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: T.night }}>
      <View style={{ flex: 1 }}>
        {showDraftReview && selectedMedia ? (
          <>
            {selectedMedia.type === "image" ? (
              <Image
                source={{ uri: selectedMedia.uri }}
                resizeMode="cover"
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <VideoView
                player={previewPlayer}
                nativeControls
                contentFit="cover"
                style={{ width: "100%", height: "100%" }}
              />
            )}

            <LinearGradient
              colors={[
                "rgba(0,0,0,0.54)",
                "rgba(0,0,0,0.10)",
                "rgba(0,0,0,0.94)"
              ]}
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            />

            <View
              style={{
                position: "absolute",
                top: insets.top + 12,
                left: 16,
                right: 16,
                flexDirection: "row",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: "InstrumentSerif_400Regular",
                    fontSize: 28,
                    color: T.cream
                  }}
                >
                  Finish memory
                </Text>
                <Text
                  style={{
                    fontFamily: "DMSans_400Regular",
                    fontSize: 11,
                    color: T.moonDim,
                    marginTop: 2
                  }}
                >
                  {draftMedia.length} media item{draftMedia.length === 1 ? "" : "s"} ready
                </Text>
              </View>

              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable
                  onPress={() => {
                    setMode("photo");
                    setShowDraftReview(false);
                  }}
                  style={{
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.12)",
                    backgroundColor: "rgba(0,0,0,0.42)",
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 10
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "DMSans_500Medium",
                      fontSize: 11,
                      color: T.cream
                    }}
                  >
                    Add more
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => removeDraftMedia(selectedMedia.id)}
                  style={{
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.12)",
                    backgroundColor: "rgba(0,0,0,0.42)",
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 10
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "DMSans_500Medium",
                      fontSize: 11,
                      color: T.blush
                    }}
                  >
                    Remove
                  </Text>
                </Pressable>
              </View>
            </View>
          </>
        ) : (
          <>
            <GestureDetector gesture={pinchGesture}>
              <View style={{ flex: 1 }}>
                <CameraView
                  ref={cameraRef}
                  style={{ flex: 1 }}
                  facing={facing}
                  mode={mode === "photo" ? "picture" : "video"}
                  flash={mode === "photo" ? flashMode : "off"}
                  enableTorch={torchEnabled}
                  zoom={zoom}
                  mirror={facing === "front"}
                  onCameraReady={() => {
                    setCameraReady(true);
                    setCameraError(null);
                  }}
                  onMountError={(event) => {
                    setCameraReady(false);
                    setCameraError(event.message);
                  }}
                />
              </View>
            </GestureDetector>

            <LinearGradient
              colors={[
                "rgba(0,0,0,0.62)",
                "rgba(0,0,0,0)",
                "rgba(0,0,0,0.88)"
              ]}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                justifyContent: "space-between"
              }}
              pointerEvents="box-none"
            >
              <View
                style={{ paddingHorizontal: 16, paddingTop: insets.top + 8 }}
                pointerEvents="box-none"
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 12
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: "InstrumentSerif_400Regular",
                        fontSize: 28,
                        color: T.cream
                      }}
                    >
                      Capture
                    </Text>
                    <Text
                      style={{
                        fontFamily: "DMSans_400Regular",
                        fontSize: 11,
                        color: T.moonDim,
                        marginTop: 2
                      }}
                    >
                      Shoot photos or videos worth remembering.
                    </Text>
                  </View>

                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <ControlPill
                      icon={
                        flashMode === "off"
                          ? "flash-off"
                          : flashMode === "on"
                            ? "flash"
                            : "auto-fix"
                      }
                      label={
                        flashMode === "off"
                          ? "Off"
                          : flashMode === "on"
                            ? "On"
                            : "Auto"
                      }
                      active={flashMode !== "off"}
                      palette={T}
                      onPress={cycleFlashMode}
                    />
                    <ControlPill
                      icon={torchEnabled ? "flashlight" : "flashlight-off"}
                      label={torchEnabled ? "On" : "Off"}
                      active={torchEnabled}
                      palette={T}
                      onPress={() =>
                        setTorchEnabled((current) => !current)
                      }
                    />
                  </View>
                </View>

                <ChildSwitcher
                  childProfiles={workspace.children}
                  activeChildId={activeChild.id}
                  onSelect={setActiveChildId}
                  colors={darkPalette}
                />

                <View
                  style={{
                    marginTop: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}
                >
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.10)",
                      backgroundColor: "rgba(0,0,0,0.35)",
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 10,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6
                    }}
                  >
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: cameraReady ? T.sage : T.terracotta
                      }}
                    />
                    <Text
                      style={{
                        fontFamily: "DMSans_400Regular",
                        fontSize: 11,
                        color: T.moon
                      }}
                    >
                      {cameraError ??
                        (cameraReady ? "Live" : "Starting camera...")}
                    </Text>
                  </View>

                  <View style={{ flexDirection: "row", gap: 6 }}>
                    {(["photo", "video"] as const).map((value) => (
                      <Pressable
                        key={value}
                        onPress={() => {
                          if (isRecording) return;
                          setMode(value);
                        }}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          borderRadius: 10,
                          backgroundColor:
                            mode === value
                              ? T.terracotta
                              : "rgba(0,0,0,0.35)",
                          borderWidth: mode === value ? 0 : 1,
                          borderColor: "rgba(255,255,255,0.10)"
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "DMSans_400Regular",
                            fontSize: 11,
                            color: T.cream,
                            textTransform: "uppercase",
                            letterSpacing: 1
                          }}
                        >
                          {value}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>

              <View
                style={{
                  paddingHorizontal: 16,
                  paddingBottom: 24
                }}
                pointerEvents="box-none"
              >
                {draftMedia.length > 0 ? (
                  <Pressable
                    onPress={() => setShowDraftReview(true)}
                    style={{
                      marginBottom: 16,
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.12)",
                      backgroundColor: "rgba(0,0,0,0.42)",
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      borderRadius: 14,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                      <MaterialCommunityIcons
                        name="image-multiple-outline"
                        size={18}
                        color={T.cream}
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontFamily: "DMSans_500Medium",
                            fontSize: 12,
                            color: T.cream
                          }}
                        >
                          Draft ready
                        </Text>
                        <Text
                          style={{
                            marginTop: 2,
                            fontFamily: "DMSans_400Regular",
                            fontSize: 10,
                            color: T.moonDim
                          }}
                        >
                          {draftMedia.length} media item{draftMedia.length === 1 ? "" : "s"} · {voiceNotes.length} voice note{voiceNotes.length === 1 ? "" : "s"}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={{
                        fontFamily: "DMSans_500Medium",
                        fontSize: 11,
                        color: T.sage
                      }}
                    >
                      Review
                    </Text>
                  </Pressable>
                ) : null}

                <View
                  style={{
                    marginBottom: 20,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 8,
                      alignItems: "center"
                    }}
                  >
                    <ControlPill
                      icon="minus"
                      label="Zoom"
                      palette={T}
                      onPress={() => adjustZoom(-0.1)}
                    />
                    <View
                      style={{
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.10)",
                        backgroundColor: "rgba(0,0,0,0.35)",
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 10
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "DMSans_400Regular",
                          fontSize: 11,
                          color: T.moon
                        }}
                      >
                        {Math.max(1, 1 + zoom * 4).toFixed(1)}x
                      </Text>
                    </View>
                    <ControlPill
                      icon="plus"
                      label="Zoom"
                      palette={T}
                      onPress={() => adjustZoom(0.1)}
                    />
                  </View>

                  <ControlPill
                    icon="timer-outline"
                    label={
                      timerSeconds === 0 ? "Off" : `${timerSeconds}s`
                    }
                    active={timerSeconds !== 0}
                    palette={T}
                    onPress={cycleTimer}
                  />
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}
                >
                  <Pressable
                    onPress={pickFromLibrary}
                    style={{
                      height: 56,
                      width: 56,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.12)",
                      backgroundColor: "rgba(0,0,0,0.40)",
                      borderRadius: 16
                    }}
                  >
                    <MaterialCommunityIcons
                      name="image-multiple-outline"
                      size={22}
                      color={T.moon}
                    />
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      void handlePrimaryCapture();
                    }}
                    disabled={cameraBusy || !cameraReady}
                    style={{
                      height: 80,
                      width: 80,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 4,
                      borderColor: "rgba(255,255,255,0.20)",
                      backgroundColor:
                        mode === "video" ? "#C03A2C" : "#FFFFFF",
                      borderRadius: 999
                    }}
                  >
                    <View
                      style={{
                        width: isRecording ? 26 : 56,
                        height: isRecording ? 26 : 56,
                        borderRadius: isRecording ? 8 : 999,
                        backgroundColor: mode === "video" ? "#FFFFFF" : T.night
                      }}
                    />
                  </Pressable>

                  <Pressable
                    onPress={() =>
                      setFacing((current) =>
                        current === "back" ? "front" : "back"
                      )
                    }
                    style={{
                      height: 56,
                      width: 56,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.12)",
                      backgroundColor: "rgba(0,0,0,0.40)",
                      borderRadius: 16
                    }}
                  >
                    <MaterialCommunityIcons
                      name="camera-flip-outline"
                      size={22}
                      color={T.moon}
                    />
                  </Pressable>
                </View>

                <View
                  style={{
                    marginTop: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10
                  }}
                >
                  {isRecording ? (
                    <>
                      <MotiView
                        from={{ opacity: 0.3 }}
                        animate={{ opacity: 1 }}
                        transition={{
                          type: "timing",
                          duration: 600,
                          loop: true
                        }}
                        style={{
                          height: 10,
                          width: 10,
                          borderRadius: 5,
                          backgroundColor: "#E85A4F"
                        }}
                      />
                      <Text
                        style={{
                          fontFamily: "DMSans_400Regular",
                          fontSize: 14,
                          color: T.cream
                        }}
                      >
                        Recording {recordingLabel}
                      </Text>
                    </>
                  ) : (
                    <Text
                      style={{
                        fontFamily: "DMSans_400Regular",
                        fontSize: 13,
                        color: T.moon
                      }}
                    >
                      {mode === "photo"
                        ? "Tap shutter · Pinch to zoom"
                        : "Tap once to record, again to stop"}
                    </Text>
                  )}
                </View>
              </View>
            </LinearGradient>
          </>
        )}

        {countdownSeconds !== null ? (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(0,0,0,0.30)"
            }}
          >
            <MotiView
              key={countdownSeconds}
              from={{ scale: 0.5, opacity: 0.4 }}
              animate={{ scale: 1.1, opacity: 1 }}
              transition={{ type: "timing", duration: 400 }}
              style={{
                height: 140,
                width: 140,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 70,
                backgroundColor: "rgba(0,0,0,0.60)",
                borderWidth: 3,
                borderColor: "rgba(196,98,58,0.50)"
              }}
            >
              <Text
                style={{
                  fontFamily: "InstrumentSerif_400Regular",
                  fontSize: 72,
                  color: T.cream
                }}
              >
                {countdownSeconds}
              </Text>
            </MotiView>
          </View>
        ) : null}

        {showShutterFlash ? (
          <MotiView
            from={{ opacity: 0.9 }}
            animate={{ opacity: 0 }}
            transition={{ type: "timing", duration: 250 }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "#FFFFFF"
            }}
          />
        ) : null}

        {saveMutation.isPending ? (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(0,0,0,0.55)"
            }}
          >
            <MotiView
              from={{ rotate: "0deg" }}
              animate={{ rotate: "360deg" }}
              transition={{
                type: "timing",
                duration: 1200,
                loop: true
              }}
              style={{ marginBottom: 16 }}
            >
              <MaterialCommunityIcons
                name="cloud-upload-outline"
                size={42}
                color={T.cream}
              />
            </MotiView>
            <MotiView
              from={{ opacity: 0.5 }}
              animate={{ opacity: 1 }}
              transition={{ type: "timing", duration: 800, loop: true }}
            >
              <Text
                style={{
                  fontFamily: "DMSans_500Medium",
                  fontSize: 15,
                  color: T.cream
                }}
              >
                Saving your memory…
              </Text>
            </MotiView>
            <Text
              style={{
                fontFamily: "DMSans_400Regular",
                fontSize: 11,
                color: T.moonDim,
                marginTop: 6
              }}
            >
              Uploading media to your family archive
            </Text>
          </View>
        ) : null}
      </View>

      {showDraftReview && draftMedia.length > 0 ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}
          keyboardVerticalOffset={Platform.OS === "ios" ? 18 : 0}
        >
          <View
            style={{
              height: composerHeight,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              borderWidth: 1,
              borderColor: S.border,
              backgroundColor: S.surface,
              overflow: "hidden"
            }}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentInsetAdjustmentBehavior="automatic"
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingTop: 16,
                paddingBottom: insets.bottom + 20
              }}
              showsVerticalScrollIndicator={false}
            >
              <View
                style={{
                  height: 5,
                  width: 48,
                  backgroundColor: S.border,
                  alignSelf: "center",
                  marginBottom: 12
                }}
              />

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: "InstrumentSerif_400Regular",
                      fontSize: 26,
                      color: S.text
                    }}
                  >
                    Finish memory
                  </Text>
                  <Text
                    style={{
                      fontFamily: "DMSans_400Regular",
                      fontSize: 11,
                      color: S.textMuted,
                      marginTop: 4
                    }}
                  >
                    Add the context your future self will want.
                  </Text>
                </View>
                <Pressable
                  onPress={clearDraft}
                  style={{
                    borderWidth: 1,
                    borderColor: S.border,
                    paddingHorizontal: 12,
                    paddingVertical: 11
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "DMSans_400Regular",
                      fontSize: 11,
                      color: S.text
                    }}
                  >
                    Clear all
                  </Text>
                </Pressable>
              </View>

              <View
                style={{
                  marginTop: 16,
                  flexDirection: "row",
                  gap: 8
                }}
              >
                <Pressable
                  onPress={() => {
                    setMode("photo");
                    setShowDraftReview(false);
                  }}
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: S.border,
                    backgroundColor: S.surfaceSecondary,
                    paddingVertical: 11
                  }}
                >
                  <Text
                    style={{
                      textAlign: "center",
                      fontFamily: "DMSans_400Regular",
                      fontSize: 12,
                      color: S.text
                    }}
                  >
                    Take photo
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setMode("video");
                    setShowDraftReview(false);
                  }}
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: S.border,
                    backgroundColor: S.surfaceSecondary,
                    paddingVertical: 11
                  }}
                >
                  <Text
                    style={{
                      textAlign: "center",
                      fontFamily: "DMSans_400Regular",
                      fontSize: 12,
                      color: S.text
                    }}
                  >
                    Record video
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    void pickFromLibrary();
                  }}
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: S.border,
                    backgroundColor: S.surfaceSecondary,
                    paddingVertical: 11
                  }}
                >
                  <Text
                    style={{
                      textAlign: "center",
                      fontFamily: "DMSans_400Regular",
                      fontSize: 12,
                      color: S.text
                    }}
                  >
                    Library
                  </Text>
                </Pressable>
              </View>

              <Text
                style={{
                  fontFamily: "DMSans_400Regular",
                  fontSize: 10,
                  color: S.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: 1.2,
                  marginTop: 16,
                  marginBottom: 8
                }}
              >
                Media
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10, paddingRight: 8 }}
              >
                {draftMedia.map((item, index) => {
                  const active = item.id === selectedMedia?.id;

                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => setSelectedMediaId(item.id)}
                      style={{
                        width: 92,
                        gap: 6
                      }}
                    >
                      <View
                        style={{
                          height: 110,
                          overflow: "hidden",
                          borderWidth: 2,
                          borderColor: active ? S.brand : S.border,
                          backgroundColor: S.surfaceSecondary
                        }}
                      >
                        {item.type === "image" ? (
                          <Image
                            source={{ uri: item.uri }}
                            resizeMode="cover"
                            style={{ width: "100%", height: "100%" }}
                          />
                        ) : (
                          <View
                            style={{
                              flex: 1,
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: S.surfaceSecondary
                            }}
                          >
                            <MaterialCommunityIcons
                              name="video-outline"
                              size={24}
                              color={S.text}
                            />
                          </View>
                        )}
                        <Pressable
                          onPress={() => removeDraftMedia(item.id)}
                          style={{
                            position: "absolute",
                            top: 6,
                            right: 6,
                            width: 24,
                            height: 24,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "rgba(0,0,0,0.62)"
                          }}
                        >
                          <MaterialCommunityIcons
                            name="close"
                            size={14}
                            color="#FFFFFF"
                          />
                        </Pressable>
                      </View>
                      <Text
                        style={{
                          fontFamily: "DMSans_400Regular",
                          fontSize: 11,
                          color: active ? S.brand : S.textMuted
                        }}
                      >
                        {item.type === "image" ? "Photo" : "Video"} {index + 1}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Text
                style={{
                  fontFamily: "DMSans_400Regular",
                  fontSize: 10,
                  color: S.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: 1.2,
                  marginTop: 16,
                  marginBottom: 4
                }}
              >
                Title
              </Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Title this memory"
                placeholderTextColor={S.textMuted}
                style={{
                  borderWidth: 1,
                  borderColor: S.border,
                  backgroundColor: S.surfaceSecondary,
                  paddingHorizontal: 16,
                  paddingVertical: 11,
                  fontFamily: "DMSans_400Regular",
                  fontSize: 14,
                  color: S.text
                }}
              />

              <Text
                style={{
                  fontFamily: "DMSans_400Regular",
                  fontSize: 10,
                  color: S.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: 1.2,
                  marginTop: 12,
                  marginBottom: 4
                }}
              >
                Add note
              </Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="What happened? Why does this moment matter?"
                placeholderTextColor={S.textMuted}
                multiline
                textAlignVertical="top"
                style={{
                  minHeight: 80,
                  borderWidth: 1,
                  borderColor: S.border,
                  backgroundColor: S.surfaceSecondary,
                  paddingHorizontal: 16,
                  paddingVertical: 11,
                  fontFamily: "DMSans_400Regular",
                  fontSize: 14,
                  color: S.text
                }}
              />

              <Text
                style={{
                  fontFamily: "DMSans_400Regular",
                  fontSize: 10,
                  color: S.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: 1.2,
                  marginTop: 12,
                  marginBottom: 4
                }}
              >
                Tags
              </Text>
              <TextInput
                value={tagsInput}
                onChangeText={setTagsInput}
                placeholder="park, spring, first laugh"
                placeholderTextColor={S.textMuted}
                style={{
                  borderWidth: 1,
                  borderColor: S.border,
                  backgroundColor: S.surfaceSecondary,
                  paddingHorizontal: 16,
                  paddingVertical: 11,
                  fontFamily: "DMSans_400Regular",
                  fontSize: 14,
                  color: S.text
                }}
              />

              <Text
                style={{
                  fontFamily: "DMSans_400Regular",
                  fontSize: 10,
                  color: S.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: 1.2,
                  marginTop: 12,
                  marginBottom: 6
                }}
              >
                Voice notes
              </Text>
              <View
                style={{
                  borderWidth: 1,
                  borderColor: S.border,
                  backgroundColor: S.surfaceSecondary,
                  padding: 12,
                  gap: 12
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                    <View
                      style={{
                        width: 42,
                        height: 42,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: isVoiceNoteRecording
                          ? S.dangerBackground
                          : S.brandBackground
                      }}
                    >
                      <MaterialCommunityIcons
                        name={isVoiceNoteRecording ? "microphone" : "microphone-outline"}
                        size={20}
                        color={isVoiceNoteRecording ? S.danger : S.brand}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontFamily: "DMSans_500Medium",
                          fontSize: 13,
                          color: S.text
                        }}
                      >
                        {isVoiceNoteRecording
                          ? "Recording voice note..."
                          : voiceNotes.length > 0
                            ? `${voiceNotes.length} voice note${voiceNotes.length === 1 ? "" : "s"} added`
                            : "Add voice notes"}
                      </Text>
                      <Text
                        style={{
                          fontFamily: "DMSans_400Regular",
                          fontSize: 11,
                          color: S.textMuted,
                          marginTop: 2
                        }}
                      >
                        {isVoiceNoteRecording
                          ? formatDurationMs(voiceRecorderState.durationMillis ?? null)
                          : "Record quick spoken context and keep as many as you need."}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => {
                      void (isVoiceNoteRecording
                        ? stopVoiceNoteRecording()
                        : startVoiceNoteRecording());
                    }}
                    style={{
                      backgroundColor: isVoiceNoteRecording
                        ? S.danger
                        : S.brand,
                      paddingHorizontal: 12,
                      paddingVertical: 10
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "DMSans_500Medium",
                        fontSize: 11,
                        color: "#FFFFFF"
                      }}
                    >
                      {isVoiceNoteRecording ? "Stop" : "Record"}
                    </Text>
                  </Pressable>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <RecordingWave
                    active={isVoiceNoteRecording}
                    accent={isVoiceNoteRecording ? S.danger : S.brand}
                  />
                  <Text
                    style={{
                      fontFamily: "DMSans_400Regular",
                      fontSize: 11,
                      color: S.textMuted
                    }}
                  >
                    {isVoiceNoteRecording
                      ? "Live waveform while recording"
                      : "Tap record to capture a spoken moment"}
                  </Text>
                </View>

                {voiceNotes.length > 0 ? (
                  <View style={{ gap: 10 }}>
                    {voiceNotes.map((voiceNote) => (
                      <VoiceNoteRow
                        key={voiceNote.id}
                        note={voiceNote}
                        colors={S}
                        onRemove={() =>
                          setVoiceNotes((current) =>
                            current.filter((item) => item.id !== voiceNote.id)
                          )
                        }
                      />
                    ))}
                  </View>
                ) : null}
              </View>

              {incompleteMilestones.length > 0 ? (
                <View style={{ marginTop: 12, gap: 8 }}>
                  <Text
                    style={{
                      fontFamily: "DMSans_400Regular",
                      fontSize: 10,
                      color: S.textMuted,
                      textTransform: "uppercase",
                      letterSpacing: 1.2
                    }}
                  >
                    Link milestone
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 8
                    }}
                  >
                    {incompleteMilestones.map((milestone) => {
                      const active = selectedMilestoneId === milestone.id;
                      return (
                        <Pressable
                          key={milestone.id}
                          onPress={() =>
                            setSelectedMilestoneId(
                              active ? null : milestone.id
                            )
                          }
                          style={{
                            borderWidth: 1,
                            borderColor: active
                              ? "rgba(196,98,58,0.45)"
                              : S.border,
                            backgroundColor: active
                              ? "rgba(196,98,58,0.20)"
                              : S.surfaceSecondary,
                            paddingHorizontal: 12,
                            paddingVertical: 8
                          }}
                        >
                          <Text
                            style={{
                              fontFamily: "DMSans_400Regular",
                              fontSize: 11,
                              color: active ? S.brandSecondary : S.text
                            }}
                          >
                            {milestone.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              <View
                style={{
                  marginTop: 16,
                  flexDirection: "row",
                  gap: 12
                }}
              >
                <Pressable
                  onPress={clearDraft}
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: S.border,
                    paddingHorizontal: 16,
                    paddingVertical: 11
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "DMSans_400Regular",
                      textAlign: "center",
                      fontSize: 14,
                      color: S.text
                    }}
                  >
                    Discard
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  style={{
                    flex: 1,
                    backgroundColor: S.brand,
                    paddingHorizontal: 16,
                    paddingVertical: 11
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "DMSans_500Medium",
                      textAlign: "center",
                      fontSize: 14,
                      color: "#FFFFFF"
                    }}
                  >
                    {saveMutation.isPending ? "Saving..." : "Save memory"}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      ) : null}
    </View>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View
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
import {
  GestureDetector,
  Gesture
} from "react-native-gesture-handler";
import { ChildSwitcher } from "@/components/child-switcher";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useWorkspace } from "@/hooks/use-workspace";
import { completeMilestone, createMemory } from "@/lib/repositories";
import { queryKeys } from "@/lib/query-keys";
import { darkPalette } from "@/lib/theme";
import { listMilestones } from "@/lib/workspace";

const TIMER_OPTIONS = [0, 3, 10] as const;
const { width: SCREEN_WIDTH } = Dimensions.get("window");

type CaptureMode = "photo" | "video";

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

export default function CaptureScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { colors } = useAppTheme();
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
  const [assetUri, setAssetUri] = useState<string | null>(null);
  const [assetType, setAssetType] = useState<"image" | "video">("image");
  const [assetMimeType, setAssetMimeType] = useState<string | undefined>(
    undefined
  );
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(
    null
  );
  const [isRecording, setIsRecording] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const [recordingElapsed, setRecordingElapsed] = useState(0);
  const [showShutterFlash, setShowShutterFlash] = useState(false);
  const [voiceNoteUri, setVoiceNoteUri] = useState<string | null>(null);
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
  const voicePreviewPlayer = useAudioPlayer(voiceNoteUri ?? null);

  // Pinch-to-zoom ref for tracking base zoom level
  const zoomBase = useRef(0);

  const milestonesQuery = useQuery({
    queryKey: activeChild
      ? queryKeys.milestones(activeChild.id)
      : ["milestones", "guest"],
    enabled: Boolean(activeChild),
    queryFn: async () => listMilestones(activeChild!.id)
  });

  const previewPlayer = useVideoPlayer(
    assetType === "video" && assetUri ? assetUri : null,
    (player) => {
      player.loop = true;
      player.play();
    }
  );

  // Recording elapsed timer
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

  const recordingLabel = useMemo(() => {
    const mins = Math.floor(recordingElapsed / 60)
      .toString()
      .padStart(2, "0");
    const secs = Math.floor(recordingElapsed % 60)
      .toString()
      .padStart(2, "0");
    return `${mins}:${secs}`;
  }, [recordingElapsed]);

  // Pinch gesture for zoom
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      zoomBase.current = zoom;
    })
    .onUpdate((event) => {
      const scaleDelta = (event.scale - 1) * 0.5;
      const newZoom = Math.max(
        0,
        Math.min(1, zoomBase.current + scaleDelta)
      );
      setZoom(Number(newZoom.toFixed(2)));
    });

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

  const assignAsset = async (
    uri: string,
    mediaType: "image" | "video",
    mimeType?: string
  ) => {
    setAssetUri(uri);
    setAssetType(mediaType);
    setAssetMimeType(mimeType);
    setSelectedMilestoneId(null);
    await Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success
    ).catch(() => undefined);
  };

  const clearDraft = () => {
    voicePreviewPlayer.pause();
    setAssetUri(null);
    setAssetMimeType(undefined);
    setTitle("");
    setNote("");
    setTagsInput("");
    setSelectedMilestoneId(null);
    setIsRecording(false);
    setCameraBusy(false);
    setCountdownSeconds(null);
    setRecordingElapsed(0);
    setVoiceNoteUri(null);
    setIsVoiceNoteRecording(false);
  };

  const startVoiceNoteRecording = async () => {
    if (isVoiceNoteRecording) return;
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Microphone access is required for voice notes.");
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
      setVoiceNoteUri(nextUri);
    }
    setIsVoiceNoteRecording(false);
    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: false
    }).catch(() => undefined);
  };

  const toggleVoicePreview = () => {
    if (!voiceNoteUri) return;
    if (voicePreviewPlayer.playing) {
      voicePreviewPlayer.pause();
      return;
    }
    voicePreviewPlayer.play();
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
      mediaTypes: mode === "photo" ? ["images"] : ["videos"],
      allowsEditing: false,
      quality: 0.92,
      videoMaxDuration: 90
    });
    if (!result.canceled && result.assets[0]) {
      const selected = result.assets[0];
      await assignAsset(
        selected.uri,
        selected.type === "video" ? "video" : "image",
        selected.mimeType
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

      // Trigger shutter flash
      setShowShutterFlash(true);
      setTimeout(() => setShowShutterFlash(false), 280);

      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (photo?.uri) {
        await assignAsset(photo.uri, "image", "image/jpeg");
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
        await assignAsset(recording.uri, "video", "video/mp4");
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
      if (!workspace || !activeChild || !assetUri)
        throw new Error("Capture a photo or video first.");

      const safeTitle =
        title.trim().length >= 2
          ? title.trim()
          : assetType === "image"
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
        mediaType: assetType,
        mediaUri: assetUri,
        mediaMimeType: assetMimeType,
        voiceNoteUri: voiceNoteUri ?? undefined,
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

  // ---- Loading / error states ----

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

  // ---- Main camera UI ----
  return (
    <View style={{ flex: 1, backgroundColor: T.night }}>
      {/* Camera / Preview layer — fills the entire screen */}
      <View style={{ flex: 1 }}>
        {assetUri ? (
          <>
            {assetType === "image" ? (
              <Image
                source={{ uri: assetUri }}
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
                "rgba(0,0,0,0.52)",
                "rgba(0,0,0,0.05)",
                "rgba(0,0,0,0.88)"
              ]}
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            />

            {/* Top header on preview */}
            <View
              style={{
                position: "absolute",
                top: insets.top + 8,
                left: 16,
                right: 16,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <View>
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
                  Review the moment, then add the story behind it.
                </Text>
              </View>
            </View>

            {/* Retake / Use Photo bar */}
            <View
              style={{
                position: "absolute",
                top: insets.top + 80,
                left: 16,
                right: 16,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <MotiView
                from={{ opacity: 0, translateX: -16 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{ type: "timing", duration: 280 }}
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
                  <MaterialCommunityIcons
                    name={assetType === "image" ? "image-check-outline" : "video-check-outline"}
                    size={14}
                    color={T.sage}
                  />
                  <Text
                    style={{
                      fontFamily: "DMSans_400Regular",
                      fontSize: 11,
                      color: T.moon
                    }}
                  >
                    {assetType === "image" ? "Photo ready" : "Video ready"}
                  </Text>
                </View>
              </MotiView>

              <MotiView
                from={{ opacity: 0, translateX: 16 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{ type: "timing", duration: 280 }}
                style={{ flexDirection: "row", gap: 8 }}
              >
                <Pressable
                  onPress={clearDraft}
                  style={{
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.12)",
                    backgroundColor: "rgba(0,0,0,0.40)",
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 10,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6
                  }}
                >
                  <MaterialCommunityIcons
                    name="camera-retake-outline"
                    size={14}
                    color={T.blush}
                  />
                  <Text
                    style={{
                      fontFamily: "DMSans_500Medium",
                      fontSize: 11,
                      color: T.blush
                    }}
                  >
                    Retake
                  </Text>
                </Pressable>
              </MotiView>
            </View>
          </>
        ) : (
          <>
            {/* Camera with pinch-to-zoom */}
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
              {/* Top controls */}
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

                {/* Camera status + mode switcher */}
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

              {/* Bottom controls */}
              <View
                style={{
                  paddingHorizontal: 16,
                  paddingBottom: 24
                }}
                pointerEvents="box-none"
              >
                {/* Zoom + Timer row */}
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

                {/* Shutter + Library + Flip row */}
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

                  {/* Shutter button */}
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

                {/* Recording / hint row */}
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

        {/* Countdown overlay */}
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

        {/* Shutter flash overlay */}
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

        {/* Upload progress overlay */}
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

      {/* Bottom form sheet when asset captured */}
      {assetUri ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}
          keyboardVerticalOffset={Platform.OS === "ios" ? 18 : 0}
        >
          <View
            style={{
              maxHeight: "48%",
              borderWidth: 1,
              borderColor: S.border,
              backgroundColor: S.surface,
              paddingHorizontal: 16,
              paddingTop: 16
            }}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentInsetAdjustmentBehavior="automatic"
              contentContainerStyle={{ paddingBottom: 20 }}
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
                  justifyContent: "space-between"
                }}
              >
                <View>
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
                    Remove
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
                Voice note
              </Text>
              <View
                style={{
                  borderWidth: 1,
                  borderColor: S.border,
                  backgroundColor: S.surfaceSecondary,
                  padding: 12,
                  gap: 10
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
                        width: 36,
                        height: 36,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: isVoiceNoteRecording
                          ? S.dangerBackground
                          : S.brandBackground
                      }}
                    >
                      <MaterialCommunityIcons
                        name={isVoiceNoteRecording ? "microphone" : "microphone-outline"}
                        size={18}
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
                          : voiceNoteUri
                            ? "Voice note attached"
                            : "Add a voice note"}
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
                          ? `${Math.max(1, Math.round(voiceRecorderState.durationMillis / 1000))}s`
                          : voiceNoteUri
                            ? "Play it back or replace it before saving."
                            : "Capture a quick spoken memory with this moment."}
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
                      {isVoiceNoteRecording
                        ? "Stop"
                        : voiceNoteUri
                          ? "Replace"
                          : "Record"}
                    </Text>
                  </Pressable>
                </View>

                {voiceNoteUri ? (
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Pressable
                      onPress={toggleVoicePreview}
                      style={{
                        flex: 1,
                        borderWidth: 1,
                        borderColor: S.border,
                        paddingVertical: 11,
                        backgroundColor: S.surface
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
                        {voicePreviewPlayer.playing
                          ? "Pause playback"
                          : "Play voice note"}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        voicePreviewPlayer.pause();
                        setVoiceNoteUri(null);
                      }}
                      style={{
                        borderWidth: 1,
                        borderColor: S.border,
                        paddingHorizontal: 14,
                        justifyContent: "center",
                        backgroundColor: S.surface
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "DMSans_400Regular",
                          fontSize: 12,
                          color: S.text
                        }}
                      >
                        Remove
                      </Text>
                    </Pressable>
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

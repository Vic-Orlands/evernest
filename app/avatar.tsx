import { useEffect, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText
} from "react-native-svg";
import { BG_PRESETS, DEFAULT_AVATAR_CONFIG, HAIR_COLORS, HAIR_STYLES, SKIN_TONES, normalizeAvatarConfig } from "@/lib/avatar";
import { useProfile } from "@/hooks/use-profile";
import { saveProfileAppearance } from "@/lib/profile";
import { queryKeys } from "@/lib/query-keys";
import { AvatarConfig } from "@/lib/types";

function AvatarSVG({
  skin,
  hair,
  hairStyle,
  bg,
  size = 200,
  showRing = true,
  label = ""
}: {
  skin: (typeof SKIN_TONES)[number];
  hair: string;
  hairStyle: (typeof HAIR_STYLES)[number]["id"];
  bg: (typeof BG_PRESETS)[number];
  size?: number;
  showRing?: boolean;
  label?: string;
}) {
  const s = skin;
  const h = hair;
  const bgA = bg.a;
  const bgB = bg.b;
  const uid = `${skin.id}-${hairStyle}-${bg.id}-${size}`;

  const hairPaths = {
    short: (
      <G>
        <Ellipse cx="100" cy="80" rx="38" ry="36" fill={h} />
        <Rect x="62" y="80" width="76" height="16" fill={h} rx="4" />
        <Ellipse cx="68" cy="88" rx="10" ry="14" fill={h} />
        <Ellipse cx="132" cy="88" rx="10" ry="14" fill={h} />
      </G>
    ),
    medium: (
      <G>
        <Ellipse cx="100" cy="78" rx="40" ry="38" fill={h} />
        <Rect x="60" y="80" width="14" height="36" fill={h} rx="7" />
        <Rect x="126" y="80" width="14" height="36" fill={h} rx="7" />
        <Rect x="62" y="78" width="76" height="18" fill={h} rx="4" />
      </G>
    ),
    long: (
      <G>
        <Ellipse cx="100" cy="76" rx="40" ry="38" fill={h} />
        <Rect x="60" y="78" width="14" height="60" fill={h} rx="7" />
        <Rect x="126" y="78" width="14" height="60" fill={h} rx="7" />
        <Rect x="62" y="76" width="76" height="20" fill={h} rx="4" />
        <Path d="M60 124 Q55 148 62 158 Q68 162 72 155 Q70 140 74 126" fill={h} />
        <Path d="M140 124 Q145 148 138 158 Q132 162 128 155 Q130 140 126 126" fill={h} />
      </G>
    ),
    curly: (
      <G>
        <Ellipse cx="100" cy="78" rx="40" ry="36" fill={h} />
        {[62, 72, 82, 92, 102, 112, 122, 130].map((x, i) => (
          <Circle key={i} cx={x} cy={60 + (i % 2) * 8} r={10 + (i % 3) * 2} fill={h} />
        ))}
        <Rect x="60" y="78" width="80" height="16" fill={h} rx="4" />
        <Ellipse cx="66" cy="90" rx="10" ry="16" fill={h} />
        <Ellipse cx="134" cy="90" rx="10" ry="16" fill={h} />
      </G>
    ),
    bun: (
      <G>
        <Ellipse cx="100" cy="84" rx="38" ry="32" fill={h} />
        <Circle cx="100" cy="55" r="18" fill={h} />
        <Circle cx="100" cy="55" r="14" fill={h} opacity="0.8" />
        <Rect x="62" y="84" width="76" height="12" fill={h} rx="4" />
        <Ellipse cx="68" cy="90" rx="9" ry="12" fill={h} />
        <Ellipse cx="132" cy="90" rx="9" ry="12" fill={h} />
      </G>
    ),
    buzz: (
      <G>
        <Ellipse cx="100" cy="82" rx="36" ry="32" fill={h} opacity="0.7" />
        <Ellipse cx="100" cy="76" rx="36" ry="22" fill={h} opacity="0.9" />
      </G>
    )
  };

  return (
    <Svg viewBox="0 0 200 200" width={size} height={size}>
      <Defs>
        <RadialGradient id={`bg-${uid}`} cx="40%" cy="35%" r="70%">
          <Stop offset="0%" stopColor={bgA} />
          <Stop offset="100%" stopColor={bgB} />
        </RadialGradient>
        <RadialGradient id={`skin-${uid}`} cx="40%" cy="35%" r="65%">
          <Stop offset="0%" stopColor={s.highlight} />
          <Stop offset="55%" stopColor={s.base} />
          <Stop offset="100%" stopColor={s.shadow} />
        </RadialGradient>
        <RadialGradient id={`eye-${uid}`} cx="35%" cy="30%" r="60%">
          <Stop offset="0%" stopColor="#4A3A2A" />
          <Stop offset="100%" stopColor="#1A0A00" />
        </RadialGradient>
        <RadialGradient id={`ring-${uid}`} cx="50%" cy="0%" r="100%">
          <Stop offset="0%" stopColor={bgA} stopOpacity="0.8" />
          <Stop offset="100%" stopColor={bgB} stopOpacity="0.2" />
        </RadialGradient>
        <ClipPath id={`circle-${uid}`}>
          <Circle cx="100" cy="100" r="96" />
        </ClipPath>
      </Defs>

      {showRing ? (
        <Circle cx="100" cy="100" r="98" fill="none" stroke={`url(#ring-${uid})`} strokeWidth="3" />
      ) : null}
      <Circle cx="100" cy="100" r="96" fill={`url(#bg-${uid})`} />
      <Circle cx="70" cy="65" r="50" fill="white" opacity="0.06" />

      <G clipPath={`url(#circle-${uid})`}>
        <Ellipse cx="100" cy="188" rx="52" ry="30" fill={s.shadow} opacity="0.6" />
        <Ellipse cx="100" cy="182" rx="48" ry="28" fill={s.base} />
        <Rect x="88" y="134" width="24" height="22" rx="8" fill={`url(#skin-${uid})`} />
        {hairPaths[hairStyle]}
        <Ellipse cx="100" cy="104" rx="36" ry="40" fill={`url(#skin-${uid})`} />
        <Ellipse cx="64" cy="106" rx="7" ry="9" fill={s.base} />
        <Ellipse cx="65" cy="106" rx="4" ry="6" fill={s.shadow} opacity="0.3" />
        <Ellipse cx="136" cy="106" rx="7" ry="9" fill={s.base} />
        <Ellipse cx="135" cy="106" rx="4" ry="6" fill={s.shadow} opacity="0.3" />
        <Ellipse cx="100" cy="86" rx="22" ry="12" fill="white" opacity="0.08" />
        <Path d="M78 97 Q85 93 92 96" stroke={h} strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.85" />
        <Path d="M108 96 Q115 93 122 97" stroke={h} strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.85" />
        <Ellipse cx="85" cy="105" rx="7" ry="6" fill="white" />
        <Ellipse cx="85" cy="105" rx="5" ry="5" fill={`url(#eye-${uid})`} />
        <Ellipse cx="85" cy="105" rx="3" ry="3" fill="#0A0400" />
        <Ellipse cx="83" cy="103" rx="1.5" ry="1.5" fill="white" opacity="0.8" />
        <Path d="M78 102 Q85 99 92 102" stroke={h} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.7" />
        <Ellipse cx="115" cy="105" rx="7" ry="6" fill="white" />
        <Ellipse cx="115" cy="105" rx="5" ry="5" fill={`url(#eye-${uid})`} />
        <Ellipse cx="115" cy="105" rx="3" ry="3" fill="#0A0400" />
        <Ellipse cx="113" cy="103" rx="1.5" ry="1.5" fill="white" opacity="0.8" />
        <Path d="M108 102 Q115 99 122 102" stroke={h} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.7" />
        <Path d="M98 108 Q96 118 94 120 Q100 123 106 120 Q104 118 102 108" fill={s.shadow} opacity="0.35" />
        <Ellipse cx="95" cy="120" rx="3" ry="2" fill={s.shadow} opacity="0.3" />
        <Ellipse cx="105" cy="120" rx="3" ry="2" fill={s.shadow} opacity="0.3" />
        <Path d="M90 130 Q100 136 110 130" stroke={s.shadow} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6" />
        <Path d="M92 130 Q100 133 108 130" fill={s.shadow} opacity="0.2" />
        <Ellipse cx="76" cy="118" rx="9" ry="6" fill={bgA} opacity="0.25" />
        <Ellipse cx="124" cy="118" rx="9" ry="6" fill={bgA} opacity="0.25" />
      </G>

      {label ? (
        <SvgText x="100" y="192" textAnchor="middle" fontSize="11" fontWeight="500" fill="white" opacity="0.9">
          {label}
        </SvgText>
      ) : null}
    </Svg>
  );
}

function MiniAvatar({
  skin,
  hair,
  hairStyle,
  bg,
  size = 40,
  showRing = true
}: {
  skin: (typeof SKIN_TONES)[number];
  hair: string;
  hairStyle: (typeof HAIR_STYLES)[number]["id"];
  bg: (typeof BG_PRESETS)[number];
  size?: number;
  showRing?: boolean;
}) {
  return (
    <View
      style={[
        styles.miniAvatarWrap,
        { width: size, height: size, borderRadius: size / 2 },
        showRing && {
          shadowColor: bg.a,
          shadowOpacity: 0.5,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 }
        }
      ]}
    >
      <AvatarSVG skin={skin} hair={hair} hairStyle={hairStyle} bg={bg} size={size} showRing={false} />
    </View>
  );
}

function Swatch({
  color,
  selected,
  onPress,
  size = 26,
  borderRadius = size / 2
}: {
  color: string;
  selected: boolean;
  onPress: () => void;
  size?: number;
  borderRadius?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: size,
        height: size,
        borderRadius,
        backgroundColor: color,
        transform: [{ scale: selected ? 1.15 : 1 }],
        shadowColor: selected ? color : "transparent",
        shadowOpacity: selected ? 0.8 : 0,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 0 },
        borderWidth: selected ? 2.5 : 0,
        borderColor: selected ? "#fff" : "transparent"
      }}
    />
  );
}

function BgSwatch({
  preset,
  selected,
  onPress
}: {
  preset: (typeof BG_PRESETS)[number];
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.bgSwatchBase,
        selected && styles.bgSwatchSelected,
        { shadowColor: selected ? preset.a : "transparent" }
      ]}
    >
      <View style={[StyleSheet.absoluteFill, { backgroundColor: preset.a, borderRadius: 14 }]} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: preset.b, opacity: 0.5, borderRadius: 14 }]} />
      {selected ? (
        <View style={[StyleSheet.absoluteFill, { borderRadius: 14, borderWidth: 2.5, borderColor: "#fff" }]} />
      ) : null}
    </Pressable>
  );
}

function StylePill({
  label,
  selected,
  onPress
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.pillBase, selected ? styles.pillSelected : styles.pillUnselected]}>
      <Text style={[styles.pillText, selected ? styles.pillTextSelected : styles.pillTextUnselected]}>
        {label}
      </Text>
    </Pressable>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function Divider() {
  return <View style={styles.divider} />;
}

export default function AvatarScreen() {
  const { width } = useWindowDimensions();
  const queryClient = useQueryClient();
  const { user, profile, loading } = useProfile();
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(DEFAULT_AVATAR_CONFIG);

  useEffect(() => {
    if (profile?.avatarConfig) {
      setAvatarConfig(normalizeAvatarConfig(profile.avatarConfig));
    }
  }, [profile?.avatarConfig]);

  const skin = useMemo(
    () => SKIN_TONES.find((item) => item.id === avatarConfig.skinToneId) ?? SKIN_TONES[2],
    [avatarConfig.skinToneId]
  );
  const hair = useMemo(
    () => HAIR_COLORS.find((item) => item.id === avatarConfig.hairColorId) ?? HAIR_COLORS[1],
    [avatarConfig.hairColorId]
  );
  const bg = useMemo(
    () => BG_PRESETS.find((item) => item.id === avatarConfig.backgroundId) ?? BG_PRESETS[0],
    [avatarConfig.backgroundId]
  );

  const previewSize = Math.min(width - 88, 220);

  const syncProfile = async () => {
    if (!user) return;
    await queryClient.invalidateQueries({ queryKey: queryKeys.profile(user.id) });
    router.back();
  };

  const saveMutation = useMutation({
    mutationFn: async () => saveProfileAppearance({ avatarConfig, removeImage: true }),
    onSuccess: async () => {
      await syncProfile();
    }
  });

  const usePhotoMutation = useMutation({
    mutationFn: async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        throw new Error("Allow photo library access to update your profile image.");
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.92
      });

      if (result.canceled || !result.assets[0]) {
        throw new Error("No image selected.");
      }

      await saveProfileAppearance({
        avatarConfig,
        imageUri: result.assets[0].uri,
        imageMimeType: result.assets[0].mimeType
      });
    },
    onSuccess: async () => {
      await syncProfile();
    }
  });

  if (loading || !profile) {
    return <SafeAreaView edges={["top", "bottom"]} style={styles.root} />;
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View />
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
            <MaterialCommunityIcons name="close" size={20} color="#F5F0E8" />
          </Pressable>
        </View>

        <View style={styles.headerWrap}>
          <Text style={styles.headerEyebrow}>Bloom · Avatar System</Text>
          <Text style={styles.headerTitle}>
            <Text style={styles.headerTitleAccent}>Person</Text> Avatar
          </Text>
          <Text style={styles.headerSub}>
            Build a profile image that still feels personal, then save it to your family archive.
          </Text>
        </View>

        <View style={styles.previewCard}>
          <AvatarSVG
            skin={skin}
            hair={hair.color}
            hairStyle={avatarConfig.hairStyleId}
            bg={bg}
            size={previewSize}
            showRing
          />
        </View>

        <View style={styles.sizePreviewCard}>
          {[80, 56, 40, 28, 20].map((size) => (
            <View key={size} style={styles.sizePreviewItem}>
              <MiniAvatar
                skin={skin}
                hair={hair.color}
                hairStyle={avatarConfig.hairStyleId}
                bg={bg}
                size={size}
                showRing={size > 30}
              />
              <Text style={styles.sizeLabel}>{size}px</Text>
            </View>
          ))}
        </View>

        <View style={styles.contextCard}>
          <Text style={styles.contextLabel}>In-app context</Text>

          <View style={styles.memberRow}>
            <MiniAvatar skin={skin} hair={hair.color} hairStyle={avatarConfig.hairStyleId} bg={bg} size={38} />
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{profile.fullName || "You"}</Text>
              <Text style={styles.memberEmail}>{profile.email}</Text>
            </View>
            <View style={styles.ownerBadge}>
              <Text style={styles.ownerBadgeText}>Owner</Text>
            </View>
          </View>

          <View style={styles.collabRow}>
            <View style={styles.collabStack}>
              {[0, 1, 2].map((index) => (
                <View key={index} style={[styles.collabAvatarWrap, index > 0 && { marginLeft: -10 }]}>
                  <MiniAvatar
                    skin={SKIN_TONES[index + 1]}
                    hair={HAIR_COLORS[index + 2].color}
                    hairStyle={["short", "medium", "bun"][index] as AvatarConfig["hairStyleId"]}
                    bg={BG_PRESETS[index]}
                    size={28}
                    showRing={false}
                  />
                </View>
              ))}
            </View>
            <Text style={styles.collabText}>+3 family members</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            onPress={() => usePhotoMutation.mutate()}
            style={styles.secondaryAction}
            disabled={usePhotoMutation.isPending}
          >
            <Text style={styles.secondaryActionText}>
              {usePhotoMutation.isPending ? "Opening..." : "Use photo instead"}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => saveMutation.mutate()}
            style={styles.primaryAction}
            disabled={saveMutation.isPending}
          >
            <Text style={styles.primaryActionText}>
              {saveMutation.isPending ? "Saving..." : "Save avatar"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.controlsCard}>
          <View>
            <SectionLabel>Skin Tone</SectionLabel>
            <View style={styles.swatchRow}>
              {SKIN_TONES.map((item) => (
                <Swatch
                  key={item.id}
                  color={item.base}
                  selected={avatarConfig.skinToneId === item.id}
                  onPress={() => setAvatarConfig((state) => ({ ...state, skinToneId: item.id }))}
                  size={30}
                />
              ))}
            </View>
          </View>

          <View style={styles.controlBlock}>
            <SectionLabel>Hair Colour</SectionLabel>
            <View style={styles.swatchRow}>
              {HAIR_COLORS.map((item) => (
                <Swatch
                  key={item.id}
                  color={item.color}
                  selected={avatarConfig.hairColorId === item.id}
                  onPress={() => setAvatarConfig((state) => ({ ...state, hairColorId: item.id }))}
                  size={26}
                  borderRadius={6}
                />
              ))}
            </View>
          </View>

          <View style={styles.controlBlock}>
            <SectionLabel>Hair Style</SectionLabel>
            <View style={styles.pillRow}>
              {HAIR_STYLES.map((item) => (
                <StylePill
                  key={item.id}
                  label={item.label}
                  selected={avatarConfig.hairStyleId === item.id}
                  onPress={() => setAvatarConfig((state) => ({ ...state, hairStyleId: item.id }))}
                />
              ))}
            </View>
          </View>

          <View style={styles.controlBlock}>
            <SectionLabel>Background</SectionLabel>
            <View style={styles.swatchRow}>
              {BG_PRESETS.map((item) => (
                <BgSwatch
                  key={item.id}
                  preset={item}
                  selected={avatarConfig.backgroundId === item.id}
                  onPress={() => setAvatarConfig((state) => ({ ...state, backgroundId: item.id }))}
                />
              ))}
            </View>
          </View>

          <Divider />

          <View>
            <SectionLabel>Quick presets</SectionLabel>
            <View style={styles.presetList}>
              {[
                { label: "Mum · Sarah", s: SKIN_TONES[1], h: HAIR_COLORS[2], hs: "long", b: BG_PRESETS[0] },
                { label: "Dad · James", s: SKIN_TONES[3], h: HAIR_COLORS[1], hs: "short", b: BG_PRESETS[1] },
                { label: "Grandma · Rose", s: SKIN_TONES[0], h: HAIR_COLORS[6], hs: "bun", b: BG_PRESETS[2] },
                { label: "Ella · Child", s: SKIN_TONES[2], h: HAIR_COLORS[4], hs: "curly", b: BG_PRESETS[3] }
              ].map((preset) => (
                <Pressable
                  key={preset.label}
                  onPress={() =>
                    setAvatarConfig({
                      skinToneId: preset.s.id,
                      hairColorId: preset.h.id,
                      hairStyleId: preset.hs as AvatarConfig["hairStyleId"],
                      backgroundId: preset.b.id
                    })
                  }
                  style={styles.presetRow}
                >
                  <MiniAvatar skin={preset.s} hair={preset.h.color} hairStyle={preset.hs as AvatarConfig["hairStyleId"]} bg={preset.b} size={32} />
                  <Text style={styles.presetLabel}>{preset.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderText}>All Hair Style Variants</Text>
          <View style={styles.sectionHeaderLine} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.variantScroll}>
          {HAIR_STYLES.map((item, index) => (
            <Pressable
              key={item.id}
              onPress={() => setAvatarConfig((state) => ({ ...state, hairStyleId: item.id }))}
              style={[styles.variantCard, avatarConfig.hairStyleId === item.id && styles.variantCardSelected]}
            >
              <AvatarSVG
                skin={skin}
                hair={hair.color}
                hairStyle={item.id}
                bg={BG_PRESETS[index % BG_PRESETS.length]}
                size={84}
                showRing
              />
              <Text style={[styles.variantLabel, avatarConfig.hairStyleId === item.id && styles.variantLabelSelected]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
          <Text style={styles.sectionHeaderText}>Skin Tone Spectrum</Text>
          <View style={styles.sectionHeaderLine} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.variantScroll}>
          {SKIN_TONES.map((item, index) => (
            <Pressable
              key={item.id}
              onPress={() => setAvatarConfig((state) => ({ ...state, skinToneId: item.id }))}
              style={[styles.variantCard, avatarConfig.skinToneId === item.id && styles.variantCardSelected]}
            >
              <AvatarSVG
                skin={item}
                hair={hair.color}
                hairStyle={avatarConfig.hairStyleId}
                bg={BG_PRESETS[index % BG_PRESETS.length]}
                size={72}
                showRing
              />
            </Pressable>
          ))}
        </ScrollView>

        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0F0D0B"
  },
  scroll: {
    flex: 1
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    alignItems: "center"
  },
  topBar: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center"
  },
  headerWrap: {
    alignItems: "center",
    marginBottom: 28
  },
  headerEyebrow: {
    fontSize: 9,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    color: "#8A8070",
    marginBottom: 8,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif"
  },
  headerTitle: {
    fontSize: 36,
    color: "#F5F0E8",
    lineHeight: 40,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    fontStyle: "italic"
  },
  headerTitleAccent: {
    color: "#C4623A",
    fontStyle: "italic",
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif"
  },
  headerSub: {
    fontSize: 12,
    color: "#8A8070",
    marginTop: 6,
    fontWeight: "300",
    textAlign: "center"
  },
  previewCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    borderRadius: 28,
    padding: 28,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 }
  },
  sizePreviewCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 14,
    marginBottom: 16,
    flexWrap: "wrap",
    justifyContent: "center"
  },
  sizePreviewItem: {
    alignItems: "center",
    gap: 6
  },
  sizeLabel: {
    fontSize: 8,
    color: "#8A8070"
  },
  contextCard: {
    width: "100%",
    backgroundColor: "#1A1612",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    borderRadius: 18,
    padding: 14,
    marginBottom: 14
  },
  contextLabel: {
    fontSize: 9,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "#8A8070",
    marginBottom: 12
  },
  memberRow: {
    backgroundColor: "#241E18",
    borderRadius: 14,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10
  },
  memberInfo: {
    flex: 1
  },
  memberName: {
    fontSize: 12,
    color: "#F5F0E8",
    fontWeight: "500",
    marginBottom: 2
  },
  memberEmail: {
    fontSize: 9,
    color: "#8A8070"
  },
  ownerBadge: {
    backgroundColor: "rgba(196,98,58,0.2)",
    borderRadius: 100,
    paddingVertical: 3,
    paddingHorizontal: 10
  },
  ownerBadgeText: {
    fontSize: 8,
    color: "#C4623A"
  },
  collabRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  collabStack: {
    flexDirection: "row",
    alignItems: "center"
  },
  collabAvatarWrap: {
    borderWidth: 2,
    borderColor: "#1A1612",
    borderRadius: 14
  },
  collabText: {
    fontSize: 10,
    color: "#8A8070"
  },
  actionRow: {
    width: "100%",
    flexDirection: "row",
    gap: 12,
    marginBottom: 16
  },
  secondaryAction: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13
  },
  secondaryActionText: {
    fontSize: 13,
    color: "#E8E0D0",
    fontWeight: "500"
  },
  primaryAction: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#C4623A",
    backgroundColor: "rgba(196,98,58,0.15)",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13
  },
  primaryActionText: {
    fontSize: 13,
    color: "#C4623A",
    fontWeight: "500"
  },
  controlsCard: {
    width: "100%",
    backgroundColor: "#1A1612",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    borderRadius: 24,
    padding: 22,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 }
  },
  controlBlock: {
    marginTop: 20
  },
  sectionLabel: {
    fontSize: 9,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    color: "#C4623A",
    marginBottom: 10
  },
  swatchRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  bgSwatchBase: {
    width: 30,
    height: 30,
    borderRadius: 15,
    overflow: "hidden",
    shadowOpacity: 0,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 }
  },
  bgSwatchSelected: {
    shadowOpacity: 0.7,
    shadowRadius: 5
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7
  },
  pillBase: {
    borderRadius: 100,
    paddingVertical: 5,
    paddingHorizontal: 13,
    borderWidth: 1.5
  },
  pillSelected: {
    backgroundColor: "rgba(196,98,58,0.2)",
    borderColor: "#C4623A"
  },
  pillUnselected: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.1)"
  },
  pillText: {
    fontSize: 12,
    fontWeight: "500"
  },
  pillTextSelected: {
    color: "#E8A090"
  },
  pillTextUnselected: {
    color: "#8A8070"
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    marginVertical: 20
  },
  presetList: {
    gap: 8
  },
  presetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 8
  },
  presetLabel: {
    fontSize: 12,
    color: "#E8E0D0"
  },
  miniAvatarWrap: {
    overflow: "hidden",
    flexShrink: 0,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 }
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
    width: "100%",
    marginTop: 12
  },
  sectionHeaderText: {
    fontSize: 9,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    color: "#C4623A",
    flexShrink: 0
  },
  sectionHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(196,98,58,0.2)"
  },
  variantScroll: {
    paddingHorizontal: 4,
    gap: 12,
    paddingBottom: 8
  },
  variantCard: {
    alignItems: "center",
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    gap: 8
  },
  variantCardSelected: {
    backgroundColor: "rgba(196,98,58,0.12)",
    borderColor: "#C4623A",
    transform: [{ translateY: -4 }]
  },
  variantLabel: {
    fontSize: 10,
    color: "#8A8070",
    letterSpacing: 0.5
  },
  variantLabelSelected: {
    color: "#E8A090"
  }
});

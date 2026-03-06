import { Image, Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AvatarConfig } from "@/lib/types";
import {
  DEFAULT_AVATAR_CONFIG,
  getBackgroundPreset,
  getHairColor,
  getSkinTone,
  normalizeAvatarConfig
} from "@/lib/avatar";

type AvatarProps = {
  imageUrl?: string | null;
  avatarConfig?: AvatarConfig | null;
  name?: string | null;
  size?: number;
  ring?: boolean;
  onPress?: () => void;
};

function initialsFromName(name?: string | null) {
  if (!name) return "G";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase() ?? "")
    .join("") || "G";
}

function HairShape({
  hairStyle,
  hairColor,
  size
}: {
  hairStyle: AvatarConfig["hairStyleId"];
  hairColor: string;
  size: number;
}) {
  const top = size * 0.17;
  const left = size * 0.18;
  const width = size * 0.64;
  const height = size * 0.38;

  if (hairStyle === "buzz") {
    return (
      <View
        style={{
          position: "absolute",
          top: top + size * 0.06,
          left: left + size * 0.04,
          width: width * 0.88,
          height: height * 0.45,
          backgroundColor: hairColor,
          opacity: 0.84,
          borderTopLeftRadius: width * 0.42,
          borderTopRightRadius: width * 0.42,
          borderBottomLeftRadius: width * 0.24,
          borderBottomRightRadius: width * 0.24
        }}
      />
    );
  }

  if (hairStyle === "bun") {
    return (
      <>
        <View
          style={{
            position: "absolute",
            top: top - size * 0.03,
            left: left + width * 0.28,
            width: size * 0.22,
            height: size * 0.22,
            borderRadius: size * 0.11,
            backgroundColor: hairColor
          }}
        />
        <View
          style={{
            position: "absolute",
            top: top + size * 0.05,
            left,
            width,
            height: height * 0.62,
            backgroundColor: hairColor,
            borderTopLeftRadius: width * 0.42,
            borderTopRightRadius: width * 0.42,
            borderBottomLeftRadius: width * 0.18,
            borderBottomRightRadius: width * 0.18
          }}
        />
      </>
    );
  }

  if (hairStyle === "curly") {
    return (
      <>
        {new Array(8).fill(0).map((_, index) => (
          <View
            key={index}
            style={{
              position: "absolute",
              top: top + (index % 2 === 0 ? 0 : size * 0.04),
              left: left + index * (size * 0.06),
              width: size * (index % 3 === 0 ? 0.16 : 0.13),
              height: size * (index % 3 === 0 ? 0.16 : 0.13),
              borderRadius: size * 0.08,
              backgroundColor: hairColor
            }}
          />
        ))}
        <View
          style={{
            position: "absolute",
            top: top + size * 0.06,
            left,
            width,
            height: height * 0.52,
            backgroundColor: hairColor,
            borderTopLeftRadius: width * 0.42,
            borderTopRightRadius: width * 0.42,
            borderBottomLeftRadius: width * 0.18,
            borderBottomRightRadius: width * 0.18
          }}
        />
      </>
    );
  }

  if (hairStyle === "long") {
    return (
      <>
        <View
          style={{
            position: "absolute",
            top,
            left,
            width,
            height: height * 0.66,
            backgroundColor: hairColor,
            borderTopLeftRadius: width * 0.42,
            borderTopRightRadius: width * 0.42,
            borderBottomLeftRadius: width * 0.18,
            borderBottomRightRadius: width * 0.18
          }}
        />
        <View
          style={{
            position: "absolute",
            top: top + size * 0.13,
            left: left - size * 0.015,
            width: size * 0.12,
            height: size * 0.34,
            backgroundColor: hairColor,
            borderRadius: size * 0.06
          }}
        />
        <View
          style={{
            position: "absolute",
            top: top + size * 0.13,
            right: left - size * 0.015,
            width: size * 0.12,
            height: size * 0.34,
            backgroundColor: hairColor,
            borderRadius: size * 0.06
          }}
        />
      </>
    );
  }

  if (hairStyle === "medium") {
    return (
      <>
        <View
          style={{
            position: "absolute",
            top,
            left,
            width,
            height: height * 0.62,
            backgroundColor: hairColor,
            borderTopLeftRadius: width * 0.42,
            borderTopRightRadius: width * 0.42,
            borderBottomLeftRadius: width * 0.16,
            borderBottomRightRadius: width * 0.16
          }}
        />
        <View
          style={{
            position: "absolute",
            top: top + size * 0.14,
            left: left - size * 0.004,
            width: size * 0.1,
            height: size * 0.2,
            backgroundColor: hairColor,
            borderRadius: size * 0.05
          }}
        />
        <View
          style={{
            position: "absolute",
            top: top + size * 0.14,
            right: left - size * 0.004,
            width: size * 0.1,
            height: size * 0.2,
            backgroundColor: hairColor,
            borderRadius: size * 0.05
          }}
        />
      </>
    );
  }

  return (
    <View
      style={{
        position: "absolute",
        top: top + size * 0.04,
        left,
        width,
        height: height * 0.5,
        backgroundColor: hairColor,
        borderTopLeftRadius: width * 0.42,
        borderTopRightRadius: width * 0.42,
        borderBottomLeftRadius: width * 0.16,
        borderBottomRightRadius: width * 0.16
      }}
    />
  );
}

export function GeneratedAvatar({
  avatarConfig,
  size = 56,
  ring = true
}: {
  avatarConfig?: AvatarConfig | null;
  size?: number;
  ring?: boolean;
}) {
  const config = normalizeAvatarConfig(avatarConfig ?? DEFAULT_AVATAR_CONFIG);
  const skin = getSkinTone(config.skinToneId);
  const hair = getHairColor(config.hairColorId);
  const bg = getBackgroundPreset(config.backgroundId);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: "hidden",
        borderWidth: ring ? 2 : 0,
        borderColor: `${bg.a}55`
      }}
    >
      <LinearGradient
        colors={[bg.a, bg.b]}
        start={{ x: 0.15, y: 0.1 }}
        end={{ x: 0.9, y: 1 }}
        style={{ flex: 1 }}
      >
        <View
          style={{
            position: "absolute",
            top: size * 0.08,
            left: size * 0.12,
            width: size * 0.46,
            height: size * 0.46,
            borderRadius: size * 0.23,
            backgroundColor: "rgba(255,255,255,0.08)"
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: size * 0.04,
            left: size * 0.24,
            width: size * 0.52,
            height: size * 0.22,
            borderTopLeftRadius: size * 0.22,
            borderTopRightRadius: size * 0.22,
            backgroundColor: skin.shadow,
            opacity: 0.7
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: size * 0.06,
            left: size * 0.26,
            width: size * 0.48,
            height: size * 0.18,
            borderTopLeftRadius: size * 0.18,
            borderTopRightRadius: size * 0.18,
            backgroundColor: skin.base
          }}
        />
        <HairShape
          hairStyle={config.hairStyleId}
          hairColor={hair.color}
          size={size}
        />
        <View
          style={{
            position: "absolute",
            top: size * 0.3,
            left: size * 0.28,
            width: size * 0.44,
            height: size * 0.48,
            borderRadius: size * 0.22,
            backgroundColor: skin.base
          }}
        />
        <View
          style={{
            position: "absolute",
            top: size * 0.34,
            left: size * 0.34,
            width: size * 0.08,
            height: size * 0.08,
            borderRadius: size * 0.04,
            backgroundColor: "#FFFFFF"
          }}
        />
        <View
          style={{
            position: "absolute",
            top: size * 0.34,
            right: size * 0.34,
            width: size * 0.08,
            height: size * 0.08,
            borderRadius: size * 0.04,
            backgroundColor: "#FFFFFF"
          }}
        />
        <View
          style={{
            position: "absolute",
            top: size * 0.356,
            left: size * 0.36,
            width: size * 0.038,
            height: size * 0.038,
            borderRadius: size * 0.019,
            backgroundColor: "#23150C"
          }}
        />
        <View
          style={{
            position: "absolute",
            top: size * 0.356,
            right: size * 0.36,
            width: size * 0.038,
            height: size * 0.038,
            borderRadius: size * 0.019,
            backgroundColor: "#23150C"
          }}
        />
        <View
          style={{
            position: "absolute",
            top: size * 0.46,
            left: size * 0.465,
            width: size * 0.07,
            height: size * 0.11,
            borderRadius: size * 0.035,
            backgroundColor: skin.shadow,
            opacity: 0.28
          }}
        />
        <View
          style={{
            position: "absolute",
            top: size * 0.58,
            left: size * 0.38,
            width: size * 0.24,
            height: size * 0.03,
            borderRadius: size * 0.015,
            backgroundColor: skin.shadow,
            opacity: 0.46
          }}
        />
        <View
          style={{
            position: "absolute",
            top: size * 0.28,
            left: size * 0.35,
            width: size * 0.3,
            height: size * 0.08,
            borderRadius: size * 0.04,
            backgroundColor: "rgba(255,255,255,0.08)"
          }}
        />
      </LinearGradient>
    </View>
  );
}

export function ProfileAvatar({
  imageUrl,
  avatarConfig,
  name,
  size = 56,
  ring = true,
  onPress
}: AvatarProps) {
  const content = imageUrl ? (
    <Image
      source={{ uri: imageUrl }}
      resizeMode="cover"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#EDE8DE"
      }}
    />
  ) : avatarConfig ? (
    <GeneratedAvatar avatarConfig={avatarConfig} size={size} ring={ring} />
  ) : (
    <LinearGradient
      colors={["#C4623A", "#E8A090"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <Text
        style={{
          fontFamily: "DMSans_500Medium",
          fontSize: size * 0.34,
          color: "#FFFFFF"
        }}
      >
        {initialsFromName(name)}
      </Text>
    </LinearGradient>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable onPress={onPress} style={{ borderRadius: size / 2 }}>
      {content}
    </Pressable>
  );
}

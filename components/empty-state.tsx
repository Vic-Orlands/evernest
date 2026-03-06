import { Text, View } from "react-native";
import { AppTheme } from "@/lib/theme";

export function EmptyState({
  title,
  body,
  colors
}: {
  title: string;
  body: string;
  colors: AppTheme;
}) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: colors.border,
        backgroundColor: colors.surface,
        padding: 24
      }}
    >
      <Text
        style={{
          textAlign: "center",
          fontFamily: "InstrumentSerif_400Regular",
          fontSize: 26,
          color: colors.text
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          textAlign: "center",
          fontFamily: "DMSans_400Regular",
          fontSize: 14,
          lineHeight: 22,
          color: colors.textMuted,
          marginTop: 8
        }}
      >
        {body}
      </Text>
    </View>
  );
}

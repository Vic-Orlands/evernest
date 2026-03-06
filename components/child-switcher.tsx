import { Pressable, Text, View } from "react-native";
import { ChildProfile } from "@/lib/types";
import { AppTheme } from "@/lib/theme";

type Props = {
  childProfiles: ChildProfile[];
  activeChildId: string;
  onSelect: (childId: string) => void;
  colors: AppTheme;
};

export function ChildSwitcher({ childProfiles, activeChildId, onSelect, colors }: Props) {
  return (
    <View style={{ marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {childProfiles.map((child) => {
        const active = child.id === activeChildId;
        return (
          <Pressable
            key={child.id}
            onPress={() => onSelect(child.id)}
            style={{
              borderWidth: 1,
              borderColor: active ? colors.brand : colors.border,
              backgroundColor: active ? colors.brandBackground : colors.surface,
              paddingHorizontal: 14,
              paddingVertical: 8
            }}
          >
            <Text
              style={{
                fontFamily: "DMSans_400Regular",
                fontSize: 12,
                color: active ? colors.brandSecondary : colors.textMuted
              }}
            >
              {child.firstName}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

import { Pressable, Text, View } from "react-native";
import { ChildProfile } from "@/lib/types";

type Props = {
  childProfiles: ChildProfile[];
  activeChildId: string;
  onSelect: (childId: string) => void;
};

export function ChildSwitcher({ childProfiles, activeChildId, onSelect }: Props) {
  return (
    <View className="mt-4 flex-row flex-wrap gap-2">
      {childProfiles.map((child) => {
        const active = child.id === activeChildId;
        return (
          <Pressable
            key={child.id}
            onPress={() => onSelect(child.id)}
            className={`rounded-full border px-4 py-2 ${active ? "border-terracotta bg-terracotta/20" : "border-night4 bg-night3"}`}
          >
            <Text className={`font-body text-xs ${active ? "text-blush" : "text-moonDim"}`}>{child.firstName}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

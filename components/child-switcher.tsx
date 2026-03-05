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
            className={`rounded-full px-4 py-2 ${active ? "bg-amber" : "border border-zinc-700 bg-zinc-900"}`}
          >
            <Text className={`${active ? "text-zinc-900" : "text-zinc-300"} font-bodybold text-sm`}>{child.firstName}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

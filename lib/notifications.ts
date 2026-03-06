import * as Device from "expo-device";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";
import { requireCurrentUserId } from "@/lib/current-user";
import { getExpoNotifications } from "@/lib/expo-notifications-optional";
import { toSupabaseSetupError } from "@/lib/supabase-setup";

/**
 * Register the device's Expo push token with Supabase so other family members
 * can send push notifications to this device.
 */
export async function registerPushToken(): Promise<string | null> {
    const notifications = getExpoNotifications();
    if (!notifications || !Device.isDevice) return null;

    const { status } = await notifications.getPermissionsAsync();
    if (status !== "granted") return null;

    try {
        const tokenResult = await notifications.getExpoPushTokenAsync();
        const token = tokenResult.data;
        const userId = await requireCurrentUserId();

        const { error } = await supabase.from("push_tokens").upsert(
            {
                user_id: userId,
                token,
                platform: Platform.OS
            },
            { onConflict: "user_id,token" }
        );

        if (error) {
            console.warn("Could not register push token:", error.message);
        }

        return token;
    } catch (err) {
        console.warn("Push token registration failed:", err);
        return null;
    }
}

/**
 * Remove the current device's push token (e.g. on sign-out).
 */
export async function unregisterPushToken(): Promise<void> {
    const notifications = getExpoNotifications();
    if (!notifications || !Device.isDevice) return;

    try {
        const tokenResult = await notifications.getExpoPushTokenAsync();
        const token = tokenResult.data;
        const userId = await requireCurrentUserId();

        await supabase
            .from("push_tokens")
            .delete()
            .eq("user_id", userId)
            .eq("token", token);
    } catch {
        // Silent fail — token may already be removed
    }
}

/**
 * Fetch push tokens for all OTHER family members (not the current user).
 */
async function getFamilyMemberTokens(familyId: string): Promise<string[]> {
    const userId = await requireCurrentUserId();

    const { data: members, error: membersError } = await supabase
        .from("family_members")
        .select("user_id")
        .eq("family_id", familyId)
        .neq("user_id", userId);

    if (membersError || !members || members.length === 0) return [];

    const memberIds = members.map((m) => m.user_id);

    const { data: tokens, error: tokensError } = await supabase
        .from("push_tokens")
        .select("token")
        .in("user_id", memberIds);

    if (tokensError || !tokens) return [];

    return tokens.map((t) => t.token);
}

/**
 * Send push notifications to all family members when a new memory is created.
 */
export async function notifyFamilyNewMemory(
    familyId: string,
    creatorName: string,
    memoryTitle: string
): Promise<void> {
    const tokens = await getFamilyMemberTokens(familyId);
    if (tokens.length === 0) return;

    await sendExpoPushNotifications(tokens, {
        title: "📸 New memory captured",
        body: `${creatorName} just saved "${memoryTitle}" to EverNest.`,
        data: { type: "new_memory", familyId }
    });
}

/**
 * Send a "nudge" notification to a specific family member to remind them
 * to capture a memory today.
 */
export async function sendNudge(
    targetUserId: string,
    senderName: string
): Promise<void> {
    const { data: tokens, error } = await supabase
        .from("push_tokens")
        .select("token")
        .eq("user_id", targetUserId);

    if (error || !tokens || tokens.length === 0) return;

    const pushTokens = tokens.map((t) => t.token);

    await sendExpoPushNotifications(pushTokens, {
        title: "💛 You've been nudged!",
        body: `${senderName} is reminding you to capture a memory today.`,
        data: { type: "nudge" }
    });
}

/**
 * Notify family when a comment is posted on a memory.
 */
export async function notifyFamilyNewComment(
    familyId: string,
    commenterName: string,
    memoryTitle: string
): Promise<void> {
    const tokens = await getFamilyMemberTokens(familyId);
    if (tokens.length === 0) return;

    await sendExpoPushNotifications(tokens, {
        title: "💬 New comment",
        body: `${commenterName} commented on "${memoryTitle}".`,
        data: { type: "new_comment", familyId }
    });
}

/**
 * Notify family when a reaction is added to a memory.
 */
export async function notifyFamilyNewReaction(
    familyId: string,
    reactorName: string,
    emoji: string,
    memoryTitle: string
): Promise<void> {
    const tokens = await getFamilyMemberTokens(familyId);
    if (tokens.length === 0) return;

    await sendExpoPushNotifications(tokens, {
        title: `${emoji} New reaction`,
        body: `${reactorName} reacted to "${memoryTitle}".`,
        data: { type: "new_reaction", familyId }
    });
}

/**
 * Send Expo push notifications via the Expo push service.
 * Falls back silently on failure.
 */
async function sendExpoPushNotifications(
    pushTokens: string[],
    notification: { title: string; body: string; data?: Record<string, unknown> }
): Promise<void> {
    const messages = pushTokens.map((token) => ({
        to: token,
        sound: "default" as const,
        title: notification.title,
        body: notification.body,
        data: notification.data ?? {}
    }));

    try {
        await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Accept-encoding": "gzip, deflate",
                "Content-Type": "application/json"
            },
            body: JSON.stringify(messages)
        });
    } catch (err) {
        console.warn("Push notification send failed:", err);
    }
}

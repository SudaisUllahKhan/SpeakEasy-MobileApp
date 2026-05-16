import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Animated,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { getUserSettings, saveSettings, deleteAccount } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";
import { colors, fontSize, fontWeight, borderRadius, spacing } from "@/lib/theme";
import type { Level } from "@/lib/types";

const LEVELS: { value: Level; label: string; desc: string }[] = [
  { value: "A1", label: "A1", desc: "Beginner" },
  { value: "A2", label: "A2", desc: "Elementary" },
  { value: "B1", label: "B1", desc: "Intermediate" },
];


function SavedToast({ visible }: { visible: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(1200),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, opacity]);

  return (
    <Animated.View style={[toastStyles.toast, { opacity }]} pointerEvents="none">
      <Ionicons name="checkmark-circle" size={16} color="#fff" />
      <Text style={toastStyles.text}>Saved</Text>
    </Animated.View>
  );
}

const toastStyles = StyleSheet.create({
  toast: {
    position: "absolute",
    bottom: 32,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1a1a1a",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  text: { color: "#fff", fontSize: 14, fontWeight: "600" },
});

export default function SettingsScreen(): React.ReactElement {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { logout, updateUserSettings, user } = useAuthStore();

  const [name, setName] = useState("");
  const [nativeLanguage, setNativeLanguage] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<Level>("A1");
  const [toastKey, setToastKey] = useState(0);
  const [editingField, setEditingField] = useState<"name" | "language" | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["user-settings"],
    queryFn: getUserSettings,
  });

  useEffect(() => {
    const src = settings ?? (user ? {
      name: user.name,
      nativeLanguage: user.nativeLanguage,
      level: user.level,
    } : null);
    if (src) {
      setName(src.name ?? "");
      setNativeLanguage(src.nativeLanguage ?? "");
      setSelectedLevel(src.level as Level);
    }
  }, [settings, user]);

  const saveMutation = useMutation({
    mutationFn: saveSettings,
    onSuccess: (updated) => {
      updateUserSettings({
        name: updated.name,
        nativeLanguage: updated.nativeLanguage,
        level: updated.level as Level,
      });
      queryClient.setQueryData(["user-settings"], updated);
      setToastKey((k) => k + 1);
    },
    onError: () => {
      Alert.alert("Error", "Could not save. Please try again.");
    },
  });

  const autoSave = useCallback((patch: Parameters<typeof saveSettings>[0]) => {
    saveMutation.mutate({
      name: name.trim() || undefined,
      nativeLanguage: nativeLanguage.trim() || undefined,
      level: selectedLevel,
      ...patch,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, nativeLanguage, selectedLevel]);

  const deleteMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: async () => {
      await logout();
      router.replace("/(auth)/login");
    },
    onError: () => Alert.alert("Error", "Could not delete account. Please try again."),
  });

  const handleLogout = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete account",
      "This permanently deletes your account and all progress. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate() },
      ]
    );
  };

  // Avatar letter from name or email
  const avatarLetter = (name || settings?.email || "?")[0].toUpperCase();
  const displayEmail = settings?.email ?? user?.email ?? "";

  if (isLoading) return <LoadingSpinner fullScreen label="Loading settings..." />;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ── */}
          <Text style={styles.pageTitle}>Settings</Text>

          {/* ── Profile card ── */}
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarLetter}>{avatarLetter}</Text>
            </View>
            <View style={styles.profileInfo}>
              {editingField === "name" ? (
                <TextInput
                  style={styles.nameInput}
                  value={name}
                  onChangeText={setName}
                  autoFocus
                  returnKeyType="done"
                  autoCapitalize="words"
                  onBlur={() => {
                    setEditingField(null);
                    autoSave({ name: name.trim() || undefined });
                  }}
                  onSubmitEditing={() => {
                    setEditingField(null);
                    autoSave({ name: name.trim() || undefined });
                  }}
                  accessibilityLabel="Display name"
                />
              ) : (
                <TouchableOpacity onPress={() => setEditingField("name")} style={styles.nameRow}>
                  <Text style={styles.profileName}>{name || "Add your name"}</Text>
                  <Ionicons name="pencil-outline" size={14} color={colors.muted} />
                </TouchableOpacity>
              )}
              {displayEmail ? (
                <Text style={styles.profileEmail}>{displayEmail}</Text>
              ) : null}
            </View>
          </View>

          {/* ── Learning ── */}
          <Text style={styles.sectionHeader}>LEARNING</Text>
          <View style={styles.sectionCard}>

            {/* Level */}
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons name="school-outline" size={20} color={colors.primary} style={styles.rowIcon} />
                <View>
                  <Text style={styles.rowLabel}>English level</Text>
                  <Text style={styles.rowSub}>Sets difficulty of your lessons</Text>
                </View>
              </View>
            </View>
            <View style={styles.segmentGroup}>
              {LEVELS.map((l) => (
                <TouchableOpacity
                  key={l.value}
                  style={[styles.segment, selectedLevel === l.value && styles.segmentActive]}
                  onPress={() => {
                    setSelectedLevel(l.value);
                    autoSave({ level: l.value });
                  }}
                  accessibilityLabel={`${l.label} ${l.desc}`}
                  accessibilityState={{ selected: selectedLevel === l.value }}
                >
                  <Text style={[styles.segmentLabel, selectedLevel === l.value && styles.segmentLabelActive]}>
                    {l.label}
                  </Text>
                  <Text style={[styles.segmentDesc, selectedLevel === l.value && styles.segmentDescActive]}>
                    {l.desc}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.divider} />

            {/* Native language */}
            <TouchableOpacity
              style={styles.row}
              onPress={() => setEditingField(editingField === "language" ? null : "language")}
              accessibilityLabel="Native language"
            >
              <View style={styles.rowLeft}>
                <Ionicons name="language-outline" size={20} color={colors.primary} style={styles.rowIcon} />
                <View>
                  <Text style={styles.rowLabel}>Native language</Text>
                  <Text style={styles.rowSub}>Helps AI personalise feedback</Text>
                </View>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.rowValue} numberOfLines={1}>
                  {nativeLanguage || "Not set"}
                </Text>
                <Ionicons
                  name={editingField === "language" ? "chevron-up" : "chevron-forward"}
                  size={16}
                  color={colors.muted}
                />
              </View>
            </TouchableOpacity>
            {editingField === "language" && (
              <View style={styles.inlineInputWrap}>
                <TextInput
                  style={styles.inlineInput}
                  value={nativeLanguage}
                  onChangeText={setNativeLanguage}
                  placeholder="e.g. Arabic, Spanish, Urdu"
                  placeholderTextColor={colors.muted}
                  autoFocus
                  autoCapitalize="words"
                  returnKeyType="done"
                  onBlur={() => {
                    setEditingField(null);
                    autoSave({ nativeLanguage: nativeLanguage.trim() || undefined });
                  }}
                  onSubmitEditing={() => {
                    setEditingField(null);
                    autoSave({ nativeLanguage: nativeLanguage.trim() || undefined });
                  }}
                  accessibilityLabel="Native language input"
                />
              </View>
            )}
          </View>

          {/* ── Account ── */}
          <Text style={styles.sectionHeader}>ACCOUNT</Text>
          <View style={styles.sectionCard}>
            <TouchableOpacity style={styles.row} onPress={handleLogout} accessibilityLabel="Sign out">
              <View style={styles.rowLeft}>
                <Ionicons name="log-out-outline" size={20} color={colors.text} style={styles.rowIcon} />
                <Text style={styles.rowLabel}>Sign out</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.row} onPress={handleDeleteAccount} accessibilityLabel="Delete account">
              <View style={styles.rowLeft}>
                {deleteMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.danger} style={styles.rowIcon} />
                ) : (
                  <Ionicons name="trash-outline" size={20} color={colors.danger} style={styles.rowIcon} />
                )}
                <Text style={[styles.rowLabel, { color: colors.danger }]}>Delete account</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.appVersion}>SpeakEasy · v1.0</Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <SavedToast key={toastKey} visible={toastKey > 0} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 80,
  },
  pageTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.lg,
  },

  // Profile
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryBg,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    fontSize: 22,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  profileName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  profileEmail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  nameInput: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.primary,
    paddingBottom: 2,
    marginBottom: 2,
  },

  // Sections
  sectionHeader: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.muted,
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    overflow: "hidden",
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 52,
  },

  // Rows
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    minHeight: 56,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: "40%",
  },
  rowIcon: {
    marginRight: 12,
    width: 24,
  },
  rowLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  rowSub: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  rowValue: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    maxWidth: 120,
  },

  // Inline text input
  inlineInputWrap: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  inlineInput: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: fontSize.base,
    color: colors.text,
    backgroundColor: colors.bg,
  },

  // Segment selector (level / speed)
  segmentGroup: {
    flexDirection: "row",
    marginHorizontal: spacing.md,
    marginBottom: 14,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  segment: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    backgroundColor: colors.bg,
  },
  segmentActive: {
    backgroundColor: colors.primary,
  },
  segmentLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  segmentLabelActive: {
    color: "#fff",
  },
  segmentDesc: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 1,
  },
  segmentDescActive: {
    color: "rgba(255,255,255,0.75)",
  },

  appVersion: {
    textAlign: "center",
    fontSize: fontSize.xs,
    color: colors.muted,
    marginTop: spacing.sm,
  },
});

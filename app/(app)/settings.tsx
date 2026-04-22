import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { getUserSettings, saveSettings, deleteAccount } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";
import {
  colors,
  fontSize,
  fontWeight,
  borderRadius,
  spacing,
} from "@/lib/theme";
import type { Level, Accent } from "@/lib/types";

const LEVELS: Level[] = ["A1", "A2", "B1"];
const ACCENTS: { value: Accent; label: string }[] = [
  { value: "US", label: "US English" },
  { value: "UK", label: "British" },
  { value: "AU", label: "Australian" },
  { value: "IN", label: "Indian" },
];
const SPEEDS: { value: number; label: string }[] = [
  { value: 0.75, label: "0.75x" },
  { value: 1.0, label: "1x" },
  { value: 1.25, label: "1.25x" },
];

export default function SettingsScreen(): React.ReactElement {
  const router = useRouter();
  const { logout, updateUserSettings, user } = useAuthStore();

  const [name, setName] = useState("");
  const [nativeLanguage, setNativeLanguage] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<Level>("A1");
  const [selectedAccent, setSelectedAccent] = useState<Accent>("US");
  const [selectedSpeed, setSelectedSpeed] = useState<number>(1.0);
  const [isDirty, setIsDirty] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["user-settings"],
    queryFn: getUserSettings,
  });

  useEffect(() => {
    if (settings) {
      setName(settings.name ?? "");
      setNativeLanguage(settings.nativeLanguage ?? "");
      setSelectedLevel(settings.level as Level);
      setSelectedAccent(settings.preferredAccent as Accent);
      setSelectedSpeed(settings.audioSpeed);
    } else if (user) {
      setName(user.name ?? "");
      setNativeLanguage(user.nativeLanguage ?? "");
      setSelectedLevel(user.level);
      setSelectedAccent(user.preferredAccent);
      setSelectedSpeed(user.audioSpeed);
    }
  }, [settings, user]);

  const saveMutation = useMutation({
    mutationFn: () =>
      saveSettings({
        name: name.trim() || undefined,
        nativeLanguage: nativeLanguage.trim() || undefined,
        level: selectedLevel,
        preferredAccent: selectedAccent,
        audioSpeed: selectedSpeed,
      }),
    onSuccess: (updatedSettings) => {
      updateUserSettings({
        name: updatedSettings.name,
        nativeLanguage: updatedSettings.nativeLanguage,
        level: updatedSettings.level as Level,
        preferredAccent: updatedSettings.preferredAccent as Accent,
        audioSpeed: updatedSettings.audioSpeed,
      });
      setSaveSuccess(true);
      setIsDirty(false);
      setTimeout(() => setSaveSuccess(false), 2000);
    },
    onError: () => {
      Alert.alert("Error", "Could not save settings. Please try again.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: async () => {
      await logout();
      router.replace("/(auth)/login");
    },
    onError: () => {
      Alert.alert("Error", "Could not delete account. Please try again.");
    },
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
      "This will permanently delete your account and all progress data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete my account",
          style: "destructive",
          onPress: () => deleteMutation.mutate(),
        },
      ]
    );
  };

  const markDirty = () => {
    if (!isDirty) setIsDirty(true);
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen label="Loading settings..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.pageTitle}>Settings</Text>

          {/* Profile */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile</Text>
            <Card>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Display name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={(v) => {
                    setName(v);
                    markDirty();
                  }}
                  placeholder="Your name"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="words"
                  returnKeyType="next"
                  accessibilityLabel="Display name input"
                />
              </View>

              <View style={[styles.field, styles.fieldBorderTop]}>
                <Text style={styles.fieldLabel}>Native language</Text>
                <TextInput
                  style={styles.input}
                  value={nativeLanguage}
                  onChangeText={(v) => {
                    setNativeLanguage(v);
                    markDirty();
                  }}
                  placeholder="e.g. Spanish, Arabic, Japanese"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="words"
                  returnKeyType="done"
                  accessibilityLabel="Native language input"
                />
              </View>
            </Card>
          </View>

          {/* Level */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CEFR level</Text>
            <Text style={styles.sectionHint}>
              Changing your level will filter lessons shown to you.
            </Text>
            <View style={styles.pillRow}>
              {LEVELS.map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.pill,
                    selectedLevel === level && styles.pillActive,
                  ]}
                  onPress={() => {
                    setSelectedLevel(level);
                    markDirty();
                  }}
                  accessibilityLabel={`Select level ${level}`}
                  accessibilityState={{ selected: selectedLevel === level }}
                >
                  <Text
                    style={[
                      styles.pillText,
                      selectedLevel === level && styles.pillTextActive,
                    ]}
                  >
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Accent */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferred accent</Text>
            <View style={styles.pillRow}>
              {ACCENTS.map((accent) => (
                <TouchableOpacity
                  key={accent.value}
                  style={[
                    styles.pill,
                    selectedAccent === accent.value && styles.pillActive,
                  ]}
                  onPress={() => {
                    setSelectedAccent(accent.value);
                    markDirty();
                  }}
                  accessibilityLabel={`Select ${accent.label} accent`}
                  accessibilityState={{ selected: selectedAccent === accent.value }}
                >
                  <Text
                    style={[
                      styles.pillText,
                      selectedAccent === accent.value && styles.pillTextActive,
                    ]}
                  >
                    {accent.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Audio speed */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Audio playback speed</Text>
            <View style={styles.pillRow}>
              {SPEEDS.map((speed) => (
                <TouchableOpacity
                  key={speed.value}
                  style={[
                    styles.pill,
                    selectedSpeed === speed.value && styles.pillActive,
                  ]}
                  onPress={() => {
                    setSelectedSpeed(speed.value);
                    markDirty();
                  }}
                  accessibilityLabel={`Select ${speed.label} playback speed`}
                  accessibilityState={{ selected: selectedSpeed === speed.value }}
                >
                  <Text
                    style={[
                      styles.pillText,
                      selectedSpeed === speed.value && styles.pillTextActive,
                    ]}
                  >
                    {speed.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Save button */}
          <Button
            onPress={() => saveMutation.mutate()}
            loading={saveMutation.isPending}
            disabled={!isDirty || saveMutation.isPending}
            fullWidth
            size="lg"
            style={styles.saveButton}
            accessibilityLabel="Save settings"
          >
            {saveSuccess ? "Saved!" : "Save settings"}
          </Button>

          {saveSuccess && (
            <View style={styles.successBanner}>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={colors.success}
              />
              <Text style={styles.successText}>Settings saved successfully!</Text>
            </View>
          )}

          {/* Account section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            <Card>
              {settings?.email && (
                <View style={styles.emailRow}>
                  <Ionicons name="mail-outline" size={18} color={colors.muted} />
                  <Text style={styles.emailText}>{settings.email}</Text>
                </View>
              )}
            </Card>
          </View>

          {/* Sign out */}
          <Button
            onPress={handleLogout}
            variant="outline"
            fullWidth
            size="lg"
            style={styles.signOutButton}
            accessibilityLabel="Sign out of account"
          >
            Sign out
          </Button>

          {/* Delete account */}
          <TouchableOpacity
            style={styles.deleteLink}
            onPress={handleDeleteAccount}
            accessibilityLabel="Delete my account"
          >
            {deleteMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <Text style={styles.deleteLinkText}>Delete my account</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingBottom: spacing.xxl,
  },
  pageTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: 6,
  },
  sectionHint: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  field: {
    paddingVertical: 12,
  },
  fieldBorderTop: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  fieldLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    fontSize: fontSize.base,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.bg,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryBg,
  },
  pillText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  pillTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  saveButton: {
    marginBottom: spacing.sm,
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.successBg,
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: spacing.md,
  },
  successText: {
    fontSize: fontSize.sm,
    color: colors.success,
    fontWeight: fontWeight.medium,
  },
  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  emailText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  signOutButton: {
    marginBottom: spacing.md,
  },
  deleteLink: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  deleteLinkText: {
    fontSize: fontSize.sm,
    color: colors.danger,
    textDecorationLine: "underline",
  },
});

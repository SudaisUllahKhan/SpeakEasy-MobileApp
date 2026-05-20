import React, { useEffect, useRef } from "react";
import { Animated, View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/lib/theme";

function ModernLoader({ message }: { message?: string }) {
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }).start();

    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 900, useNativeDriver: true })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.1, duration: 750, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.0, duration: 750, useNativeDriver: true }),
      ])
    ).start();

    const bounceDot = (d: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(d, { toValue: -7, duration: 280, useNativeDriver: true }),
          Animated.timing(d, { toValue: 0, duration: 280, useNativeDriver: true }),
          Animated.delay(960 - delay),
        ])
      ).start();
    };

    bounceDot(dot1, 0);
    bounceDot(dot2, 160);
    bounceDot(dot3, 320);
  }, []);

  const rotation = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeIn }]}>
        <View style={styles.iconWrap}>
          <Animated.View style={[styles.spinnerRing, { transform: [{ rotate: rotation }] }]} />
          <Animated.View style={[styles.innerCircle, { transform: [{ scale: pulse }] }]}>
            <Text style={styles.logoLetter}>S</Text>
          </Animated.View>
        </View>

        <Text style={styles.brandName}>SpeakEasy</Text>
        <Text style={styles.brandSub}>{message ?? "Getting ready…"}</Text>

        <View style={styles.dots}>
          {[dot1, dot2, dot3].map((d, i) => (
            <Animated.View key={i} style={[styles.dot, { transform: [{ translateY: d }] }]} />
          ))}
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

export function DashboardSkeleton() { return <ModernLoader message="Loading your dashboard…" />; }
export function TopicsSkeleton() { return <ModernLoader message="Loading topics…" />; }
export function TopicDetailSkeleton() { return <ModernLoader message="Loading lessons…" />; }
export function ProgressSkeleton() { return <ModernLoader message="Loading your progress…" />; }
export function ReviewSkeleton() { return <ModernLoader message="Loading review words…" />; }
export function SettingsSkeleton() { return <ModernLoader message="Loading settings…" />; }

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  iconWrap: {
    width: 88,
    height: 88,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  spinnerRing: {
    position: "absolute",
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3.5,
    borderColor: "#EDE9FE",
    borderTopColor: colors.primary,
  },
  innerCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logoLetter: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.5,
  },
  brandName: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: -0.3,
  },
  brandSub: {
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  dots: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
    opacity: 0.7,
  },
});

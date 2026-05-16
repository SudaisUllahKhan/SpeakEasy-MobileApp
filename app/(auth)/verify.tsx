import React from "react";
import { useRouter } from "expo-router";
import { useEffect } from "react";

// Magic link removed — this screen is unused. Redirect to login if reached.
export default function VerifyScreen(): null {
  const router = useRouter();
  useEffect(() => {
    router.replace("/(auth)/login");
  }, [router]);
  return null;
}

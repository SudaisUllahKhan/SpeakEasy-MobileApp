// Deep-link callback — Android routes exp:// or speakeasy:// here after Google OAuth.
// iOS catches it inside WebBrowser.openAuthSessionAsync instead (returns type:"success").

import React, { useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuthStore } from "@/lib/authStore";

export default function AuthCallbackScreen(): React.ReactElement {
  const router = useRouter();
  const params = useLocalSearchParams<{
    sessionToken?: string;
    token?: string;
    error?: string;
  }>();
  const { setToken } = useAuthStore();

  useEffect(() => {
    const sessionToken = params.sessionToken ?? params.token;

    if (!sessionToken || params.error) {
      router.replace("/(auth)/login");
      return;
    }

    void setToken(sessionToken).then(() => {
      router.replace("/(app)/dashboard");
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <LoadingSpinner fullScreen label="Signing you in..." />;
}

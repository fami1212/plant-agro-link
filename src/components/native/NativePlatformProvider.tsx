import { useNativePlatform } from "@/hooks/useNativePlatform";

export function NativePlatformProvider({ children }: { children: React.ReactNode }) {
  const { isNative, platform } = useNativePlatform();

  return (
    <div
      className={isNative ? `native-app platform-${platform}` : "web-app"}
      style={{ minHeight: "100dvh" }}
    >
      {children}
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

/**
 * Notifications locales / push :
 * - natif (Capacitor) : @capacitor/local-notifications
 * - web : Notification API via le Service Worker
 */
export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [supported, setSupported] = useState(false);
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      if (isNative) {
        setSupported(true);
        try {
          const res = await LocalNotifications.checkPermissions();
          if (!cancelled) {
            setPermission(res.display === "granted" ? "granted" : res.display === "denied" ? "denied" : "default");
          }
        } catch {
          /* noop */
        }
        return;
      }
      const isSupported = "Notification" in window && "serviceWorker" in navigator;
      setSupported(isSupported);
      if (isSupported) setPermission(Notification.permission);
    };
    init();
    return () => {
      cancelled = true;
    };
  }, [isNative]);

  const requestPermission = useCallback(async () => {
    if (!supported) return false;
    if (isNative) {
      const res = await LocalNotifications.requestPermissions();
      const granted = res.display === "granted";
      setPermission(granted ? "granted" : "denied");
      return granted;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    return result === "granted";
  }, [supported, isNative]);

  const sendLocalNotification = useCallback(
    async (title: string, options?: NotificationOptions & { link?: string }) => {
      if (permission !== "granted") return;

      if (isNative) {
        try {
          await LocalNotifications.schedule({
            notifications: [
              {
                id: Math.floor(Math.random() * 2147483000),
                title,
                body: options?.body || "",
                extra: { link: options?.link },
              },
            ],
          });
        } catch {
          /* noop */
        }
        return;
      }

      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready;
        reg.showNotification(title, {
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          ...options,
        } as NotificationOptions);
      }
    },
    [permission, isNative]
  );

  return { permission, supported, isNative, requestPermission, sendLocalNotification };
}

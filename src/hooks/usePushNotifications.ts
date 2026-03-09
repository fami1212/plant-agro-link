import { useCallback, useEffect, useState } from "react";

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const isSupported = "Notification" in window && "serviceWorker" in navigator;
    setSupported(isSupported);
    if (isSupported) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!supported) return false;
    const result = await Notification.requestPermission();
    setPermission(result);
    return result === "granted";
  }, [supported]);

  const sendLocalNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (permission !== "granted") return;
      
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, {
            icon: "/icons/icon-192.png",
            badge: "/icons/icon-192.png",
            ...options,
          } as NotificationOptions);
        });
      }
    },
    [permission]
  );

  return { permission, supported, requestPermission, sendLocalNotification };
}

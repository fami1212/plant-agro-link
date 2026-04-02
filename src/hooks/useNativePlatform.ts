import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export function useNativePlatform() {
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'

  useEffect(() => {
    if (!isNative) return;

    const setupNative = async () => {
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setStyle({ style: Style.Light });
        if (platform === 'android') {
          await StatusBar.setBackgroundColor({ color: '#22C55E' });
        }
      } catch (e) {
        // StatusBar not available
      }

      try {
        const { Keyboard } = await import('@capacitor/keyboard');
        Keyboard.addListener('keyboardWillShow', () => {
          document.body.classList.add('keyboard-open');
        });
        Keyboard.addListener('keyboardWillHide', () => {
          document.body.classList.remove('keyboard-open');
        });
      } catch (e) {
        // Keyboard not available
      }

      try {
        const { SplashScreen } = await import('@capacitor/splash-screen');
        await SplashScreen.hide();
      } catch (e) {
        // SplashScreen not available
      }
    };

    setupNative();
  }, [isNative, platform]);

  return { isNative, platform };
}

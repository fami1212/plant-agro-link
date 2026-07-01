import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'sn.planterea.app',
  appName: 'PlantErea',
  webDir: 'dist',
  server: {
    // Use production domain for deep-links and OAuth callbacks. Keep
    // `androidScheme` https so cookies/localStorage stay isolated per origin.
    androidScheme: 'https',
    hostname: 'plant-erea.com',
    // Do NOT set `url` — that would proxy the whole app to an external site.
    // We only ship the built bundle inside the native shell.
    allowNavigation: ['plant-erea.com', '*.plant-erea.com', '*.supabase.co'],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#FCFCFC',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#22C55E',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;

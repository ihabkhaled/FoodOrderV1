import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ihabkhaled.foodorderv1',
  appName: 'FoodOrder',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: { androidScheme: 'https' },
  plugins: {
    Keyboard: { resize: 'body', resizeOnFullScreen: true },
    StatusBar: { style: 'DARK', backgroundColor: '#fffaf2' },
  },
};

export default config;

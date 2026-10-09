import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.masrofy.app',
  appName: 'Masrofy',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;

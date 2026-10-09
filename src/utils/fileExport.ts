/**
 * Cross-platform file export utility for Web & Android Capacitor APK
 * Directly saves/downloads files into the user's phone Downloads folder without opening share dialogs
 */
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

interface NativeDownloaderPlugin {
  downloadFile(options: {
    filename: string;
    content: string;
    mimeType: string;
  }): Promise<{ success: boolean; uri?: string; canceled?: boolean }>;
}

const NativeDownloader = registerPlugin<NativeDownloaderPlugin>('NativeDownloader');

export async function exportFile({
  filename,
  content,
  mimeType,
}: {
  filename: string;
  content: string;
  mimeType: string;
}): Promise<{ success: boolean; method: 'download'; canceled?: boolean; error?: string; uri?: string }> {
  // 1. Android Native Platform: Primary & Direct Download via NativeDownloader (MediaStore.Downloads)
  if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
    try {
      const res = await NativeDownloader.downloadFile({
        filename,
        content,
        mimeType,
      });
      if (res && res.success) {
        return { success: true, method: 'download', uri: res.uri };
      }
      if (res && res.canceled) {
        return { success: false, method: 'download', canceled: true };
      }
    } catch (pluginErr: any) {
      console.warn('NativeDownloader plugin error, attempting Filesystem fallback:', pluginErr);
    }

    // 2. Android Capacitor Filesystem Fallback
    try {
      try {
        const perm = await Filesystem.checkPermissions();
        if (perm.publicStorage !== 'granted') {
          await Filesystem.requestPermissions();
        }
      } catch {}

      // Write to public Documents or External Downloads
      try {
        const docResult = await Filesystem.writeFile({
          path: filename,
          data: content,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
          recursive: true,
        });
        return { success: true, method: 'download', uri: docResult.uri };
      } catch {
        const extResult = await Filesystem.writeFile({
          path: `Download/${filename}`,
          data: content,
          directory: Directory.ExternalStorage,
          encoding: Encoding.UTF8,
          recursive: true,
        });
        return { success: true, method: 'download', uri: extResult.uri };
      }
    } catch (fsErr: any) {
      console.warn('Filesystem fallback failed:', fsErr);
    }
  }

  // 3. Web & Mobile Browser Direct Download (<a download>)
  try {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 400);

    return { success: true, method: 'download' };
  } catch (err: any) {
    console.error('Browser download failed:', err);
    return { success: false, method: 'download', error: err?.message || 'Download failed' };
  }
}

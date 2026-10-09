/**
 * Cross-platform file export utility for Web & Android Capacitor APK
 * Directly saves/downloads files into the user's Downloads or Documents folder
 */
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

export async function exportFile({
  filename,
  content,
  mimeType,
}: {
  filename: string;
  content: string;
  mimeType: string;
}): Promise<{ success: boolean; method: 'download'; canceled?: boolean; error?: string }> {
  let savedNatively = false;

  // 1. Android Native APK (Capacitor Native Platform):
  // Saves file directly into user storage Downloads / Documents folder without opening any share sheet
  if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
    try {
      // Check and request storage permissions if required on Android
      try {
        const perm = await Filesystem.checkPermissions();
        if (perm.publicStorage !== 'granted') {
          await Filesystem.requestPermissions();
        }
      } catch (pErr) {
        // Permissions not needed or auto-granted on modern Android Scoped Storage
      }

      // First attempt: write to Public Documents directory
      try {
        await Filesystem.writeFile({
          path: filename,
          data: content,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
          recursive: true,
        });
        savedNatively = true;
      } catch {
        // Fallback: write to Downloads folder under External Storage
        await Filesystem.writeFile({
          path: `Download/${filename}`,
          data: content,
          directory: Directory.ExternalStorage,
          encoding: Encoding.UTF8,
          recursive: true,
        });
        savedNatively = true;
      }
    } catch (err: any) {
      console.warn('Capacitor native filesystem export failed, falling back to Web API:', err);
    }
  }

  // 2. Direct Web & Mobile Browser Download directly to device Downloads folder
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
    }, 300);

    return { success: true, method: 'download' };
  } catch (err: any) {
    if (savedNatively) {
      return { success: true, method: 'download' };
    }
    console.error('Download link failed:', err);
    return { success: false, method: 'download', error: err?.message || 'Download failed' };
  }
}

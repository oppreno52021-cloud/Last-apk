package com.masrofy.app;

import android.app.DownloadManager;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "NativeDownloader")
public class NativeDownloaderPlugin extends Plugin {

    @PluginMethod
    public void downloadFile(PluginCall call) {
        String filename = call.getString("filename", "export.csv");
        String content = call.getString("content", "");
        String mimeType = call.getString("mimeType", "text/csv");

        if (filename == null || filename.trim().isEmpty()) {
            filename = "Masrofy_Export_" + System.currentTimeMillis() + ".csv";
        }
        if (content == null) {
            content = "";
        }
        if (mimeType == null || mimeType.trim().isEmpty()) {
            mimeType = "text/csv";
        }

        try {
            byte[] bytes = content.getBytes(StandardCharsets.UTF_8);
            Uri fileUri = null;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // Modern Android 10+ (API 29+) MediaStore.Downloads API
                // Writes directly to user's real Downloads folder without requiring dangerous permissions
                ContentValues values = new ContentValues();
                values.put(MediaStore.MediaColumns.DISPLAY_NAME, filename);
                values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
                values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                values.put(MediaStore.MediaColumns.IS_PENDING, 1);

                ContentResolver resolver = getContext().getContentResolver();
                fileUri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);

                if (fileUri != null) {
                    try (OutputStream os = resolver.openOutputStream(fileUri)) {
                        if (os != null) {
                            os.write(bytes);
                            os.flush();
                        }
                    }

                    values.clear();
                    values.put(MediaStore.MediaColumns.IS_PENDING, 0);
                    resolver.update(fileUri, values, null, null);
                } else {
                    throw new Exception("Could not create MediaStore entry for " + filename);
                }
            } else {
                // Android 9 and older: Direct write to public Downloads directory
                File downloadDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                if (!downloadDir.exists()) {
                    downloadDir.mkdirs();
                }
                File file = new File(downloadDir, filename);
                try (FileOutputStream fos = new FileOutputStream(file)) {
                    fos.write(bytes);
                    fos.flush();
                }
                fileUri = Uri.fromFile(file);

                DownloadManager dm = (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
                if (dm != null) {
                    dm.addCompletedDownload(
                        filename,
                        "Masrofy Export",
                        true,
                        mimeType,
                        file.getAbsolutePath(),
                        file.length(),
                        true
                    );
                }
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("uri", fileUri != null ? fileUri.toString() : "");
            call.resolve(ret);

        } catch (Exception e) {
            call.reject("Failed to save file to Downloads: " + e.getMessage(), e);
        }
    }
}

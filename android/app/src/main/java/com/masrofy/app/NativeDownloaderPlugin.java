package com.masrofy.app;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.Intent;
import android.net.Uri;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "NativeDownloader")
public class NativeDownloaderPlugin extends Plugin {

    @PluginMethod
    public void downloadFile(PluginCall call) {
        String filename = call.getString("filename", "Masrofy_Backup.json");
        String mimeType = call.getString("mimeType", "application/json");

        if (filename == null || filename.trim().isEmpty()) {
            filename = "Masrofy_Export_" + System.currentTimeMillis() + ".json";
        }
        if (mimeType == null || mimeType.trim().isEmpty()) {
            mimeType = "*/*";
        }

        try {
            // Android Storage Access Framework (SAF) - ACTION_CREATE_DOCUMENT
            // Opens native Android System File Picker to let the user save to Downloads, Documents, SD card, Drive, etc.
            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType(mimeType);
            intent.putExtra(Intent.EXTRA_TITLE, filename);

            startActivityForResult(call, intent, "saveFileResult");
        } catch (Exception e) {
            call.reject("Could not launch Android file picker: " + e.getMessage(), e);
        }
    }

    @ActivityCallback
    private void saveFileResult(PluginCall call, ActivityResult result) {
        if (call == null) return;

        if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
            Uri targetUri = result.getData().getData();
            if (targetUri != null) {
                try {
                    String content = call.getString("content", "");
                    byte[] bytes = content.getBytes(StandardCharsets.UTF_8);

                    ContentResolver resolver = getContext().getContentResolver();
                    try (OutputStream os = resolver.openOutputStream(targetUri)) {
                        if (os != null) {
                            os.write(bytes);
                            os.flush();
                        } else {
                            throw new Exception("Unable to open output stream for chosen location");
                        }
                    }

                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    ret.put("uri", targetUri.toString());
                    call.resolve(ret);
                    return;
                } catch (Exception e) {
                    call.reject("Failed to write file to selected location: " + e.getMessage(), e);
                    return;
                }
            }
        }

        // User dismissed, pressed back, or canceled the file picker
        JSObject ret = new JSObject();
        ret.put("success", false);
        ret.put("canceled", true);
        call.resolve(ret);
    }
}

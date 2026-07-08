package com.alzaabi.rased.teachers.app;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "RasedScheduleWidget")
public class RasedScheduleWidgetPlugin extends Plugin {

    public static final String PREFS_NAME = "rased_schedule_widget_prefs";
    public static final String KEY_WIDGET_DATA = "widget_data";

    // للتوافق إذا بقي أي ملف قديم يستخدم الاسم السابق
    public static final String KEY_PAYLOAD = KEY_WIDGET_DATA;

    public static final String ACTION_RASED_WIDGET_REFRESH =
            "com.alzaabi.rased.teachers.app.ACTION_RASED_WIDGET_REFRESH";

    @PluginMethod
    public void update(PluginCall call) {
        String data = call.getString("data", "");

        Context context = getContext();

        if (context == null) {
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("message", "Context is null");
            call.resolve(ret);
            return;
        }

        SharedPreferences prefs = context.getSharedPreferences(
                PREFS_NAME,
                Context.MODE_PRIVATE
        );

        prefs.edit()
                .putString(KEY_WIDGET_DATA, data == null ? "" : data)
                .putLong("last_update", System.currentTimeMillis())
                .apply();

        // تحديث مباشر
        RasedScheduleWidgetProvider.updateAllWidgets(context);

        // Broadcast إضافي احتياطي
        Intent intent = new Intent(context, RasedScheduleWidgetProvider.class);
        intent.setAction(ACTION_RASED_WIDGET_REFRESH);
        context.sendBroadcast(intent);

        JSObject ret = new JSObject();
        ret.put("success", true);
        ret.put("message", "Widget data saved and refresh requested");
        call.resolve(ret);
    }
}

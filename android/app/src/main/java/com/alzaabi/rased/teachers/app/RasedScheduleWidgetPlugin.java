package com.alzaabi.rased.teachers.app;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
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
    public static final String KEY_PAYLOAD = "schedule_payload";

    @PluginMethod
    public void updateScheduleWidget(PluginCall call) {
        String payload = call.getString("payload", "");

        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putString(KEY_PAYLOAD, payload).apply();

        Intent intent = new Intent(getContext(), RasedScheduleWidgetProvider.class);
        intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);

        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(getContext());
        ComponentName componentName = new ComponentName(getContext(), RasedScheduleWidgetProvider.class);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(componentName);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, appWidgetIds);
        getContext().sendBroadcast(intent);

        JSObject result = new JSObject();
        result.put("success", true);
        result.put("widgets", appWidgetIds.length);
        call.resolve(result);
    }
}

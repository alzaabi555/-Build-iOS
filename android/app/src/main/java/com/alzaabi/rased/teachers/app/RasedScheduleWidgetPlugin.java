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
    public static final String KEY_WIDGET_DATA = "widget_data";

    @PluginMethod
    public void update(PluginCall call) {
        String data = call.getString("data", "{}");

        Context context = getContext();

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
                .putString(KEY_WIDGET_DATA, data)
                .putLong("last_update", System.currentTimeMillis())
                .apply();

        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName componentName = new ComponentName(context, RasedScheduleWidgetProvider.class);
        int[] widgetIds = appWidgetManager.getAppWidgetIds(componentName);

        Intent intent = new Intent(context, RasedScheduleWidgetProvider.class);
        intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, widgetIds);
        context.sendBroadcast(intent);

        JSObject ret = new JSObject();
        ret.put("success", true);
        ret.put("updatedWidgets", widgetIds.length);
        call.resolve(ret);
    }
}

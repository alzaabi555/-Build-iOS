package com.alzaabi.rased.teachers.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.widget.RemoteViews;

import org.json.JSONObject;

public class RasedScheduleWidgetProvider extends AppWidgetProvider {

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);

        if (intent == null) return;

        String action = intent.getAction();

        if (
                AppWidgetManager.ACTION_APPWIDGET_UPDATE.equals(action) ||
                RasedScheduleWidgetPlugin.ACTION_RASED_WIDGET_REFRESH.equals(action)
        ) {
            updateAllWidgets(context);
        }
    }

    @Override
    public void onUpdate(
            Context context,
            AppWidgetManager appWidgetManager,
            int[] appWidgetIds
    ) {
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAllWidgets(Context context) {
        if (context == null) return;

        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);

        ComponentName componentName = new ComponentName(
                context,
                RasedScheduleWidgetProvider.class
        );

        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(componentName);

        if (appWidgetIds == null || appWidgetIds.length == 0) return;

        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
        }
    }

    private static void updateWidget(
            Context context,
            AppWidgetManager appWidgetManager,
            int appWidgetId
    ) {
        RemoteViews views = new RemoteViews(
                context.getPackageName(),
                R.layout.rased_schedule_widget
        );

        WidgetState state = readWidgetState(context);

        views.setTextViewText(R.id.widget_title, "راصد - جدول الحصص");
        views.setTextViewText(R.id.widget_today, state.todayName);

        views.setTextViewText(R.id.widget_current_label, state.currentLabel);
        views.setTextViewText(R.id.widget_current_class, state.currentClass);
        views.setTextViewText(R.id.widget_current_time, state.currentTime);

        views.setTextViewText(R.id.widget_next_label, state.nextLabel);
        views.setTextViewText(R.id.widget_next_class, state.nextClass);
        views.setTextViewText(R.id.widget_next_time, state.nextTime);

        views.setTextViewText(R.id.widget_updated, state.updatedText);

        Intent launchIntent = context
                .getPackageManager()
                .getLaunchIntentForPackage(context.getPackageName());

        if (launchIntent != null) {
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }

            PendingIntent pendingIntent = PendingIntent.getActivity(
                    context,
                    0,
                    launchIntent,
                    flags
            );

            views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);
        }

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private static WidgetState readWidgetState(Context context) {
        WidgetState fallback = new WidgetState();

        fallback.todayName = "جدول اليوم";
        fallback.currentLabel = "الحصة الآن";
        fallback.currentClass = "افتح راصد لتحديث الجدول";
        fallback.currentTime = "--:--";
        fallback.nextLabel = "القادمة";
        fallback.nextClass = "غير محدد";
        fallback.nextTime = "--:--";
        fallback.updatedText = "لم يتم تحديث الويدجيت بعد";

        try {
            SharedPreferences prefs = context.getSharedPreferences(
                    RasedScheduleWidgetPlugin.PREFS_NAME,
                    Context.MODE_PRIVATE
            );

            String payload = prefs.getString(
                    RasedScheduleWidgetPlugin.KEY_WIDGET_DATA,
                    ""
            );

            if (payload == null || payload.trim().isEmpty()) {
                return fallback;
            }

            JSONObject data = new JSONObject(payload);

            WidgetState state = new WidgetState();

            state.todayName = safeText(
                    data.optString("todayName", ""),
                    fallback.todayName
            );

            state.currentLabel = safeText(
                    data.optString("currentTitle", ""),
                    fallback.currentLabel
            );

            state.currentClass = safeText(
                    data.optString("currentClass", ""),
                    "-"
            );

            state.currentTime = safeText(
                    data.optString("currentTime", ""),
                    "--:--"
            );

            state.nextLabel = safeText(
                    data.optString("nextTitle", ""),
                    fallback.nextLabel
            );

            state.nextClass = safeText(
                    data.optString("nextClass", ""),
                    "-"
            );

            state.nextTime = safeText(
                    data.optString("nextTime", ""),
                    "--:--"
            );

            String updatedAt = data.optString("updatedAt", "");

            if (updatedAt != null && !updatedAt.trim().isEmpty()) {
                state.updatedText = "آخر تحديث: " + updatedAt.trim();
            } else {
                state.updatedText = "آخر تحديث من راصد";
            }

            return state;
        } catch (Exception e) {
            return fallback;
        }
    }

    private static String safeText(String value, String fallback) {
        if (value == null) return fallback;

        String clean = value.trim();

        if (clean.isEmpty()) return fallback;

        return clean;
    }

    static class WidgetState {
        String todayName;
        String currentLabel;
        String currentClass;
        String currentTime;
        String nextLabel;
        String nextClass;
        String nextTime;
        String updatedText;
    }
}

package com.alzaabi.rased.teachers.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.Map;

public class RasedScheduleWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
        }
    }

    static void updateWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.rased_schedule_widget);

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

        Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launchIntent != null) {
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
            PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, launchIntent, flags);
            views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);
        }

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private static WidgetState readWidgetState(Context context) {
        WidgetState fallback = new WidgetState();
        fallback.todayName = getArabicTodayName();
        fallback.currentLabel = "الحصة الآن";
        fallback.currentClass = "افتح راصد لتحديث الجدول";
        fallback.currentTime = "--:--";
        fallback.nextLabel = "القادمة";
        fallback.nextClass = "غير محدد";
        fallback.nextTime = "--:--";
        fallback.updatedText = "لم يتم تحديث الويدجيت بعد";

        try {
            SharedPreferences prefs = context.getSharedPreferences(RasedScheduleWidgetPlugin.PREFS_NAME, Context.MODE_PRIVATE);
            String payload = prefs.getString(RasedScheduleWidgetPlugin.KEY_PAYLOAD, "");
            if (payload == null || payload.trim().isEmpty()) return fallback;

            JSONObject root = new JSONObject(payload);
            String subject = root.optString("subject", "");
            JSONArray schedule = root.optJSONArray("schedule");
            JSONArray periodTimes = root.optJSONArray("periodTimes");
            if (schedule == null || periodTimes == null) return fallback;

            String todayName = getArabicTodayName();
            JSONObject todaySchedule = findTodaySchedule(schedule, todayName);
            if (todaySchedule == null) {
                fallback.currentClass = "لا يوجد جدول محفوظ لهذا اليوم";
                fallback.nextClass = "افتح راصد للتحقق";
                return fallback;
            }

            JSONArray periods = todaySchedule.optJSONArray("periods");
            if (periods == null || periods.length() == 0) {
                fallback.currentClass = "لا توجد حصص اليوم";
                fallback.nextClass = "لا توجد حصص قادمة";
                return fallback;
            }

            LocalTime now = LocalTime.now();
            Period current = null;
            Period next = null;

            int max = Math.min(periods.length(), periodTimes.length());
            for (int i = 0; i < max; i++) {
                String className = periods.optString(i, "").trim();
                JSONObject timeObj = periodTimes.optJSONObject(i);
                if (timeObj == null) continue;

                LocalTime start = parseTime(timeObj.optString("startTime", ""));
                LocalTime end = parseTime(timeObj.optString("endTime", ""));
                if (start == null || end == null) continue;

                if (!className.isEmpty()) {
                    if ((now.equals(start) || now.isAfter(start)) && now.isBefore(end)) {
                        current = new Period(i + 1, className, subject, start, end);
                    } else if (now.isBefore(start) && next == null) {
                        next = new Period(i + 1, className, subject, start, end);
                    }
                }
            }

            WidgetState state = new WidgetState();
            state.todayName = todayName;
            state.currentLabel = "الحصة الآن";
            state.nextLabel = "القادمة";

            if (current != null) {
                state.currentClass = current.className;
                state.currentTime = formatPeriod(current);
            } else {
                state.currentClass = "لا توجد حصة حاليًا";
                state.currentTime = "--:--";
            }

            if (next != null) {
                state.nextClass = next.className;
                state.nextTime = formatPeriod(next);
            } else {
                state.nextClass = current == null ? "انتهى جدول اليوم" : "لا توجد حصة قادمة";
                state.nextTime = "--:--";
            }

            String updatedAt = root.optString("updatedAt", "");
            state.updatedText = updatedAt.isEmpty() ? "آخر تحديث: غير محدد" : "آخر تحديث من راصد";
            return state;
        } catch (Exception e) {
            return fallback;
        }
    }

    private static JSONObject findTodaySchedule(JSONArray schedule, String todayName) {
        for (int i = 0; i < schedule.length(); i++) {
            JSONObject item = schedule.optJSONObject(i);
            if (item == null) continue;
            String dayName = item.optString("dayName", "").trim();
            if (dayName.equals(todayName)) return item;
        }
        return null;
    }

    private static LocalTime parseTime(String value) {
        try {
            if (value == null || value.trim().isEmpty()) return null;
            String[] parts = value.trim().split(":");
            if (parts.length < 2) return null;
            return LocalTime.of(Integer.parseInt(parts[0]), Integer.parseInt(parts[1]));
        } catch (Exception e) {
            return null;
        }
    }

    private static String formatPeriod(Period period) {
        return two(period.start.getHour()) + ":" + two(period.start.getMinute()) + " - " + two(period.end.getHour()) + ":" + two(period.end.getMinute());
    }

    private static String two(int value) {
        return value < 10 ? "0" + value : String.valueOf(value);
    }

    private static String getArabicTodayName() {
        Map<Integer, String> days = new HashMap<>();
        days.put(1, "الاثنين");
        days.put(2, "الثلاثاء");
        days.put(3, "الأربعاء");
        days.put(4, "الخميس");
        days.put(5, "الجمعة");
        days.put(6, "السبت");
        days.put(7, "الأحد");
        return days.get(LocalDate.now().getDayOfWeek().getValue());
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

    static class Period {
        int number;
        String className;
        String subject;
        LocalTime start;
        LocalTime end;
        Period(int number, String className, String subject, LocalTime start, LocalTime end) {
            this.number = number;
            this.className = className;
            this.subject = subject;
            this.start = start;
            this.end = end;
        }
    }
}

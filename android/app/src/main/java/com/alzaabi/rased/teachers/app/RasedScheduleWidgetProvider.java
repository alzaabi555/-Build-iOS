package com.alzaabi.rased.teachers.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.Locale;

public class RasedScheduleWidgetProvider extends AppWidgetProvider {
    public static final String ACTION_AUTO_REFRESH =
            "com.alzaabi.rased.teachers.app.ACTION_RASED_WIDGET_AUTO_REFRESH";
    private static final int ALARM_REQUEST_CODE = 70031;

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (intent == null) return;
        String action = intent.getAction();
        if (AppWidgetManager.ACTION_APPWIDGET_UPDATE.equals(action)
                || RasedScheduleWidgetPlugin.ACTION_RASED_WIDGET_REFRESH.equals(action)
                || ACTION_AUTO_REFRESH.equals(action)
                || Intent.ACTION_BOOT_COMPLETED.equals(action)
                || Intent.ACTION_TIME_CHANGED.equals(action)
                || Intent.ACTION_TIMEZONE_CHANGED.equals(action)
                || Intent.ACTION_DATE_CHANGED.equals(action)) {
            updateAllWidgets(context);
        }
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) updateWidget(context, manager, id);
        scheduleNextRefresh(context);
    }

    @Override
    public void onEnabled(Context context) {
        super.onEnabled(context);
        updateAllWidgets(context);
    }

    @Override
    public void onDisabled(Context context) {
        super.onDisabled(context);
        cancelScheduledRefresh(context);
    }

    public static void updateAllWidgets(Context context) {
        if (context == null) return;
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName name = new ComponentName(context, RasedScheduleWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(name);
        if (ids != null) {
            for (int id : ids) updateWidget(context, manager, id);
        }
        scheduleNextRefresh(context);
    }

    private static void updateWidget(Context context, AppWidgetManager manager, int id) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.rased_schedule_widget);
        WidgetState state = readWidgetState(context);

        views.setTextViewText(R.id.widget_title, "راصد");
        views.setTextViewText(R.id.widget_subtitle, "جدول الحصص");
        views.setTextViewText(R.id.widget_today, state.todayName);
        views.setTextViewText(R.id.widget_updated, state.updatedText);

        if (state.singleStatusMode) {
            views.setViewVisibility(R.id.widget_periods_container, View.GONE);
            views.setViewVisibility(R.id.widget_status_container, View.VISIBLE);
            views.setTextViewText(R.id.widget_status_icon, state.statusIcon);
            views.setTextViewText(R.id.widget_status_title, state.statusTitle);
            views.setTextViewText(R.id.widget_status_main, state.statusMain);
            views.setTextViewText(R.id.widget_status_subtitle, state.statusSubtitle);
        } else {
            views.setViewVisibility(R.id.widget_periods_container, View.VISIBLE);
            views.setViewVisibility(R.id.widget_status_container, View.GONE);
            views.setTextViewText(R.id.widget_current_label, state.currentLabel);
            views.setTextViewText(R.id.widget_current_class, state.currentClass);
            views.setTextViewText(R.id.widget_current_subject, state.currentSubject);
            views.setTextViewText(R.id.widget_current_time, state.currentTime);
            views.setTextViewText(R.id.widget_next_label, state.nextLabel);
            views.setTextViewText(R.id.widget_next_class, state.nextClass);
            views.setTextViewText(R.id.widget_next_subject, state.nextSubject);
            views.setTextViewText(R.id.widget_next_time, state.nextTime);
        }

        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launch != null) {
            launch.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
            PendingIntent pending = PendingIntent.getActivity(context, 0, launch, flags);
            views.setOnClickPendingIntent(R.id.widget_root, pending);
        }
        manager.updateAppWidget(id, views);
    }

    private static WidgetState readWidgetState(Context context) {
        WidgetState fallback = WidgetState.fallback();
        try {
            SharedPreferences prefs = context.getSharedPreferences(
                    RasedScheduleWidgetPlugin.PREFS_NAME, Context.MODE_PRIVATE);
            String payload = prefs.getString(RasedScheduleWidgetPlugin.KEY_WIDGET_DATA, "");
            if (payload == null || payload.trim().isEmpty()) return fallback;
            JSONObject data = new JSONObject(payload);
            JSONArray days = data.optJSONArray("scheduleDays");
            if (days != null && days.length() > 0) {
                return calculateNativeState(data, days);
            }
            return readLegacyState(data);
        } catch (Exception ignored) {
            return fallback;
        }
    }

    private static WidgetState calculateNativeState(JSONObject data, JSONArray days) {
        Calendar now = Calendar.getInstance();
        int javaDay = now.get(Calendar.DAY_OF_WEEK); // Sunday=1
        int dayIndex = javaDay == Calendar.FRIDAY || javaDay == Calendar.SATURDAY ? 0 : javaDay - 1;
        boolean isToday = javaDay != Calendar.FRIDAY && javaDay != Calendar.SATURDAY;
        JSONObject day = findDay(days, dayIndex);
        String dayName = safe(day != null ? day.optString("dayName", "") : "", "جدول اليوم");
        List<Period> periods = parsePeriods(day);
        int nowMinutes = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE);

        WidgetState state = new WidgetState();
        state.todayName = isToday ? dayName : "الدوام القادم • " + dayName;
        state.updatedText = formatUpdatedText(data.optLong("scheduleUpdatedAtMillis", 0L));

        if (periods.isEmpty()) {
            state.singleStatusMode = true;
            state.statusIcon = "▣";
            state.statusTitle = "جدول اليوم";
            state.statusMain = "لا توجد حصص مسجلة اليوم";
            state.statusSubtitle = "يمكنك مراجعة الجدول من داخل راصد";
            return state;
        }

        if (!isToday) {
            fillPeriodPair(state, periods.get(0), periods.size() > 1 ? periods.get(1) : null,
                    "أول حصة لك • " + periods.get(0).number, "الحصة التالية");
            return state;
        }

        Period current = null;
        Period next = null;
        for (Period p : periods) {
            if (p.start >= 0 && p.end >= 0 && nowMinutes >= p.start && nowMinutes < p.end) current = p;
            if (p.start >= 0 && nowMinutes < p.start) { next = p; break; }
        }

        Period first = periods.get(0);
        Period last = periods.get(periods.size() - 1);
        if (first.start < 0 || last.end < 0) {
            state.singleStatusMode = true;
            state.statusIcon = "!";
            state.statusTitle = "بيانات الجدول غير مكتملة";
            state.statusMain = "أوقات بعض الحصص غير محددة";
            state.statusSubtitle = "افتح راصد وأكمل أوقات الحصص";
            return state;
        }

        if (nowMinutes < first.start) {
            Period afterFirst = periods.size() > 1 ? periods.get(1) : null;
            fillPeriodPair(state, first, afterFirst,
                    "أول حصة لك • " + first.number, "الحصة التالية");
            int until = first.start - nowMinutes;
            state.currentTime = until <= 120
                    ? "تبدأ بعد " + until + " دقيقة"
                    : "تبدأ الساعة " + first.startTime;
            return state;
        }

        if (current != null) {
            fillPeriodPair(state, current, next,
                    "الحصة الآن • " + current.number, "القادمة");
            int remaining = Math.max(0, current.end - nowMinutes);
            state.currentTime = formatRange(current) + " • متبقٍ " + remaining + " دقيقة";
            return state;
        }

        if (next != null) {
            state.singleStatusMode = false;
            state.currentLabel = "بين الحصص";
            state.currentClass = "لا توجد حصة الآن";
            state.currentSubject = "القادمة بعد " + Math.max(0, next.start - nowMinutes) + " دقيقة";
            state.currentTime = "";
            fillNext(state, next, "الحصة القادمة • " + next.number);
            return state;
        }

        state.singleStatusMode = true;
        state.statusIcon = "✓";
        state.statusTitle = "انتهت حصص اليوم";
        state.statusMain = "تم تنفيذ " + periods.size() + " حصص";
        state.statusSubtitle = "نتمنى لك يومًا موفقًا";
        return state;
    }

    private static void fillPeriodPair(WidgetState state, Period current, Period next,
                                       String currentLabel, String nextLabel) {
        state.singleStatusMode = false;
        state.currentLabel = currentLabel;
        state.currentClass = current.className;
        state.currentSubject = current.subject;
        state.currentTime = formatRange(current);
        if (next != null) fillNext(state, next, nextLabel + " • " + next.number);
        else {
            state.nextLabel = "لا توجد حصة تالية";
            state.nextClass = "اكتملت حصص اليوم";
            state.nextSubject = "";
            state.nextTime = "";
        }
    }

    private static void fillNext(WidgetState state, Period next, String label) {
        state.nextLabel = label;
        state.nextClass = next.className;
        state.nextSubject = next.subject;
        state.nextTime = formatRange(next);
    }

    private static JSONObject findDay(JSONArray days, int index) {
        for (int i = 0; i < days.length(); i++) {
            JSONObject day = days.optJSONObject(i);
            if (day != null && day.optInt("dayIndex", i) == index) return day;
        }
        return index >= 0 && index < days.length() ? days.optJSONObject(index) : null;
    }

    private static List<Period> parsePeriods(JSONObject day) {
        List<Period> list = new ArrayList<>();
        if (day == null) return list;
        JSONArray array = day.optJSONArray("periods");
        if (array == null) return list;
        for (int i = 0; i < array.length(); i++) {
            JSONObject item = array.optJSONObject(i);
            if (item == null) continue;
            String className = item.optString("className", "").trim();
            if (className.isEmpty()) continue;
            Period p = new Period();
            p.number = item.optInt("periodNumber", i + 1);
            p.className = className;
            p.subject = item.optString("subject", "").trim();
            p.startTime = item.optString("startTime", "").trim();
            p.endTime = item.optString("endTime", "").trim();
            p.start = minutes(p.startTime);
            p.end = minutes(p.endTime);
            list.add(p);
        }
        return list;
    }

    private static WidgetState readLegacyState(JSONObject data) {
        WidgetState state = new WidgetState();
        state.todayName = safe(data.optString("todayName", ""), "جدول اليوم");
        state.currentLabel = safe(data.optString("currentTitle", ""), "الحصة الآن");
        state.currentClass = safe(data.optString("currentClass", ""), "افتح راصد");
        state.currentSubject = data.optString("currentSubject", "").trim();
        state.currentTime = data.optString("currentTime", "").trim();
        state.nextLabel = safe(data.optString("nextTitle", ""), "القادمة");
        state.nextClass = safe(data.optString("nextClass", ""), "لا توجد حصة قادمة");
        state.nextSubject = data.optString("nextSubject", "").trim();
        state.nextTime = data.optString("nextTime", "").trim();
        state.updatedText = "آخر تحديث: " + safe(data.optString("updatedAt", ""), "من راصد");
        return state;
    }

    private static int minutes(String value) {
        if (value == null || !value.contains(":")) return -1;
        try {
            String[] parts = value.split(":");
            return Integer.parseInt(parts[0]) * 60 + Integer.parseInt(parts[1]);
        } catch (Exception ignored) { return -1; }
    }

    private static String formatRange(Period p) {
        if (p == null || p.startTime.isEmpty() || p.endTime.isEmpty()) return "";
        return p.startTime + " - " + p.endTime;
    }

    private static String safe(String value, String fallback) {
        if (value == null || value.trim().isEmpty()) return fallback;
        return value.trim();
    }

    private static String formatUpdatedText(long millis) {
        if (millis <= 0) return "آخر تحديث من راصد";
        Calendar c = Calendar.getInstance();
        c.setTimeInMillis(millis);
        return String.format(Locale.getDefault(), "آخر تحديث: %02d:%02d",
                c.get(Calendar.HOUR_OF_DAY), c.get(Calendar.MINUTE));
    }

    private static void scheduleNextRefresh(Context context) {
        cancelScheduledRefresh(context);
        long trigger = calculateNextTrigger(context);
        AlarmManager alarm = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarm == null) return;
        PendingIntent pending = alarmPendingIntent(context);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, trigger, pending);
        } else {
            alarm.set(AlarmManager.RTC_WAKEUP, trigger, pending);
        }
    }

    private static long calculateNextTrigger(Context context) {
        long fallback = System.currentTimeMillis() + 15 * 60 * 1000L;
        try {
            SharedPreferences prefs = context.getSharedPreferences(
                    RasedScheduleWidgetPlugin.PREFS_NAME, Context.MODE_PRIVATE);
            JSONObject data = new JSONObject(prefs.getString(
                    RasedScheduleWidgetPlugin.KEY_WIDGET_DATA, "{}"));
            JSONArray days = data.optJSONArray("scheduleDays");
            if (days == null) return fallback;
            Calendar now = Calendar.getInstance();
            int javaDay = now.get(Calendar.DAY_OF_WEEK);
            int dayIndex = javaDay == Calendar.FRIDAY || javaDay == Calendar.SATURDAY ? 0 : javaDay - 1;
            boolean isToday = javaDay != Calendar.FRIDAY && javaDay != Calendar.SATURDAY;
            List<Period> periods = parsePeriods(findDay(days, dayIndex));
            if (isToday) {
                int nowMinutes = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE);
                int nextMinute = Integer.MAX_VALUE;
                for (Period p : periods) {
                    if (p.start > nowMinutes) nextMinute = Math.min(nextMinute, p.start);
                    if (p.end > nowMinutes) nextMinute = Math.min(nextMinute, p.end);
                }
                if (nextMinute != Integer.MAX_VALUE) {
                    Calendar target = (Calendar) now.clone();
                    target.set(Calendar.HOUR_OF_DAY, nextMinute / 60);
                    target.set(Calendar.MINUTE, nextMinute % 60);
                    target.set(Calendar.SECOND, 2);
                    target.set(Calendar.MILLISECOND, 0);
                    return target.getTimeInMillis();
                }
            }
            Calendar midnight = (Calendar) now.clone();
            midnight.add(Calendar.DAY_OF_YEAR, 1);
            midnight.set(Calendar.HOUR_OF_DAY, 0);
            midnight.set(Calendar.MINUTE, 1);
            midnight.set(Calendar.SECOND, 0);
            midnight.set(Calendar.MILLISECOND, 0);
            return midnight.getTimeInMillis();
        } catch (Exception ignored) { return fallback; }
    }

    private static PendingIntent alarmPendingIntent(Context context) {
        Intent intent = new Intent(context, RasedScheduleWidgetProvider.class);
        intent.setAction(ACTION_AUTO_REFRESH);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getBroadcast(context, ALARM_REQUEST_CODE, intent, flags);
    }

    private static void cancelScheduledRefresh(Context context) {
        AlarmManager alarm = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarm != null) alarm.cancel(alarmPendingIntent(context));
    }

    static class Period {
        int number;
        String className = "";
        String subject = "";
        String startTime = "";
        String endTime = "";
        int start = -1;
        int end = -1;
    }

    static class WidgetState {
        boolean singleStatusMode = false;
        String todayName = "جدول اليوم";
        String updatedText = "آخر تحديث من راصد";
        String currentLabel = "الحصة الآن";
        String currentClass = "";
        String currentSubject = "";
        String currentTime = "";
        String nextLabel = "القادمة";
        String nextClass = "";
        String nextSubject = "";
        String nextTime = "";
        String statusIcon = "";
        String statusTitle = "";
        String statusMain = "";
        String statusSubtitle = "";

        static WidgetState fallback() {
            WidgetState state = new WidgetState();
            state.singleStatusMode = true;
            state.statusIcon = "↻";
            state.statusTitle = "جدول الحصص";
            state.statusMain = "افتح راصد لتحديث الجدول";
            state.statusSubtitle = "سيعمل الويدجيت تلقائيًا بعد أول مزامنة";
            return state;
        }
    }
}

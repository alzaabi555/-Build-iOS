const fs = require('fs');
const path = require('path');

// التأكد من أن مجلد www موجود (لأننا وحدنا المسار عليه)
if (!fs.existsSync('www')) {
    fs.mkdirSync('www', { recursive: true });
}

// إنشاء ملف التشغيل الرئيسي
const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <title>راصد</title>
    <meta name="viewport" content="viewport-fit=cover, width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <meta name="theme-color" content="#4f46e5" />
    <link rel="stylesheet" href="index.css">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="index.js"></script>
  </body>
</html>`;

// الكتابة داخل www حصراً
fs.writeFileSync('www/index.html', htmlContent);
console.log('✅ Success: index.html generated in www folder.');

const fs = require('fs');

// مسار الملف الذي نريد تعديله داخل السيرفر
const plistPath = 'ios/App/App/Info.plist';

// الكود المفقود الذي نريد زرعه
const googleAuthXML = `
    <key>CFBundleURLTypes</key>
    <array>
        <dict>
            <key>CFBundleURLSchemes</key>
            <array>
                <string>com.googleusercontent.apps.87037584903-3uc4aeg3nc5lk3pu8crjbaad184bhjth</string>
            </array>
        </dict>
    </array>
`;

try {
    // 1. قراءة الملف الموجود
    if (fs.existsSync(plistPath)) {
        let content = fs.readFileSync(plistPath, 'utf8');

        // 2. التأكد من عدم وجود الكود مسبقاً
        if (!content.includes('com.googleusercontent.apps')) {
            
            // 3. زرع الكود قبل نهاية الملف
            // نبحث عن قفلة الملف ونضع الكود قبلها
            content = content.replace('</dict>\n</plist>', googleAuthXML + '</dict>\n</plist>');
            
            // 4. حفظ الملف المعدل
            fs.writeFileSync(plistPath, content);
            console.log("✅ GREAT! Info.plist has been hacked and fixed successfully!");
        } else {
            console.log("⚠️ Info.plist is already fixed.");
        }
    } else {
        console.error("❌ Error: Could not find Info.plist file.");
        process.exit(1);
    }
} catch (e) {
    console.error("❌ Error running fix script:", e);
    process.exit(1);
}

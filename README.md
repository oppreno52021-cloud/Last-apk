# مصروفي (Masrofy) - Spending Intelligence

تطبيق ذكي وسريع لتتبع المصاريف والميزانية الشخصية، مبني بواسطة Vite + React + Tailwind CSS ومدعوم بـ Capacitor لبناء تطبيق Android APK أصلي.

---

## 📱 بناء واستخراج ملف الـ APK (Build APK)

### الطريقة الأولى: تلقائياً عبر GitHub Actions (الأسهل والأسرع)
1. ارفع المشروع إلى حسابك في **GitHub**.
2. افتح تبويب **Actions** في صفحة المستودع على GitHub.
3. ستجد سير العمل **Build Android APK** يعمل تلقائياً (أو يمكنك الضغط على **Run workflow**).
4. بعد انتهاء البناء (يستغرق حوالي دقيقتين)، ستجد ملف **`masrofy-app-debug.apk`** جاهزاً للتحميل المباشر وتثبيته على هاتفك فوراً!

---

### الطريقة الثانية: محلياً عبر سطر الأوامر (Command Line)
تأكد من تثبيت Node.js و Java JDK 17، ثم نفذ:
```bash
# 1. تثبيت الحزم
npm install

# 2. بناء ملفات الويب
npm run build

# 3. مزامنة كاباسيتور
npx cap sync android

# 4. بناء ملف الـ APK
cd android
./gradlew assembleDebug
```
ستجد ملف الـ APK في المسار:
`android/app/build/outputs/apk/debug/app-debug.apk`

---

### الطريقة الثالثة: عبر Android Studio
1. نفذ:
```bash
npm run build
npx cap sync android
```
2. افتح مجلد `android` داخل **Android Studio**.
3. اختر من القائمة العلوية: **Build > Build Bundle(s) / APK(s) > Build APK(s)**.

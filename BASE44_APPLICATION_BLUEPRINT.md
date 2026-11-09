# מפרט אפיון מלא וקובץ הנחיות לבניית האפליקציה ב-Base44
## קונפיגורטור מוצר – יצירת BOM לפי דרישת לקוח (Product BOM Configurator)

> **הנחיה ל-Base44 AI Builder:**
> מסמך זה מכיל את **כל המידע הגולמי, הסכמות, חוקי התצורה, נתוני האתחול (Seed Data), תהליכי העבודה (Workflows) והדרישות הגרפיות והממשקיות (UI/UX)** הנדרשים לבנייה מלאה, עצמאית ומושלמת של האפליקציה ב-Base44, ללא תלות בקבצי גרפיקה חיצוניים.

---

# חלק 1: סקירת המיזם וארכיטקטורה (Overview & Architecture)

### 1.1 מטרת המערכת
אפליקציית דסקטופ/ווב אינטראקטיבית לניהול תצורה (Configurator) ובניית עץ מוצר (BOM – Bill of Materials) תפעולי אוטומטי להזמנות לקוח מורכבות בעולם מערכות אופטיקה, לייזר, אלקטרוניקה ובקרה.
המערכת מגשרת ומסנכרנת בזמן אמת בין 6 תפקידים ארגוניים:
1. **מכירות (Sales):** הזנת דרישות לקוח והכוונה למכלולים קיימים או סימון חריגות פיתוח בכתום.
2. **רכש / תפ"י (Procurement / Production Control):** ניהול שורות BOM, בחירת חלופות, נעילת שורות, סימון פריטים שהוסרו, ואישור ההזמנה.
3. **פיתוח / הנדסת מערכת (R&D / Engineering):** אפיון פריטים חריגים הדורשים פיתוח (Custom).
4. **ייצור (Manufacturing):** צפייה ב-BOM המאושר והוראות הרכבה.
5. **שירות לקוחות (Customer Support):** מעקב אחר קונפיגורציית המוצר שסופקה ללקוח.
6. **מנהל מערכת (Admin):** שליטה מלאה בקטלוג המכלולים, סוגי המערכות, חוקי התאימות, המשתמשים, הלקוחות וסל המיחזור.

### 1.2 עקרונות ממשק (UI/UX Core)
- **כיווניות מלאה בעברית (RTL):** כל הדפים, הטבלאות, הטפסים ועצי המוצר מיושרים מימין לשמאל (`dir="rtl"`).
- **תמיכה במצב בהיר וכהה (Light / Dark Mode):** מתג מעבר פנימי בתוך התריס העליון, הנשמר ב-`localStorage`.
- **תריס עליון מתכנס (Shutter Drawer):** תפריט עליון שנסגר אוטומטית ביציאת עכבר, עם כפתור נעיצה (📌 Pin) וכפתור חץ קומפקטי.
- **טבלאות 100% Fit ללא גלילה אופקית:** כל שורות הטבלה (כולל מק"ט, פרמטרים, עלות וכפתורי פעולות) מוצגות במלואן על המסך ללא צורך בגלילה שמאלה. תגיות הפרמטרים קומפקטיות (`IP54`, `400V 3P`) עם Tooltip במעבר עכבר.
- **תצוגת עץ מוצר ויזואלית (Visual Product Tree):** עץ היררכי עם קווי חיבור ישירים ותיבות קומפקטיות לכל רמה, כולל הגדלת תמונה בריחוף (Hover Zoom Popover).
- **ייצוא ל-Excel עם 2 גיליונות:**
  - גיליון 1: טבלת BOM מלאה עם פרטי לקוח, מטא-דאטה, היררכיה ושורות שהוסרו.
  - גיליון 2: **תמונה גרפית יחידה ברזולוציה גבוהה** המציגה את עץ המוצר הוויזואלי (ללא תאי טקסט גולמיים).

---

# חלק 2: מודל נתונים וישויות Base44 (Entities & Schemas)

להלן הגדרות ה-JSON Schema של הישויות (Entities) שיש להגדיר ב-Base44:

### 2.1 ישות `Customer` (לקוחות)
```json
{
  "name": "Customer",
  "properties": {
    "id": { "type": "string", "description": "מזהה לקוח ייחודי (CUST-001)" },
    "name": { "type": "string", "description": "שם חברה / ארגון" },
    "contact": { "type": "string", "description": "שם איש קשר ראשי" },
    "email": { "type": "string", "description": "דוא\"ל איש קשר" },
    "phone": { "type": "string", "description": "טלפון איש קשר" },
    "address": { "type": "string", "description": "כתובת הלקוח" },
    "notes": { "type": "string", "description": "הערות" },
    "active": { "type": "boolean", "default": true, "description": "האם פעיל" },
    "createdAt": { "type": "string", "description": "תאריך יצירה" },
    "updatedAt": { "type": "string", "description": "תאריך עדכון אחרון" }
  },
  "required": ["id", "name", "contact"]
}
```

### 2.2 ישות `CatalogRule` (מכלולים ותתי-מכלולים בקטלוג)
```json
{
  "name": "CatalogRule",
  "properties": {
    "sku": { "type": "string", "description": "מק\"ט המכלול (PSU-MOD-100)" },
    "rev": { "type": "string", "default": "Rev A", "description": "מהדורה" },
    "desc": { "type": "string", "description": "תיאור המכלול" },
    "category": { "type": "string", "description": "קטגוריה (ספקי כוח והזנה, אופטיקה וכו')" },
    "parentSku": { "type": "string", "default": "ROOT", "description": "מק\"ט מכלול אב או ROOT אם מכלול ראשי" },
    "matchPower": { "type": "array", "items": { "type": "string" }, "description": "הספקים תואמים" },
    "matchFocal": { "type": "array", "items": { "type": "string" }, "description": "אורכי מוקד תואמים" },
    "matchVoltage": { "type": "array", "items": { "type": "string" }, "description": "הזנות חשמל תואמות" },
    "matchEnv": { "type": "array", "items": { "type": "string" }, "description": "תנאי סביבה תואמים" },
    "matchUsage": { "type": "array", "items": { "type": "string" }, "description": "שימושים תואמים (אזרחי / תעשייתי)" },
    "cost": { "type": "string", "description": "עלות משוערת ($1,150)" },
    "imgType": { "type": "string", "enum": ["optics", "power", "board", "sensor", "custom"], "description": "אייקון גרפי" },
    "customImg": { "type": "string", "nullable": true, "description": "נתיב או URL לתמונה" },
    "active": { "type": "boolean", "default": true, "description": "האם פעיל בהזמנות חדשות" }
  },
  "required": ["sku", "desc", "category", "parentSku"]
}
```

### 2.3 ישות `SystemType` (סוגי מערכות מוצר)
```json
{
  "name": "SystemType",
  "properties": {
    "id": { "type": "string", "description": "מזהה מערכת (SYS-STD-100)" },
    "name": { "type": "string", "description": "שם המערכת" },
    "allowedPowers": { "type": "array", "items": { "type": "string" }, "description": "הספקים מותרים" },
    "allowedFocals": { "type": "array", "items": { "type": "string" }, "description": "אורכי מוקד מותרים" },
    "allowedVoltages": { "type": "array", "items": { "type": "string" }, "description": "מתחים מותרים" },
    "allowedEnvs": { "type": "array", "items": { "type": "string" }, "description": "תנאי סביבה מותרים" },
    "allowedUsages": { "type": "array", "items": { "type": "string" }, "description": "שימושים מותרים" },
    "channels": { "type": "number", "description": "מספר ערוצים" },
    "psuCount": { "type": "number", "description": "כמות ספקי כוח נדרשת" },
    "active": { "type": "boolean", "default": true },
    "customImg": { "type": "string", "nullable": true },
    "catQty": { "type": "object", "description": "כמות נדרשת לפי קטגוריה" }
  },
  "required": ["id", "name"]
}
```

### 2.4 ישות `Order` (הזמנת לקוח)
```json
{
  "name": "Order",
  "properties": {
    "id": { "type": "string", "description": "מספר הזמנה (ORD-2026-001)" },
    "customer": { "type": "string", "description": "שם הלקוח" },
    "contact": { "type": "string", "description": "איש קשר" },
    "email": { "type": "string", "nullable": true },
    "phone": { "type": "string", "nullable": true },
    "systemTypeId": { "type": "string", "description": "מזהה סוג מערכת" },
    "systemName": { "type": "string", "description": "שם סוג המערכת" },
    "deliveryDate": { "type": "string", "description": "תאריך אספקה מבוקש" },
    "createdAt": { "type": "string", "description": "תאריך ושעת פתיחה" },
    "createdBy": { "type": "string", "description": "שם ותפקיד פותח ההזמנה" },
    "updatedAt": { "type": "string", "description": "תאריך עדכון אחרון" },
    "updatedBy": { "type": "string", "description": "שם מעדכן אחרון" },
    "power": { "type": "string", "description": "הספק נבחר" },
    "focal": { "type": "string", "description": "אורך מוקד נבחר" },
    "voltage": { "type": "string", "description": "הזנת חשמל נבחרת" },
    "env": { "type": "string", "description": "תנאי סביבה נבחרים" },
    "usage": { "type": "string", "description": "שימוש נבחר (אזרחי/תעשייתי)" },
    "channels": { "type": "number", "default": 1 },
    "psuCount": { "type": "number", "default": 1 },
    "status": {
      "type": "string",
      "enum": ["ממתין לאישור", "מאושר", "ממתין לפיתוח", "סגורה", "בטיפול", "מבוטלת"]
    },
    "locked": { "type": "boolean", "default": false, "description": "האם ה-BOM נעול ומאושר" },
    "bom": {
      "type": "array",
      "items": { "$ref": "#/definitions/BomRow" },
      "description": "שורות ה-BOM ההיררכיות של ההזמנה"
    }
  },
  "required": ["id", "customer", "systemTypeId", "status"]
}
```

### 2.5 הגדרת מבנה שורת BOM (`BomRow`)
```json
{
  "name": "BomRow",
  "properties": {
    "id": { "type": "string", "description": "מזהה שורה ייחודי (B1, B2...)" },
    "category": { "type": "string", "description": "שם הקטגוריה" },
    "level": { "type": "string", "enum": ["assembly", "sub-assembly"], "description": "רמת מכלול או תת-מכלול" },
    "parentId": { "type": "string", "nullable": true, "description": "מזהה שורת האב (אם זה תת-מכלול)" },
    "sku": { "type": "string", "description": "מק\"ט המכלול" },
    "rev": { "type": "string", "description": "מהדורה (Rev A)" },
    "desc": { "type": "string", "description": "תיאור הפריט" },
    "qty": { "type": "number", "description": "כמות נדרשת במערכת" },
    "selectionType": {
      "type": "string",
      "enum": ["פריט מוגדר", "לבחירת איש רכש", "דרישת פיתוח (Custom)"]
    },
    "alternatives": { "type": "array", "items": { "type": "string" }, "description": "רשימת חלופות תואמות" },
    "selectedAlt": { "type": "string", "description": "החלופה שנבחרה" },
    "isCustom": { "type": "boolean", "description": "האם שורת פיתוח חריגה (מסומנת בכתום)" },
    "approved": { "type": "boolean", "description": "האם השורה אושרה" },
    "rowLocked": { "type": "boolean", "description": "האם השורה נעולה לעריכה" },
    "rowEditing": { "type": "boolean", "description": "האם כרגע במצב בחירת חלופה פתוחה" },
    "removed": { "type": "boolean", "default": false, "description": "האם סומנה כ'הוסר' (🚫) ללא מחיקה מהטבלה" },
    "lastEditedBy": { "type": "string", "description": "מי ערך לאחרונה" },
    "lastEditedAt": { "type": "string", "description": "מתי נערך" },
    "notes": { "type": "string", "description": "הערות והנחיות לרכש/פיתוח" },
    "imgType": { "type": "string" },
    "customImg": { "type": "string", "nullable": true }
  }
}
```

### 2.6 ישות `AppUser` (משתמשים והרשאות)
```json
{
  "name": "AppUser",
  "properties": {
    "id": { "type": "string", "description": "מזהה משתמש (USR-001)" },
    "email": { "type": "string", "description": "דוא\"ל ייחודי" },
    "username": { "type": "string", "description": "שם משתמש בפורמט שם.שם_משפחה" },
    "password": { "type": "string", "description": "סיסמה מוצפנת (ברירת מחדל: 123456)" },
    "fullName": { "type": "string", "description": "שם מלא בעברית" },
    "role": {
      "type": "string",
      "enum": ["sales", "procurement", "dev", "viewer", "manager"],
      "description": "תפקיד ארגוני"
    },
    "provider": { "type": "string", "enum": ["google", "local"] },
    "active": { "type": "boolean", "default": true },
    "createdAt": { "type": "string" },
    "lastSignInAt": { "type": "string" }
  },
  "required": ["id", "email", "fullName", "role"]
}
```

### 2.7 ישות `RecycleBinItem` (סל מיחזור מכלולים ומערכות)
```json
{
  "name": "RecycleBinItem",
  "properties": {
    "recycleId": { "type": "string", "description": "מזהה מחיקה (REC-001)" },
    "itemType": { "type": "string", "enum": ["assembly", "system"] },
    "skuOrId": { "type": "string", "description": "מק\"ט המכלול או מזהה המערכת" },
    "rev": { "type": "string" },
    "name": { "type": "string" },
    "categoryOrDetails": { "type": "string" },
    "deletedBy": { "type": "string", "description": "שם המוחק" },
    "deletedAt": { "type": "string", "description": "תאריך ושעת מחיקה" },
    "deleteReason": { "type": "string", "description": "סיבת המחיקה שהוזנה כחובה" },
    "payload": { "type": "object", "description": "אובייקט הנתונים השלם לשחזור מלא" }
  },
  "required": ["recycleId", "itemType", "skuOrId", "deletedBy", "deleteReason"]
}
```

---

# חלק 3: נתוני אתחול גולמיים מלאים (Seed Data)

### 3.1 חמשת הקטגוריות הראשיות
```json
[
  "אופטיקה ולייזר",
  "ספקי כוח והזנה",
  "מארז ומיגון סביבתי",
  "בקרה ותקשורת",
  "חיישנים וגילוי"
]
```

### 3.2 ערכי אפשרויות קונפיגורציה גלובליים
```json
{
  "POWERS": ["100W", "200W", "1.5kW", "3.0kW", "6.0kW"],
  "FOCALS": ["50mm", "100mm", "250mm"],
  "VOLTAGES": ["230V AC", "400V 3-Phase", "28V DC"],
  "ENVS": ["IP54 מעבדה/פנים", "IP65 שטח ממוזג", "IP67 מוקשח"],
  "USAGES": ["אזרחי", "תעשייתי"]
}
```

### 3.3 15 מכלולים ותתי-מכלולים בקטלוג (Catalog Rules)
```json
[
  {
    "sku": "OPT-MOD-100",
    "rev": "Rev A",
    "desc": "מכלול אופטיקה ראשי סדרה 100",
    "category": "אופטיקה ולייזר",
    "parentSku": "ROOT",
    "matchPower": ["100W", "200W"],
    "matchFocal": ["50mm", "100mm"],
    "matchVoltage": ["230V AC", "400V 3-Phase", "28V DC"],
    "matchEnv": ["IP54 מעבדה/פנים", "IP65 שטח ממוזג", "IP67 מוקשח"],
    "matchUsage": ["אזרחי", "תעשייתי"],
    "cost": "$1,450",
    "imgType": "optics",
    "active": true
  },
  {
    "sku": "SUB-OPT-LENS",
    "rev": "Rev A",
    "desc": "עדשה ממוקדת F50",
    "category": "אופטיקה ולייזר",
    "parentSku": "OPT-MOD-100",
    "matchPower": ["100W", "200W"],
    "matchFocal": ["50mm", "100mm"],
    "matchVoltage": ["230V AC", "400V 3-Phase", "28V DC"],
    "matchEnv": ["IP54 מעבדה/פנים", "IP65 שטח ממוזג", "IP67 מוקשח"],
    "matchUsage": ["אזרחי", "תעשייתי"],
    "cost": "$320",
    "imgType": "optics",
    "active": true
  },
  {
    "sku": "SUB-OPT-CLM",
    "rev": "Rev A",
    "desc": "קולימטור אלומיניום תעופתי",
    "category": "אופטיקה ולייזר",
    "parentSku": "OPT-MOD-100",
    "matchPower": ["100W", "200W"],
    "matchFocal": ["50mm", "100mm"],
    "matchVoltage": ["230V AC", "400V 3-Phase", "28V DC"],
    "matchEnv": ["IP54 מעבדה/פנים", "IP65 שטח ממוזג", "IP67 מוקשח"],
    "matchUsage": ["אזרחי", "תעשייתי"],
    "cost": "$280",
    "imgType": "optics",
    "active": true
  },
  {
    "sku": "PSU-MOD-100",
    "rev": "Rev A",
    "desc": "מכלול ספק כוח סדרה A (230V AC / 400V)",
    "category": "ספקי כוח והזנה",
    "parentSku": "ROOT",
    "matchPower": ["100W", "200W", "1.5kW", "3.0kW", "6.0kW"],
    "matchFocal": ["50mm", "100mm", "250mm"],
    "matchVoltage": ["230V AC", "400V 3-Phase"],
    "matchEnv": ["IP54 מעבדה/פנים", "IP65 שטח ממוזג", "IP67 מוקשח"],
    "matchUsage": ["אזרחי", "תעשייתי"],
    "cost": "$1,150",
    "imgType": "power",
    "active": true
  },
  {
    "sku": "SUB-PSU1-EMI",
    "rev": "Rev A",
    "desc": "פילטר EMI לספק כוח A",
    "category": "ספקי כוח והזנה",
    "parentSku": "PSU-MOD-100",
    "matchPower": ["100W", "200W", "1.5kW", "3.0kW", "6.0kW"],
    "matchFocal": ["50mm", "100mm", "250mm"],
    "matchVoltage": ["230V AC", "400V 3-Phase"],
    "matchEnv": ["IP54 מעבדה/פנים", "IP65 שטח ממוזג", "IP67 מוקשח"],
    "matchUsage": ["אזרחי", "תעשייתי"],
    "cost": "$240",
    "imgType": "board",
    "active": true
  },
  {
    "sku": "SUB-PSU1-REG",
    "rev": "Rev A",
    "desc": "כרטיס ייצוב מתח לספק כוח A",
    "category": "ספקי כוח והזנה",
    "parentSku": "PSU-MOD-100",
    "matchPower": ["100W", "200W", "1.5kW", "3.0kW", "6.0kW"],
    "matchFocal": ["50mm", "100mm", "250mm"],
    "matchVoltage": ["230V AC", "400V 3-Phase"],
    "matchEnv": ["IP54 מעבדה/פנים", "IP65 שטח ממוזג", "IP67 מוקשח"],
    "matchUsage": ["אזרחי", "תעשייתי"],
    "cost": "$310",
    "imgType": "board",
    "active": true
  },
  {
    "sku": "PSU-MOD-200",
    "rev": "Rev A",
    "desc": "מכלול ספק כוח סדרה B (230V AC / 400V / 28V DC)",
    "category": "ספקי כוח והזנה",
    "parentSku": "ROOT",
    "matchPower": ["100W", "200W", "1.5kW", "3.0kW", "6.0kW"],
    "matchFocal": ["50mm", "100mm", "250mm"],
    "matchVoltage": ["230V AC", "400V 3-Phase", "28V DC"],
    "matchEnv": ["IP54 מעבדה/פנים", "IP65 שטח ממוזג", "IP67 מוקשח"],
    "matchUsage": ["אזרחי", "תעשייתי"],
    "cost": "$1,380",
    "imgType": "power",
    "active": true
  },
  {
    "sku": "SUB-PSU2-PFC",
    "rev": "Rev A",
    "desc": "מעגל תיקון גורם הספק PFC",
    "category": "ספקי כוח והזנה",
    "parentSku": "PSU-MOD-200",
    "matchPower": ["100W", "200W", "1.5kW", "3.0kW", "6.0kW"],
    "matchFocal": ["50mm", "100mm", "250mm"],
    "matchVoltage": ["230V AC", "400V 3-Phase", "28V DC"],
    "matchEnv": ["IP54 מעבדה/פנים", "IP65 שטח ממוזג", "IP67 מוקשח"],
    "matchUsage": ["אזרחי", "תעשייתי"],
    "cost": "$290",
    "imgType": "board",
    "active": true
  },
  {
    "sku": "SUB-PSU2-SURG",
    "rev": "Rev A",
    "desc": "הגנת נחשולי מתח Surge Protection",
    "category": "ספקי כוח והזנה",
    "parentSku": "PSU-MOD-200",
    "matchPower": ["100W", "200W", "1.5kW", "3.0kW", "6.0kW"],
    "matchFocal": ["50mm", "100mm", "250mm"],
    "matchVoltage": ["230V AC", "400V 3-Phase", "28V DC"],
    "matchEnv": ["IP54 מעבדה/פנים", "IP65 שטח ממוזג", "IP67 מוקשח"],
    "matchUsage": ["אזרחי", "תעשייתי"],
    "cost": "$195",
    "imgType": "board",
    "active": true
  },
  {
    "sku": "ENC-MOD-100",
    "rev": "Rev A",
    "desc": "מכלול מארז ומיגון מוקשח סדרה 100",
    "category": "מארז ומיגון סביבתי",
    "parentSku": "ROOT",
    "matchPower": ["100W", "200W", "1.5kW", "3.0kW", "6.0kW"],
    "matchFocal": ["50mm", "100mm", "250mm"],
    "matchVoltage": ["230V AC", "400V 3-Phase", "28V DC"],
    "matchEnv": ["IP54 מעבדה/פנים", "IP65 שטח ממוזג", "IP67 מוקשח"],
    "matchUsage": ["אזרחי", "תעשייתי"],
    "cost": "$890",
    "imgType": "board",
    "active": true
  },
  {
    "sku": "SUB-ENC-SEAL",
    "rev": "Rev A",
    "desc": "אטם סיליקון EPDM לתקן IP67",
    "category": "מארז ומיגון סביבתי",
    "parentSku": "ENC-MOD-100",
    "matchPower": ["100W", "200W", "1.5kW", "3.0kW", "6.0kW"],
    "matchFocal": ["50mm", "100mm", "250mm"],
    "matchVoltage": ["230V AC", "400V 3-Phase", "28V DC"],
    "matchEnv": ["IP65 שטח ממוזג", "IP67 מוקשח"],
    "matchUsage": ["אזרחי", "תעשייתי"],
    "cost": "$85",
    "imgType": "board",
    "active": true
  },
  {
    "sku": "SUB-ENC-FAN",
    "rev": "Rev A",
    "desc": "מאוורר קירור תעשייתי מוגן מים IP67",
    "category": "מארז ומיגון סביבתי",
    "parentSku": "ENC-MOD-100",
    "matchPower": ["1.5kW", "3.0kW", "6.0kW"],
    "matchFocal": ["50mm", "100mm", "250mm"],
    "matchVoltage": ["230V AC", "400V 3-Phase", "28V DC"],
    "matchEnv": ["IP54 מעבדה/פנים", "IP65 שטח ממוזג", "IP67 מוקשח"],
    "matchUsage": ["אזרחי", "תעשייתי"],
    "cost": "$140",
    "imgType": "board",
    "active": true
  },
  {
    "sku": "CTL-MOD-100",
    "rev": "Rev A",
    "desc": "מכלול בקר ראשי ותקשורת Ethernet/CAN",
    "category": "בקרה ותקשורת",
    "parentSku": "ROOT",
    "matchPower": ["100W", "200W", "1.5kW", "3.0kW", "6.0kW"],
    "matchFocal": ["50mm", "100mm", "250mm"],
    "matchVoltage": ["230V AC", "400V 3-Phase", "28V DC"],
    "matchEnv": ["IP54 מעבדה/פנים", "IP65 שטח ממוזג", "IP67 מוקשח"],
    "matchUsage": ["אזרחי", "תעשייתי"],
    "cost": "$760",
    "imgType": "sensor",
    "active": true
  },
  {
    "sku": "SUB-CTL-CPU",
    "rev": "Rev A",
    "desc": "כרטיס עיבוד מרכזי ARM Cortex-M7",
    "category": "בקרה ותקשורת",
    "parentSku": "CTL-MOD-100",
    "matchPower": ["100W", "200W", "1.5kW", "3.0kW", "6.0kW"],
    "matchFocal": ["50mm", "100mm", "250mm"],
    "matchVoltage": ["230V AC", "400V 3-Phase", "28V DC"],
    "matchEnv": ["IP54 מעבדה/פנים", "IP65 שטח ממוזג", "IP67 מוקשח"],
    "matchUsage": ["אזרחי", "תעשייתי"],
    "cost": "$340",
    "imgType": "board",
    "active": true
  },
  {
    "sku": "SUB-CTL-COM",
    "rev": "Rev A",
    "desc": "מודול תקשורת RS422 + CAN Isolated",
    "category": "בקרה ותקשורת",
    "parentSku": "CTL-MOD-100",
    "matchPower": ["100W", "200W", "1.5kW", "3.0kW", "6.0kW"],
    "matchFocal": ["50mm", "100mm", "250mm"],
    "matchVoltage": ["230V AC", "400V 3-Phase", "28V DC"],
    "matchEnv": ["IP54 מעבדה/פנים", "IP65 שטח ממוזג", "IP67 מוקשח"],
    "matchUsage": ["אזרחי", "תעשייתי"],
    "cost": "$180",
    "imgType": "board",
    "active": true
  }
]
```

### 3.4 3 סוגי מערכות מוצר (System Types)
```json
[
  {
    "id": "SYS-STD-100",
    "name": "מערכת מעבדה סטנדרטית (Standard Lab)",
    "allowedPowers": ["100W", "200W"],
    "allowedFocals": ["50mm", "100mm"],
    "allowedVoltages": ["230V AC"],
    "allowedEnvs": ["IP54 מעבדה/פנים"],
    "allowedUsages": ["אזרחי"],
    "channels": 1,
    "psuCount": 1,
    "active": true,
    "catQty": {
      "אופטיקה ולייזר": 1,
      "ספקי כוח והזנה": 1,
      "מארז ומיגון סביבתי": 1,
      "בקרה ותקשורת": 1,
      "חיישנים וגילוי": 1
    }
  },
  {
    "id": "SYS-PRO-200",
    "name": "מערכת תעשייתית רב-ערוצית (Industrial Pro)",
    "allowedPowers": ["200W", "1.5kW", "3.0kW"],
    "allowedFocals": ["100mm", "250mm"],
    "allowedVoltages": ["230V AC", "400V 3-Phase"],
    "allowedEnvs": ["IP65 שטח ממוזג", "IP67 מוקשח"],
    "allowedUsages": ["תעשייתי"],
    "channels": 2,
    "psuCount": 2,
    "active": true,
    "catQty": {
      "אופטיקה ולייזר": 2,
      "ספקי כוח והזנה": 2,
      "מארז ומיגון סביבתי": 1,
      "בקרה ותקשורת": 1,
      "חיישנים וגילוי": 2
    }
  },
  {
    "id": "SYS-HD-400",
    "name": "מערכת מוקשחת הספק גבוה (Heavy Duty Rugged)",
    "allowedPowers": ["1.5kW", "3.0kW", "6.0kW"],
    "allowedFocals": ["100mm", "250mm"],
    "allowedVoltages": ["400V 3-Phase", "28V DC"],
    "allowedEnvs": ["IP67 מוקשח"],
    "allowedUsages": ["תעשייתי"],
    "channels": 4,
    "psuCount": 4,
    "active": true,
    "catQty": {
      "אופטיקה ולייזר": 4,
      "ספקי כוח והזנה": 4,
      "מארז ומיגון סביבתי": 1,
      "בקרה ותקשורת": 1,
      "חיישנים וגילוי": 4
    }
  }
]
```

### 3.5 חמשת הלקוחות המנוהלים (Default Customers)
```json
[
  {
    "id": "CUST-001",
    "name": "לקוח א׳ – חברת אלפא טכנולוגיות",
    "contact": "ישראל ישראלי",
    "email": "israel@alpha-tech.co.il",
    "phone": "050-1234567",
    "address": "פארק המדע, רחובות",
    "notes": "לקוח VIP – מערכות אופטיות מתקדמות",
    "active": true,
    "createdAt": "01/01/2026",
    "updatedAt": "01/11/2026"
  },
  {
    "id": "CUST-002",
    "name": "לקוח ב׳ – חברת בטא תעשיות",
    "contact": "דנה לוי",
    "email": "dana.levi@beta-ind.com",
    "phone": "052-9876543",
    "address": "אזור התעשייה קיסריה",
    "notes": "פרויקטי לייזר תעשייתיים",
    "active": true,
    "createdAt": "15/01/2026",
    "updatedAt": "03/11/2026"
  },
  {
    "id": "CUST-003",
    "name": "לקוח ג׳ – קבוצת גמא מערכות",
    "contact": "רועי אברהם",
    "email": "roei@gamma-eng.com",
    "phone": "054-5556677",
    "address": "מתחם מת\"ם, חיפה",
    "notes": "הזמנות רב-ערוציות ותנאי סביבה מוקשחים",
    "active": true,
    "createdAt": "10/02/2026",
    "updatedAt": "02/11/2026"
  },
  {
    "id": "CUST-004",
    "name": "לקוח ד׳ – דלתא הנדסה בע\"מ",
    "contact": "מיכל שפירא",
    "email": "michal@delta-sys.com",
    "phone": "053-3456789",
    "address": "פארק התעשייה שורק",
    "notes": "מערכות מוקשחות לטווח ארוך",
    "active": true,
    "createdAt": "01/03/2026",
    "updatedAt": "06/11/2026"
  },
  {
    "id": "CUST-005",
    "name": "לקוח ה׳ – אפסילון פתרונות",
    "contact": "עמית ברק",
    "email": "amit@epsilon-optics.com",
    "phone": "058-2345678",
    "address": "קריית מטלון, פתח תקווה",
    "notes": "מערכות מעבדה Standard",
    "active": true,
    "createdAt": "15/03/2026",
    "updatedAt": "12/10/2026"
  }
]
```

### 3.6 חמשת המשתמשים ההתחלתיים (Default Users & Roles)
```json
[
  {
    "id": "USR-101",
    "email": "shalomkopla@gmail.com",
    "username": "shalom.kopla",
    "password": "123456",
    "fullName": "שלום קופלה (מנהל מערכת)",
    "role": "manager",
    "provider": "google",
    "active": true,
    "createdAt": "01/01/2026",
    "lastSignInAt": "09/11/2026 01:00"
  },
  {
    "id": "USR-102",
    "email": "yossi.cohen@company.com",
    "username": "yossi.cohen",
    "password": "123456",
    "fullName": "יוסי כהן (איש מכירות)",
    "role": "sales",
    "provider": "local",
    "active": true,
    "createdAt": "05/01/2026",
    "lastSignInAt": "08/11/2026 14:20"
  },
  {
    "id": "USR-103",
    "email": "ronit.levi@company.com",
    "username": "ronit.levi",
    "password": "123456",
    "fullName": "רונית לוי (איש רכש / תפ\"י)",
    "role": "procurement",
    "provider": "local",
    "active": true,
    "createdAt": "10/01/2026",
    "lastSignInAt": "08/11/2026 16:30"
  },
  {
    "id": "USR-104",
    "email": "amir.barak@company.com",
    "username": "amir.barak",
    "password": "123456",
    "fullName": "אמיר ברק (איש פיתוח / הנדסה)",
    "role": "dev",
    "provider": "local",
    "active": true,
    "createdAt": "12/01/2026",
    "lastSignInAt": "07/11/2026 11:15"
  },
  {
    "id": "USR-105",
    "email": "sarah.m@company.com",
    "username": "sarah.m",
    "password": "123456",
    "fullName": "שרה מזרחי (שירות לקוחות / ייצור)",
    "role": "viewer",
    "provider": "local",
    "active": true,
    "createdAt": "15/01/2026",
    "lastSignInAt": "06/11/2026 09:40"
  }
]
```

---

# חלק 4: חוקי מנוע הקונפיגורציה וה-BOM (Business Logic)

### 4.1 אלגוריתם יצירת ה-BOM הדינמי (`buildDynamicBomForOrder`)
כאשר איש מכירות מגיש טופס הזמנה (או כאשר משנים נתוני הזמנה), מנוע הקונפיגורציה בונה את ה-BOM לפי השלבים הבאים:
1. **שליפת סוג המערכת:** קריאת כמויות המכלולים הנדרשות מתוך `catQty` של המערכת (לדוגמה: במערכת `SYS-PRO-200` כמות האופטיקה היא 2 וכמות הספקים היא 2).
2. **סינון קטלוג לפי `active: true`:** רק מכלולים שמוגדרים כפעילים משובצים בהזמנות חדשות.
3. **התאמת פרמטרים מול דרישות ההזמנה:**
   עבור כל קטגוריה נבדקת תאימות של 5 הפרמטרים:
   - `matchPower` מכיל את הספק ההזמנה (אלא אם נבחר "אחר")
   - `matchFocal` מכיל את אורך המוקד
   - `matchVoltage` מכיל את מתח ההזמנה
   - `matchEnv` מכיל את תנאי הסביבה
   - `matchUsage` מכיל את סוג השימוש (אזרחי/תעשייתי)
4. **זיהוי דרישות פיתוח (Custom Development) – צביעה בכתום:**
   - אם באחד השדות בחר איש המכירות באפשרות **"אחר (דרישה מיוחדת)"**, או אם לא נמצא בקטלוג אף מכלול פעיל שתואם לכל הצירוף:
     - נוצרת שורת BOM מסוג `דרישת פיתוח (Custom)` עם מק"ט `CUSTOM-DEV`.
     - השדה `isCustom` מקבל `true`.
     - השורה נצבעת ב**כתום בולט** בטבלה.
     - סטטוס ההזמנה הופך ל-`ממתין לפיתוח`.
     - בעץ המוצר הוויזואלי התיבה מודגשת בגבול ורקע כתומים זוהרים.
5. **זיהוי חלופות לבחירת איש רכש:**
   - אם נמצא **מכלול יחיד** תואם: השורה מקבלת `selectionType: "פריט מוגדר"`, `approved: true`, `rowLocked: true`.
   - אם נמצאו **2 או יותר מכלולים תואמים** (לדוגמה: גם `PSU-MOD-100` וגם `PSU-MOD-200` מתאימים ל-`230V AC`):
     - השורה מקבלת `selectionType: "לבחירת איש רכש"`.
     - השדה `alternatives` מכיל את רשימת כל המכלולים התואמים.
     - השורה מסומנת כלא מאושרת (`approved: false`) ולא נעולה (`rowLocked: false`) עד שאיש הרכש יבחר מתוכן וינעל אותה.
6. **שיבוץ תתי-מכלולים אוטומטי בהיררכיה:**
   - עבור כל מכלול ראשי שנבחר, המנוע מאתר אוטומטית בקטלוג את כל תתי-המכלולים שמוגדרים תחתיו (`parentSku === mainSku`).
   - תתי-המכלולים מוכנסים מיד תחת מכלול האב ב-BOM עם הזחה (Offset), מקבלים `level: "sub-assembly"`, ומשויכים ל-`parentId` של שורת האב.

### 4.2 חוקי אישור ונעילת הזמנה (Approval Workflow)
- **תנאי סף לאישור הזמנה:** כפתור `✓ אישור הזמנה (נעילת BOM)` חסום לחלוטין אם קיימת ב-BOM שורה כלשהי שאינה נעולה (`!rowLocked`) או שורה במצב עריכה פתוח (`rowEditing`) או שורת פיתוח שלא נפתרה.
- בלחיצה על כפתור האישור כאשר כל השורות נעולות:
  - סטטוס ההזמנה משתנה ל-`מאושר`.
  - ההזמנה ננעלת לעריכה (`locked: true`).
  - איש רכש ומכירות אינם יכולים לשנות יותר שורות (רק מנהל מערכת יכול לפתוח נעילה).
- **סגירת הזמנה:** הזמנה מאושרת ניתנת להעברה לסטטוס `סגורה` באמצעות כפתור `📦 סגירת הזמנה`.
- **ביטול הזמנה:** איש מכירות או מנהל מערכת יכולים לבטל הזמנה (`✕ ביטול הזמנה`), מה שמעביר אותה לסטטוס `מבוטלת`.

### 4.3 סימון פריט כ"הוסר" (Soft Removal)
- איש רכש או מנהל מערכת יכולים ללחוץ על `🚫 סמן כ"הוסר"` בכל שורת BOM.
- השורה **אינה נמחקת מהטבלה**, אלא:
  - מסומנת עם תגית אדומה `🚫 הוסר`.
  - הטקסט מופיע עם קו חוצה (strikethrough).
  - השורה ננעלת ואינה מעכבת אישור הזמנה.
  - נשמר תיעוד Metadata של מי סימן ומתי.
  - בעת ייצוא ל-Excel השורה מיוצאת עם ציון מפורש של הסטטוס `"הוסר"`.

### 4.4 סל מיחזור עם חובת הזנת סיבה (Recycle Bin)
- מחיקת מכלול או מערכת מדף הניהול אינה מבצעת מחיקה פיזית מיידית (Hard Delete), אלא דורשת הזנת סיבת מחיקה מפורטת בחלונית מודאלית.
- הפריט מועבר לישות `RecycleBinItem` עם תיעוד מלא: תאריך ושעה, שם המוחק וסיבת המחיקה.
- לשונית סל המיחזור כוללת כפתור `♻️ שחזר` להחזרת הפריט לפעילות מלאה.

---

# חלק 5: דרישות ממשק וגרפיקה מלאות (UI/UX Specifications)

### 5.1 לוח צבעים ומיתוג (Design Tokens & Color Palette)
- **צבע ראשי (Primary):** אינדיגו/סגול עמוק (`indigo-600` / `purple-700`) למיתוג יוקרתי, טכנולוגי והנדסי.
- **צבע דרישות פיתוח (Custom Alert):** כתום עז (`amber-500` / `orange-500`) המושך את העין עבור חריגות פיתוח.
- **צבעי סטטוס:**
  - `מאושר` / `פעיל`: ירוק אמרלד (`emerald-500` / `emerald-600`)
  - `ממתין לאישור` / `בטיפול`: כחול (`blue-500`)
  - `ממתין לפיתוח`: כתום (`orange-500`)
  - `סגורה`: אפור כהה (`slate-600`)
  - `מבוטלת` / `הוסר` / `לא פעיל`: אדום (`red-500` / `red-600`)
- **מצב כהה (Dark Theme):**
  - רקע ראשי: `slate-950`
  - כרטיסיות ומודאלים: `slate-900` עם מסגרת `slate-800`
  - טקסט ראשי: `slate-100`, משני: `slate-400`
  - שורות טבלה: רקע כהה עם hover מודגש.

### 5.2 תצוגת טבלת מכלולים – התאמה מלאה לרוחב (100% Fit)
כדי למנוע גלילה שמאלה:
- **רוחב עמודות יחסי:**
  - תמונה: `w-12` (48px)
  - מק"ט ו-Rev: `w-28` (112px)
  - תיאור פריט: `min-w-[120px] max-w-[180px]` עם `line-clamp-2`
  - סטטוס: `w-10` (40px) עם נורת חיווי צבעונית
  - הספקים: `min-w-[80px]` (תגיות מקוצרות `100W`, `1.5kW`)
  - אורכי מוקד: `min-w-[75px]` (`50mm`, `100mm`)
  - הזנת חשמל: `min-w-[75px]` (תגיות תקן `230V`, `400V 3P`)
  - תנאי סביבה: `min-w-[75px]` (תגיות תקן `IP54`, `IP65`, `IP67` עם Tooltip של הסביבה המלאה)
  - שימוש: `min-w-[65px]` (`אזרחי`, `תעשייתי`)
  - עלות: `w-16` (64px) מיושרת לשמאל
  - פעולות: `w-28` (112px) מיושרת למרכז (כפתורי אייקון בלבד: `✏️`, `📋`, `⏸️/▶️`, `🗑️`)
- **ריווח תאים (Padding):** `py-2 px-1.5` במקום שוליים רחבים.
- **הגדלת תמונה בריחוף (Hover Zoom Popover):** תמונת ממוזערת מציגה בריחוף עכבר חלונית צפה גדולה (256px) עם התמונה ברזולוציה מלאה, מק"ט, שם ועלות.

### 5.3 עץ מוצר ויזואלי (Visual Product Tree Layout)
- **מבנה שכבות (4 רמות):**
  - רמה 1: **מערכת ראשית (Root System)** – רוחב כרטיס 256px עם תמונת המערכת, מזהה וכמות ערוצים.
  - רמה 2: **קטגוריות (Categories)** – צומתי ביניים עם אייקון תיקייה וכותרת.
  - רמה 3: **מכלולים ראשיים (Assemblies)** – רוחב כרטיס 192px עם תמונת מכלול, מק"ט, כמות וסטטוס.
  - רמה 4: **תתי-מכלולים (Sub-assemblies)** – רוחב כרטיס 176px עם תת-מכלול, סימון חץ `↳` ותיאור נקי ללא המילה המיותרת "תת מכלול".
- **ענפי חיבור (Connecting Branches):** קווי חיבור גרפיים ישירים (בצבע `slate-300` / `slate-700`) המחברים בין מרכז כל צומת לרמת האב מעליו.
- **פריטי Custom בכתום:** קופסה עם מסגרת כתומה כפולה וזוהרת וסימון `דרישת פיתוח`.

### 5.4 דרישות מנוע ייצוא Excel (Excel Export Engine)
- **קובץ `.xlsx` עם 2 גיליונות:**
  - **גיליון 1: "טבלת BOM מפורטת"**
    - כותרת עליונה מעוצבת ברקע כחול כהה: מספר הזמנה, שם לקוח, איש קשר, סוג מערכת, תאריך אספקה, סטטוס.
    - עמודות הטבלה: מזהה, קטגוריה, רמה (מכלול / תת-מכלול), מק"ט, מהדורה, תיאור פריט, כמות, סוג בחירה, חלופה שנבחרה, סטטוס אישור, האם הוסר, מי ערך לאחרונה, תאריך עריכה, הערות.
    - שורות שהוסרו (🚫) נצבעות ברקע אדום בהיר עם קו חוצה.
    - שורות פיתוח (Custom) נצבעות ברקע כתום בהיר.
  - **גיליון 2: "עץ מוצר ויזואלי"**
    - **ללא תאי טקסט.**
    - מכיל **תמונה גרפית אחת יחידה** שנוצרת באמצעות Canvas 2D (ב-2x Retina Resolution) ומציגה את הדיאגרמה הוויזואלית השלמה של עץ המוצר על כל רמותיו וענפיו.

---

# חלק 6: פירוט מסכי המערכת (Screen Breakdown)

1. **מסך התחברות (Login Screen):**
   - כניסה בלחיצה אחת עם חשבון Google (`Sign in with Google`).
   - כניסה עם שם משתמש וסיסמה (למשתמשים שהוקמו ע"י מנהל המערכת, בפורמט `שם.שם_משפחה` וסיסמת ברירת מחדל `123456`).
   - **חסימת הרשמה עצמית עצמאית ללא Google.**

2. **מסך 1: דשבורד הזמנות ראשי (Orders Dashboard):**
   - כרטיסיות KPI בראש העמוד: סה"כ הזמנות, הזמנות פתוחות, ממתין לפיתוח (בכתום), הזמנות מאושרות, הזמנות סגורות.
   - שורת חיפוש חופשי וסינון מהיר לפי סטטוס.
   - טבלת הזמנות מפורטת עם מטא-דאטה, סטטוס בצבעים וכפתורי פעולה מהירים (`צפה ב-BOM`, `שכפל הזמנה`, `בטל הזמנה`).
   - כפתור בולט: `+ פתיחת הזמנה חדשה`.

3. **מסך 2: קונפיגורטור פתיחת הזמנה (Order Configurator):**
   - בחירת לקוח מרשימה נפתחת דינמית או פתיחת לקוח חדש במקום.
   - בחירת תאריך אספקה.
   - בחירת סוג מערכת – מסננת ומגבילה אוטומטית את האפשרויות בשדות ההספק, המוקד, המתח והסביבה רק למה שנתמך במערכת.
   - שדות בחירה עם אפשרות "אחר (דרישה מיוחדת)" הנצבעת מיידית בכתום.
   - מגירת תצוגה מקדימה חיה (Live BOM Drawer) המציגה את ה-BOM הנבנה בזמן אמת.

4. **מסך 3: עמוד הזמנה בודדת, ניהול BOM ועץ מוצר:**
   - פרטי כותרת ומטא-דאטה מלא של ההזמנה.
   - מתג מעבר תצוגה: `[📋 טבלת BOM היררכית]` מול `[🌳 עץ מוצר ויזואלי]`.
   - כפתורי שליטה: `📊 ייצוא BOM ל-Excel`, `✓ אישור הזמנה (נעילת BOM)`, `📦 סגירת הזמנה`, `✕ ביטול הזמנה`.
   - בטבלה: עריכת שורות, בחירת חלופות, סימון כ"הוסר", ונעילת שורות.

5. **מסך 4: דשבורד מנהל מערכת (Admin Management):**
   - **לשונית א': מכלולים וחוקי בחירה** – הוספת מכלול חדש (+ מתקפל), שכפול מכלול, סינון לפי קטגוריה, טבלת מכלולים 100% Fit, השבתה/הפעלה (`💡`).
   - **לשונית ב': סוגי מערכות מוצר** – הוספת מערכת (+ מתקפל), שכפול מערכת, הגדרת ערוצים, ספקים וכמויות לקטגוריה.
   - **לשונית ג': התאמות בין רכיבים** – הגדרת חוקי תאימות הדדיים בין מכלולים.
   - **לשונית ד': תרשים זרימת קונפיגורציה (Workflow Diagram)** – הצגת תהליך התרגום מטופס ההזמנה ל-BOM.
   - **לשונית ה': סל מיחזור (Recycle Bin)** – היסטוריית מחיקות עם סיבת מחיקה ואפשרות שחזור.
   - **לשונית ו': ניהול משתמשים והרשאות** – רשימת משתמשים, הקצאת תפקידים, והוספת משתמשים חדשים.
   - **לשונית ז': ניהול לקוחות** – הוספת לקוח (+ מתקפל), עריכת פרטי לקוח עם אפשרות סנכרון להזמנות קודמות, ומתג פעיל/לא פעיל.

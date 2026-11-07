# קונפיגורטור מוצר – יצירת BOM לפי דרישת לקוח

## מטרת הפרויקט
מערכת קונפיגורטור (Web Desktop ב-**Next.js + TypeScript + Tailwind CSS + Supabase**) לבניית BOM (עץ מוצר / כתב כמויות) תפעולי לפי דרישות לקוח שממלא איש המכירות.
המערכת מגשרת בין אנשי מכירות, תפ"י/רכש, הנדסת מערכת/פיתוח, ייצור, שירות לקוחות ומנהל מערכת:
- מכווינה את איש המכירות להגדיר את המוצר לפי מכלולים קיימים או מסמנת חריגות הדורשות פיתוח (Custom) בכתום.
- מאפשרת לאנשי תפ"י ורכש לבחור חלופות, לנעול שורות, לסמן פריטים כ"הוסר" (ללא מחיקתם מהטבלה) ולאשר הזמנות רק כאשר כל השורות נעולות.
- מציגה את הקונפיגורציה המדויקת בטבלת BOM היררכית ובעץ מוצר ויזואלי עם ענפים ותמונות מכלולים מתוך `public/images/assemblies/`.
- מאפשרת **ייצוא מלא של טבלת ה-BOM ל-Excel (`.xlsx`)** כולל פרטי ההזמנה, ה-Metadata וכל השורות (כולל שורות שסומנו כ"הוסר").
- כוללת ממשק מנהל מערכת לניהול קטלוג מכלולים (כולל הפיכת מכלולים ל"לא פעיל" בהזמנות חדשות), סוגי מערכות, התאמות בין רכיבים, תרשים זרימה ו**סל מיחזור** עם חובת הזנת סיבת מחיקה.

---

## הרצה מקומית (Local Development)

```bash
npm install
npm run dev
```
האפליקציה זמינה בכתובת: `http://localhost:3000`

---

## חיבור ל-Supabase ופריסה ב-Vercel

1. **יצירת טבלאות ב-Supabase:**
   הרץ את הקובץ [`supabase/schema.sql`](./supabase/schema.sql) בתוך ה-SQL Editor בפרויקט ה-Supabase שלך.
2. **הגדרת משתני סביבה (ב-`.env.local` וב-Vercel Project Settings):**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```
   *הערה:* כאשר משתני הסביבה של Supabase מוגדרים, האפליקציה מסנכרנת אוטומטית את כל הנתונים מול Supabase ובמקביל שומרת גיבוי ב-`localStorage`. כאשר אינם מוגדרים, האפליקציה עובדת באופן מלא ושומרת אוטומטית ב-`localStorage`.

---

## מבנה הפרויקט
- `src/app/` — דפי ה-Next.js (App Router, RTL בעברית).
- `src/components/` — רכיבי המערכת (`VisualProductTree.tsx`, `AdminDashboard.tsx`, `MultiSelectDropdown.tsx`).
- `src/lib/` — מנוע בניית ה-BOM (`bomEngine.ts`), ייצוא ל-Excel (`excelExport.ts`), ושכבת הסנכרון מול Supabase + LocalStorage (`supabase.ts`).
- `src/data/initialData.ts` — נתוני ברירת המחדל (15 מכלולים ותתי-מכלולים, 3 סוגי מערכות, קשרי תאימות ו-5 הזמנות).
- `public/images/assemblies/` — 19 תמונות המכלולים, תתי-המכלולים והמערכות (`PNG`).
- `supabase/schema.sql` — סכמת המסד עבור Supabase.
- `specs/SPEC.md` — מסמך האפיון המלא (Single Source of Truth).
- `specs/wireframe-orders.html` — קובץ ה-Wireframe האינטראקטיבי העצמאי (גרסה v8).
- `AGENTS.md` / `CLAUDE.md` — הנחיות פיתוח מונחה אפיון (SDD) לסוכני AI.

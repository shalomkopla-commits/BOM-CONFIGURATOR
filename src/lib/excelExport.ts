import * as XLSX from 'xlsx';
import { BomRow, Order } from '@/types/configurator';

/**
 * Exports an Order's BOM table to an Excel (.xlsx) file with full RTL Hebrew layout,
 * order metadata summary rows, and all BOM rows including rows marked as "הוסר".
 */
export function exportOrderBomToExcel(order: Order, bomRows: BomRow[]): void {
  const wb = XLSX.utils.book_new();

  // Order Summary + Metadata Rows at top of worksheet
  const contactDetails = `${order.contact || ''}${order.email ? ` | ${order.email}` : ''}${order.phone ? ` | טל: ${order.phone}` : ''}`;
  const sheetData: (string | number)[][] = [
    ['דוח עץ מוצר וכתב כמויות (BOM) – קונפיגורטור מוצר'],
    [],
    ['מספר הזמנה:', order.id, 'לקוח:', order.customer, 'איש קשר:', contactDetails],
    [
      'סוג מערכת:',
      `${order.systemName} (${order.systemTypeId})`,
      'סטטוס הזמנה:',
      order.status,
      'תאריך אספקה:',
      order.deliveryDate,
    ],
    [
      'הספק:',
      order.power,
      'אורך מוקד:',
      order.focal,
      'הזנת חשמל:',
      order.voltage,
    ],
    [
      'תנאי סביבה:',
      order.env,
      'שימוש:',
      order.usage || 'אזרחי',
      'ערוצים / ספקים:',
      `${order.channels} ערוצים / ${order.psuCount} ספקים`,
    ],
    [
      'נפתח ע"י (Metadata):',
      order.createdBy,
      'תאריך פתיחה:',
      order.createdAt,
      'עודכן לאחרונה:',
      `${order.updatedBy} (${order.updatedAt})`,
    ],
    [],
    [
      '#',
      'קטגוריה',
      'רמה בהיררכיה',
      'מק"ט (SKU)',
      'מהדורה (Rev)',
      'תיאור פריט / מכלול',
      'כמות',
      'אופן בחירה',
      'חלופה נבחרת',
      'סטטוס שורה (פעיל / הוסר / פיתוח)',
      'סטטוס נעילה',
      'נערך לאחרונה ע"י (Metadata)',
      'מועד עריכה אחרון (Metadata)',
      'הערות הנדסיות / תפ"י',
    ],
  ];

  bomRows.forEach((row, idx) => {
    const levelLabel =
      row.level === 'assembly' ? 'מכלול ראשי (אב)' : '↳ תת-מכלול (בן)';

    // Explicit "הוסר" status as requested by the user
    let rowStatusLabel = 'פעיל ב-BOM';
    if (row.removed) {
      rowStatusLabel = 'הוסר';
    } else if (row.isCustom) {
      rowStatusLabel = 'דרישת פיתוח (Custom - כתום)';
    } else if (row.inactiveSource) {
      rowStatusLabel = 'מכלול לא פעיל (מוצג בהזמנה קיימת)';
    }

    const lockLabel = row.removed
      ? 'הוסר (נעול)'
      : row.rowLocked && !row.rowEditing && !row.isCustom
      ? 'נעול'
      : 'פתוח לעריכה';

    sheetData.push([
      idx + 1,
      row.category,
      levelLabel,
      row.sku,
      row.rev,
      row.desc,
      row.qty,
      row.selectionType,
      row.selectedAlt,
      rowStatusLabel,
      lockLabel,
      row.lastEditedBy || 'מערכת',
      row.lastEditedAt || order.createdAt,
      row.notes || '',
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Set RTL direction for Excel sheet
  ws['!views'] = [{ rightToLeft: true }];

  // Set column widths for clean readability
  ws['!cols'] = [
    { wch: 6 },  // #
    { wch: 22 }, // קטגוריה
    { wch: 18 }, // רמה בהיררכיה
    { wch: 18 }, // מק"ט
    { wch: 12 }, // Rev
    { wch: 36 }, // תיאור פריט
    { wch: 8 },  // כמות
    { wch: 22 }, // אופן בחירה
    { wch: 42 }, // חלופה נבחרת
    { wch: 24 }, // סטטוס שורה (כולל "הוסר")
    { wch: 16 }, // סטטוס נעילה
    { wch: 26 }, // נערך לאחרונה ע"י
    { wch: 18 }, // מועד עריכה אחרון
    { wch: 34 }, // הערות
  ];

  XLSX.utils.book_append_sheet(wb, ws, `BOM_${order.id}`);

  // --- Sheet 2: Visual Product Tree (מבנה עץ מוצר ויזואלי) ---
  const treeSheetData: (string | number)[][] = [
    [`מבנה עץ מוצר ויזואלי (Visual Product Tree) – הזמנה ${order.id}`],
    [`לקוח: ${order.customer}`, `איש קשר: ${contactDetails}`, `תאריך הפקה: ${new Date().toLocaleDateString('he-IL')}`],
    [],
    [
      'רמת עץ',
      'סוג צומת',
      'זיהוי / מק"ט',
      'תיאור ישות',
      'מהדורה',
      'כמות',
      'סטטוס תצורה',
      'שיוך אב ישיר',
      'הערות',
    ],
    // Level 0: Root System
    [
      'רמה 0 (Root)',
      '🖥️ מערכת ראשית',
      order.systemTypeId,
      order.systemName,
      'Rev A',
      1,
      'מערכת בסיס קבועה',
      '-',
      `${order.power} • ${order.focal} • ${order.voltage} • ${order.usage || 'אזרחי'}`,
    ],
  ];

  // Group by category and build tree rows
  const categories = Array.from(new Set(bomRows.map((b) => b.category)));
  categories.forEach((cat) => {
    treeSheetData.push([
      'רמה 1',
      '📁 קטגוריה',
      cat,
      `ענף קטגוריה: ${cat}`,
      '-',
      '-',
      'ענף היררכי',
      order.systemTypeId,
      '',
    ]);

    const asms = bomRows.filter((b) => b.category === cat && b.level === 'assembly');
    asms.forEach((asm) => {
      const asmStatus = asm.removed ? '🚫 הוסר' : asm.isCustom ? '⚠️ דרישת פיתוח (Custom)' : 'פעיל (מאושר)';
      treeSheetData.push([
        '  רמה 2 (אב)',
        '📦 מכלול ראשי',
        asm.sku,
        `  └── ${asm.desc}`,
        asm.rev,
        asm.qty,
        asmStatus,
        cat,
        asm.notes || '',
      ]);

      const subs = bomRows.filter((b) => b.level === 'sub-assembly' && b.parentId === asm.id);
      subs.forEach((sub) => {
        const subStatus = sub.removed ? '🚫 הוסר' : sub.isCustom ? '⚠️ פיתוח Custom' : '✓ תואם מכלול';
        treeSheetData.push([
          '    רמה 3 (בן)',
          '↳ תת-מכלול',
          sub.sku,
          `      └── ↳ ${sub.desc}`,
          sub.rev,
          sub.qty,
          subStatus,
          asm.sku,
          sub.notes || '',
        ]);
      });
    });
  });

  const wsTree = XLSX.utils.aoa_to_sheet(treeSheetData);
  wsTree['!views'] = [{ rightToLeft: true }];
  wsTree['!cols'] = [
    { wch: 16 }, // רמת עץ
    { wch: 20 }, // סוג צומת
    { wch: 22 }, // מק"ט
    { wch: 45 }, // תיאור
    { wch: 10 }, // מהדורה
    { wch: 8 },  // כמות
    { wch: 24 }, // סטטוס
    { wch: 20 }, // אב
    { wch: 35 }, // הערות
  ];
  XLSX.utils.book_append_sheet(wb, wsTree, `עץ_מוצר_${order.id}`);

  const safeCustomer = order.customer.replace(/[\\/:*?"<>|]/g, '').trim();
  const fileName = `BOM_${order.id}_${safeCustomer}.xlsx`;
  XLSX.writeFile(wb, fileName);
}


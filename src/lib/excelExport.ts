import * as XLSX from 'xlsx';
import { BomRow, Order } from '@/types/configurator';

/**
 * Exports an Order's BOM table to an Excel (.xlsx) file with full RTL Hebrew layout,
 * order metadata summary rows, and all BOM rows including rows marked as "הוסר".
 */
export function exportOrderBomToExcel(order: Order, bomRows: BomRow[]): void {
  const wb = XLSX.utils.book_new();

  // Order Summary + Metadata Rows at top of worksheet
  const sheetData: (string | number)[][] = [
    ['דוח עץ מוצר וכתב כמויות (BOM) – קונפיגורטור מוצר'],
    [],
    ['מספר הזמנה:', order.id, 'לקוח:', order.customer, 'איש קשר:', order.contact],
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

  const safeCustomer = order.customer.replace(/[\\/:*?"<>|]/g, '').trim();
  const fileName = `BOM_${order.id}_${safeCustomer}.xlsx`;
  XLSX.writeFile(wb, fileName);
}


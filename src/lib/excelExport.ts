import ExcelJS from 'exceljs';
import { BomRow, Order } from '@/types/configurator';
import { cleanSubAssemblyDesc } from '@/data/initialData';

/**
 * Helper to draw rounded rectangle on Canvas
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Helper to truncate and wrap text for canvas
 */
function drawTextWithEllipsis(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number
) {
  let str = text;
  if (ctx.measureText(str).width > maxWidth) {
    while (str.length > 0 && ctx.measureText(str + '...').width > maxWidth) {
      str = str.slice(0, -1);
    }
    str += '...';
  }
  ctx.fillText(str, x, y);
}

/**
 * Generates an image representing the visual product tree on an HTML Canvas.
 * Returns the base64 PNG data along with display dimensions for embedding into Excel.
 */
export async function generateVisualTreeImage(
  order: Order,
  bomRows: BomRow[]
): Promise<{ base64: string; width: number; height: number }> {
  if (typeof document === 'undefined') {
    return { base64: '', width: 800, height: 600 };
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { base64: '', width: 800, height: 600 };
  }

  // Group top-level assemblies and their sub-assemblies by category
  const categories = Array.from(new Set(bomRows.map((b) => b.category)));
  const assembliesByCategory: {
    category: string;
    assemblies: { asm: BomRow; subs: BomRow[] }[];
  }[] = [];

  let totalAssemblyColumns = 0;
  categories.forEach((cat) => {
    const asms = bomRows.filter(
      (b) => b.category === cat && b.level === 'assembly'
    );
    const mapped = asms.map((asm) => ({
      asm,
      subs: bomRows.filter(
        (b) => b.level === 'sub-assembly' && b.parentId === asm.id
      ),
    }));
    assembliesByCategory.push({ category: cat, assemblies: mapped });
    totalAssemblyColumns += Math.max(mapped.length, 1);
  });

  // Calculate layout geometry
  const cardW = 210;
  const colGap = 24;
  const marginX = 60;
  const marginY = 50;

  const contentW = Math.max(1280, totalAssemblyColumns * (cardW + colGap) + marginX * 2);
  const maxSubs = Math.max(
    ...bomRows.map(
      (b) => bomRows.filter((s) => s.parentId === b.id).length
    ),
    0
  );
  const contentH = Math.max(860, 480 + maxSubs * 105 + marginY * 2);

  // High-DPI 2x scale for ultra crisp text and borders
  const dpr = 2;
  canvas.width = contentW * dpr;
  canvas.height = contentH * dpr;
  ctx.scale(dpr, dpr);

  // Background
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, contentW, contentH);

  // Header Title Banner
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.fillText(
    `דוח עץ מוצר ויזואלי – הזמנה ${order.id} | לקוח: ${order.customer}`,
    contentW / 2,
    marginY
  );

  ctx.fillStyle = '#64748b';
  ctx.font = '12px system-ui, -apple-system, sans-serif';
  ctx.fillText(
    `תאריך הפקה: ${new Date().toLocaleDateString('he-IL')} • סך הכל ${bomRows.length} פריטים בעץ המוצר`,
    contentW / 2,
    marginY + 22
  );

  // 1. Root System Node
  const rootW = 320;
  const rootH = 120;
  const rootX = (contentW - rootW) / 2;
  const rootY = marginY + 45;

  const hasCustom = bomRows.some((b) => b.isCustom && !b.removed);

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
  roundRect(ctx, rootX + 2, rootY + 3, rootW, rootH, 12);
  ctx.fill();

  // Root Box
  ctx.fillStyle = '#0f172a';
  roundRect(ctx, rootX, rootY, rootW, rootH, 12);
  ctx.fill();
  ctx.strokeStyle = hasCustom ? '#f97316' : '#3b82f6';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Root Header tag
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`ROOT SYSTEM • ${order.systemTypeId}`, rootX + rootW - 16, rootY + 24);

  // Status badge
  ctx.fillStyle = hasCustom ? '#f97316' : '#10b981';
  roundRect(ctx, rootX + 16, rootY + 12, 85, 20, 6);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(order.status, rootX + 16 + 42, rootY + 26);

  // System Name
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'right';
  drawTextWithEllipsis(ctx, order.systemName, rootX + rootW - 16, rootY + 54, rootW - 32);

  // Parameters line
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillText(
    `⚡ ${order.power}  |  🔭 ${order.focal}  |  🔌 ${order.voltage}`,
    rootX + rootW - 16,
    rootY + 80
  );
  ctx.fillText(
    `ערוצים: ${order.channels}  |  ספקים: ${order.psuCount}  |  שימוש: ${order.usage || 'אזרחי'}`,
    rootX + rootW - 16,
    rootY + 102
  );

  // Horizontal Bus Bar under Root
  const busY = rootY + rootH + 35;
  const catY = busY + 25;
  const catH = 34;

  let currentColX = marginX;
  const colCenters: number[] = [];

  // First pass: calculate column positions
  assembliesByCategory.forEach((catGroup) => {
    catGroup.assemblies.forEach(() => {
      colCenters.push(currentColX + cardW / 2);
      currentColX += cardW + colGap;
    });
  });

  if (colCenters.length === 0) {
    colCenters.push(contentW / 2);
  }

  const busLeft = Math.min(...colCenters);
  const busRight = Math.max(...colCenters);

  // Line from Root bottom to horizontal bus
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(contentW / 2, rootY + rootH);
  ctx.lineTo(contentW / 2, busY);
  ctx.stroke();

  // Horizontal bus line
  ctx.beginPath();
  ctx.moveTo(busLeft, busY);
  ctx.lineTo(busRight, busY);
  ctx.stroke();

  // Second pass: Draw category badges and assembly columns
  let asmColIndex = 0;
  assembliesByCategory.forEach((catGroup) => {
    if (catGroup.assemblies.length === 0) return;

    const firstColCenter = colCenters[asmColIndex];
    const lastColCenter =
      colCenters[asmColIndex + catGroup.assemblies.length - 1];
    const catCenterX = (firstColCenter + lastColCenter) / 2;

    const catHasCustom = catGroup.assemblies.some(
      (a) =>
        (a.asm.isCustom && !a.asm.removed) ||
        a.subs.some((s) => s.isCustom && !s.removed)
    );

    // Connector from bus to category
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(catCenterX, busY);
    ctx.lineTo(catCenterX, catY);
    ctx.stroke();

    // Category Card
    const catBoxW = Math.max(140, ctx.measureText(catGroup.category).width + 36);
    ctx.fillStyle = catHasCustom ? '#ffedd5' : '#e2e8f0';
    roundRect(ctx, catCenterX - catBoxW / 2, catY, catBoxW, catH, 8);
    ctx.fill();
    ctx.strokeStyle = catHasCustom ? '#f97316' : '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = catHasCustom ? '#9a3412' : '#1e293b';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`📁 ${catGroup.category}`, catCenterX, catY + 22);

    // Assembly cards under this category
    const asmBaseY = catY + catH + 35;

    catGroup.assemblies.forEach(({ asm, subs }) => {
      const colCenterX = colCenters[asmColIndex];
      const asmCardX = colCenterX - cardW / 2;
      const asmCardH = 92;

      // Line from category level down to assembly card
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(colCenterX, catY + catH);
      ctx.lineTo(colCenterX, asmBaseY);
      ctx.stroke();

      // Assembly Card Box
      const asmBg = asm.removed
        ? '#fee2e2'
        : asm.isCustom
        ? '#fff7ed'
        : '#ffffff';
      const asmBorder = asm.removed
        ? '#ef4444'
        : asm.isCustom
        ? '#f97316'
        : '#cbd5e1';

      ctx.fillStyle = asmBg;
      roundRect(ctx, asmCardX, asmBaseY, cardW, asmCardH, 8);
      ctx.fill();
      ctx.strokeStyle = asmBorder;
      ctx.lineWidth = asm.isCustom ? 2 : 1.5;
      ctx.stroke();

      // SKU + Rev
      ctx.fillStyle = asm.removed ? '#991b1b' : asm.isCustom ? '#c2410c' : '#1e40af';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${asm.sku} (${asm.rev})`, asmCardX + cardW - 12, asmBaseY + 20);

      // Qty
      ctx.fillStyle = '#64748b';
      ctx.font = '10px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`כמות: ${asm.qty}`, asmCardX + 12, asmBaseY + 20);

      // Description
      ctx.fillStyle = asm.removed ? '#7f1d1d' : asm.isCustom ? '#7c2d12' : '#0f172a';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'right';
      drawTextWithEllipsis(
        ctx,
        asm.desc,
        asmCardX + cardW - 12,
        asmBaseY + 44,
        cardW - 24
      );

      // Status Badge
      let badgeLabel = '✓ פעיל ב-BOM';
      let badgeBg = '#dcfce7';
      let badgeFg = '#166534';
      if (asm.removed) {
        badgeLabel = '🚫 הוסר';
        badgeBg = '#fee2e2';
        badgeFg = '#991b1b';
      } else if (asm.isCustom) {
        badgeLabel = '⚠️ דרישת פיתוח (Custom)';
        badgeBg = '#ffedd5';
        badgeFg = '#9a3412';
      }

      ctx.fillStyle = badgeBg;
      roundRect(ctx, asmCardX + 10, asmBaseY + 60, cardW - 20, 22, 5);
      ctx.fill();
      ctx.fillStyle = badgeFg;
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(badgeLabel, asmCardX + cardW / 2, asmBaseY + 75);

      // Draw Sub-Assemblies under this assembly
      let subY = asmBaseY + asmCardH + 24;
      subs.forEach((sub) => {
        const subW = cardW - 16;
        const subH = 75;
        const subX = asmCardX + 8;

        // Connecting elbow line from parent assembly down to sub-assembly
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(colCenterX, subY - 24);
        ctx.lineTo(colCenterX, subY);
        ctx.stroke();

        // Sub card box
        const subBg = sub.removed
          ? '#fef2f2'
          : sub.isCustom
          ? '#fff7ed'
          : '#f8fafc';
        const subBorder = sub.removed
          ? '#f87171'
          : sub.isCustom
          ? '#fb923c'
          : '#bfdbfe';

        ctx.fillStyle = subBg;
        roundRect(ctx, subX, subY, subW, subH, 8);
        ctx.fill();
        ctx.strokeStyle = subBorder;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // SKU + Rev
        ctx.fillStyle = sub.removed ? '#991b1b' : sub.isCustom ? '#ea580c' : '#2563eb';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`↳ ${sub.sku} (${sub.rev})`, subX + subW - 10, subY + 18);

        // Qty
        ctx.fillStyle = '#64748b';
        ctx.font = '9px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`כמות: ${sub.qty}`, subX + 10, subY + 18);

        // Description without "תת-מכלול"
        ctx.fillStyle = '#334155';
        ctx.font = 'bold 10px system-ui, sans-serif';
        ctx.textAlign = 'right';
        drawTextWithEllipsis(
          ctx,
          cleanSubAssemblyDesc(sub.desc),
          subX + subW - 10,
          subY + 38,
          subW - 20
        );

        // Sub status line
        let subStatus = sub.removed
          ? '🚫 הוסר'
          : sub.isCustom
          ? '⚠️ פיתוח Custom'
          : '✓ תואם מכלול אב';
        ctx.fillStyle = sub.removed ? '#dc2626' : sub.isCustom ? '#c2410c' : '#059669';
        ctx.font = 'bold 9px system-ui, sans-serif';
        ctx.fillText(subStatus, subX + subW - 10, subY + 58);

        subY += subH + 20;
      });

      asmColIndex++;
    });
  });

  return {
    base64: canvas.toDataURL('image/png'),
    width: contentW,
    height: contentH,
  };
}

/**
 * Exports an Order's BOM table to an Excel (.xlsx) file with:
 * Sheet 1: Full BOM Table with RTL Hebrew layout, metadata, styles, and "הוסר" rows.
 * Sheet 2: Visual Product Tree Single Image (תמונה אחת בלבד ללא תאי טקסט).
 */
export async function exportOrderBomToExcel(
  order: Order,
  bomRows: BomRow[]
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = order.createdBy || 'BOM Configurator';
  workbook.created = new Date();

  // -------------------------------------------------------------
  // Sheet 1: BOM Data Table (גיליון 1: טבלת כמויות ומכלולים)
  // -------------------------------------------------------------
  const wsBom = workbook.addWorksheet(`BOM_${order.id}`, {
    views: [{ rightToLeft: true }],
  });

  // Contact details string
  const contactDetails = `${order.contact || ''}${
    order.email ? ` | ${order.email}` : ''
  }${order.phone ? ` | טל: ${order.phone}` : ''}`;

  // Title Row
  const titleRow = wsBom.addRow([
    'דוח עץ מוצר וכתב כמויות (BOM) – קונפיגורטור מוצר',
  ]);
  titleRow.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1E3A8A' } };
  wsBom.addRow([]);

  // Order Metadata Block
  const metaRows = [
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
  ];

  metaRows.forEach((rowValues) => {
    const row = wsBom.addRow(rowValues);
    row.font = { name: 'Arial', size: 10 };
    // Bold field labels in columns 1, 3, 5
    row.getCell(1).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF334155' } };
    row.getCell(3).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF334155' } };
    row.getCell(5).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF334155' } };
  });

  wsBom.addRow([]);

  // Table Column Headers
  const headers = [
    '#',
    'קטגוריה',
    'רמה בהיררכיה',
    'מק"ט (SKU)',
    'מהדורה (Rev)',
    'תיאור פריט / מכלול',
    'כמות',
    'אופן בחירה',
    'חלופה נבחרת',
    'סטטוס שורה',
    'סטטוס נעילה',
    'נערך ע"י (Metadata)',
    'מועד עריכה אחרון',
    'הערות הנדסיות / תפ"י',
  ];

  const headerRow = wsBom.addRow(headers);
  headerRow.height = 28;
  headerRow.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' },
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF0F172A' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF475569' } },
      right: { style: 'thin', color: { argb: 'FF475569' } },
    };
  });

  // Data Rows
  bomRows.forEach((row, idx) => {
    const isSub = row.level === 'sub-assembly';
    const levelLabel = isSub ? '↳ מכלול בן (רמה 2)' : 'מכלול ראשי (אב)';
    const cleanDesc = isSub ? cleanSubAssemblyDesc(row.desc) : row.desc;

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

    const r = wsBom.addRow([
      idx + 1,
      row.category,
      levelLabel,
      row.sku,
      row.rev,
      cleanDesc,
      row.qty,
      row.selectionType,
      row.selectedAlt,
      rowStatusLabel,
      lockLabel,
      row.lastEditedBy || 'מערכת',
      row.lastEditedAt || order.createdAt,
      row.notes || '',
    ]);

    r.height = 22;
    r.font = { name: 'Arial', size: 9.5 };
    r.alignment = { vertical: 'middle' };

    // Format special rows: Removed (red), Custom (orange), Sub-assembly (slight indent)
    if (row.removed) {
      r.font = { name: 'Arial', size: 9.5, color: { argb: 'FF991B1B' }, strike: true };
      r.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEE2E2' },
        };
      });
    } else if (row.isCustom) {
      r.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF9A3412' } };
      r.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFEDD5' },
        };
      });
    } else if (isSub) {
      r.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' },
        };
      });
    }

    // Set light gray cell borders
    r.eachCell((cell) => {
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
  });

  // Set Column Widths on Sheet 1
  wsBom.columns = [
    { width: 6 },  // #
    { width: 20 }, // קטגוריה
    { width: 18 }, // רמה
    { width: 18 }, // מק"ט
    { width: 12 }, // Rev
    { width: 36 }, // תיאור פריט
    { width: 8 },  // כמות
    { width: 22 }, // אופן בחירה
    { width: 32 }, // חלופה
    { width: 24 }, // סטטוס שורה
    { width: 16 }, // סטטוס נעילה
    { width: 24 }, // נערך ע"י
    { width: 18 }, // מועד עריכה
    { width: 30 }, // הערות
  ];

  // -------------------------------------------------------------
  // Sheet 2: Visual Product Tree (גיליון 2: תמונה אחת בלבד!)
  // -------------------------------------------------------------
  const wsTree = workbook.addWorksheet(`עץ_מוצר_${order.id}`, {
    views: [{ rightToLeft: true }],
  });

  try {
    const treeImg = await generateVisualTreeImage(order, bomRows);
    if (treeImg.base64) {
      const imageId = workbook.addImage({
        base64: treeImg.base64,
        extension: 'png',
      });

      // Embed the single image starting at top-left corner with crisp dimensions
      wsTree.addImage(imageId, {
        tl: { col: 0.5, row: 0.5 },
        ext: { width: treeImg.width, height: treeImg.height },
      });
    }
  } catch (err) {
    console.warn('Failed to embed tree image into Sheet 2:', err);
  }

  // -------------------------------------------------------------
  // Download File in Browser
  // -------------------------------------------------------------
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeCustomer = order.customer.replace(/[\\/:*?"<>|]/g, '').trim();
  a.download = `BOM_${order.id}_${safeCustomer}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

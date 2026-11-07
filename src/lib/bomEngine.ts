import {
  BomRow,
  CatalogRule,
  ImgType,
  Order,
  SystemType,
} from '@/types/configurator';
import { getItemImageUrl } from '@/data/initialData';

export function getNowTimestamp(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

export function getDefaultImgTypeForCat(cat: string): ImgType {
  if (cat.includes('אופטי')) return 'optics';
  if (cat.includes('ספק')) return 'power';
  if (cat.includes('מארז') || cat.includes('בקרה')) return 'board';
  return 'sensor';
}

export function buildDynamicBomForOrder(
  sys: SystemType | undefined,
  p: string,
  f: string,
  v: string,
  e: string,
  u: string,
  catalogRules: CatalogRule[],
  categories: string[],
  includeInactive = false,
  editedByLabel = 'מערכת (גזירה אוטומטית)',
  editedAtTs?: string
): BomRow[] {
  const ts = editedAtTs || getNowTimestamp();
  const bom: BomRow[] = [];
  let rowIndex = 1;

  const isCustomPower = p.startsWith('אחר:');
  const isCustomFocal = f.startsWith('אחר:');
  const isCustomVoltage = v.startsWith('אחר:');
  const isCustomEnv = e.startsWith('אחר:');
  const isCustomUsage = u.startsWith('אחר:');

  categories.forEach((cat) => {
    const qtyForCat =
      sys && sys.catQty && sys.catQty[cat] !== undefined ? sys.catQty[cat] : 1;
    if (qtyForCat <= 0) return;

    const catRoots = catalogRules.filter(
      (r) =>
        r.category === cat &&
        r.parentSku === 'ROOT' &&
        (includeInactive || r.active !== false)
    );
    if (catRoots.length === 0) return;

    let isCatCustom = false;
    let customReason = '';
    if (cat.includes('אופטי') && isCustomPower) {
      isCatCustom = true;
      customReason = p;
    } else if (cat.includes('ספק') && isCustomVoltage) {
      isCatCustom = true;
      customReason = v;
    } else if (cat.includes('מארז') && isCustomEnv) {
      isCatCustom = true;
      customReason = e;
    } else if (isCustomUsage) {
      isCatCustom = true;
      customReason = u;
    }

    const matchingRoots = catRoots.filter(
      (r) =>
        (isCustomPower || r.matchPower.includes(p)) &&
        (isCustomFocal || r.matchFocal.includes(f)) &&
        (isCustomVoltage || r.matchVoltage.includes(v)) &&
        (isCustomEnv || r.matchEnv.includes(e)) &&
        (isCustomUsage || (r.matchUsage && r.matchUsage.includes(u)))
    );

    const parentRowId = `B${rowIndex++}`;
    let chosenRoot = matchingRoots[0] || catRoots[0];

    if (isCatCustom || matchingRoots.length === 0) {
      const reasonText =
        customReason || `${p}, ${f}, ${v}, ${e}, ${u}`;
      bom.push({
        id: parentRowId,
        category: cat,
        level: 'assembly',
        parentId: null,
        sku: 'CUSTOM-REQ',
        rev: 'TBD (פיתוח)',
        desc: `מכלול ${cat} מותאם (${reasonText})`,
        qty: qtyForCat,
        selectionType: 'דרישת פיתוח (Custom)',
        alternatives: ['נדרש תכנון הנדסי / בחירת מכלול חלופי'],
        selectedAlt: 'נדרש תכנון הנדסי / בחירת מכלול חלופי',
        isCustom: true,
        approved: false,
        rowLocked: false,
        rowEditing: false,
        removed: false,
        lastEditedBy: editedByLabel,
        lastEditedAt: ts,
        notes: `דרישה חורגת בקטגוריית ${cat}: ${reasonText}`,
        imgType: 'custom',
        customImg: getItemImageUrl('CUSTOM-DEV', null, true),
      });
    } else {
      const altStrings = matchingRoots.map(
        (r) => `${r.sku} – ${r.desc} (${r.rev})`
      );
      const isMultiple = matchingRoots.length > 1;
      bom.push({
        id: parentRowId,
        category: cat,
        level: 'assembly',
        parentId: null,
        sku: chosenRoot.sku,
        rev: chosenRoot.rev,
        desc: chosenRoot.desc,
        qty: qtyForCat,
        selectionType: isMultiple ? 'לבחירת איש רכש' : 'פריט מוגדר',
        alternatives: altStrings,
        selectedAlt: altStrings[0],
        isCustom: false,
        approved: !isMultiple,
        rowLocked: !isMultiple,
        rowEditing: isMultiple,
        removed: false,
        inactiveSource: chosenRoot.active === false,
        lastEditedBy: editedByLabel,
        lastEditedAt: ts,
        notes: isMultiple
          ? `${matchingRoots.length} מכלולים תואמים – לבחירת איש רכש`
          : 'מכלול תואם נבחר אוטומטית מהקטלוג',
        imgType: chosenRoot.imgType || getDefaultImgTypeForCat(cat),
        customImg: getItemImageUrl(chosenRoot.sku, chosenRoot.customImg, false),
      });
    }

    if (chosenRoot) {
      const subRules = catalogRules.filter(
        (r) =>
          r.parentSku === chosenRoot.sku &&
          (includeInactive || r.active !== false)
      );
      subRules.forEach((sub) => {
        const isSubCustomFocal =
          cat.includes('אופטי') &&
          isCustomFocal &&
          sub.desc.includes('עדש');
        const subMatch =
          !isSubCustomFocal &&
          (isCustomPower || sub.matchPower.includes(p)) &&
          (isCustomFocal || sub.matchFocal.includes(f)) &&
          (isCustomVoltage || sub.matchVoltage.includes(v)) &&
          (isCustomEnv || sub.matchEnv.includes(e)) &&
          (isCustomUsage || (sub.matchUsage && sub.matchUsage.includes(u)));

        const subRowId = `B${rowIndex++}`;
        if (!subMatch) {
          bom.push({
            id: subRowId,
            category: cat,
            level: 'sub-assembly',
            parentId: parentRowId,
            sku: `CUSTOM-${sub.sku}`,
            rev: 'TBD (פיתוח)',
            desc: `${sub.desc} (${isCustomFocal ? f : 'התאמה מיוחדת'})`,
            qty: qtyForCat,
            selectionType: 'דרישת פיתוח (Custom)',
            alternatives: ['נדרש תכנון הנדסי ופתיחת מק"ט'],
            selectedAlt: 'נדרש תכנון הנדסי ופתיחת מק"ט',
            isCustom: true,
            approved: false,
            rowLocked: false,
            rowEditing: false,
            removed: false,
            lastEditedBy: editedByLabel,
            lastEditedAt: ts,
            notes: `תת-מכלול דורש התאמה מיוחדת תחת ${chosenRoot.sku}`,
            imgType: 'custom',
            customImg: getItemImageUrl('CUSTOM-DEV', null, true),
          });
        } else {
          const altStr = `${sub.sku} – ${sub.desc} (${sub.rev})`;
          bom.push({
            id: subRowId,
            category: cat,
            level: 'sub-assembly',
            parentId: parentRowId,
            sku: sub.sku,
            rev: sub.rev,
            desc: sub.desc,
            qty: qtyForCat,
            selectionType: 'פריט מוגדר',
            alternatives: [altStr],
            selectedAlt: altStr,
            isCustom: false,
            approved: true,
            rowLocked: true,
            rowEditing: false,
            removed: false,
            inactiveSource: sub.active === false,
            lastEditedBy: editedByLabel,
            lastEditedAt: ts,
            notes: `תת-מכלול משויך ל-${chosenRoot.sku}`,
            imgType: sub.imgType || 'sensor',
            customImg: getItemImageUrl(sub.sku, sub.customImg, false),
          });
        }
      });
    }
  });

  return bom;
}

export function ensureOrderHasBom(
  order: Order,
  systemTypes: SystemType[],
  catalogRules: CatalogRule[],
  categories: string[]
): BomRow[] {
  if (order.bom && order.bom.length > 0) {
    return order.bom;
  }
  const sys =
    systemTypes.find((s) => s.id === order.systemTypeId) || systemTypes[0];
  return buildDynamicBomForOrder(
    sys,
    order.power,
    order.focal,
    order.voltage,
    order.env,
    order.usage || 'אזרחי',
    catalogRules,
    categories,
    true, // Existing orders include inactive assemblies
    order.createdBy || 'מערכת (גזירה אוטומטית)',
    order.createdAt || getNowTimestamp()
  );
}

export function getUnlockedBomRows(bomRows: BomRow[]): BomRow[] {
  return bomRows.filter((b) => {
    if (b.removed) return false;
    if (b.isCustom) return true;
    if (!b.rowLocked || b.rowEditing) return true;
    return false;
  });
}


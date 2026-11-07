'use client';

import React, { useState } from 'react';
import {
  AppUser,
  CatalogRule,
  CompatLink,
  ImgType,
  RecycleBinItem,
  RoleType,
  SystemType,
} from '@/types/configurator';
import {
  ALL_ENVS,
  ALL_FOCALS,
  ALL_POWERS,
  ALL_USAGES,
  ALL_VOLTAGES,
  getItemImageUrl,
  ROLE_LABELS_HE,
} from '@/data/initialData';
import { getNowTimestamp } from '@/lib/bomEngine';
import MultiSelectDropdown from '@/components/MultiSelectDropdown';

interface AdminDashboardProps {
  categories: string[];
  systemTypes: SystemType[];
  catalogRules: CatalogRule[];
  compatLinks: CompatLink[];
  recycleBin: RecycleBinItem[];
  users: AppUser[];
  currentUserLabel: string;
  onUpdateState: (updater: {
    categories?: string[];
    systemTypes?: SystemType[];
    catalogRules?: CatalogRule[];
    compatLinks?: CompatLink[];
    recycleBin?: RecycleBinItem[];
    users?: AppUser[];
  }) => void;
  onGoToNewOrder: () => void;
  onSelectActiveUser?: (user: AppUser) => void;
}

export default function AdminDashboard({
  categories,
  systemTypes,
  catalogRules,
  compatLinks,
  recycleBin,
  users,
  currentUserLabel,
  onUpdateState,
  onGoToNewOrder,
  onSelectActiveUser,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<
    'rules' | 'systems' | 'compat' | 'workflow' | 'recycle' | 'users'
  >('rules');

  // --- Tab F: User Management State ---
  const [newUserName, setNewUserName] = useState<string>('');
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  const [newUserRole, setNewUserRole] = useState<RoleType>('viewer');

  // --- Tab A: Catalog Rules State ---
  const [filterCat, setFilterCat] = useState<string>('ALL');
  const [newCatInput, setNewCatInput] = useState<string>('');
  const [editingRuleIdx, setEditingRuleIdx] = useState<number>(-1);
  const [ruleSku, setRuleSku] = useState<string>('');
  const [ruleRev, setRuleRev] = useState<string>('Rev A');
  const [ruleDesc, setRuleDesc] = useState<string>('');
  const [ruleCategory, setRuleCategory] = useState<string>(
    categories[0] || 'אופטיקה ולייזר'
  );
  const [ruleParent, setRuleParent] = useState<string>('ROOT');
  const [ruleCost, setRuleCost] = useState<string>('$850');
  const [ruleActive, setRuleActive] = useState<boolean>(true);
  const [ruleCustomImg, setRuleCustomImg] = useState<string | null>(null);
  const [rulePowers, setRulePowers] = useState<string[]>([...ALL_POWERS]);
  const [ruleFocals, setRuleFocals] = useState<string[]>([...ALL_FOCALS]);
  const [ruleVoltages, setRuleVoltages] = useState<string[]>(['230V AC']);
  const [ruleEnvs, setRuleEnvs] = useState<string[]>([...ALL_ENVS]);
  const [ruleUsages, setRuleUsages] = useState<string[]>([...ALL_USAGES]);

  // --- Tab B: System Types State ---
  const [editingSysIdx, setEditingSysIdx] = useState<number>(-1);
  const [sysId, setSysId] = useState<string>('');
  const [sysName, setSysName] = useState<string>('');
  const [sysPowers, setSysPowers] = useState<string[]>([...ALL_POWERS]);
  const [sysFocals, setSysFocals] = useState<string[]>([...ALL_FOCALS]);
  const [sysVoltages, setSysVoltages] = useState<string[]>(['230V AC']);
  const [sysEnvs, setSysEnvs] = useState<string[]>([...ALL_ENVS]);
  const [sysUsages, setSysUsages] = useState<string[]>([...ALL_USAGES]);
  const [sysChannels, setSysChannels] = useState<number>(4);
  const [sysPsuCount, setSysPsuCount] = useState<number>(2);
  const [sysCustomImg, setSysCustomImg] = useState<string | null>(null);
  const [sysCatQty, setSysCatQty] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    categories.forEach((c) => (map[c] = 1));
    return map;
  });

  // --- Tab C: Compatibility Links State ---
  const [editingCompatIdx, setEditingCompatIdx] = useState<number>(-1);
  const [compatC1, setCompatC1] = useState<string>(
    catalogRules[0]?.sku || 'OPT-MOD-100'
  );
  const [compatC2List, setCompatC2List] = useState<string[]>([]);
  const [compatNote, setCompatNote] = useState<string>('');

  // --- Delete Reason Modal State ---
  const [deleteTarget, setDeleteTarget] = useState<{
    itemType: 'assembly' | 'system';
    idx: number;
    title: string;
  } | null>(null);
  const [deleteReasonText, setDeleteReasonText] = useState<string>('');

  // --- Handlers: Tab A (Assemblies) ---
  const resetRuleForm = () => {
    setEditingRuleIdx(-1);
    setRuleSku('');
    setRuleRev('Rev A');
    setRuleDesc('');
    setRuleCategory(categories[0] || 'אופטיקה ולייזר');
    setRuleParent('ROOT');
    setRuleCost('$850');
    setRuleActive(true);
    setRuleCustomImg(null);
    setRulePowers([...ALL_POWERS]);
    setRuleFocals([...ALL_FOCALS]);
    setRuleVoltages(['230V AC']);
    setRuleEnvs([...ALL_ENVS]);
    setRuleUsages([...ALL_USAGES]);
  };

  const handleEditRule = (idx: number) => {
    const r = catalogRules[idx];
    if (!r) return;
    setEditingRuleIdx(idx);
    setRuleSku(r.sku);
    setRuleRev(r.rev || 'Rev A');
    setRuleDesc(r.desc);
    setRuleCategory(r.category);
    setRuleParent(r.parentSku);
    setRuleCost(r.cost);
    setRuleActive(r.active !== false);
    setRuleCustomImg(r.customImg);
    setRulePowers([...r.matchPower]);
    setRuleFocals([...r.matchFocal]);
    setRuleVoltages([...r.matchVoltage]);
    setRuleEnvs([...r.matchEnv]);
    setRuleUsages([...(r.matchUsage || ALL_USAGES)]);
  };

  const handleSaveRule = () => {
    const skuTrim = ruleSku.trim();
    const revTrim = ruleRev.trim() || 'Rev A';
    const descTrim = ruleDesc.trim();
    if (!skuTrim || !descTrim) {
      alert('נא להזין מק"ט (SKU) ושם/תיאור מכלול.');
      return;
    }

    // Block duplicate SKU + Rev
    const duplicate = catalogRules.some(
      (r, idx) =>
        idx !== editingRuleIdx &&
        r.sku.toLowerCase() === skuTrim.toLowerCase() &&
        (r.rev || 'Rev A').toLowerCase() === revTrim.toLowerCase()
    );
    if (duplicate) {
      alert(
        `חסימת כפילות: כבר קיים בקטלוג מכלול עם המק"ט "${skuTrim}" ואותו Rev ("${revTrim}").\nלא ניתן להקים שני מכלולים עם אותו מק"ט ואותו Rev.`
      );
      return;
    }

    const imgType: ImgType = ruleCategory.includes('אופטי')
      ? 'optics'
      : ruleCategory.includes('ספק')
      ? 'power'
      : ruleCategory.includes('מארז')
      ? 'board'
      : 'sensor';

    const newRule: CatalogRule = {
      sku: skuTrim,
      rev: revTrim,
      desc: descTrim,
      category: ruleCategory,
      parentSku: ruleParent,
      matchPower: rulePowers.length ? rulePowers : ['100W'],
      matchFocal: ruleFocals.length ? ruleFocals : ['50mm'],
      matchVoltage: ruleVoltages.length ? ruleVoltages : ['230V AC'],
      matchEnv: ruleEnvs.length ? ruleEnvs : ['IP54 מעבדה/פנים'],
      matchUsage: ruleUsages.length ? ruleUsages : [...ALL_USAGES],
      cost: ruleCost.trim() || '$500',
      imgType,
      customImg:
        ruleCustomImg || getItemImageUrl(skuTrim, null, false),
      active: ruleActive,
    };

    const nextRules = [...catalogRules];
    if (editingRuleIdx >= 0) {
      nextRules[editingRuleIdx] = newRule;
    } else {
      nextRules.push(newRule);
    }

    onUpdateState({ catalogRules: nextRules });
    resetRuleForm();
  };

  const handleToggleRuleActive = (idx: number) => {
    const nextRules = [...catalogRules];
    const current = nextRules[idx];
    if (!current) return;
    nextRules[idx] = {
      ...current,
      active: current.active === false ? true : false,
    };
    onUpdateState({ catalogRules: nextRules });
  };

  const handleAddCategory = () => {
    const val = newCatInput.trim();
    if (!val) {
      alert('נא להזין שם קטגוריה חדשה.');
      return;
    }
    if (categories.includes(val)) {
      alert('הקטגוריה כבר קיימת במערכת.');
      return;
    }
    const nextCategories = [...categories, val];
    const nextSystems = systemTypes.map((s) => ({
      ...s,
      catQty: { ...s.catQty, [val]: 1 },
    }));
    setNewCatInput('');
    setRuleCategory(val);
    setSysCatQty((prev) => ({ ...prev, [val]: 1 }));
    onUpdateState({ categories: nextCategories, systemTypes: nextSystems });
  };

  // --- Handlers: Tab B (Systems) ---
  const resetSystemForm = () => {
    setEditingSysIdx(-1);
    setSysId('');
    setSysName('');
    setSysPowers([...ALL_POWERS]);
    setSysFocals([...ALL_FOCALS]);
    setSysVoltages(['230V AC']);
    setSysEnvs([...ALL_ENVS]);
    setSysUsages([...ALL_USAGES]);
    setSysChannels(4);
    setSysPsuCount(2);
    setSysCustomImg(null);
    const map: Record<string, number> = {};
    categories.forEach((c) => (map[c] = 1));
    setSysCatQty(map);
  };

  const handleEditSystem = (idx: number) => {
    const s = systemTypes[idx];
    if (!s) return;
    setEditingSysIdx(idx);
    setSysId(s.id);
    setSysName(s.name);
    setSysPowers([...(s.allowedPowers || [s.power])]);
    setSysFocals([...(s.allowedFocals || [s.focal])]);
    setSysVoltages([...(s.allowedVoltages || [s.voltage])]);
    setSysEnvs([...(s.allowedEnvs || [s.env])]);
    setSysUsages([...(s.allowedUsages || [s.usage || 'אזרחי'])]);
    setSysChannels(s.channels);
    setSysPsuCount(s.psuCount);
    setSysCustomImg(s.customImg);
    setSysCatQty({ ...s.catQty });
  };

  const handleSaveSystem = () => {
    const idTrim = sysId.trim();
    const nameTrim = sysName.trim();
    if (!idTrim || !nameTrim) {
      alert('נא להזין קוד מערכת ושם מערכת.');
      return;
    }
    const powers = sysPowers.length ? sysPowers : ['100W'];
    const focals = sysFocals.length ? sysFocals : ['50mm'];
    const voltages = sysVoltages.length ? sysVoltages : ['230V AC'];
    const envs = sysEnvs.length ? sysEnvs : ['IP54 מעבדה/פנים'];
    const usages = sysUsages.length ? sysUsages : ['אזרחי'];

    const newSys: SystemType = {
      id: idTrim,
      name: nameTrim,
      allowedPowers: powers,
      allowedFocals: focals,
      allowedVoltages: voltages,
      allowedEnvs: envs,
      allowedUsages: usages,
      power: powers[0],
      focal: focals[0],
      voltage: voltages[0],
      env: envs[0],
      usage: usages[0],
      channels: sysChannels || 1,
      psuCount: sysPsuCount || 1,
      active: true,
      customImg: sysCustomImg || getItemImageUrl(idTrim, null, false),
      catQty: { ...sysCatQty },
    };

    const nextSystems = [...systemTypes];
    if (editingSysIdx >= 0) {
      nextSystems[editingSysIdx] = newSys;
    } else {
      nextSystems.push(newSys);
    }
    onUpdateState({ systemTypes: nextSystems });
    resetSystemForm();
  };

  // --- Handlers: Tab C (Compat Links) ---
  const resetCompatForm = () => {
    setEditingCompatIdx(-1);
    setCompatC1(catalogRules[0]?.sku || 'OPT-MOD-100');
    setCompatC2List([]);
    setCompatNote('');
  };

  const handleEditCompat = (idx: number) => {
    const link = compatLinks[idx];
    if (!link) return;
    setEditingCompatIdx(idx);
    setCompatC1(link.c1);
    setCompatC2List([...link.c2List]);
    setCompatNote(link.note);
  };

  const handleSaveCompat = () => {
    if (!compatC1 || compatC2List.length === 0) {
      alert('נא לבחור רכיב 1 ולפחות רכיב תואם אחד ברשימת רכיב 2.');
      return;
    }
    const filteredC2 = compatC2List.filter((sku) => sku !== compatC1);
    const nextCompat = [...compatLinks];
    if (editingCompatIdx >= 0) {
      nextCompat[editingCompatIdx] = {
        c1: compatC1,
        c2List: filteredC2,
        note: compatNote.trim() || 'תאימות מאושרת ע"י מנהל מערכת',
      };
    } else {
      const existingIdx = nextCompat.findIndex((l) => l.c1 === compatC1);
      if (existingIdx >= 0) {
        const merged = Array.from(
          new Set([...nextCompat[existingIdx].c2List, ...filteredC2])
        );
        nextCompat[existingIdx] = {
          c1: compatC1,
          c2List: merged,
          note: compatNote.trim() || nextCompat[existingIdx].note,
        };
      } else {
        nextCompat.push({
          c1: compatC1,
          c2List: filteredC2,
          note: compatNote.trim() || 'תאימות מאושרת ע"י מנהל מערכת',
        });
      }
    }
    onUpdateState({ compatLinks: nextCompat });
    resetCompatForm();
  };

  const handleDeleteCompat = (idx: number) => {
    const nextCompat = compatLinks.filter((_, i) => i !== idx);
    onUpdateState({ compatLinks: nextCompat });
  };

  // --- Handlers: Tab E (Recycle Bin & Delete Modal) ---
  const openDeleteModal = (
    itemType: 'assembly' | 'system',
    idx: number
  ) => {
    if (itemType === 'assembly') {
      const r = catalogRules[idx];
      if (!r) return;
      setDeleteTarget({
        itemType,
        idx,
        title: `מחיקת מכלול לסל המיחזור: ${r.sku} (${r.rev || 'Rev A'}) – ${r.desc}`,
      });
    } else {
      const s = systemTypes[idx];
      if (!s) return;
      setDeleteTarget({
        itemType,
        idx,
        title: `מחיקת מערכת לסל המיחזור: ${s.id} – ${s.name}`,
      });
    }
    setDeleteReasonText('');
  };

  const confirmDeleteToRecycleBin = () => {
    if (!deleteTarget) return;
    const reason = deleteReasonText.trim();
    if (!reason) {
      alert(
        'חובה להזין הערה המפרטת מדוע הפריט נמחק לפני העברתו לסל המיחזור.'
      );
      return;
    }

    const ts = getNowTimestamp();
    if (deleteTarget.itemType === 'assembly') {
      const r = catalogRules[deleteTarget.idx];
      if (!r) return;
      const newBinItem: RecycleBinItem = {
        recycleId: `REC-ASM-${Date.now()}`,
        itemType: 'assembly',
        skuOrId: r.sku,
        rev: r.rev || 'Rev A',
        name: r.desc,
        categoryOrDetails: `קטגוריה: ${r.category} | היררכיה: ${
          r.parentSku === 'ROOT' ? 'מכלול ראשי' : 'תחת ' + r.parentSku
        }`,
        deletedBy: currentUserLabel,
        deletedAt: ts,
        deleteReason: reason,
        payload: structuredClone(r),
      };
      const nextRules = catalogRules.filter(
        (_, i) => i !== deleteTarget.idx
      );
      onUpdateState({
        catalogRules: nextRules,
        recycleBin: [newBinItem, ...recycleBin],
      });
    } else {
      const s = systemTypes[deleteTarget.idx];
      if (!s) return;
      const newBinItem: RecycleBinItem = {
        recycleId: `REC-SYS-${Date.now()}`,
        itemType: 'system',
        skuOrId: s.id,
        rev: '-',
        name: s.name,
        categoryOrDetails: `מערכת ראשית | ${s.channels} ערוצים | ${s.psuCount} ספקים`,
        deletedBy: currentUserLabel,
        deletedAt: ts,
        deleteReason: reason,
        payload: structuredClone(s),
      };
      const nextSystems = systemTypes.filter(
        (_, i) => i !== deleteTarget.idx
      );
      onUpdateState({
        systemTypes: nextSystems,
        recycleBin: [newBinItem, ...recycleBin],
      });
    }

    setDeleteTarget(null);
    setDeleteReasonText('');
  };

  const handleRestoreFromRecycleBin = (recycleId: string) => {
    const idx = recycleBin.findIndex((item) => item.recycleId === recycleId);
    if (idx === -1) return;
    const item = recycleBin[idx];

    if (item.itemType === 'assembly') {
      const payload = item.payload as CatalogRule;
      const exists = catalogRules.some(
        (r) =>
          r.sku.toLowerCase() === payload.sku.toLowerCase() &&
          (r.rev || 'Rev A').toLowerCase() ===
            (payload.rev || 'Rev A').toLowerCase()
      );
      if (exists) {
        alert(
          `לא ניתן לשחזר: כבר קיים כעת בקטלוג מכלול פעיל עם מק"ט ${payload.sku} ומהדורה ${payload.rev || 'Rev A'}.`
        );
        return;
      }
      const nextRules = [...catalogRules, payload];
      const nextBin = recycleBin.filter((_, i) => i !== idx);
      onUpdateState({ catalogRules: nextRules, recycleBin: nextBin });
    } else {
      const payload = item.payload as SystemType;
      const exists = systemTypes.some(
        (s) => s.id.toLowerCase() === payload.id.toLowerCase()
      );
      if (exists) {
        alert(
          `לא ניתן לשחזר: כבר קיימת מערכת פעילה עם המזהה ${payload.id}.`
        );
        return;
      }
      const nextSystems = [...systemTypes, payload];
      const nextBin = recycleBin.filter((_, i) => i !== idx);
      onUpdateState({ systemTypes: nextSystems, recycleBin: nextBin });
    }
  };

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'rule' | 'system'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      if (target === 'rule') setRuleCustomImg(result);
      else setSysCustomImg(result);
    };
    reader.readAsDataURL(file);
  };

  const rootAssemblies = catalogRules.filter((r) => r.parentSku === 'ROOT');
  const filteredCatalogRules = catalogRules
    .map((rule, idx) => ({ rule, idx }))
    .filter(({ rule }) => filterCat === 'ALL' || rule.category === filterCat);

  return (
    <section className="space-y-5">
      {/* Top Banner */}
      <div className="bg-gradient-to-l from-purple-950 via-slate-900 to-slate-900 text-white rounded-xl p-5 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-purple-500/30 border border-purple-400/40 text-purple-200 text-xs px-2.5 py-0.5 rounded-full font-semibold">
              הרשאת מנהל מערכת
            </span>
            <span className="text-xs text-slate-400">
              חוקי תצורה, סטטוס פעיל/לא פעיל וסל מיחזור
            </span>
          </div>
          <h2 className="text-xl font-bold">
            ניהול ישויות, היררכיית מוצר, מערכות, תאימות וסל מיחזור
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            כל שינוי נשמר אוטומטית ומסונכרן למנוע בניית ה-BOM ולעץ המוצר.
          </p>
        </div>

        {/* 5 Sub-Tabs */}
        <div className="flex flex-wrap bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className={`px-3.5 py-2 rounded-lg font-bold transition ${
              activeTab === 'rules'
                ? 'bg-purple-600 text-white'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            א. מכלולים וחוקי בחירה
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('systems')}
            className={`px-3.5 py-2 rounded-lg font-bold transition ${
              activeTab === 'systems'
                ? 'bg-purple-600 text-white'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            ב. סוגי מערכות
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('compat')}
            className={`px-3.5 py-2 rounded-lg font-bold transition ${
              activeTab === 'compat'
                ? 'bg-purple-600 text-white'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            ג. התאמות בין רכיבים
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('workflow')}
            className={`px-3.5 py-2 rounded-lg font-bold transition ${
              activeTab === 'workflow'
                ? 'bg-purple-600 text-white'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            ד. 🔄 תרשים זרימה – מהטופס ל-BOM
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('recycle')}
            className={`px-3.5 py-2 rounded-lg font-bold transition flex items-center gap-1.5 ${
              activeTab === 'recycle'
                ? 'bg-purple-600 text-white'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <span>ה. 🗑️ סל מיחזור</span>
            <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.2 rounded-full">
              {recycleBin.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`px-3.5 py-2 rounded-lg font-bold transition flex items-center gap-1.5 ${
              activeTab === 'users'
                ? 'bg-purple-600 text-white'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <span>ו. 👥 ניהול משתמשים (Google)</span>
            <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.2 rounded-full">
              {users.length}
            </span>
          </button>
        </div>
      </div>

      {/* TAB A: Assemblies & Selection Rules */}
      {activeTab === 'rules' && (
        <div className="space-y-5">
          {/* Category Filter + Add Category Bar */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-700">
                סינון מכלולים לפי קטגוריה:
              </label>
              <select
                value={filterCat}
                onChange={(e) => setFilterCat(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs bg-white font-semibold"
              >
                <option value="ALL">כל הקטגוריות ({categories.length})</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <span className="text-xs text-slate-500">
                מציג <strong>{filteredCatalogRules.length}</strong> מכלולים
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newCatInput}
                onChange={(e) => setNewCatInput(e.target.value)}
                placeholder="שם קטגוריה חדשה..."
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs w-52 bg-white"
              />
              <button
                type="button"
                onClick={handleAddCategory}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-sm transition"
              >
                + הוסף קטגוריה חדשה
              </button>
            </div>
          </div>

          {/* Add / Edit Assembly Form */}
          <div className="bg-white rounded-xl border-2 border-purple-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-purple-900">
                {editingRuleIdx >= 0
                  ? `עריכת מכלול קיים: ${ruleSku}`
                  : '+ הוספת מכלול / תת-מכלול חדש והגדרת חוק בחירה'}
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[11px] bg-purple-50 text-purple-800 border border-purple-200 px-2.5 py-0.5 rounded-full font-medium">
                  ברירת מחדל: כל ההספקים | כל אורכי המוקד | 230V AC | כל תנאי הסביבה | כל השימושים
                </span>
                {editingRuleIdx >= 0 && (
                  <button
                    type="button"
                    onClick={resetRuleForm}
                    className="text-xs text-slate-600 hover:text-slate-900 bg-slate-100 px-3 py-1 rounded-lg font-semibold"
                  >
                    ביטול עריכה
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-7 gap-3 items-end text-xs mb-3">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  מק&quot;ט (SKU)
                </label>
                <input
                  type="text"
                  value={ruleSku}
                  onChange={(e) => setRuleSku(e.target.value)}
                  placeholder="למשל: OPT-300"
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono bg-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  מהדורה (Rev)
                </label>
                <input
                  type="text"
                  value={ruleRev}
                  onChange={(e) => setRuleRev(e.target.value)}
                  placeholder="Rev A"
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono bg-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  שם / תיאור המכלול
                </label>
                <input
                  type="text"
                  value={ruleDesc}
                  onChange={(e) => setRuleDesc(e.target.value)}
                  placeholder="תיאור המכלול..."
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  קטגוריה
                </label>
                <select
                  value={ruleCategory}
                  onChange={(e) => setRuleCategory(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-2 py-1.5 bg-white"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  מיקום בהיררכיה
                </label>
                <select
                  value={ruleParent}
                  onChange={(e) => setRuleParent(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-2 py-1.5 bg-white"
                >
                  <option value="ROOT">מכלול ראשי (אב)</option>
                  {rootAssemblies.map((r) => (
                    <option key={r.sku} value={r.sku}>
                      תת-מכלול תחת {r.sku} ({r.desc})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  עלות ותמונה
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={ruleCost}
                    onChange={(e) => setRuleCost(e.target.value)}
                    className="w-20 border border-slate-300 rounded-lg px-2 py-1.5 font-mono bg-white"
                  />
                  <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1">
                    <span>📷 תמונה</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, 'rule')}
                    />
                  </label>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  סטטוס פעילות
                </label>
                <label className="flex items-center gap-2 border border-slate-300 rounded-lg px-2.5 py-1.5 bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ruleActive}
                    onChange={(e) => setRuleActive(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span className="font-bold text-slate-700">
                    מכלול פעיל (להזמנות חדשות)
                  </span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 items-end text-xs pt-2 border-t border-slate-100">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  מתאים להספקים
                </label>
                <MultiSelectDropdown
                  options={ALL_POWERS.map((v) => ({ value: v }))}
                  selected={rulePowers}
                  onChange={setRulePowers}
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  מתאים לאורכי מוקד
                </label>
                <MultiSelectDropdown
                  options={ALL_FOCALS.map((v) => ({ value: v }))}
                  selected={ruleFocals}
                  onChange={setRuleFocals}
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  מתאים להזנת חשמל
                </label>
                <MultiSelectDropdown
                  options={ALL_VOLTAGES.map((v) => ({ value: v }))}
                  selected={ruleVoltages}
                  onChange={setRuleVoltages}
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  מתאים לתנאי סביבה
                </label>
                <MultiSelectDropdown
                  options={ALL_ENVS.map((v) => ({ value: v }))}
                  selected={ruleEnvs}
                  onChange={setRuleEnvs}
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  מתאים לשימוש
                </label>
                <MultiSelectDropdown
                  options={ALL_USAGES.map((v) => ({ value: v }))}
                  selected={ruleUsages}
                  onChange={setRuleUsages}
                />
              </div>
              <div>
                <button
                  type="button"
                  onClick={handleSaveRule}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-3 rounded-lg shadow transition"
                >
                  {editingRuleIdx >= 0 ? '💾 עדכן מכלול' : '+ הוסף מכלול'}
                </button>
              </div>
            </div>
          </div>

          {/* Assemblies Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="font-bold text-sm text-slate-800">
                קטלוג מכלולים ותתי-מכלולים וחוקי גזירה אוטומטיים לטופס המכירות
              </span>
              <span className="text-xs text-slate-500">
                מכלול &quot;לא פעיל&quot; לא יופיע בהזמנות חדשות אך ימשיך להופיע בהזמנות קיימות/ישנות
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">תמונה</th>
                    <th className="py-2.5 px-3">מק&quot;ט ו-Rev</th>
                    <th className="py-2.5 px-3">תיאור פריט</th>
                    <th className="py-2.5 px-3">קטגוריה</th>
                    <th className="py-2.5 px-3">היררכיה (אב/בן)</th>
                    <th className="py-2.5 px-3">סטטוס פעילות</th>
                    <th className="py-2.5 px-3">הספקים</th>
                    <th className="py-2.5 px-3">אורכי מוקד</th>
                    <th className="py-2.5 px-3">הזנת חשמל</th>
                    <th className="py-2.5 px-3">תנאי סביבה</th>
                    <th className="py-2.5 px-3">שימוש</th>
                    <th className="py-2.5 px-3">עלות</th>
                    <th className="py-2.5 px-3 text-center">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredCatalogRules.map(({ rule: r, idx }) => {
                    const isSub = r.parentSku !== 'ROOT';
                    const isActive = r.active !== false;
                    return (
                      <tr
                        key={`${r.sku}-${r.rev}`}
                        className={`${
                          isSub ? 'bg-slate-50/70' : ''
                        } ${
                          !isActive ? 'opacity-60 bg-slate-100' : ''
                        } hover:bg-purple-50/30 transition`}
                      >
                        <td className="py-2.5 px-3">
                          <img
                            src={getItemImageUrl(r.sku, r.customImg, false)}
                            alt={r.desc}
                            className="w-16 h-11 object-cover rounded border border-slate-200 shadow-sm"
                          />
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                          <div>{r.sku}</div>
                          <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-semibold">
                            {r.rev || 'Rev A'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">
                          {r.desc}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-700 font-medium">
                            {r.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {isSub ? (
                            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold">
                              ↳ תת-מכלול של {r.parentSku}
                            </span>
                          ) : (
                            <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold">
                              מכלול ראשי (אב)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full text-[11px] font-bold">
                              🟢 פעיל
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-slate-200 text-slate-700 border border-slate-400 px-2 py-0.5 rounded-full text-[11px] font-bold">
                              ⏸️ לא פעיל (מוסתר בחדשות)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-[11px]">
                          {r.matchPower.join(', ')}
                        </td>
                        <td className="py-2.5 px-3 text-[11px]">
                          {r.matchFocal.join(', ')}
                        </td>
                        <td className="py-2.5 px-3 text-[11px]">
                          {r.matchVoltage.join(', ')}
                        </td>
                        <td className="py-2.5 px-3 text-[11px]">
                          {r.matchEnv.join(', ')}
                        </td>
                        <td className="py-2.5 px-3 text-[11px]">
                          {(r.matchUsage || ALL_USAGES).join(', ')}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold">
                          {r.cost}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleEditRule(idx)}
                              className="text-blue-600 hover:text-blue-800 font-bold px-2 py-1 rounded bg-blue-50 hover:bg-blue-100"
                            >
                              ✏️ ערוך
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleRuleActive(idx)}
                              className={`${
                                isActive
                                  ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                                  : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                              } font-bold px-2 py-1 rounded`}
                            >
                              {isActive ? '⏸️ השבת' : '▶️ הפעל'}
                            </button>
                            <button
                              type="button"
                              onClick={() => openDeleteModal('assembly', idx)}
                              className="text-red-600 hover:text-red-800 font-bold px-2 py-1 rounded bg-red-50 hover:bg-red-100"
                            >
                              🗑️ מחק
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB B: System Types */}
      {activeTab === 'systems' && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border-2 border-purple-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-purple-900">
                  {editingSysIdx >= 0
                    ? `עריכת מערכת: ${sysId}`
                    : '+ הוספת מערכת חדשה / הגדרת פרטי מערכת מותרים'}
                </h3>
                <p className="text-xs text-slate-500">
                  הגדר אילו ערכים מותרים עבור מערכת זו. בטופס פתיחת ההזמנה המשתמש יוכל לבחור רק מתוך הערכים המוגדרים כאן (או לבחור &quot;אחר&quot; לפיתוח).
                </p>
              </div>
              {editingSysIdx >= 0 && (
                <button
                  type="button"
                  onClick={resetSystemForm}
                  className="text-xs text-slate-600 bg-slate-100 px-3 py-1 rounded-lg font-semibold"
                >
                  ביטול עריכה
                </button>
              )}
            </div>

            <div className="grid grid-cols-6 gap-3 items-end text-xs mb-3">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  קוד מערכת (ID)
                </label>
                <input
                  type="text"
                  value={sysId}
                  onChange={(e) => setSysId(e.target.value)}
                  placeholder="SYS-NEW-300"
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono bg-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  שם המערכת
                </label>
                <input
                  type="text"
                  value={sysName}
                  onChange={(e) => setSysName(e.target.value)}
                  placeholder="שם מערכת..."
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  הספקים מותרים במערכת
                </label>
                <MultiSelectDropdown
                  options={ALL_POWERS.map((v) => ({ value: v }))}
                  selected={sysPowers}
                  onChange={setSysPowers}
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  אורכי מוקד מותרים
                </label>
                <MultiSelectDropdown
                  options={ALL_FOCALS.map((v) => ({ value: v }))}
                  selected={sysFocals}
                  onChange={setSysFocals}
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  הזנות חשמל מותרות
                </label>
                <MultiSelectDropdown
                  options={ALL_VOLTAGES.map((v) => ({ value: v }))}
                  selected={sysVoltages}
                  onChange={setSysVoltages}
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  תנאי סביבה מותרים
                </label>
                <MultiSelectDropdown
                  options={ALL_ENVS.map((v) => ({ value: v }))}
                  selected={sysEnvs}
                  onChange={setSysEnvs}
                />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 items-end text-xs pt-2 border-t border-slate-100">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  שימושים מותרים
                </label>
                <MultiSelectDropdown
                  options={ALL_USAGES.map((v) => ({ value: v }))}
                  selected={sysUsages}
                  onChange={setSysUsages}
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  כמות ערוצים / ספקים
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    min={1}
                    value={sysChannels}
                    onChange={(e) => setSysChannels(Number(e.target.value))}
                    className="w-1/2 border border-slate-300 rounded-lg px-2 py-1.5 text-center bg-white"
                    title="ערוצים"
                  />
                  <input
                    type="number"
                    min={1}
                    value={sysPsuCount}
                    onChange={(e) => setSysPsuCount(Number(e.target.value))}
                    className="w-1/2 border border-slate-300 rounded-lg px-2 py-1.5 text-center bg-white"
                    title="ספקים"
                  />
                </div>
              </div>
              <div className="col-span-2">
                <label className="block font-semibold text-slate-600 mb-1">
                  כמות מכלולים נדרשת לכל קטגוריה
                </label>
                <div className="grid grid-cols-2 gap-1.5 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                  {categories.map((cat) => (
                    <div
                      key={cat}
                      className="flex items-center justify-between gap-1 text-[11px]"
                    >
                      <span className="truncate">{cat}:</span>
                      <input
                        type="number"
                        min={0}
                        value={sysCatQty[cat] ?? 1}
                        onChange={(e) =>
                          setSysCatQty((prev) => ({
                            ...prev,
                            [cat]: Number(e.target.value),
                          }))
                        }
                        className="w-12 border border-slate-300 rounded px-1 py-0.5 text-center font-bold bg-white"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  תמונת מערכת
                </label>
                <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1">
                  <span>📷 העלה תמונה</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, 'system')}
                  />
                </label>
              </div>
              <div>
                <button
                  type="button"
                  onClick={handleSaveSystem}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-3 rounded-lg shadow transition"
                >
                  {editingSysIdx >= 0 ? '💾 עדכן מערכת' : '💾 שמור מערכת'}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {systemTypes.map((s, idx) => (
              <div
                key={s.id}
                className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-5 space-y-3 hover:border-purple-300 transition"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={getItemImageUrl(s.id, s.customImg, false)}
                      alt={s.name}
                      className="w-20 h-14 object-cover rounded-lg border border-slate-200 shadow-sm"
                    />
                    <div>
                      <span className="font-mono text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-bold">
                        {s.id}
                      </span>
                      <h4 className="font-bold text-slate-800 text-sm mt-1">
                        {s.name}
                      </h4>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => handleEditSystem(idx)}
                      className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-2.5 py-1 rounded-lg border border-blue-200"
                    >
                      ✏️ ערוך
                    </button>
                    <button
                      type="button"
                      onClick={() => openDeleteModal('system', idx)}
                      className="text-xs bg-red-50 hover:bg-red-100 text-red-700 font-bold px-2.5 py-1 rounded-lg border border-red-200"
                    >
                      🗑️ מחק
                    </button>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200 space-y-1 text-xs">
                  <div className="font-bold text-slate-700 mb-1">
                    🔒 ערכים מותרים לבחירה במערכת זו:
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">הספקים:</span>
                    <span className="font-semibold text-blue-800">
                      {(s.allowedPowers || [s.power]).join(', ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">אורכי מוקד:</span>
                    <span className="font-semibold text-blue-800">
                      {(s.allowedFocals || [s.focal]).join(', ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">הזנת חשמל:</span>
                    <span className="font-semibold text-blue-800">
                      {(s.allowedVoltages || [s.voltage]).join(', ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">תנאי סביבה:</span>
                    <span className="font-semibold text-blue-800">
                      {(s.allowedEnvs || [s.env]).join(', ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">שימוש:</span>
                    <span className="font-semibold text-blue-800">
                      {(s.allowedUsages || [s.usage]).join(', ')}
                    </span>
                  </div>
                </div>

                <div className="pt-1 border-t border-slate-100">
                  <div className="text-xs font-bold text-slate-700 mb-1.5">
                    כמות מכלולים פר קטגוריה:
                  </div>
                  <div className="space-y-1 text-xs">
                    {categories.map((cat) => (
                      <div
                        key={cat}
                        className="flex items-center justify-between bg-slate-50 px-2.5 py-1 rounded border border-slate-200"
                      >
                        <span>{cat}</span>
                        <span className="font-bold text-purple-800">
                          {s.catQty[cat] ?? 0} יח&apos;
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB C: Component Compatibility */}
      {activeTab === 'compat' && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border-2 border-purple-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-purple-900">
                {editingCompatIdx >= 0
                  ? `עריכת קשר תאימות עבור: ${compatC1}`
                  : '+ הוספת / עריכת קשר תאימות בין רכיבים'}
              </h3>
              {editingCompatIdx >= 0 && (
                <button
                  type="button"
                  onClick={resetCompatForm}
                  className="text-xs text-slate-600 bg-slate-100 px-3 py-1 rounded-lg font-semibold"
                >
                  ביטול עריכה
                </button>
              )}
            </div>

            <div className="grid grid-cols-4 gap-3 items-end text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  רכיב 1 (מק&quot;ט אב / מכלול)
                </label>
                <select
                  value={compatC1}
                  onChange={(e) => setCompatC1(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono bg-white"
                >
                  {catalogRules.map((r) => (
                    <option key={`${r.sku}-${r.rev}`} value={r.sku}>
                      {r.sku} – {r.desc}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  רכיבים תואמים (רכיב 2)
                </label>
                <MultiSelectDropdown
                  options={catalogRules.map((r) => ({
                    value: r.sku,
                    label: `${r.sku} – ${r.desc}`,
                  }))}
                  selected={compatC2List}
                  onChange={setCompatC2List}
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  הערת תאימות הנדסית
                </label>
                <input
                  type="text"
                  value={compatNote}
                  onChange={(e) => setCompatNote(e.target.value)}
                  placeholder="למשל: תאימות אופטית ומכאנית מלאה"
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
                />
              </div>
              <div>
                <button
                  type="button"
                  onClick={handleSaveCompat}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-3 rounded-lg shadow transition"
                >
                  🔗 שמור קשר תאימות
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-800">
                התאמות בין רכיבים
              </h3>
            </div>
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">רכיב 1 (מק&quot;ט + שם)</th>
                  <th className="py-2.5 px-4">רכיבים תואמים מותרים (רכיב 2)</th>
                  <th className="py-2.5 px-4">סטטוס תאימות</th>
                  <th className="py-2.5 px-4">הערה הנדסית</th>
                  <th className="py-2.5 px-4 text-center">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {compatLinks.map((link, idx) => {
                  const r1 = catalogRules.find((r) => r.sku === link.c1);
                  return (
                    <tr key={link.c1 + idx} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-800">
                        <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">
                          {link.c1}
                        </span>{' '}
                        – {r1 ? r1.desc : ''}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {link.c2List.map((sku2) => {
                            const r2 = catalogRules.find((r) => r.sku === sku2);
                            return (
                              <span
                                key={sku2}
                                className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded font-medium text-[11px]"
                              >
                                <strong className="font-mono">{sku2}</strong>
                                {r2 ? `(${r2.desc})` : ''}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                          ✓ תאימות מאושרת ({link.c2List.length} רכיבים)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{link.note}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditCompat(idx)}
                            className="text-blue-600 hover:text-blue-800 font-bold px-2 py-1 rounded bg-blue-50"
                          >
                            ✏️ ערוך
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCompat(idx)}
                            className="text-red-600 hover:text-red-800 font-bold px-2 py-1 rounded bg-red-50"
                          >
                            ✕ הסר
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB D: Workflow Diagram */}
      {activeTab === 'workflow' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                🔄 תרשים זרימה (Workflow) – איך טופס פתיחת ההזמנה בונה את ה-BOM באופן דינמי
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                כל מכלול או תת-מכלול פעיל שתגדיר תחת קטגוריה בכרטיסייה א&apos; ישובץ אוטומטית ב-BOM של הזמנות חדשות לפי כללי ההתאמה.
              </p>
            </div>
            <button
              type="button"
              onClick={onGoToNewOrder}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow"
            >
              נסה עכשיו בפתיחת הזמנה חדשה ⬅
            </button>
          </div>

          <div className="grid grid-cols-4 gap-4 text-xs">
            <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 relative">
              <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700 mb-1">
                שלב 1 • בחירת מערכת
              </div>
              <div className="font-bold text-slate-900 text-sm mb-1.5">
                🖥️ בחירת סוג מערכת בטופס
              </div>
              <p className="text-slate-600 leading-relaxed">
                איש המכירות בוחר סוג מערכת. המערכת קובעת את{' '}
                <strong>האפשרויות המותרות לבחירה</strong> ואת{' '}
                <strong>כמות המכלולים הנדרשת לכל קטגוריה</strong>.
              </p>
            </div>
            <div className="bg-purple-50 border-2 border-purple-300 rounded-xl p-4 relative">
              <div className="text-[10px] font-bold uppercase tracking-wider text-purple-700 mb-1">
                שלב 2 • סינון חוקי קטלוג (פעילים)
              </div>
              <div className="font-bold text-slate-900 text-sm mb-1.5">
                ⚙️ סריקת הקטגוריות והמכלולים
              </div>
              <p className="text-slate-600 leading-relaxed">
                עבור <strong>כל קטגוריה</strong> במערכת, המנוע מחפש מכלולים ראשיים{' '}
                <strong>פעילים</strong> (`ROOT`) שעונים על הספק, מוקד, מתח, סביבה ושימוש.
              </p>
            </div>
            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4 relative">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1">
                שלב 3 • צירוף תתי-מכלולים
              </div>
              <div className="font-bold text-slate-900 text-sm mb-1.5">
                🌿 בניית עץ המוצר ותתי-המכלולים
              </div>
              <p className="text-slate-600 leading-relaxed">
                לכל מכלול אב שנבחר, המנוע מצרף אוטומטית את כל{' '}
                <strong>תתי-המכלולים</strong> המשויכים אליו. אם יש יותר ממכלול תואם אחד, השורה מסומנת כ-
                <strong>&quot;לבחירת איש רכש&quot;</strong>.
              </p>
            </div>
            <div className="bg-orange-50 border-2 border-orange-400 rounded-xl p-4 relative">
              <div className="text-[10px] font-bold uppercase tracking-wider text-orange-700 mb-1">
                שלב 4 • חריגות ופיתוח (Custom)
              </div>
              <div className="font-bold text-slate-900 text-sm mb-1.5">
                🟠 סימון כתום אוטומטי לפיתוח
              </div>
              <p className="text-slate-600 leading-relaxed">
                אם איש המכירות בחר <strong>&quot;אחר&quot;</strong> או שאין מכלול תואם בקטלוג, השורה ב-BOM והענף בעץ נצבעים ב-
                <strong>כתום</strong> להשלמת מהנדס פיתוח/רכש.
              </p>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 font-bold text-xs text-slate-800">
              מיפוי חי: כיצד הקטגוריות והמכלולים שמוגדרים כעת במערכת מתורגמים לשורות ב-BOM
            </div>
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">קטגוריה</th>
                  <th className="py-2.5 px-4">מכלולים ראשיים (אב) בקטגוריה</th>
                  <th className="py-2.5 px-4">תתי-מכלולים (בנים) המשויכים אוטומטית</th>
                  <th className="py-2.5 px-4">שדה הטופס המרכזי המשפיע</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {categories.map((cat) => {
                  const roots = catalogRules.filter(
                    (r) => r.category === cat && r.parentSku === 'ROOT'
                  );
                  const subs = catalogRules.filter(
                    (r) => r.category === cat && r.parentSku !== 'ROOT'
                  );
                  return (
                    <tr key={cat}>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        📁 {cat}
                      </td>
                      <td className="py-3 px-4">
                        {roots.map((r) => (
                          <div key={r.sku} className="mb-1">
                            <span className="font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded">
                              {r.sku}
                            </span>{' '}
                            {r.desc}{' '}
                            {r.active === false && (
                              <span className="text-red-600 font-bold">
                                (לא פעיל)
                              </span>
                            )}
                          </div>
                        ))}
                      </td>
                      <td className="py-3 px-4">
                        {subs.map((s) => (
                          <div key={s.sku} className="mb-1 text-slate-700">
                            ↳{' '}
                            <span className="font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.5 rounded">
                              {s.sku}
                            </span>{' '}
                            {s.desc} (תחת {s.parentSku})
                          </div>
                        ))}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        הספק + אורך מוקד + הזנת חשמל + תנאי סביבה + שימוש
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB E: Recycle Bin */}
      {activeTab === 'recycle' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                🗑️ סל מיחזור – מכלולים, תתי-מכלולים ומערכות שנמחקו
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                תיעוד מלא של פריטים שנמחקו (כולל מי מחק, מתי נמחק וסיבת המחיקה) עם אפשרות לשחזור מלא בלחיצת כפתור.
              </p>
            </div>
            <span className="text-xs font-bold bg-slate-200 text-slate-800 px-3 py-1 rounded-full">
              {recycleBin.length} פריטים בסל המיחזור
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">סוג פריט</th>
                  <th className="py-3 px-4">מזהה / מק&quot;ט ו-Rev</th>
                  <th className="py-3 px-4">שם / תיאור</th>
                  <th className="py-3 px-4">קטגוריה / פרטים</th>
                  <th className="py-3 px-4">נמחק ע&quot;י</th>
                  <th className="py-3 px-4">תאריך ושעת מחיקה</th>
                  <th className="py-3 px-4">סיבת המחיקה (הערת חובה)</th>
                  <th className="py-3 px-4 text-center">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {recycleBin.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-10 text-center text-slate-400 text-xs"
                    >
                      סל המיחזור ריק כעת. כל מכלול או מערכת שיימחקו יופיעו כאן עם תיעוד מלא ואפשרות שחזור.
                    </td>
                  </tr>
                ) : (
                  recycleBin.map((item) => (
                    <tr
                      key={item.recycleId}
                      className="hover:bg-slate-50 transition"
                    >
                      <td className="py-3 px-4">
                        {item.itemType === 'assembly' ? (
                          <span className="bg-purple-100 text-purple-800 border border-purple-300 px-2 py-0.5 rounded font-bold">
                            🔧 מכלול / תת-מכלול
                          </span>
                        ) : (
                          <span className="bg-blue-100 text-blue-800 border border-blue-300 px-2 py-0.5 rounded font-bold">
                            🖥️ סוג מערכת
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {item.skuOrId}{' '}
                        {item.rev && item.rev !== '-' ? (
                          <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded">
                            {item.rev}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {item.name}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {item.categoryOrDetails}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        👤 {item.deletedBy}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        🕒 {item.deletedAt}
                      </td>
                      <td className="py-3 px-4">
                        <div className="bg-red-50 border border-red-200 text-red-900 px-2.5 py-1 rounded-lg font-medium">
                          &quot;{item.deleteReason}&quot;
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            handleRestoreFromRecycleBin(item.recycleId)
                          }
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg shadow-sm transition"
                        >
                          ♻️ שחזר פריט
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB F: User Management & Google Sign-In Roles */}
      {activeTab === 'users' && (
        <div className="space-y-5">
          {/* Info & Add Pre-Authorized Google User Box */}
          <div className="bg-white rounded-xl border-2 border-purple-200 shadow-sm p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-purple-900">
                    👥 ניהול משתמשים והרשאות (התחברות באמצעות חשבון Google)
                  </h3>
                  <span className="text-[11px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full font-bold">
                    ✓ משתמש חדש ב-Sign In מוגדר אוטומטית כ&quot;צופה&quot; (Viewer)
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  כל משתמש שמתחבר למערכת דרך חשבון Google מתווסף אוטומטית לטבלה זו בתפקיד <strong>&quot;צופה&quot; (קריאה בלבד)</strong>. מנהל המערכת יכול לשנות כאן את תפקיד המשתמש לכל תפקיד אחר במערכת.
                </p>
              </div>
            </div>

            {/* Add Google User Form */}
            <div className="grid grid-cols-4 gap-3 items-end text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  שם מלא של המשתמש
                </label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="למשל: נועה ברק"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  כתובת חשבון Google (Gmail / Workspace)
                </label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="noa.barak@gmail.com"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono bg-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  תפקיד במערכת (ברירת מחדל: צופה)
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as RoleType)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white font-bold"
                >
                  <option value="viewer">👁️ צופה (שירות לקוחות / ייצור) – ברירת מחדל</option>
                  <option value="sales">💼 איש מכירות</option>
                  <option value="procurement">📦 איש רכש / תפ&quot;י</option>
                  <option value="dev">🔧 איש פיתוח / הנדסה</option>
                  <option value="manager">⚙️ מנהל מערכת</option>
                </select>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    const emailTrim = newUserEmail.trim().toLowerCase();
                    const nameTrim = newUserName.trim();
                    if (!emailTrim || !emailTrim.includes('@')) {
                      alert('נא להזין כתובת אימייל תקנית של חשבון Google.');
                      return;
                    }
                    if (users.some((u) => u.email.toLowerCase() === emailTrim)) {
                      alert('משתמש עם כתובת Google זו כבר קיים במערכת.');
                      return;
                    }
                    const ts = getNowTimestamp();
                    const addedUser: AppUser = {
                      id: `USR-${100 + users.length + 1}`,
                      email: emailTrim,
                      fullName: nameTrim || emailTrim.split('@')[0],
                      role: newUserRole,
                      provider: 'google',
                      active: true,
                      createdAt: ts,
                      lastSignInAt: 'טרם התחבר',
                      updatedBy: currentUserLabel,
                    };
                    onUpdateState({ users: [addedUser, ...users] });
                    setNewUserName('');
                    setNewUserEmail('');
                    setNewUserRole('viewer');
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg shadow transition"
                >
                  + הוסף משתמש Google
                </button>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  רשימת משתמשי המערכת והגדרת תפקידים (Role Assignment)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  שינוי תפקיד בטבלה מעדכן מיידית את הרשאות המשתמש במערכת ובמסד הנתונים (Supabase).
                </p>
              </div>
              <span className="text-xs font-bold bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                {users.length} משתמשי Google רשומים
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">משתמש</th>
                    <th className="py-3 px-4">חשבון Google (Email)</th>
                    <th className="py-3 px-4">אימות</th>
                    <th className="py-3 px-4">הגדרת תפקיד במערכת (ע&quot;י מנהל)</th>
                    <th className="py-3 px-4">סטטוס</th>
                    <th className="py-3 px-4">הצטרפות / התחברות אחרונה</th>
                    <th className="py-3 px-4">עודכן ע&quot;י</th>
                    <th className="py-3 px-4 text-center">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {users.map((u, idx) => (
                    <tr
                      key={u.id}
                      className={`hover:bg-slate-50 transition ${
                        !u.active ? 'opacity-60 bg-slate-100' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                            {u.fullName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">
                              {u.fullName}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              {u.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                        {u.email}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 bg-white border border-slate-300 px-2.5 py-1 rounded-full text-[11px] font-bold text-slate-700 shadow-sm">
                          <span className="text-blue-600 font-extrabold">G</span>
                          <span>Google Account</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={u.role}
                          onChange={(e) => {
                            const nextRole = e.target.value as RoleType;
                            const nextUsers = [...users];
                            nextUsers[idx] = {
                              ...u,
                              role: nextRole,
                              updatedBy: `${currentUserLabel} (${getNowTimestamp()})`,
                            };
                            onUpdateState({ users: nextUsers });
                          }}
                          className={`border-2 rounded-lg px-3 py-1.5 font-bold text-xs bg-white shadow-sm ${
                            u.role === 'manager'
                              ? 'border-purple-400 text-purple-900'
                              : u.role === 'procurement'
                              ? 'border-emerald-400 text-emerald-900'
                              : u.role === 'sales'
                              ? 'border-blue-400 text-blue-900'
                              : u.role === 'dev'
                              ? 'border-orange-400 text-orange-900'
                              : 'border-slate-300 text-slate-700'
                          }`}
                        >
                          <option value="viewer">
                            👁️ צופה (שירות לקוחות / ייצור)
                          </option>
                          <option value="sales">💼 איש מכירות</option>
                          <option value="procurement">📦 איש רכש / תפ&quot;י</option>
                          <option value="dev">🔧 איש פיתוח / הנדסה</option>
                          <option value="manager">⚙️ מנהל מערכת</option>
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        {u.active ? (
                          <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full text-[11px] font-bold">
                            🟢 פעיל
                          </span>
                        ) : (
                          <span className="bg-red-100 text-red-800 border border-red-300 px-2 py-0.5 rounded-full text-[11px] font-bold">
                            ⏸️ מושהה
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-600">
                        <div>
                          הצטרף: <span className="font-mono">{u.createdAt}</span>
                        </div>
                        <div>
                          כניסה אחרונה:{' '}
                          <span className="font-mono font-semibold text-slate-800">
                            {u.lastSignInAt}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-600">
                        {u.updatedBy || 'Google Sign-In (אוטומטי)'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {onSelectActiveUser && u.active && (
                            <button
                              type="button"
                              onClick={() => onSelectActiveUser(u)}
                              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg font-bold text-[11px]"
                              title={`החלף חיבור פעיל אל ${u.fullName} (${ROLE_LABELS_HE[u.role]})`}
                            >
                              🔑 התחבר כמשתמש זה
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              const nextUsers = [...users];
                              nextUsers[idx] = {
                                ...u,
                                active: !u.active,
                                updatedBy: `${currentUserLabel} (${getNowTimestamp()})`,
                              };
                              onUpdateState({ users: nextUsers });
                            }}
                            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${
                              u.active
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {u.active ? '⏸️ השהה' : '▶️ הפעל'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory Delete Reason Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border-2 border-red-400 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                <h3 className="font-bold text-base text-slate-900">
                  מחיקת פריט והעברה לסל המיחזור
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>
            <div className="text-xs text-slate-700 space-y-2">
              <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-red-900 font-semibold">
                {deleteTarget.title}
              </div>
              <p className="text-slate-600">
                הפריט יועבר ל<strong>סל המיחזור</strong> וניתן יהיה לשחזר אותו בכל עת.{' '}
                <strong>חובה להזין הערה המפרטת מדוע הפריט נמחק:</strong>
              </p>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  סיבת המחיקה (שדה חובה) <span className="text-red-600">*</span>
                </label>
                <textarea
                  rows={3}
                  value={deleteReasonText}
                  onChange={(e) => setDeleteReasonText(e.target.value)}
                  placeholder="פרט מדוע המכלול/המערכת נמחקים (למשל: הוחלף בדגם חדש, הוקם בטעות, סוף חיי מוצר EOL)..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-red-400 outline-none bg-white"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={confirmDeleteToRecycleBin}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow"
              >
                🗑️ אשר מחיקה והעבר לסל מיחזור
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}


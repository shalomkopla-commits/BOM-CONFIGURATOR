'use client';

import React, { useState, useMemo } from 'react';
import {
  AppUser,
  CatalogRule,
  CompatLink,
  Customer,
  ImgType,
  Order,
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
  cleanSubAssemblyDesc,
  deriveDefaultUsername,
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
  customers?: Customer[];
  orders?: Order[];
  currentUserLabel: string;
  onUpdateState: (updater: {
    categories?: string[];
    systemTypes?: SystemType[];
    catalogRules?: CatalogRule[];
    compatLinks?: CompatLink[];
    recycleBin?: RecycleBinItem[];
    users?: AppUser[];
    customers?: Customer[];
    orders?: Order[];
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
  customers = [],
  orders = [],
  currentUserLabel,
  onUpdateState,
  onGoToNewOrder,
  onSelectActiveUser,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<
    'rules' | 'systems' | 'compat' | 'workflow' | 'recycle' | 'users' | 'customers'
  >('rules');

  // --- Tab F: User Management State ---
  const [newUserName, setNewUserName] = useState<string>('');
  const [newUserUsername, setNewUserUsername] = useState<string>('');
  const [newUserPassword, setNewUserPassword] = useState<string>('123456');
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  const [newUserRole, setNewUserRole] = useState<RoleType>('viewer');

  // User Edit Modal State
  const [editingUserIdx, setEditingUserIdx] = useState<number>(-1);
  const [editUserName, setEditUserName] = useState<string>('');
  const [editUserUsername, setEditUserUsername] = useState<string>('');
  const [editUserPassword, setEditUserPassword] = useState<string>('123456');
  const [editUserEmail, setEditUserEmail] = useState<string>('');
  const [editUserRole, setEditUserRole] = useState<RoleType>('viewer');
  const [editUserActive, setEditUserActive] = useState<boolean>(true);

  const startEditUser = (u: AppUser, idx: number) => {
    setEditingUserIdx(idx);
    setEditUserName(u.fullName);
    setEditUserUsername(u.username || deriveDefaultUsername(u.fullName, u.email));
    setEditUserPassword(u.password || '123456');
    setEditUserEmail(u.email);
    setEditUserRole(u.role);
    setEditUserActive(u.active);
  };

  const handleSaveEditedUser = () => {
    if (editingUserIdx < 0 || !users[editingUserIdx]) return;
    const nameTrim = editUserName.trim();
    const usernameTrim =
      editUserUsername.trim() ||
      deriveDefaultUsername(nameTrim, editUserEmail.trim());
    const passwordTrim = editUserPassword.trim() || '123456';
    const emailTrim =
      editUserEmail.trim().toLowerCase() ||
      `${usernameTrim.toLowerCase()}@local.company`;
    if (!nameTrim) {
      alert('נא להזין שם מלא.');
      return;
    }
    const duplicate = users.some(
      (u, i) =>
        i !== editingUserIdx &&
        (u.email.toLowerCase() === emailTrim ||
          (u.username || deriveDefaultUsername(u.fullName, u.email)).toLowerCase() ===
          usernameTrim.toLowerCase())
    );
    if (duplicate) {
      alert('שם משתמש או כתובת אימייל אלו כבר קיימים עבור משתמש אחר במערכת.');
      return;
    }

    const nextUsers = [...users];
    nextUsers[editingUserIdx] = {
      ...nextUsers[editingUserIdx],
      fullName: nameTrim,
      username: usernameTrim,
      password: passwordTrim,
      email: emailTrim,
      role: editUserRole,
      active: editUserActive,
      updatedBy: `${currentUserLabel} (${getNowTimestamp()})`,
    };
    onUpdateState({ users: nextUsers });
    setEditingUserIdx(-1);
  };

  const handleDeleteUser = (idx: number) => {
    if (idx < 0 || !users[idx]) return;
    const u = users[idx];
    if (u.role === 'manager' && users.filter((x) => x.role === 'manager').length <= 1) {
      alert('לא ניתן למחוק את מנהל המערכת היחיד.');
      return;
    }
    if (!confirm(`האם אתה בטוח שברצונך למחוק את המשתמש ${u.fullName} (${u.email})?`)) {
      return;
    }
    const nextUsers = users.filter((_, i) => i !== idx);
    onUpdateState({ users: nextUsers });
    setEditingUserIdx(-1);
  };

  // --- Tab G: Customer Management State ---
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [isCustomerFormOpen, setIsCustomerFormOpen] = useState<boolean>(false);
  const [editingCustId, setEditingCustId] = useState<string | null>(null);
  const [custName, setCustName] = useState<string>('');
  const [custContact, setCustContact] = useState<string>('');
  const [custPhone, setCustPhone] = useState<string>('');
  const [custEmail, setCustEmail] = useState<string>('');
  const [custAddress, setCustAddress] = useState<string>('');
  const [custNotes, setCustNotes] = useState<string>('');
  const [custActive, setCustActive] = useState<boolean>(true);
  const [updateLinkedOrders, setUpdateLinkedOrders] = useState<boolean>(true);

  const resetCustomerForm = () => {
    setEditingCustId(null);
    setCustName('');
    setCustContact('');
    setCustPhone('');
    setCustEmail('');
    setCustAddress('');
    setCustNotes('');
    setCustActive(true);
    setUpdateLinkedOrders(true);
  };

  const handleEditCustomer = (c: Customer) => {
    setEditingCustId(c.id);
    setCustName(c.name);
    setCustContact(c.contact);
    setCustPhone(c.phone || '');
    setCustEmail(c.email || '');
    setCustAddress(c.address || '');
    setCustNotes(c.notes || '');
    setCustActive(c.active !== false);
    setUpdateLinkedOrders(true);
    setIsCustomerFormOpen(true);
  };

  const handleSaveCustomer = () => {
    const nameTrim = custName.trim();
    const contactTrim = custContact.trim();
    if (!nameTrim || !contactTrim) {
      alert('נא להזין שם לקוח / חברה ואיש קשר.');
      return;
    }

    const nowStr = new Date().toLocaleDateString('he-IL');
    let nextCustomers = [...customers];
    let nextOrders = [...orders];

    if (editingCustId) {
      const oldCust = customers.find((c) => c.id === editingCustId);
      const oldName = oldCust?.name;

      nextCustomers = nextCustomers.map((c) =>
        c.id === editingCustId
          ? {
            ...c,
            name: nameTrim,
            contact: contactTrim,
            phone: custPhone.trim() || undefined,
            email: custEmail.trim().toLowerCase() || undefined,
            address: custAddress.trim() || undefined,
            notes: custNotes.trim() || undefined,
            active: custActive,
            updatedAt: nowStr,
          }
          : c
      );

      // If user chose to update linked orders
      if (updateLinkedOrders && oldName && oldName !== nameTrim) {
        nextOrders = nextOrders.map((o) =>
          o.customer === oldName
            ? {
              ...o,
              customer: nameTrim,
              contact: contactTrim,
              email: custEmail.trim() || o.email,
              phone: custPhone.trim() || o.phone,
              updatedAt: getNowTimestamp(),
              updatedBy: currentUserLabel,
            }
            : o
        );
      }
    } else {
      let maxNum = 0;
      customers.forEach((c) => {
        if (c.id.startsWith('CUST-')) {
          const num = parseInt(c.id.replace('CUST-', ''), 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });
      const newId = `CUST-${String(maxNum + 1).padStart(3, '0')}`;

      const newCust: Customer = {
        id: newId,
        name: nameTrim,
        contact: contactTrim,
        phone: custPhone.trim() || undefined,
        email: custEmail.trim().toLowerCase() || undefined,
        address: custAddress.trim() || undefined,
        notes: custNotes.trim() || undefined,
        active: custActive,
        createdAt: nowStr,
        updatedAt: nowStr,
      };

      nextCustomers = [newCust, ...nextCustomers];
    }

    onUpdateState({ customers: nextCustomers, orders: nextOrders });
    resetCustomerForm();
    setIsCustomerFormOpen(false);
  };

  const handleToggleCustomerActive = (id: string) => {
    const nextCustomers = customers.map((c) =>
      c.id === id
        ? {
          ...c,
          active: c.active === false ? true : false,
          updatedAt: new Date().toLocaleDateString('he-IL'),
        }
        : c
    );
    onUpdateState({ customers: nextCustomers });
  };

  const handleDeleteCustomer = (id: string) => {
    const cust = customers.find((c) => c.id === id);
    if (!cust) return;

    const linkedOrdersCount = orders.filter((o) => o.customer === cust.name).length;
    if (linkedOrdersCount > 0) {
      if (
        !confirm(
          `ללקוח זה קיימות ${linkedOrdersCount} הזמנות מקושרות במערכת. מומלץ להשבית את הלקוח במקום למחוק אותו כדי לא לפגוע ברציפות הנתונים.\n\nהאם להשבית את הלקוח כעת?`
        )
      ) {
        return;
      }
      handleToggleCustomerActive(id);
      return;
    }

    if (confirm(`האם אתה בטוח שברצונך למחוק את הלקוח "${cust.name}" לצמיתות?`)) {
      const nextCustomers = customers.filter((c) => c.id !== id);
      onUpdateState({ customers: nextCustomers });
    }
  };

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.contact.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        c.id.toLowerCase().includes(q)
    );
  }, [customers, customerSearch]);

  // --- Tab A: Catalog Rules State ---
  const [isRuleFormOpen, setIsRuleFormOpen] = useState<boolean>(false);
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
  const [isSysFormOpen, setIsSysFormOpen] = useState<boolean>(false);
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
  const [compatFilterCat, setCompatFilterCat] = useState<string>('ALL');

  const filteredCompatLinks = useMemo(() => {
    if (compatFilterCat === 'ALL') return compatLinks;
    return compatLinks.filter((link) => {
      const r1 = catalogRules.find((r) => r.sku === link.c1);
      return r1 && r1.category === compatFilterCat;
    });
  }, [compatLinks, catalogRules, compatFilterCat]);

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
    setIsRuleFormOpen(true);
    setEditingRuleIdx(idx);
    setRuleSku(r.sku);
    setRuleRev(r.rev || 'Rev A');
    setRuleDesc(r.parentSku !== 'ROOT' ? cleanSubAssemblyDesc(r.desc) : r.desc);
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDuplicateRule = (r: CatalogRule) => {
    setIsRuleFormOpen(true);
    setEditingRuleIdx(-1);
    setRuleSku(`${r.sku}-COPY`);
    setRuleRev(r.rev || 'Rev A');
    setRuleDesc(`העתק של ${r.parentSku !== 'ROOT' ? cleanSubAssemblyDesc(r.desc) : r.desc}`);
    setRuleCategory(r.category);
    setRuleParent(r.parentSku);
    setRuleCost(r.cost);
    setRuleActive(true);
    setRuleCustomImg(r.customImg);
    setRulePowers([...r.matchPower]);
    setRuleFocals([...r.matchFocal]);
    setRuleVoltages([...r.matchVoltage]);
    setRuleEnvs([...r.matchEnv]);
    setRuleUsages([...(r.matchUsage || ALL_USAGES)]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    setIsSysFormOpen(true);
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDuplicateSystem = (s: SystemType) => {
    setIsSysFormOpen(true);
    setEditingSysIdx(-1);
    setSysId(`${s.id}-COPY`);
    setSysName(`העתק של ${s.name}`);
    setSysPowers([...(s.allowedPowers || [s.power])]);
    setSysFocals([...(s.allowedFocals || [s.focal])]);
    setSysVoltages([...(s.allowedVoltages || [s.voltage])]);
    setSysEnvs([...(s.allowedEnvs || [s.env])]);
    setSysUsages([...(s.allowedUsages || [s.usage || 'אזרחי'])]);
    setSysChannels(s.channels);
    setSysPsuCount(s.psuCount);
    setSysCustomImg(s.customImg);
    setSysCatQty({ ...s.catQty });
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
        categoryOrDetails: `קטגוריה: ${r.category} | היררכיה: ${r.parentSku === 'ROOT' ? 'מכלול ראשי' : 'תחת ' + r.parentSku
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

  const groupedRulesByCategory = useMemo(() => {
    const catsToShow =
      filterCat === 'ALL'
        ? Array.from(new Set([...categories, ...catalogRules.map((r) => r.category)]))
        : [filterCat];

    return catsToShow
      .map((cat) => {
        const catRules = catalogRules
          .map((rule, idx) => ({ rule, idx }))
          .filter(({ rule }) => rule.category === cat);

        const rootItems = catRules.filter(({ rule }) => rule.parentSku === 'ROOT');
        const subItems = catRules.filter(({ rule }) => rule.parentSku !== 'ROOT');

        const sorted: { rule: CatalogRule; idx: number; isChild: boolean }[] = [];
        rootItems.forEach((root) => {
          sorted.push({ ...root, isChild: false });
          const children = subItems.filter(({ rule }) => rule.parentSku === root.rule.sku);
          children.forEach((child) => {
            sorted.push({ ...child, isChild: true });
          });
        });

        const handledSkus = new Set(sorted.map((x) => x.rule.sku));
        subItems.forEach((sub) => {
          if (!handledSkus.has(sub.rule.sku)) {
            sorted.push({ ...sub, isChild: true });
          }
        });

        return {
          category: cat,
          rules: sorted,
          count: catRules.length,
        };
      })
      .filter((group) => group.count > 0);
  }, [catalogRules, categories, filterCat]);

  const formatBadgeInfo = (item: string) => {
    if (item === 'IP54 מעבדה/פנים') return { label: 'IP54', tip: 'IP54 – מעבדה / פנים' };
    if (item === 'IP65 שטח ממוזג') return { label: 'IP65', tip: 'IP65 – שטח ממוזג' };
    if (item === 'IP67 מוקשח') return { label: 'IP67', tip: 'IP67 – מוקשח' };
    if (item === '400V 3-Phase') return { label: '400V 3P', tip: '400V 3-Phase (תלת פאזי)' };
    if (item === '230V AC') return { label: '230V', tip: '230V AC (חד פאזי)' };
    if (item === '28V DC') return { label: '28V DC', tip: '28V DC' };
    return { label: item, tip: item };
  };

  const renderParamBadges = (
    items: string[] | undefined,
    colorClass = 'bg-blue-50 text-blue-700 border-blue-200'
  ) => {
    if (!items || items.length === 0) {
      return <span className="text-[10px] text-slate-400 select-none">הכל</span>;
    }
    return (
      <div className="flex flex-wrap items-center gap-1">
        {items.map((item) => {
          const { label, tip } = formatBadgeInfo(item);
          return (
            <span
              key={item}
              title={tip}
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-semibold border whitespace-nowrap shadow-2xs cursor-default leading-tight ${colorClass}`}
            >
              {label}
            </span>
          );
        })}
      </div>
    );
  };

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
            className={`px-3.5 py-2 rounded-lg font-bold transition ${activeTab === 'rules'
                ? 'bg-purple-600 text-white'
                : 'text-slate-300 hover:text-white'
              }`}
          >
            א. מכלולים וחוקי בחירה
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('systems')}
            className={`px-3.5 py-2 rounded-lg font-bold transition ${activeTab === 'systems'
                ? 'bg-purple-600 text-white'
                : 'text-slate-300 hover:text-white'
              }`}
          >
            ב. סוגי מערכות
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('compat')}
            className={`px-3.5 py-2 rounded-lg font-bold transition ${activeTab === 'compat'
                ? 'bg-purple-600 text-white'
                : 'text-slate-300 hover:text-white'
              }`}
          >
            ג. התאמות בין רכיבים
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('workflow')}
            className={`px-3.5 py-2 rounded-lg font-bold transition ${activeTab === 'workflow'
                ? 'bg-purple-600 text-white'
                : 'text-slate-300 hover:text-white'
              }`}
          >
            ד. 🔄 תרשים זרימה – מהטופס ל-BOM
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('recycle')}
            className={`px-3.5 py-2 rounded-lg font-bold transition flex items-center gap-1.5 ${activeTab === 'recycle'
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
            className={`px-3.5 py-2 rounded-lg font-bold transition flex items-center gap-1.5 ${activeTab === 'users'
                ? 'bg-purple-600 text-white'
                : 'text-slate-300 hover:text-white'
              }`}
          >
            <span>ו. 👥 ניהול משתמשים</span>
            <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.2 rounded-full">
              {users.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('customers')}
            className={`px-3.5 py-2 rounded-lg font-bold transition flex items-center gap-1.5 ${activeTab === 'customers'
                ? 'bg-purple-600 text-white'
                : 'text-slate-300 hover:text-white'
              }`}
          >
            <span>ז. 🏢 ניהול לקוחות</span>
            <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.2 rounded-full">
              {customers.length}
            </span>
          </button>
        </div>
      </div>

      {/* TAB A: Assemblies & Selection Rules */}
      {activeTab === 'rules' && (
        <div className="space-y-5">
          {/* Add / Edit Assembly Form (Collapsible Accordion) */}
          <div className="bg-white rounded-xl border-2 border-purple-200 shadow-sm overflow-hidden">
            <div
              onClick={() => setIsRuleFormOpen((prev) => !prev)}
              className="px-5 py-3.5 bg-gradient-to-l from-purple-50/70 to-white flex items-center justify-between cursor-pointer hover:bg-purple-50/90 transition select-none"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-purple-600 text-white font-bold flex items-center justify-center text-sm shadow-2xs">
                  {isRuleFormOpen ? '−' : '+'}
                </span>
                <h3 className="text-sm font-bold text-purple-900">
                  {editingRuleIdx >= 0
                    ? `עריכת מכלול קיים: ${ruleSku}`
                    : 'הוספת מכלול / תת-מכלול חדש והגדרת חוק בחירה'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-purple-700 font-semibold">
                  {isRuleFormOpen ? 'לחץ לסגירת הטופס ▲' : 'לחץ לפתיחת טופס הוספה ▼'}
                </span>
                {editingRuleIdx >= 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      resetRuleForm();
                      setIsRuleFormOpen(false);
                    }}
                    className="text-xs text-slate-600 hover:text-slate-900 bg-slate-100 px-3 py-1 rounded-lg font-semibold"
                  >
                    ביטול עריכה
                  </button>
                )}
              </div>
            </div>

            {isRuleFormOpen && (
              <div className="p-5 border-t border-purple-100">
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
            )}
          </div>

          {/* Category Filter + Add Category Bar (ממוקם מתחת לאזור הוספת מכלול ומעל טבלת המכלולים) */}
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

          {/* Assemblies Display Grouped by Category */}
          <div className="space-y-6">
            {groupedRulesByCategory.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 font-medium">
                לא נמצאו מכלולים תואמים לסינון הקטגוריה שנבחרה.
              </div>
            ) : (
              groupedRulesByCategory.map((group) => (
                <div
                  key={group.category}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  {/* Category Header Bar */}
                  <div className="px-5 py-3 bg-gradient-to-l from-slate-50 to-purple-50/50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-base select-none">📁</span>
                      <h4 className="font-bold text-sm text-slate-900">
                        קטגוריה: {group.category}
                      </h4>
                      <span className="text-xs bg-purple-100 text-purple-800 border border-purple-200 font-bold px-2 py-0.5 rounded-full">
                        {group.count} מכלולים
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      תתי-מכלולים מוצגים בהזחה ישירות תחת מכלול האב
                    </span>
                  </div>

                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-right text-xs table-auto">
                      <thead className="bg-slate-100 text-slate-700 text-[11px] font-bold uppercase border-b border-slate-200 select-none">
                        <tr>
                          <th className="py-2.5 px-2 w-12 text-center">תמונה</th>
                          <th className="py-2.5 px-2 w-28">מק&quot;ט ו-Rev</th>
                          <th className="py-2.5 px-2 min-w-[120px] max-w-[180px]">תיאור פריט</th>
                          <th className="py-2.5 px-1 w-10 text-center">סטטוס</th>
                          <th className="py-2.5 px-1.5 min-w-[80px]">הספקים</th>
                          <th className="py-2.5 px-1.5 min-w-[75px]">אורכי מוקד</th>
                          <th className="py-2.5 px-1.5 min-w-[75px]">הזנת חשמל</th>
                          <th className="py-2.5 px-1.5 min-w-[75px]">תנאי סביבה</th>
                          <th className="py-2.5 px-1.5 min-w-[65px]">שימוש</th>
                          <th className="py-2.5 px-2 w-16 font-mono text-left">עלות</th>
                          <th className="py-2.5 px-2 w-28 text-center">פעולות</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {group.rules.map(({ rule: r, idx, isChild }) => {
                          const isActive = r.active !== false;
                          return (
                            <tr
                              key={`${r.sku}-${r.rev}`}
                              className={`${isChild
                                  ? 'bg-blue-50/40 border-r-4 border-r-blue-400 hover:bg-blue-100/40'
                                  : 'hover:bg-purple-50/30'
                                } ${!isActive ? 'opacity-65 bg-slate-100/80' : ''
                                } transition`}
                            >
                              {/* 1. Image with Zoom-in on hover */}
                              <td className="py-2 px-2 w-12 text-center whitespace-nowrap">
                                <div className="relative group/img inline-block">
                                  <img
                                    src={getItemImageUrl(r.sku, r.customImg, false)}
                                    alt={r.desc}
                                    className="w-11 h-8 object-cover rounded border border-slate-200 shadow-2xs cursor-zoom-in hover:border-purple-400 transition bg-white"
                                  />
                                  {/* High-res Popover Preview */}
                                  <div className="absolute z-50 top-1/2 -translate-y-1/2 right-14 hidden group-hover/img:flex flex-col bg-white rounded-xl shadow-2xl border-2 border-purple-300 p-2.5 pointer-events-none w-64 text-right">
                                    <img
                                      src={getItemImageUrl(r.sku, r.customImg, false)}
                                      alt={r.desc}
                                      className="w-full h-40 object-cover rounded-lg border border-slate-200 bg-slate-50 shadow-inner"
                                    />
                                    <div className="mt-2 font-bold text-xs text-slate-900 leading-snug">
                                      {isChild ? cleanSubAssemblyDesc(r.desc) : r.desc}
                                    </div>
                                    <div className="text-[11px] font-mono text-purple-700 font-bold mt-0.5">
                                      {r.sku} ({r.rev || 'Rev A'})
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">
                                      עלות: {r.cost}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* 2. SKU and Rev (Offset for sub-assembly) */}
                              <td
                                className={`py-2 px-2 font-mono text-slate-800 whitespace-nowrap w-28 ${isChild ? 'pr-5' : ''
                                  }`}
                              >
                                {isChild ? (
                                  <div className="flex items-center gap-1">
                                    <span className="text-blue-500 font-bold text-xs leading-none select-none">
                                      ↳
                                    </span>
                                    <span className="font-bold text-[11px]">{r.sku}</span>
                                  </div>
                                ) : (
                                  <div className="font-bold text-xs text-slate-900">{r.sku}</div>
                                )}
                                <span
                                  className={`text-[9.5px] px-1 py-0.2 rounded font-normal block w-fit mt-0.5 ${isChild
                                      ? 'bg-blue-50 text-blue-700 border border-blue-200 mr-3'
                                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                                    }`}
                                >
                                  {r.rev || 'Rev A'}
                                </span>
                              </td>

                              {/* 3. Description */}
                              <td className="py-2 px-2 font-medium text-slate-900 text-xs min-w-[120px] max-w-[180px]">
                                <div className="line-clamp-2 leading-snug" title={r.desc}>
                                  {isChild ? cleanSubAssemblyDesc(r.desc) : r.desc}
                                </div>
                              </td>

                              {/* 4. Status Indicator (Bulb with Tooltip) */}
                              <td className="py-2 px-1 text-center whitespace-nowrap w-10">
                                <div className="relative group/tip inline-flex items-center justify-center">
                                  {isActive ? (
                                    <span className="cursor-help text-base select-none leading-none inline-flex items-center justify-center relative">
                                      <span>💡</span>
                                      <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200 absolute -bottom-0.5 -right-0.5 animate-pulse" />
                                    </span>
                                  ) : (
                                    <span className="cursor-help text-base select-none leading-none inline-flex items-center justify-center relative opacity-50 grayscale">
                                      <span>💡</span>
                                      <span className="w-2 h-2 rounded-full bg-red-500 ring-2 ring-red-200 absolute -bottom-0.5 -right-0.5" />
                                    </span>
                                  )}
                                  <div className="absolute z-50 bottom-full mb-1.5 right-1/2 translate-x-1/2 hidden group-hover/tip:flex flex-col bg-slate-900 text-white text-[11px] rounded-lg shadow-xl p-2 w-48 pointer-events-none border border-slate-700 text-center font-normal">
                                    {isActive ? (
                                      <>
                                        <span className="font-bold text-emerald-400">
                                          🟢 מכלול פעיל
                                        </span>
                                        <span className="text-[10px] text-slate-300">
                                          זמין לבחירה בהזמנות חדשות
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <span className="font-bold text-red-400">
                                          🔴 מכלול לא פעיל
                                        </span>
                                        <span className="text-[10px] text-slate-300">
                                          מוסתר בהזמנות חדשות, נשמר בישנות
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* 5-9. Parameters in Badges */}
                              <td className="py-2 px-1.5 min-w-[80px]">
                                {renderParamBadges(
                                  r.matchPower,
                                  'bg-blue-50 text-blue-700 border-blue-200'
                                )}
                              </td>
                              <td className="py-2 px-1.5 min-w-[75px]">
                                {renderParamBadges(
                                  r.matchFocal,
                                  'bg-indigo-50 text-indigo-700 border-indigo-200'
                                )}
                              </td>
                              <td className="py-2 px-1.5 min-w-[75px]">
                                {renderParamBadges(
                                  r.matchVoltage,
                                  'bg-amber-50 text-amber-800 border-amber-200'
                                )}
                              </td>
                              <td className="py-2 px-1.5 min-w-[75px]">
                                {renderParamBadges(
                                  r.matchEnv,
                                  'bg-emerald-50 text-emerald-800 border-emerald-200'
                                )}
                              </td>
                              <td className="py-2 px-1.5 min-w-[65px]">
                                {renderParamBadges(
                                  r.matchUsage || ALL_USAGES,
                                  'bg-purple-50 text-purple-800 border-purple-200'
                                )}
                              </td>

                              {/* 10. Cost */}
                              <td className="py-2 px-2 font-mono font-bold text-slate-800 whitespace-nowrap text-left w-16 text-xs">
                                {r.cost}
                              </td>

                              {/* 11. Actions (Icons only with Tooltips) */}
                              <td className="py-2 px-2 text-center whitespace-nowrap w-28">
                                <div className="flex items-center justify-center gap-1">
                                  {/* Edit Button */}
                                  <div className="relative group/tip inline-flex items-center">
                                    <button
                                      type="button"
                                      onClick={() => handleEditRule(idx)}
                                      className="p-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition text-xs shadow-2xs cursor-pointer"
                                    >
                                      ✏️
                                    </button>
                                    <div className="absolute z-50 bottom-full mb-1.5 right-1/2 translate-x-1/2 hidden group-hover/tip:flex flex-col bg-slate-900 text-white text-[11px] rounded-md shadow-xl py-1 px-2 pointer-events-none whitespace-nowrap border border-slate-700">
                                      ערוך מכלול
                                    </div>
                                  </div>

                                  {/* Duplicate Button */}
                                  <div className="relative group/tip inline-flex items-center">
                                    <button
                                      type="button"
                                      onClick={() => handleDuplicateRule(r)}
                                      className="p-1 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition text-xs shadow-2xs cursor-pointer"
                                    >
                                      📋
                                    </button>
                                    <div className="absolute z-50 bottom-full mb-1.5 right-1/2 translate-x-1/2 hidden group-hover/tip:flex flex-col bg-slate-900 text-white text-[11px] rounded-md shadow-xl py-1 px-2 pointer-events-none whitespace-nowrap border border-slate-700">
                                      שכפל מכלול (יצירת עותק חדש)
                                    </div>
                                  </div>

                                  {/* Toggle Active Button */}
                                  <div className="relative group/tip inline-flex items-center">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleRuleActive(idx)}
                                      className={`p-1 rounded-md border transition text-xs shadow-2xs cursor-pointer ${isActive
                                          ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                        }`}
                                    >
                                      {isActive ? '⏸️' : '▶️'}
                                    </button>
                                    <div className="absolute z-50 bottom-full mb-1.5 right-1/2 translate-x-1/2 hidden group-hover/tip:flex flex-col bg-slate-900 text-white text-[11px] rounded-md shadow-xl py-1 px-2 pointer-events-none whitespace-nowrap border border-slate-700">
                                      {isActive
                                        ? 'השבת מכלול (הסתר מהזמנות חדשות)'
                                        : 'הפעל מכלול (אפשר בהזמנות חדשות)'}
                                    </div>
                                  </div>

                                  {/* Delete Button */}
                                  <div className="relative group/tip inline-flex items-center">
                                    <button
                                      type="button"
                                      onClick={() => openDeleteModal('assembly', idx)}
                                      className="p-1 rounded-md bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition text-xs shadow-2xs cursor-pointer"
                                    >
                                      🗑️
                                    </button>
                                    <div className="absolute z-50 bottom-full mb-1.5 right-1/2 translate-x-1/2 hidden group-hover/tip:flex flex-col bg-slate-900 text-white text-[11px] rounded-md shadow-xl py-1 px-2 pointer-events-none whitespace-nowrap border border-slate-700">
                                      מחק מכלול מהמערכת (העברה לסל מיחזור)
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB B: System Types */}
      {activeTab === 'systems' && (
        <div className="space-y-5">
          {/* Collapsible Add / Edit System Form */}
          <div className="bg-white rounded-xl border-2 border-purple-200 shadow-sm overflow-hidden">
            <div
              onClick={() => setIsSysFormOpen((prev) => !prev)}
              className="px-5 py-3.5 bg-gradient-to-l from-purple-50/70 to-white flex items-center justify-between cursor-pointer hover:bg-purple-50/90 transition select-none"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-purple-600 text-white font-bold flex items-center justify-center text-sm shadow-2xs">
                  {isSysFormOpen ? '−' : '+'}
                </span>
                <div>
                  <h3 className="text-sm font-bold text-purple-900">
                    {editingSysIdx >= 0
                      ? `עריכת מערכת: ${sysId}`
                      : 'הוספת מערכת חדשה / הגדרת פרטי מערכת מותרים'}
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-purple-700 font-semibold">
                  {isSysFormOpen ? 'לחץ לסגירת הטופס ▲' : 'לחץ לפתיחת טופס הוספה ▼'}
                </span>
                {editingSysIdx >= 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      resetSystemForm();
                      setIsSysFormOpen(false);
                    }}
                    className="text-xs text-slate-600 bg-slate-100 px-3 py-1 rounded-lg font-semibold"
                  >
                    ביטול עריכה
                  </button>
                )}
              </div>
            </div>

            {isSysFormOpen && (
              <div className="p-5 border-t border-purple-100">
                <p className="text-xs text-slate-500 mb-3">
                  הגדר אילו ערכים מותרים עבור מערכת זו. בטופס פתיחת ההזמנה המשתמש יוכל לבחור רק מתוך הערכים המוגדרים כאן (או לבחור &quot;אחר&quot; לפיתוח).
                </p>

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
            )}
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
                  <div className="flex items-center gap-1.5">
                    {/* Edit System */}
                    <div className="relative group/tip inline-flex items-center">
                      <button
                        type="button"
                        onClick={() => handleEditSystem(idx)}
                        className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 transition text-sm inline-flex items-center justify-center shadow-2xs cursor-pointer"
                      >
                        ✏️
                      </button>
                      <div className="absolute z-50 bottom-full mb-1.5 right-1/2 translate-x-1/2 hidden group-hover/tip:flex flex-col bg-slate-900 text-white text-[11px] rounded-md shadow-xl py-1 px-2 pointer-events-none whitespace-nowrap border border-slate-700">
                        ערוך מערכת
                      </div>
                    </div>

                    {/* Duplicate System */}
                    <div className="relative group/tip inline-flex items-center">
                      <button
                        type="button"
                        onClick={() => handleDuplicateSystem(s)}
                        className="p-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg border border-purple-200 transition text-sm inline-flex items-center justify-center shadow-2xs cursor-pointer"
                      >
                        📋
                      </button>
                      <div className="absolute z-50 bottom-full mb-1.5 right-1/2 translate-x-1/2 hidden group-hover/tip:flex flex-col bg-slate-900 text-white text-[11px] rounded-md shadow-xl py-1 px-2 pointer-events-none whitespace-nowrap border border-slate-700">
                        שכפל מערכת (יצירת עותק חדש)
                      </div>
                    </div>

                    {/* Delete System */}
                    <div className="relative group/tip inline-flex items-center">
                      <button
                        type="button"
                        onClick={() => openDeleteModal('system', idx)}
                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg border border-red-200 transition text-sm inline-flex items-center justify-center shadow-2xs cursor-pointer"
                      >
                        🗑️
                      </button>
                      <div className="absolute z-50 bottom-full mb-1.5 right-1/2 translate-x-1/2 hidden group-hover/tip:flex flex-col bg-slate-900 text-white text-[11px] rounded-md shadow-xl py-1 px-2 pointer-events-none whitespace-nowrap border border-slate-700">
                        מחק מערכת (העברה לסל מיחזור)
                      </div>
                    </div>
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
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-sm text-slate-800">
                  התאמות בין רכיבים
                </h3>
                <span className="text-slate-400">|</span>
                <label className="text-xs font-bold text-slate-700">
                  סינון לפי קטגוריה:
                </label>
                <select
                  value={compatFilterCat}
                  onChange={(e) => setCompatFilterCat(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-1 text-xs bg-white font-semibold"
                >
                  <option value="ALL">כל הקטגוריות ({categories.length})</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-xs text-slate-500">
                מציג <strong>{filteredCompatLinks.length}</strong> קשרי תאימות
              </span>
            </div>
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">רכיב (מק&quot;ט + תיאור)</th>
                  <th className="py-2.5 px-4">רכיבים תואמים (מק&quot;ט + תיאור)</th>
                  <th className="py-2.5 px-4">הערה הנדסית</th>
                  <th className="py-2.5 px-4 text-center w-24">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredCompatLinks.map((link: CompatLink, idx: number) => {
                  const r1 = catalogRules.find((r) => r.sku === link.c1);
                  return (
                    <tr key={link.c1 + idx} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-800">
                        <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-blue-800 font-bold">
                          {link.c1}
                        </span>{' '}
                        – {r1 ? r1.desc : ''}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {link.c2List.map((sku2: string) => {
                            const r2 = catalogRules.find((r) => r.sku === sku2);
                            return (
                              <span
                                key={sku2}
                                className="inline-flex items-center gap-1 bg-blue-50 text-blue-900 border border-blue-200 px-2 py-0.5 rounded font-medium text-[11px]"
                              >
                                <strong className="font-mono">{sku2}</strong>
                                {r2 ? ` – ${r2.desc}` : ''}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{link.note}</td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditCompat(idx)}
                            title="ערוך קשר תאימות"
                            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition text-sm shadow-2xs"
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCompat(idx)}
                            title="מחק קשר תאימות"
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition text-sm shadow-2xs"
                          >
                            🗑️
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
                            {cleanSubAssemblyDesc(s.desc)} (תחת {s.parentSku})
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

      {/* TAB F: User Management & Roles (Google Sign-In + Username/Password) */}
      {activeTab === 'users' && (
        <div className="space-y-5">
          {/* Info & Add User Box (Supports users with or without a Google account) */}
          <div className="bg-white rounded-xl border-2 border-purple-200 shadow-sm p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-purple-900">
                    👥 ניהול משתמשים והרשאות (חשבון Google או שם משתמש וסיסמה)
                  </h3>
                  <span className="text-[11px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full font-bold">
                    ✓ סיסמת ברירת מחדל: 123456
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  ניתן להוסיף כאן משתמשים חדשים גם אם <strong>אין להם חשבון Google</strong> (כניסה באמצעות שם משתמש בפורמט <code className="font-mono bg-slate-100 px-1 rounded">FirstName.LastName</code> וסיסמה). משתמשים חדשים שנכנסים עצמאית דרך Google מוגדרים אוטומטית כ<strong>&quot;צופה&quot;</strong>.
                </p>
              </div>
            </div>

            {/* Add User Form */}
            <div className="grid grid-cols-6 gap-3 items-end text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  שם מלא של המשתמש *
                </label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewUserName(val);
                    if (!newUserUsername && /^[A-Za-z]+(\s+[A-Za-z]+)+$/.test(val.trim())) {
                      setNewUserUsername(deriveDefaultUsername(val, newUserEmail));
                    }
                  }}
                  placeholder="למשל: Noa Barak / נועה ברק"
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-2 bg-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  שם משתמש (FirstName.LastName) *
                </label>
                <input
                  type="text"
                  value={newUserUsername}
                  onChange={(e) => setNewUserUsername(e.target.value)}
                  placeholder="למשל: Noa.barak"
                  dir="ltr"
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-2 font-mono text-left bg-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  סיסמה (ברירת מחדל: 123456)
                </label>
                <input
                  type="text"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="123456"
                  dir="ltr"
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-2 font-mono text-left bg-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  אימייל / Google (אופציונלי)
                </label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="noa.barak@gmail.com (לא חובה)"
                  dir="ltr"
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-2 font-mono text-left bg-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  תפקיד במערכת
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as RoleType)}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-2 bg-white font-bold"
                >
                  <option value="viewer">👁️ צופה (ברירת מחדל)</option>
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
                    const nameTrim = newUserName.trim();
                    const usernameTrim =
                      newUserUsername.trim() ||
                      deriveDefaultUsername(nameTrim, newUserEmail.trim());
                    const passwordTrim = newUserPassword.trim() || '123456';
                    const rawEmail = newUserEmail.trim().toLowerCase();
                    const emailFinal =
                      rawEmail && rawEmail.includes('@')
                        ? rawEmail
                        : `${usernameTrim.toLowerCase()}@local.company`;

                    if (!nameTrim && !usernameTrim) {
                      alert('נא להזין שם מלא ושם משתמש.');
                      return;
                    }
                    if (
                      users.some(
                        (u) =>
                          u.email.toLowerCase() === emailFinal ||
                          (
                            u.username ||
                            deriveDefaultUsername(u.fullName, u.email)
                          ).toLowerCase() === usernameTrim.toLowerCase()
                      )
                    ) {
                      alert('משתמש עם שם משתמש או אימייל זה כבר קיים במערכת.');
                      return;
                    }

                    let maxIdNum = 100;
                    users.forEach((u) => {
                      if (u.id.startsWith('USR-')) {
                        const n = parseInt(u.id.replace('USR-', ''), 10);
                        if (!isNaN(n) && n > maxIdNum) maxIdNum = n;
                      }
                    });

                    const ts = getNowTimestamp();
                    const addedUser: AppUser = {
                      id: `USR-${maxIdNum + 1}`,
                      email: emailFinal,
                      username: usernameTrim,
                      password: passwordTrim,
                      fullName: nameTrim || usernameTrim,
                      role: newUserRole,
                      provider: rawEmail ? 'google' : 'local',
                      active: true,
                      createdAt: ts,
                      lastSignInAt: 'טרם התחבר',
                      updatedBy: currentUserLabel,
                    };
                    onUpdateState({ users: [addedUser, ...users] });
                    setNewUserName('');
                    setNewUserUsername('');
                    setNewUserPassword('123456');
                    setNewUserEmail('');
                    setNewUserRole('viewer');
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-3 rounded-lg shadow transition cursor-pointer"
                >
                  + הוסף משתמש
                </button>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  רשימת משתמשי המערכת, פרטי כניסה והגדרת תפקידים
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  שינוי תפקיד בטבלה מעדכן מיידית את הרשאות המשתמש במערכת ובמסד הנתונים (Supabase).
                </p>
              </div>
              <span className="text-xs font-bold bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                {users.length} משתמשים רשומים
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">משתמש</th>
                    <th className="py-2.5 px-3">שם משתמש וסיסמה</th>
                    <th className="py-2.5 px-3">אימייל / חשבון Google</th>
                    <th className="py-2.5 px-3">הגדרת תפקיד במערכת (ע&quot;י מנהל)</th>
                    <th className="py-2.5 px-3 text-center">סטטוס</th>
                    <th className="py-2.5 px-3">הצטרפות / התחברות אחרונה</th>
                    <th className="py-2.5 px-3">עודכן ע&quot;י</th>
                    <th className="py-2.5 px-3 text-center">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {users.map((u, idx) => {
                    const displayUsername =
                      u.username || deriveDefaultUsername(u.fullName, u.email);
                    const displayPassword = u.password || '123456';
                    return (
                      <tr
                        key={u.id}
                        className={`hover:bg-slate-50 transition ${!u.active ? 'opacity-60 bg-slate-100' : ''
                          }`}
                      >
                        <td className="py-2.5 px-3">
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
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="font-mono font-bold text-purple-900 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded w-fit">
                            {displayUsername}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                            סיסמה: <strong>{displayPassword}</strong>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-700">
                          {u.email.endsWith('@local.company') ? (
                            <span className="text-slate-400 text-[11px] font-sans">
                              ללא חשבון Google (מקומי)
                            </span>
                          ) : (
                            u.email
                          )}
                        </td>
                        <td className="py-2.5 px-3">
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
                            className={`border-2 rounded-lg px-2.5 py-1 font-bold text-xs bg-white shadow-sm ${u.role === 'manager'
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
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {u.active ? (
                            <span
                              className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 text-sm shadow-2xs cursor-help"
                              title="משתמש פעיל"
                            >
                              💡
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-100 text-red-600 text-sm shadow-2xs cursor-help"
                              title="משתמש לא פעיל (מושהה)"
                            >
                              💡
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-600">
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
                        <td className="py-2.5 px-3 text-[11px] text-slate-600">
                          {u.updatedBy || 'Google Sign-In (אוטומטי)'}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {onSelectActiveUser && u.active && (
                              <button
                                type="button"
                                onClick={() => onSelectActiveUser(u)}
                                className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition text-sm shadow-2xs inline-flex items-center justify-center"
                                title={`החלף חיבור פעיל אל ${u.fullName} (${ROLE_LABELS_HE[u.role]})`}
                              >
                                🔑
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => startEditUser(u, idx)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition text-sm shadow-2xs inline-flex items-center justify-center"
                              title="ערוך פרטי משתמש"
                            >
                              ✏️
                            </button>
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
                              className={`p-1.5 rounded-lg transition text-sm shadow-2xs inline-flex items-center justify-center ${u.active
                                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                                }`}
                              title={u.active ? 'השהה משתמש' : 'הפעל משתמש'}
                            >
                              {u.active ? '⏸️' : '▶️'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(idx)}
                              className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition text-sm shadow-2xs inline-flex items-center justify-center"
                              title="מחק משתמש מהמערכת"
                            >
                              🗑️
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

      {/* Edit User Modal */}
      {editingUserIdx !== -1 && users[editingUserIdx] && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border-2 border-purple-400 shadow-2xl max-w-lg w-full p-6 space-y-4 text-right">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-purple-600"></span>
                <h3 className="font-bold text-base text-slate-900">
                  ✏️ עריכת פרטי משתמש ({users[editingUserIdx].id})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingUserIdx(-1)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    שם מלא של המשתמש:
                  </label>
                  <input
                    type="text"
                    value={editUserName}
                    onChange={(e) => setEditUserName(e.target.value)}
                    placeholder="למשל: דניאל כהן"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-purple-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    שם משתמש (FirstName.LastName):
                  </label>
                  <input
                    type="text"
                    value={editUserUsername}
                    onChange={(e) => setEditUserUsername(e.target.value)}
                    placeholder="Shalom.kopla"
                    dir="ltr"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-left focus:ring-2 focus:ring-purple-400 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    סיסמה להתחברות:
                  </label>
                  <input
                    type="text"
                    value={editUserPassword}
                    onChange={(e) => setEditUserPassword(e.target.value)}
                    placeholder="123456"
                    dir="ltr"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-left focus:ring-2 focus:ring-purple-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    כתובת אימייל (חשבון Google / אופציונלי):
                  </label>
                  <input
                    type="email"
                    value={editUserEmail}
                    onChange={(e) => setEditUserEmail(e.target.value)}
                    placeholder="user@example.com"
                    dir="ltr"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-left focus:ring-2 focus:ring-purple-400 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    תפקיד במערכת:
                  </label>
                  <select
                    value={editUserRole}
                    onChange={(e) => setEditUserRole(e.target.value as RoleType)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-purple-400 outline-none bg-white"
                  >
                    <option value="viewer">👁️ צופה (שירות לקוחות / ייצור)</option>
                    <option value="sales">💼 איש מכירות</option>
                    <option value="procurement">📦 איש רכש / תפ"י</option>
                    <option value="dev">🔧 איש פיתוח / הנדסה</option>
                    <option value="manager">⚙️ מנהל מערכת</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    סטטוס פעילות:
                  </label>
                  <select
                    value={editUserActive ? 'active' : 'paused'}
                    onChange={(e) => setEditUserActive(e.target.value === 'active')}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-purple-400 outline-none bg-white"
                  >
                    <option value="active">🟢 פעיל ומורשה גישה</option>
                    <option value="paused">⏸️ מושהה (גישה חסומה)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => handleDeleteUser(editingUserIdx)}
                className="px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition"
              >
                🗑️ מחק משתמש
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUserIdx(-1)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  ביטול
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditedUser}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow"
                >
                  💾 שמור שינויים
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB G: Customer Management (ניהול לקוחות ועריכת פרטי לקוח) */}
      {activeTab === 'customers' && (
        <div className="space-y-5">
          {/* Collapsible Add/Edit Customer Box */}
          <div className="bg-white rounded-xl border-2 border-purple-200 shadow-sm overflow-hidden">
            <div
              onClick={() => {
                if (isCustomerFormOpen && editingCustId) {
                  resetCustomerForm();
                }
                setIsCustomerFormOpen((prev) => !prev);
              }}
              className="px-5 py-3.5 bg-gradient-to-l from-purple-50/70 to-white flex items-center justify-between cursor-pointer hover:bg-purple-50/90 transition select-none"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-purple-600 text-white font-bold flex items-center justify-center text-sm shadow-2xs">
                  {isCustomerFormOpen ? '−' : '+'}
                </span>
                <div>
                  <h3 className="text-sm font-bold text-purple-900">
                    {editingCustId ? `עריכת לקוח: ${custName}` : 'הוספת לקוח חדש'}
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    הגדר לקוחות שיופיעו לבחירה בטופס פתיחת הזמנה חדשה
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-purple-700 font-semibold">
                  {isCustomerFormOpen ? 'לחץ לסגירת הטופס ▲' : 'לחץ לפתיחת טופס הוספה ▼'}
                </span>
                {editingCustId && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      resetCustomerForm();
                      setIsCustomerFormOpen(false);
                    }}
                    className="text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-lg font-semibold"
                  >
                    ביטול עריכה
                  </button>
                )}
              </div>
            </div>

            {isCustomerFormOpen && (
              <div className="p-5 border-t border-purple-100 bg-slate-50/50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs mb-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      שם לקוח / חברה *
                    </label>
                    <input
                      type="text"
                      value={custName}
                      onChange={(e) => setCustName(e.target.value)}
                      placeholder="למשל: לקוח ו׳ – חברת אומגה מערכות"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      שם איש קשר *
                    </label>
                    <input
                      type="text"
                      value={custContact}
                      onChange={(e) => setCustContact(e.target.value)}
                      placeholder="למשל: ירון כהן"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      מספר טלפון
                    </label>
                    <input
                      type="text"
                      value={custPhone}
                      onChange={(e) => setCustPhone(e.target.value)}
                      placeholder="050-1234567"
                      dir="ltr"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-right font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs mb-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      כתובת אימייל
                    </label>
                    <input
                      type="email"
                      value={custEmail}
                      onChange={(e) => setCustEmail(e.target.value)}
                      placeholder="contact@company.com"
                      dir="ltr"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-right font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      כתובת פיזית / אתר
                    </label>
                    <input
                      type="text"
                      value={custAddress}
                      onChange={(e) => setCustAddress(e.target.value)}
                      placeholder="פארק תעשייה, עיר"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      סטטוס פעילות
                    </label>
                    <select
                      value={custActive ? 'active' : 'inactive'}
                      onChange={(e) => setCustActive(e.target.value === 'active')}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                    >
                      <option value="active">🟢 פעיל (מופיע בפתיחת הזמנה)</option>
                      <option value="inactive">🔴 מושבת (מוסתר מהזמנות חדשות)</option>
                    </select>
                  </div>
                </div>

                <div className="text-xs mb-4">
                  <label className="block font-semibold text-slate-700 mb-1">
                    הערות הנדסיות / מסחריות על הלקוח
                  </label>
                  <input
                    type="text"
                    value={custNotes}
                    onChange={(e) => setCustNotes(e.target.value)}
                    placeholder="למשל: דרישות איכות מיוחדות, שעות קבלת סחורה..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                  />
                </div>

                {editingCustId && (
                  <div className="mb-4 bg-purple-50 p-2.5 rounded-lg border border-purple-200 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="updateLinkedOrders"
                      checked={updateLinkedOrders}
                      onChange={(e) => setUpdateLinkedOrders(e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-400 w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="updateLinkedOrders" className="text-xs font-semibold text-purple-900 cursor-pointer">
                      סנכרן ועדכן את פרטי הלקוח (שם, איש קשר, טלפון, אימייל) בכל ההזמנות הקיימות של לקוח זה
                    </label>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      resetCustomerForm();
                      setIsCustomerFormOpen(false);
                    }}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold"
                  >
                    ביטול
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCustomer}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow transition cursor-pointer"
                  >
                    {editingCustId ? '💾 שמור עדכון לקוח' : '➕ הוסף לקוח למערכת'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Customers Table View with Search */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  🏢 רשימת לקוחות וארגונים ({filteredCustomers.length})
                </h3>
                <span className="text-xs text-slate-500">
                  ניהול פרטי קשר, אנשי קשר, כתובות וסטטוס פעילות
                </span>
              </div>
              <div className="w-72">
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="חפש לפי שם לקוח, איש קשר או אימייל..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs bg-white"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-600 text-[11px] uppercase border-b border-slate-200 select-none">
                  <tr>
                    <th className="py-2.5 px-3">מזהה</th>
                    <th className="py-2.5 px-3">שם לקוח / חברה</th>
                    <th className="py-2.5 px-3">איש קשר</th>
                    <th className="py-2.5 px-3">טלפון</th>
                    <th className="py-2.5 px-3">אימייל</th>
                    <th className="py-2.5 px-3">כתובת</th>
                    <th className="py-2.5 px-3 text-center">הזמנות מקושרות</th>
                    <th className="py-2.5 px-3 text-center">סטטוס</th>
                    <th className="py-2.5 px-3 text-center">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        לא נמצאו לקוחות התואמים את החיפוש.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((c) => {
                      const linkedOrdersCount = orders.filter((o) => o.customer === c.name).length;
                      const isActive = c.active !== false;

                      return (
                        <tr
                          key={c.id}
                          className={`hover:bg-slate-50 transition ${!isActive ? 'bg-red-50/40 opacity-70' : ''
                            }`}
                        >
                          <td className="py-2.5 px-3 font-mono font-bold text-purple-700">
                            {c.id}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            {c.name}
                            {c.notes && (
                              <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                                {c.notes}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-700">
                            {c.contact}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600" dir="ltr">
                            {c.phone || '-'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-blue-700" dir="ltr">
                            {c.email || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {c.address || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${linkedOrdersCount > 0
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : 'bg-slate-100 text-slate-500'
                                }`}
                            >
                              {linkedOrdersCount} הזמנות
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="relative group/tip inline-flex items-center justify-center">
                              {isActive ? (
                                <span className="cursor-help text-base select-none leading-none inline-flex items-center justify-center relative">
                                  <span>💡</span>
                                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200 absolute -bottom-0.5 -right-0.5 animate-pulse" />
                                </span>
                              ) : (
                                <span className="cursor-help text-base select-none leading-none inline-flex items-center justify-center relative opacity-50 grayscale">
                                  <span>💡</span>
                                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-red-200 absolute -bottom-0.5 -right-0.5" />
                                </span>
                              )}
                              <div className="absolute z-50 bottom-full mb-1.5 right-1/2 translate-x-1/2 hidden group-hover/tip:flex flex-col bg-slate-900 text-white text-[11px] rounded-lg shadow-xl p-2 w-44 pointer-events-none border border-slate-700 text-center font-normal">
                                {isActive ? (
                                  <>
                                    <span className="font-bold text-emerald-400">🟢 לקוח פעיל</span>
                                    <span className="text-[10px] text-slate-300">זמין לבחירה בהזמנות חדשות</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="font-bold text-red-400">🔴 לקוח מושבת</span>
                                    <span className="text-[10px] text-slate-300">מוסתר בפתיחת הזמנות חדשות</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Edit Customer */}
                              <div className="relative group/tip inline-flex items-center">
                                <button
                                  type="button"
                                  onClick={() => handleEditCustomer(c)}
                                  className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition text-sm shadow-2xs cursor-pointer"
                                >
                                  ✏️
                                </button>
                                <div className="absolute z-50 bottom-full mb-1.5 right-1/2 translate-x-1/2 hidden group-hover/tip:flex flex-col bg-slate-900 text-white text-[11px] rounded-md shadow-xl py-1 px-2 pointer-events-none whitespace-nowrap border border-slate-700">
                                  ערוך פרטי לקוח
                                </div>
                              </div>

                              {/* Toggle Active */}
                              <div className="relative group/tip inline-flex items-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleCustomerActive(c.id)}
                                  className={`p-1.5 rounded-lg border transition text-sm shadow-2xs cursor-pointer ${isActive
                                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                    }`}
                                >
                                  {isActive ? '⏸️' : '▶️'}
                                </button>
                                <div className="absolute z-50 bottom-full mb-1.5 right-1/2 translate-x-1/2 hidden group-hover/tip:flex flex-col bg-slate-900 text-white text-[11px] rounded-md shadow-xl py-1 px-2 pointer-events-none whitespace-nowrap border border-slate-700">
                                  {isActive ? 'השבת לקוח' : 'הפעל לקוח'}
                                </div>
                              </div>

                              {/* Delete Customer */}
                              <div className="relative group/tip inline-flex items-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCustomer(c.id)}
                                  className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition text-sm shadow-2xs cursor-pointer"
                                >
                                  🗑️
                                </button>
                                <div className="absolute z-50 bottom-full mb-1.5 right-1/2 translate-x-1/2 hidden group-hover/tip:flex flex-col bg-slate-900 text-white text-[11px] rounded-md shadow-xl py-1 px-2 pointer-events-none whitespace-nowrap border border-slate-700">
                                  מחק לקוח
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}


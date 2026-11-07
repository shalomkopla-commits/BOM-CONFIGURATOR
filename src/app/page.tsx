'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AppUser,
  BomRow,
  ConfiguratorState,
  Order,
  OrderStatus,
  RoleType,
} from '@/types/configurator';
import {
  getItemImageUrl,
  INITIAL_STATE,
  INITIAL_USERS,
  ROLE_LABELS_HE,
  ROLE_USER_MAP,
} from '@/data/initialData';
import {
  buildDynamicBomForOrder,
  ensureOrderHasBom,
  getDefaultImgTypeForCat,
  getNowTimestamp,
  getUnlockedBomRows,
} from '@/lib/bomEngine';
import {
  getAuthenticatedGoogleUser,
  isSupabaseConfigured,
  loadConfiguratorState,
  resetConfiguratorState,
  saveConfiguratorState,
  signInWithGoogleOAuth,
} from '@/lib/supabase';
import { exportOrderBomToExcel } from '@/lib/excelExport';
import VisualProductTree from '@/components/VisualProductTree';
import AdminDashboard from '@/components/AdminDashboard';

export default function HomePage() {
  const [appState, setAppState] = useState<ConfiguratorState>(INITIAL_STATE);
  const [storageSource, setStorageSource] = useState<
    'supabase' | 'localStorage' | 'seed'
  >('seed');
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  const [role, setRole] = useState<RoleType>('procurement');
  const [activeUserEmail, setActiveUserEmail] = useState<string>(
    'ronit.levi@company.com'
  );
  const [googleModalOpen, setGoogleModalOpen] = useState<boolean>(false);
  const [googleInputEmail, setGoogleInputEmail] = useState<string>('');
  const [googleInputName, setGoogleInputName] = useState<string>('');
  const [authBannerMsg, setAuthBannerMsg] = useState<string | null>(null);

  const [activeScreen, setActiveScreen] = useState<
    'list' | 'new' | 'detail' | 'admin'
  >('detail');
  const [selectedOrderId, setSelectedOrderId] =
    useState<string>('ORD-2026-102');
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState<boolean>(false);

  // --- Screen 1: Orders List Filters & Sort ---
  const [kpiFilter, setKpiFilter] = useState<'all' | 'open' | 'dev' | 'closed'>(
    'all'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortCol, setSortCol] = useState<string>('id');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // --- Screen 2: New Order Form State ---
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>(
    'existing'
  );
  const [selectedCustomer, setSelectedCustomer] = useState<string>(
    'לקוח א׳ – חברת אלפא טכנולוגיות'
  );
  const [newCustomerName, setNewCustomerName] = useState<string>('');
  const [newCustomerContact, setNewCustomerContact] = useState<string>('');
  const [newCustomerEmail, setNewCustomerEmail] = useState<string>('');
  const [deliveryDate, setDeliveryDate] = useState<string>('2026-12-15');
  const [selectedSysId, setSelectedSysId] = useState<string>('SYS-PRO-200');

  const [cfgPower, setCfgPower] = useState<string>('3.0kW');
  const [cfgPowerOther, setCfgPowerOther] = useState<string>(
    '4.5kW קירור נוזל מיוחד'
  );
  const [cfgFocal, setCfgFocal] = useState<string>('OTHER');
  const [cfgFocalOther, setCfgFocalOther] =
    useState<string>('500mm זום מיוצב');
  const [cfgVoltage, setCfgVoltage] = useState<string>('230V AC');
  const [cfgVoltageOther, setCfgVoltageOther] =
    useState<string>('110V תעופתי 400Hz');
  const [cfgEnv, setCfgEnv] = useState<string>('OTHER');
  const [cfgEnvOther, setCfgEnvOther] =
    useState<string>('IP68 קיצון -40°C');
  const [cfgUsage, setCfgUsage] = useState<string>('תעשייתי');
  const [cfgUsageOther, setCfgUsageOther] =
    useState<string>('שימוש ימי מיוחד');

  // --- Screen 3: Detail View Tabs & Custom Modal ---
  const [bomSubView, setBomSubView] = useState<'both' | 'table' | 'tree'>(
    'both'
  );
  const [customModalRowId, setCustomModalRowId] = useState<string | null>(null);
  const [customModalMode, setCustomModalMode] = useState<'existing' | 'new'>(
    'existing'
  );
  const [customModalSelectedSku, setCustomModalSelectedSku] =
    useState<string>('');
  const [customModalNewSku, setCustomModalNewSku] =
    useState<string>('OPT-LENS-500Z-C');
  const [customModalNewRev, setCustomModalNewRev] =
    useState<string>('Rev 1.0');
  const [customModalNewDesc, setCustomModalNewDesc] = useState<string>(
    'תת-מכלול עדשת זום מיוצבת 500mm (פיתוח מאושר)'
  );

  const usersList = useMemo(
    () =>
      appState.users && appState.users.length > 0
        ? appState.users
        : INITIAL_USERS,
    [appState.users]
  );

  const activeUserObj = useMemo(
    () =>
      usersList.find(
        (u) => u.email.toLowerCase() === activeUserEmail.toLowerCase()
      ) || usersList.find((u) => u.role === role),
    [usersList, activeUserEmail, role]
  );

  const currentUserLabel = activeUserObj
    ? `${activeUserObj.fullName} (${ROLE_LABELS_HE[role]})`
    : ROLE_USER_MAP[role];

  const handleGoogleSignIn = (emailRaw: string, fullNameRaw?: string) => {
    const email = emailRaw.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      alert('נא להזין כתובת אימייל של חשבון Google.');
      return;
    }
    const ts = getNowTimestamp();
    const existingIdx = usersList.findIndex(
      (u) => u.email.toLowerCase() === email
    );

    if (existingIdx >= 0) {
      const existingUser = usersList[existingIdx];
      if (!existingUser.active) {
        alert('משתמש זה מושהה כעת ע"י מנהל המערכת.');
        return;
      }
      const updatedUser: AppUser = {
        ...existingUser,
        lastSignInAt: ts,
      };
      const nextUsers = [...usersList];
      nextUsers[existingIdx] = updatedUser;
      persistState({ ...appState, users: nextUsers });
      setActiveUserEmail(updatedUser.email);
      setRole(updatedUser.role);
      if (updatedUser.role !== 'manager' && activeScreen === 'admin') {
        setActiveScreen('list');
      }
      setAuthBannerMsg(
        `התחברת באמצעות Google כ-${updatedUser.fullName} (${updatedUser.email}) בתפקיד: ${ROLE_LABELS_HE[updatedUser.role]}`
      );
    } else {
      // NEW USER SIGN IN -> Automatically assigned 'viewer' (צופה) role!
      const derivedName =
        (fullNameRaw && fullNameRaw.trim()) || email.split('@')[0];
      const newUser: AppUser = {
        id: `USR-${100 + usersList.length + 1}`,
        email,
        fullName: derivedName,
        role: 'viewer',
        provider: 'google',
        active: true,
        createdAt: ts,
        lastSignInAt: ts,
        updatedBy: 'Google Sign-In (הוגדר אוטומטית כצופה)',
      };
      const nextUsers = [newUser, ...usersList];
      persistState({ ...appState, users: nextUsers });
      setActiveUserEmail(newUser.email);
      setRole('viewer');
      if (activeScreen === 'admin') {
        setActiveScreen('list');
      }
      setAuthBannerMsg(
        `משתמש Google חדש (${newUser.email}) התחבר למערכת והוגדר אוטומטית כ"צופה" (Viewer). מנהל המערכת יכול לעדכן את תפקידו במסך ניהול המשתמשים.`
      );
    }
    setGoogleInputEmail('');
    setGoogleInputName('');
    setGoogleModalOpen(false);
  };

  // Load state and check Supabase Auth / pending Google login on mount
  useEffect(() => {
    let mounted = true;
    loadConfiguratorState().then(async ({ state, source }) => {
      if (!mounted) return;
      const hydratedOrders = state.orders.map((o) => ({
        ...o,
        bom: ensureOrderHasBom(
          o,
          state.systemTypes,
          state.catalogRules,
          state.categories
        ),
      }));
      let hydratedUsers =
        state.users && state.users.length > 0 ? [...state.users] : [...INITIAL_USERS];

      // Check real Supabase Auth Google user or pending local /login session
      const supaUser = await getAuthenticatedGoogleUser();
      let pendingLogin: { email: string; fullName: string; role?: string } | null = supaUser;

      if (!pendingLogin && typeof window !== 'undefined') {
        const rawPending = window.localStorage.getItem('bom_pending_google_login');
        if (rawPending) {
          try {
            pendingLogin = JSON.parse(rawPending);
            window.localStorage.removeItem('bom_pending_google_login');
          } catch {
            // ignore
          }
        }
      }

      if (pendingLogin && pendingLogin.email) {
        const emailLower = pendingLogin.email.toLowerCase();
        const ts = getNowTimestamp();
        const existingIdx = hydratedUsers.findIndex(
          (u) => u.email.toLowerCase() === emailLower
        );
        if (existingIdx >= 0) {
          const existing = hydratedUsers[existingIdx];
          hydratedUsers[existingIdx] = { ...existing, lastSignInAt: ts };
          setActiveUserEmail(existing.email);
          setRole(existing.role);
          if (existing.role === 'manager') {
            setActiveScreen('admin');
          }
        } else {
          // New Google user -> auto-assign 'viewer' (צופה)
          const newUser: AppUser = {
            id: `USR-${100 + hydratedUsers.length + 1}`,
            email: emailLower,
            fullName: pendingLogin.fullName || emailLower.split('@')[0],
            role: (pendingLogin.role as RoleType) || 'viewer',
            provider: 'google',
            active: true,
            createdAt: ts,
            lastSignInAt: ts,
            updatedBy: 'Google Sign-In (הוגדר אוטומטית כצופה)',
          };
          hydratedUsers = [newUser, ...hydratedUsers];
          setActiveUserEmail(newUser.email);
          setRole(newUser.role);
          if (newUser.role === 'manager') {
            setActiveScreen('admin');
          }
          setAuthBannerMsg(
            `משתמש Google מחובר: ${newUser.fullName} (${newUser.email}) בתפקיד: ${ROLE_LABELS_HE[newUser.role]}`
          );
        }
      }

      setAppState({ ...state, orders: hydratedOrders, users: hydratedUsers });
      setStorageSource(source);
      setIsLoaded(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Save helper
  const persistState = (nextState: ConfiguratorState) => {
    setAppState(nextState);
    saveConfiguratorState(nextState, currentUserLabel).then(
      ({ syncedToSupabase }) => {
        if (syncedToSupabase) setStorageSource('supabase');
        else if (storageSource === 'seed') setStorageSource('localStorage');
      }
    );
  };

  // Sync system defaults when selectedSysId changes in Screen 2
  const handleSelectSystemInForm = (newSysId: string) => {
    setSelectedSysId(newSysId);
    const sys = appState.systemTypes.find((s) => s.id === newSysId);
    if (!sys) return;
    setCfgPower((sys.allowedPowers || [sys.power])[0] || sys.power);
    setCfgFocal((sys.allowedFocals || [sys.focal])[0] || sys.focal);
    setCfgVoltage((sys.allowedVoltages || [sys.voltage])[0] || sys.voltage);
    setCfgEnv((sys.allowedEnvs || [sys.env])[0] || sys.env);
    setCfgUsage((sys.allowedUsages || [sys.usage])[0] || sys.usage);
  };

  // Current selected order
  const currentOrder: Order = useMemo(() => {
    return (
      appState.orders.find((o) => o.id === selectedOrderId) ||
      appState.orders[0]
    );
  }, [appState.orders, selectedOrderId]);

  const currentOrderBom: BomRow[] = useMemo(() => {
    if (!currentOrder) return [];
    return ensureOrderHasBom(
      currentOrder,
      appState.systemTypes,
      appState.catalogRules,
      appState.categories
    );
  }, [
    currentOrder,
    appState.systemTypes,
    appState.catalogRules,
    appState.categories,
  ]);

  // Screen 1: Filtered & Sorted Orders
  const filteredOrders = useMemo(() => {
    return appState.orders
      .filter((o) => {
        if (kpiFilter === 'open') {
          if (
            o.status === 'סגורה' ||
            o.status === 'מבוטלת' ||
            o.status === 'מאושר'
          ) {
            return false;
          }
        } else if (kpiFilter === 'dev') {
          if (o.status !== 'ממתין לפיתוח') return false;
        } else if (kpiFilter === 'closed') {
          if (o.status !== 'סגורה') return false;
        }

        if (statusFilter !== 'ALL' && o.status !== statusFilter) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          const match =
            o.id.toLowerCase().includes(q) ||
            o.customer.toLowerCase().includes(q) ||
            o.contact.toLowerCase().includes(q) ||
            o.systemName.toLowerCase().includes(q);
          if (!match) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const va = String((a as unknown as Record<string, unknown>)[sortCol] || '');
        const vb = String((b as unknown as Record<string, unknown>)[sortCol] || '');
        return sortAsc ? va.localeCompare(vb, 'he') : vb.localeCompare(va, 'he');
      });
  }, [appState.orders, kpiFilter, statusFilter, searchQuery, sortCol, sortAsc]);

  const handleSortTable = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else {
      setSortCol(col);
      setSortAsc(true);
    }
  };

  // Screen 2: Live Preview Calculation
  const selectedSysObj = useMemo(
    () =>
      appState.systemTypes.find((s) => s.id === selectedSysId) ||
      appState.systemTypes[0],
    [appState.systemTypes, selectedSysId]
  );

  const previewParams = useMemo(() => {
    const p =
      cfgPower === 'OTHER'
        ? `אחר: ${cfgPowerOther.trim() || 'דרישת הספק מיוחדת'}`
        : cfgPower;
    const f =
      cfgFocal === 'OTHER'
        ? `אחר: ${cfgFocalOther.trim() || 'אורך מוקד מיוחד'}`
        : cfgFocal;
    const v =
      cfgVoltage === 'OTHER'
        ? `אחר: ${cfgVoltageOther.trim() || 'הזנה מיוחדת'}`
        : cfgVoltage;
    const e =
      cfgEnv === 'OTHER'
        ? `אחר: ${cfgEnvOther.trim() || 'תנאי סביבה מיוחדים'}`
        : cfgEnv;
    const u =
      cfgUsage === 'OTHER'
        ? `אחר: ${cfgUsageOther.trim() || 'שימוש מיוחד'}`
        : cfgUsage;
    return { p, f, v, e, u };
  }, [
    cfgPower,
    cfgPowerOther,
    cfgFocal,
    cfgFocalOther,
    cfgVoltage,
    cfgVoltageOther,
    cfgEnv,
    cfgEnvOther,
    cfgUsage,
    cfgUsageOther,
  ]);

  const previewBom = useMemo(() => {
    return buildDynamicBomForOrder(
      selectedSysObj,
      previewParams.p,
      previewParams.f,
      previewParams.v,
      previewParams.e,
      previewParams.u,
      appState.catalogRules,
      appState.categories,
      false, // Exclude inactive assemblies for new orders
      currentUserLabel
    );
  }, [
    selectedSysObj,
    previewParams,
    appState.catalogRules,
    appState.categories,
    currentUserLabel,
  ]);

  const handleCreateNewOrder = () => {
    let customerName = selectedCustomer;
    let contactName = 'ישראל ישראלי';
    if (customerMode === 'new') {
      if (!newCustomerName.trim()) {
        alert('נא להזין שם לקוח חדש.');
        return;
      }
      customerName = newCustomerName.trim();
      contactName = newCustomerContact.trim() || 'איש קשר ראשי';
    }

    const nowTs = getNowTimestamp();
    const newId = `ORD-2026-${105 + appState.orders.length}`;
    const hasCustom = previewBom.some((b) => b.isCustom);

    const newOrder: Order = {
      id: newId,
      customer: customerName,
      contact: contactName,
      email: newCustomerEmail.trim() || undefined,
      systemTypeId: selectedSysObj?.id || 'SYS-STD-100',
      systemName: selectedSysObj?.name || 'מערכת אופטית',
      deliveryDate: deliveryDate || '2026-12-30',
      createdAt: nowTs,
      createdBy: currentUserLabel,
      updatedAt: nowTs,
      updatedBy: currentUserLabel,
      power: previewParams.p,
      focal: previewParams.f,
      voltage: previewParams.v,
      env: previewParams.e,
      usage: previewParams.u,
      channels: selectedSysObj?.channels || 2,
      psuCount: selectedSysObj?.psuCount || 1,
      status: hasCustom ? 'ממתין לפיתוח' : 'ממתין לאישור',
      locked: false,
      bom: previewBom,
    };

    const nextState: ConfiguratorState = {
      ...appState,
      orders: [newOrder, ...appState.orders],
    };
    persistState(nextState);
    setSelectedOrderId(newId);
    setActiveScreen('detail');
  };

  // --- Screen 3: BOM Row & Order Actions ---
  const updateCurrentOrderAndBom = (
    updater: (order: Order, bom: BomRow[]) => { order: Order; bom: BomRow[] }
  ) => {
    if (!currentOrder) return;
    const clonedOrder = structuredClone(currentOrder);
    const clonedBom = structuredClone(currentOrderBom);
    const { order: updatedOrder, bom: updatedBom } = updater(
      clonedOrder,
      clonedBom
    );
    updatedOrder.bom = updatedBom;

    const nextOrders = appState.orders.map((o) =>
      o.id === updatedOrder.id ? updatedOrder : o
    );
    persistState({ ...appState, orders: nextOrders });
  };

  const handleOpenRowEdit = (rowId: string) => {
    if (!currentOrder) return;
    const isFinalApproved =
      currentOrder.status === 'מאושר' ||
      currentOrder.status === 'סגורה' ||
      currentOrder.status === 'מבוטלת';
    if (isFinalApproved) return;

    updateCurrentOrderAndBom((order, bom) => {
      const item = bom.find((b) => b.id === rowId);
      if (item && !item.removed) {
        const ts = getNowTimestamp();
        item.rowEditing = true;
        item.rowLocked = false;
        item.lastEditedBy = currentUserLabel;
        item.lastEditedAt = ts;
        order.updatedBy = currentUserLabel;
        order.updatedAt = ts;
      }
      return { order, bom };
    });
  };

  const handleLockBomRow = (rowId: string) => {
    updateCurrentOrderAndBom((order, bom) => {
      const item = bom.find((b) => b.id === rowId);
      if (item) {
        const ts = getNowTimestamp();
        item.rowEditing = false;
        item.rowLocked = true;
        item.approved = true;
        item.lastEditedBy = currentUserLabel;
        item.lastEditedAt = ts;
        order.updatedBy = currentUserLabel;
        order.updatedAt = ts;
      }
      return { order, bom };
    });
  };

  const handleToggleRemoveBomRow = (rowId: string) => {
    if (!currentOrder) return;
    const isFinalApproved =
      currentOrder.status === 'מאושר' ||
      currentOrder.status === 'סגורה' ||
      currentOrder.status === 'מבוטלת';
    if (isFinalApproved || currentOrder.locked) return;

    updateCurrentOrderAndBom((order, bom) => {
      const item = bom.find((b) => b.id === rowId);
      if (item) {
        const ts = getNowTimestamp();
        item.removed = !item.removed;
        if (item.removed) {
          item.rowEditing = false;
          item.rowLocked = true;
          item.approved = true;
        }
        item.lastEditedBy = currentUserLabel;
        item.lastEditedAt = ts;
        order.updatedBy = currentUserLabel;
        order.updatedAt = ts;
      }
      return { order, bom };
    });
  };

  const handleChangeBomAlternative = (rowId: string, newAltVal: string) => {
    updateCurrentOrderAndBom((order, bom) => {
      const idx = bom.findIndex((b) => b.id === rowId);
      if (idx === -1) return { order, bom };
      const item = bom[idx];
      const ts = getNowTimestamp();

      item.selectedAlt = newAltVal;
      const skuPart = newAltVal.split(' – ')[0].trim();
      const matchedRule = appState.catalogRules.find((r) => r.sku === skuPart);

      if (matchedRule) {
        item.sku = matchedRule.sku;
        item.rev = matchedRule.rev || 'Rev A';
        item.desc = matchedRule.desc;
        item.imgType =
          matchedRule.imgType || getDefaultImgTypeForCat(item.category);
        item.customImg = getItemImageUrl(
          matchedRule.sku,
          matchedRule.customImg,
          false
        );

        // If main assembly changed, automatically sync its child sub-assemblies!
        if (item.level === 'assembly') {
          const parentQty = item.qty || 1;
          const filteredBom = bom.filter((b) => b.parentId !== item.id);
          const newSubRules = appState.catalogRules.filter(
            (r) => r.parentSku === matchedRule.sku && r.active !== false
          );
          const newSubRows: BomRow[] = newSubRules.map((sub, sIdx) => ({
            id: `${item.id}_SUB_${sIdx + 1}`,
            category: item.category,
            level: 'sub-assembly',
            parentId: item.id,
            sku: sub.sku,
            rev: sub.rev || 'Rev A',
            desc: sub.desc,
            qty: parentQty,
            selectionType: 'פריט מוגדר',
            alternatives: [
              `${sub.sku} – ${sub.desc} (${sub.rev || 'Rev A'})`,
            ],
            selectedAlt: `${sub.sku} – ${sub.desc} (${sub.rev || 'Rev A'})`,
            isCustom: false,
            approved: true,
            rowLocked: true,
            rowEditing: false,
            removed: false,
            lastEditedBy: `${currentUserLabel} (סנכרון אוטומטי)`,
            lastEditedAt: ts,
            notes: `תת-מכלול מעודכן אוטומטית עבור ${matchedRule.sku}`,
            imgType: sub.imgType || 'sensor',
            customImg: getItemImageUrl(sub.sku, sub.customImg, false),
          }));

          const newParentIdx = filteredBom.findIndex((b) => b.id === item.id);
          filteredBom.splice(newParentIdx + 1, 0, ...newSubRows);
          bom = filteredBom;
        }
      }

      const updatedItem = bom.find((b) => b.id === rowId);
      if (updatedItem) {
        updatedItem.rowLocked = false;
        updatedItem.rowEditing = true;
        updatedItem.approved = false;
        updatedItem.lastEditedBy = currentUserLabel;
        updatedItem.lastEditedAt = ts;
      }
      order.updatedBy = currentUserLabel;
      order.updatedAt = ts;
      return { order, bom };
    });
  };

  // Custom Dev Modal Open & Apply
  const handleOpenCustomModal = (rowId: string) => {
    const item = currentOrderBom.find((b) => b.id === rowId);
    if (!item) return;
    const catRules = appState.catalogRules.filter(
      (r) => r.category === item.category && r.active !== false
    );
    setCustomModalRowId(rowId);
    setCustomModalMode('existing');
    setCustomModalSelectedSku(catRules[0]?.sku || '');
    setCustomModalNewSku(
      item.sku.replace('CUSTOM-', 'STD-') + '-C'
    );
    setCustomModalNewRev('Rev 1.0');
    setCustomModalNewDesc(`${item.desc} (פיתוח מאושר)`);
  };

  const handleConfirmCustomSku = () => {
    if (!customModalRowId) return;
    updateCurrentOrderAndBom((order, bom) => {
      const item = bom.find((b) => b.id === customModalRowId);
      if (!item) return { order, bom };
      const ts = getNowTimestamp();

      if (customModalMode === 'existing') {
        const chosen = appState.catalogRules.find(
          (r) => r.sku === customModalSelectedSku
        );
        if (!chosen) {
          alert('נא לבחור מכלול קיים מהרשימה.');
          return { order, bom };
        }
        item.sku = chosen.sku;
        item.rev = chosen.rev || 'Rev A';
        item.desc = chosen.desc;
        item.selectionType = 'נבחר מקטלוג קיים (אושר)';
        item.alternatives = [
          `${chosen.sku} – ${chosen.desc} (${chosen.rev || 'Rev A'})`,
        ];
        item.selectedAlt = `${chosen.sku} – ${chosen.desc} (${
          chosen.rev || 'Rev A'
        })`;
        item.isCustom = false;
        item.approved = true;
        item.rowLocked = true;
        item.rowEditing = false;
        item.imgType = chosen.imgType || 'optics';
        item.customImg = getItemImageUrl(chosen.sku, chosen.customImg, false);
        item.notes = `שויך למכלול קיים בקטגוריית ${item.category}`;
      } else {
        const newSku = customModalNewSku.trim() || 'DEV-NEW-100';
        const newRev = customModalNewRev.trim() || 'Rev 1.0';
        const newDesc = customModalNewDesc.trim() || item.desc;
        item.sku = newSku;
        item.rev = newRev;
        item.desc = newDesc;
        item.selectionType = 'מק"ט פיתוח מאושר';
        item.alternatives = [`${newSku} – ${newDesc} (${newRev})`];
        item.selectedAlt = `${newSku} – ${newDesc} (${newRev})`;
        item.isCustom = false;
        item.approved = true;
        item.rowLocked = true;
        item.rowEditing = false;
        item.imgType = getDefaultImgTypeForCat(item.category);
        item.customImg = getItemImageUrl(newSku, null, false);
        item.notes = 'מק"ט פיתוח הוגדר ואושר ע"י הנדסה';
      }

      item.lastEditedBy = currentUserLabel;
      item.lastEditedAt = ts;
      order.updatedBy = currentUserLabel;
      order.updatedAt = ts;

      const stillHasCustom = bom.some((b) => b.isCustom && !b.removed);
      if (!stillHasCustom && order.status === 'ממתין לפיתוח') {
        order.status = 'ממתין לאישור';
      }
      return { order, bom };
    });
    setCustomModalRowId(null);
  };

  // Order Approval, Close, Cancel, Unlock
  const handleApproveAndLockOrder = () => {
    const unlockedRows = getUnlockedBomRows(currentOrderBom);
    if (unlockedRows.length > 0) {
      const listStr = unlockedRows
        .map(
          (r) =>
            `• ${r.sku} (${r.desc}) – ${
              r.isCustom ? 'דרישת פיתוח טרם הוגדרה' : 'שורה לא נעולה'
            }`
        )
        .join('\n');
      alert(
        `חסימת אישור הזמנה:\nלא ניתן לאשר הזמנה כאשר קיימות שורות שאינן נעולות בטבלת ה-BOM (${unlockedRows.length} שורות פתוחות):\n\n${listStr}\n\nיש לנעול את כל השורות הפתוחות (או לסמן כהוסר / להגדיר מק"ט פיתוח) לפני אישור ההזמנה.`
      );
      return;
    }

    updateCurrentOrderAndBom((order, bom) => {
      const ts = getNowTimestamp();
      order.locked = true;
      order.status = 'מאושר';
      order.updatedBy = currentUserLabel;
      order.updatedAt = ts;
      bom.forEach((b) => {
        b.approved = true;
        b.rowLocked = true;
        b.rowEditing = false;
      });
      return { order, bom };
    });
  };

  const handleCloseApprovedOrder = () => {
    if (!currentOrder || currentOrder.status !== 'מאושר') return;
    updateCurrentOrderAndBom((order, bom) => {
      const ts = getNowTimestamp();
      order.status = 'סגורה';
      order.locked = true;
      order.updatedBy = currentUserLabel;
      order.updatedAt = ts;
      return { order, bom };
    });
  };

  const handleUnlockOrderByManager = () => {
    if (role !== 'manager') return;
    updateCurrentOrderAndBom((order, bom) => {
      const ts = getNowTimestamp();
      order.locked = false;
      order.status = 'בטיפול';
      order.updatedBy = currentUserLabel;
      order.updatedAt = ts;
      return { order, bom };
    });
  };

  const handleCancelOrder = () => {
    if (role !== 'sales' && role !== 'manager') {
      alert('ביטול הזמנה מורשה לאיש מכירות או מנהל מערכת בלבד.');
      return;
    }
    updateCurrentOrderAndBom((order, bom) => {
      const ts = getNowTimestamp();
      order.status = 'מבוטלת';
      order.locked = true;
      order.updatedBy = currentUserLabel;
      order.updatedAt = ts;
      return { order, bom };
    });
  };

  const handleResetDemoData = async () => {
    const fresh = await resetConfiguratorState();
    const hydrated = fresh.orders.map((o) => ({
      ...o,
      bom: ensureOrderHasBom(
        o,
        fresh.systemTypes,
        fresh.catalogRules,
        fresh.categories
      ),
    }));
    setAppState({ ...fresh, orders: hydrated });
    setSelectedOrderId('ORD-2026-102');
  };

  const getStatusBadge = (status: OrderStatus) => {
    const map: Record<OrderStatus, string> = {
      'ממתין לאישור': 'bg-amber-50 text-amber-700 border-amber-200/90',
      מאושר: 'bg-emerald-50 text-emerald-700 border-emerald-200/90',
      'ממתין לפיתוח': 'bg-orange-100 text-orange-800 border-orange-300 font-bold',
      סגורה: 'bg-slate-100 text-slate-600 border-slate-200',
      בטיפול: 'bg-blue-50 text-blue-700 border-blue-200/90',
      מבוטלת: 'bg-rose-50 text-rose-700 border-rose-200 line-through',
    };
    return `inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
      map[status] || 'bg-slate-50 text-slate-700 border-slate-200'
    }`;
  };

  // KPI Counts
  const kpiCounts = useMemo(() => {
    const all = appState.orders.length;
    const open = appState.orders.filter(
      (o) =>
        o.status !== 'סגורה' &&
        o.status !== 'מבוטלת' &&
        o.status !== 'מאושר'
    ).length;
    const dev = appState.orders.filter(
      (o) => o.status === 'ממתין לפיתוח'
    ).length;
    const closed = appState.orders.filter((o) => o.status === 'סגורה').length;
    return { all, open, dev, closed };
  }, [appState.orders]);

  const unlockedBomRows = useMemo(
    () => getUnlockedBomRows(currentOrderBom),
    [currentOrderBom]
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900">
      {/* TOP BAR WITH SHUTTER ACCORDION */}
      <header className="bg-slate-900 text-white border-b border-slate-700 sticky top-0 z-50 shadow-md">
        {/* Shutter Content (Collapsible) */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isHeaderCollapsed
              ? 'max-h-0 opacity-0'
              : 'max-h-[160px] opacity-100'
          }`}
        >
          <div className="max-w-[1640px] mx-auto px-6 py-3 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-lg shadow-inner">
                ⚙️
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold tracking-tight">
                    קונפיגורטור מוצר וניהול BOM
                  </h1>
                  <span className="text-xs bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full">
                    Next.js • Desktop RTL
                  </span>
                  <span
                    className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold border ${
                      isSupabaseConfigured && storageSource === 'supabase'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                        : 'bg-slate-800 text-slate-300 border-slate-600'
                    }`}
                  >
                    {isSupabaseConfigured && storageSource === 'supabase'
                      ? '🟢 מחובר ל-Supabase'
                      : '💾 שמירה מקומית (מוכן ל-Supabase & Vercel)'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  משתמש פעיל: <strong className="text-slate-200">{currentUserLabel}</strong> | ייצוא BOM ל-Excel, תמונות מכלולים, Metadata מלא וסל מיחזור
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setActiveScreen('list')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeScreen === 'list' || activeScreen === 'detail'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                1. הזמנות ו-BOM
              </button>
              <button
                type="button"
                onClick={() => setActiveScreen('new')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeScreen === 'new'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                2. + פתיחת הזמנה חדשה
              </button>
              {role === 'manager' && (
                <button
                  type="button"
                  onClick={() => setActiveScreen('admin')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeScreen === 'admin'
                      ? 'bg-purple-600 text-white shadow'
                      : 'text-purple-300 hover:text-white'
                  }`}
                >
                  ⚙️ ניהול מערכת, היררכיות וחוקים
                </button>
              )}
            </div>

            {/* Connected User Profile Display & Sign Out */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700">
              <div className="bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-2 shadow-inner">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-extrabold text-[11px] flex items-center justify-center">
                  G
                </span>
                <span>
                  {activeUserObj
                    ? `${activeUserObj.fullName} (${activeUserObj.email})`
                    : activeUserEmail}
                </span>
                <span className="text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full">
                  {ROLE_LABELS_HE[role]}
                </span>
              </div>

              <a
                href="/auth/signout"
                title="התנתקות מהחשבון"
                className="text-xs bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-800/60 px-2.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1"
              >
                <span>🚪</span>
                <span>התנתק</span>
              </a>
            </div>
          </div>
        </div>

        {/* Shutter Toggle Tab Button */}
        <div className="flex justify-center -mb-2.5 relative z-10">
          <button
            type="button"
            onClick={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3.5 py-0.5 rounded-b-md border-x border-b border-slate-600 text-xs font-bold shadow-md transition flex items-center justify-center cursor-pointer"
            title={
              isHeaderCollapsed
                ? 'פתח תריס סרגל עליון'
                : 'כווץ תריס סרגל עליון'
            }
          >
            <span>{isHeaderCollapsed ? '▼' : '▲'}</span>
          </button>
        </div>
      </header>

      {/* Auth Notification Banner */}
      {authBannerMsg && (
        <div className="bg-emerald-900 text-emerald-100 border-b border-emerald-700 px-6 py-2.5 text-xs flex items-center justify-between max-w-[1640px] w-full mx-auto rounded-b-xl shadow">
          <div className="flex items-center gap-2 font-semibold">
            <span>🔐</span>
            <span>{authBannerMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setAuthBannerMsg(null)}
            className="text-emerald-300 hover:text-white font-bold px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* MAIN WORKSPACE */}
      <main className="flex-1 max-w-[1640px] w-full mx-auto px-6 py-6 space-y-6">
        {!isLoaded ? (
          <div className="bg-white rounded-xl p-12 text-center text-slate-500 shadow-sm border border-slate-200">
            טוען נתוני מערכת...
          </div>
        ) : (
          <>
            {/* =================================================================
                SCREEN 1: ORDERS LIST DASHBOARD
               ================================================================= */}
            {activeScreen === 'list' && (
              <section className="space-y-5">
                {/* KPI Cards */}
                <div className="grid grid-cols-4 gap-4">
                  <button
                    type="button"
                    onClick={() => setKpiFilter('all')}
                    className={`text-right bg-white p-4 rounded-xl border-2 transition shadow-sm hover:shadow ${
                      kpiFilter === 'all'
                        ? 'border-blue-600'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">
                        סה&quot;כ הזמנות במערכת
                      </span>
                      <span className="text-lg">📋</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">
                      {kpiCounts.all}
                    </div>
                    <div className="text-[11px] text-blue-600 mt-1 font-medium">
                      לחץ להצגת כל ההזמנות
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setKpiFilter('open')}
                    className={`text-right bg-white p-4 rounded-xl border-2 transition shadow-sm hover:shadow ${
                      kpiFilter === 'open'
                        ? 'border-blue-600'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">
                        הזמנות פתוחות / בטיפול (ללא מאושרות)
                      </span>
                      <span className="text-lg">⏳</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-600 mt-1">
                      {kpiCounts.open}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      ממתינות לאישור, בטיפול או בפיתוח
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setKpiFilter('dev')}
                    className={`text-right bg-orange-50/70 p-4 rounded-xl border-2 transition shadow-sm hover:shadow ${
                      kpiFilter === 'dev'
                        ? 'border-orange-500'
                        : 'border-orange-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-orange-800">
                        דרישות מיוחדות (ממתין לפיתוח)
                      </span>
                      <span className="w-3 h-3 rounded-full bg-orange-500 animate-pulse"></span>
                    </div>
                    <div className="text-2xl font-bold text-orange-600 mt-1">
                      {kpiCounts.dev}
                    </div>
                    <div className="text-[11px] text-orange-800 mt-1 font-medium">
                      כולל פריטים מותאמים אישית (כתום)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setKpiFilter('closed')}
                    className={`text-right bg-white p-4 rounded-xl border-2 transition shadow-sm hover:shadow ${
                      kpiFilter === 'closed'
                        ? 'border-blue-600'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">
                        הזמנות סגורות (סופקו)
                      </span>
                      <span className="text-lg">✅</span>
                    </div>
                    <div className="text-2xl font-bold text-emerald-600 mt-1">
                      {kpiCounts.closed}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      היסטוריית תצורה לשירות לקוחות
                    </div>
                  </button>
                </div>

                {/* Search & Filter Toolbar */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-[420px]">
                    <div className="relative flex-1 max-w-md">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="חיפוש לפי מספר הזמנה, שם לקוח, איש קשר או סוג מערכת..."
                        className="w-full pl-4 pr-9 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                      <span className="absolute right-3 top-2.5 text-slate-400 text-sm">
                        🔍
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-xs font-semibold text-slate-600">
                        מצב הזמנה:
                      </label>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="ALL">כל המצבים</option>
                        <option value="ממתין לאישור">ממתין לאישור</option>
                        <option value="מאושר">מאושר</option>
                        <option value="ממתין לפיתוח">
                          ממתין לפיתוח (כתום)
                        </option>
                        <option value="בטיפול">בטיפול</option>
                        <option value="סגורה">סגורה</option>
                        <option value="מבוטלת">מבוטלת</option>
                      </select>
                    </div>
                  </div>

                  {(role === 'sales' || role === 'manager') && (
                    <button
                      type="button"
                      onClick={() => setActiveScreen('new')}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-sm transition flex items-center gap-1.5"
                    >
                      <span>+</span>
                      <span>פתיחת הזמנה חדשה</span>
                    </button>
                  )}
                </div>

                {/* Orders Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                    <h2 className="font-bold text-sm text-slate-800">
                      רשימת הזמנות לקוח (לחץ על כותרת עמודה למיון, או על שורה לצפייה ב-BOM ובעץ המוצר)
                    </h2>
                    <span className="text-xs text-slate-500">
                      מציג <strong>{filteredOrders.length}</strong> הזמנות
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase border-b border-slate-200 select-none">
                        <tr>
                          <th
                            onClick={() => handleSortTable('id')}
                            className="py-2.5 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                          >
                            הזמנה ולקוח ⇅
                          </th>
                          <th
                            onClick={() => handleSortTable('systemName')}
                            className="py-2.5 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                          >
                            סוג מערכת ⇅
                          </th>
                          <th className="py-2.5 px-3">
                            דרישות עיקריות (הספק / מוקד / מתח)
                          </th>
                          <th
                            onClick={() => handleSortTable('usage')}
                            className="py-2.5 px-3 cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap"
                          >
                            שימוש ⇅
                          </th>
                          <th
                            onClick={() => handleSortTable('deliveryDate')}
                            className="py-2.5 px-3 cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap"
                          >
                            תאריך אספקה ⇅
                          </th>
                          <th
                            onClick={() => handleSortTable('updatedAt')}
                            className="py-2.5 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                          >
                            עדכון ⇅
                          </th>
                          <th
                            onClick={() => handleSortTable('status')}
                            className="py-2.5 px-3 cursor-pointer hover:bg-slate-100 transition-colors text-center"
                          >
                            מצב הזמנה ⇅
                          </th>
                          <th className="py-2.5 px-3 text-center w-14">פעולות</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredOrders.map((o) => {
                          const isDev = o.status === 'ממתין לפיתוח';
                          const isCustomFocal =
                            o.focal.includes('אחר') ||
                            o.focal.includes('זום') ||
                            o.focal.includes('מיוצב');
                          const isCustomEnv = o.env.includes('אחר');

                          return (
                            <tr
                              key={o.id}
                              onClick={() => {
                                setSelectedOrderId(o.id);
                                setActiveScreen('detail');
                              }}
                              className={`cursor-pointer hover:bg-blue-50/40 transition group h-[46px] ${
                                isDev
                                  ? 'bg-amber-50/25 hover:bg-amber-100/35 border-r-4 border-r-orange-500'
                                  : ''
                              }`}
                            >
                              {/* 1. הזמנה ולקוח */}
                              <td className="py-2 px-3 whitespace-nowrap">
                                <div className="font-mono font-bold text-xs text-blue-700 group-hover:text-blue-800 leading-tight">
                                  {o.id}
                                </div>
                                <div className="text-[10px] text-slate-500 font-medium truncate max-w-[200px] leading-tight mt-0.5">
                                  {o.customer}
                                </div>
                              </td>

                              {/* 2. סוג מערכת */}
                              <td className="py-2 px-3 whitespace-nowrap">
                                <span className="font-bold text-slate-900">
                                  {o.systemName}
                                </span>
                              </td>

                              {/* 3. דרישות עיקריות */}
                              <td className="py-2 px-3 whitespace-nowrap">
                                <div className="flex items-center gap-1.5 text-[11px]">
                                  <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-semibold">
                                    {o.power}
                                  </span>
                                  <span className="text-slate-300">•</span>
                                  <span
                                    className={`px-1.5 py-0.5 rounded font-semibold ${
                                      isCustomFocal
                                        ? 'bg-orange-100 text-orange-950 border border-orange-300 font-bold'
                                        : 'bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    {o.focal}
                                  </span>
                                  <span className="text-slate-300">•</span>
                                  <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-semibold">
                                    {o.voltage}
                                  </span>
                                </div>
                              </td>

                              {/* 4. שימוש */}
                              <td className="py-2 px-3 whitespace-nowrap">
                                <span className="font-semibold text-slate-800">
                                  {o.usage}
                                </span>
                              </td>

                              {/* 5. תאריך אספקה */}
                              <td className="py-2 px-3 whitespace-nowrap font-mono text-xs font-semibold text-slate-700">
                                {o.deliveryDate}
                              </td>

                              {/* 6. עדכון - שם אחרון ותאריך מקוצר + ענן Tooltip במעבר על ה-i */}
                              <td className="py-2 px-3 whitespace-nowrap">
                                <div className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                                  <span className="font-semibold text-slate-800">
                                    {o.updatedBy
                                      ? o.updatedBy.split('(')[0].trim()
                                      : 'מערכת'}
                                  </span>
                                  <span className="text-slate-300">•</span>
                                  <span className="font-mono text-slate-500 text-[11px]">
                                    {o.updatedAt
                                      ? o.updatedAt.split(' ')[0]
                                      : ''}
                                  </span>

                                  {/* Tooltip trigger on ℹ️ icon only */}
                                  <div className="relative group/tip inline-flex items-center justify-center">
                                    <span className="cursor-pointer text-blue-600 hover:text-blue-800 transition text-xs select-none p-0.5">
                                      ℹ️
                                    </span>

                                    {/* Cloud Tooltip on hover - positioned top-full mt-2 and z-50 to avoid clipping on top rows */}
                                    <div className="absolute z-50 top-full mt-2 right-1/2 translate-x-1/2 hidden group-hover/tip:flex flex-col bg-slate-900 text-white text-[11px] rounded-xl shadow-2xl p-3 w-64 pointer-events-none transition-all border border-slate-700 text-right">
                                      <div className="font-bold text-amber-300 border-b border-slate-700 pb-1.5 mb-1.5 flex items-center justify-between">
                                        <span>היסטוריית הזמנה</span>
                                        <span className="font-mono text-slate-300 text-[10px]">
                                          {o.id}
                                        </span>
                                      </div>
                                      <div className="space-y-1.5">
                                        <div className="text-slate-300">
                                          <span className="text-slate-400 font-medium">
                                            נפתח ע&quot;י:
                                          </span>{' '}
                                          <strong className="text-white">
                                            {o.createdBy}
                                          </strong>
                                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                            {o.createdAt}
                                          </div>
                                        </div>
                                        <div className="border-t border-slate-800 pt-1 text-slate-300">
                                          <span className="text-slate-400 font-medium">
                                            עודכן ע&quot;י:
                                          </span>{' '}
                                          <strong className="text-white">
                                            {o.updatedBy}
                                          </strong>
                                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                            {o.updatedAt}
                                          </div>
                                        </div>
                                      </div>
                                      {/* Arrow on top pointing up to icon */}
                                      <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-0 h-0 border-x-4 border-x-transparent border-b-4 border-b-slate-900 border-t-0" />
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* 7. מצב הזמנה */}
                              <td className="py-2 px-3 text-center whitespace-nowrap">
                                <span className={getStatusBadge(o.status)}>
                                  {o.status}
                                </span>
                              </td>

                              {/* 8. פעולות - אייקון עין בלבד */}
                              <td className="py-2 px-3 text-center whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedOrderId(o.id);
                                    setActiveScreen('detail');
                                  }}
                                  title="צפייה ב-BOM ובעץ המוצר"
                                  className="p-1.5 rounded-md text-slate-500 hover:text-blue-700 hover:bg-blue-100/80 border border-slate-200 hover:border-blue-300 transition shadow-2xs inline-flex items-center justify-center"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                    />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {/* =================================================================
                SCREEN 2: NEW ORDER FORM (SALES CONFIGURATOR)
               ================================================================= */}
            {activeScreen === 'new' && (
              <section className="space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        טופס פתיחת הזמנה חדשה – הגדרת דרישות מערכת (איש מכירות)
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        האפשרויות בכל שדה מוגבלות אוטומטית למה שהוגדר עבור סוג המערכת שנבחר. בחירת{' '}
                        <strong className="text-orange-600">&quot;אחר&quot;</strong> תפתח שדה מילוי חופשי ותצבע את הדרישה וה-BOM בכתום.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveScreen('list')}
                      className="text-xs text-slate-600 hover:text-slate-900 border border-slate-300 px-3 py-1.5 rounded-lg"
                    >
                      ✕ חזרה לרשימת ההזמנות
                    </button>
                  </div>

                  <div className="grid grid-cols-12 gap-6">
                    {/* Right Column: Form */}
                    <div className="col-span-7 space-y-5">
                      {/* 1. Customer & Delivery */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                            1. פרטי לקוח ואספקה
                          </h3>
                          <button
                            type="button"
                            onClick={() =>
                              setCustomerMode((prev) =>
                                prev === 'existing' ? 'new' : 'existing'
                              )
                            }
                            className="text-xs text-blue-600 hover:underline font-semibold"
                          >
                            {customerMode === 'existing'
                              ? '+ הקמת לקוח חדש מתוך הטופס'
                              : 'חזרה לבחירת לקוח קיים'}
                          </button>
                        </div>

                        {customerMode === 'existing' ? (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                בחירת לקוח קיים
                              </label>
                              <select
                                value={selectedCustomer}
                                onChange={(e) =>
                                  setSelectedCustomer(e.target.value)
                                }
                                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white"
                              >
                                <option value="לקוח א׳ – חברת אלפא טכנולוגיות">
                                  לקוח א׳ – חברת אלפא טכנולוגיות (ישראל ישראלי)
                                </option>
                                <option value="לקוח ב׳ – חברת בטא תעשיות">
                                  לקוח ב׳ – חברת בטא תעשיות (דנה לוי)
                                </option>
                                <option value="לקוח ג׳ – קבוצת גמא מערכות">
                                  לקוח ג׳ – קבוצת גמא מערכות (רועי אברהם)
                                </option>
                                <option value="לקוח ד׳ – דלתא הנדסה בע״מ">
                                  לקוח ד׳ – דלתא הנדסה בע&quot;מ (מיכל שפירא)
                                </option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                תאריך אספקה מבוקש
                              </label>
                              <input
                                type="date"
                                value={deliveryDate}
                                onChange={(e) =>
                                  setDeliveryDate(e.target.value)
                                }
                                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-4 gap-3 pt-2 border-t border-slate-200">
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                שם לקוח חדש
                              </label>
                              <input
                                type="text"
                                value={newCustomerName}
                                onChange={(e) =>
                                  setNewCustomerName(e.target.value)
                                }
                                placeholder="למשל: לקוח ו׳ – חברת זטא"
                                className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                איש קשר
                              </label>
                              <input
                                type="text"
                                value={newCustomerContact}
                                onChange={(e) =>
                                  setNewCustomerContact(e.target.value)
                                }
                                placeholder="שם מלא"
                                className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                אימייל
                              </label>
                              <input
                                type="email"
                                value={newCustomerEmail}
                                onChange={(e) =>
                                  setNewCustomerEmail(e.target.value)
                                }
                                placeholder="name@company.com"
                                className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                תאריך אספקה
                              </label>
                              <input
                                type="date"
                                value={deliveryDate}
                                onChange={(e) =>
                                  setDeliveryDate(e.target.value)
                                }
                                className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 2. System Selection */}
                      <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold uppercase text-blue-900 tracking-wider">
                            2. בחירת סוג מערכת (מגבילה אוטומטית את האפשרויות המותרות בשדות מטה)
                          </h3>
                          <span className="text-[11px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-medium">
                            מוגדר ע&quot;י מנהל המערכת
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 items-center">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              סוג מערכת (System Type)
                            </label>
                            <select
                              value={selectedSysId}
                              onChange={(e) =>
                                handleSelectSystemInForm(e.target.value)
                              }
                              className="w-full text-sm border border-blue-300 rounded-lg px-3 py-2 bg-white font-semibold"
                            >
                              {appState.systemTypes.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.id} – {s.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs bg-white p-2.5 rounded-lg border border-blue-100">
                            <div>
                              <span className="text-slate-400 block">
                                כמות ערוצים במערכת:
                              </span>
                              <span className="font-bold text-slate-800">
                                {selectedSysObj?.channels || 2} ערוצים
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">
                                כמות ספקי כוח:
                              </span>
                              <span className="font-bold text-slate-800">
                                {selectedSysObj?.psuCount || 1} ספקים
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 3. Technical Parameters */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                            3. דרישות מערכת (האפשרויות מסוננות לפי סוג המערכת שנבחר + אפשרות &quot;אחר&quot;)
                          </h3>
                          <span className="text-[11px] text-orange-700 bg-orange-100 px-2 py-0.5 rounded font-semibold">
                            בחירת &quot;אחר&quot; = סימון כתום לפיתוח
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          {/* Power */}
                          <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-slate-700">
                              הספק מערכת (רק הספקים מותרים למערכת זו)
                            </label>
                            <select
                              value={cfgPower}
                              onChange={(e) => setCfgPower(e.target.value)}
                              className={`w-full text-sm border rounded-lg px-3 py-2 bg-white ${
                                cfgPower === 'OTHER'
                                  ? 'border-orange-500 bg-orange-50 font-bold text-orange-900'
                                  : 'border-slate-300'
                              }`}
                            >
                              {(
                                selectedSysObj?.allowedPowers || [
                                  selectedSysObj?.power || '100W',
                                ]
                              ).map((v) => (
                                <option key={v} value={v}>
                                  {v} (מותר במערכת)
                                </option>
                              ))}
                              <option value="OTHER">
                                אחר (דרישה מיוחדת - יסומן בכתום)
                              </option>
                            </select>
                            {cfgPower === 'OTHER' && (
                              <div className="bg-orange-50 border-2 border-orange-400 rounded-lg p-2">
                                <label className="block text-[11px] font-bold text-orange-900 mb-1">
                                  פרט דרישת הספק מיוחדת (פיתוח):
                                </label>
                                <input
                                  type="text"
                                  value={cfgPowerOther}
                                  onChange={(e) =>
                                    setCfgPowerOther(e.target.value)
                                  }
                                  className="w-full text-xs border border-orange-300 rounded px-2.5 py-1.5 bg-white text-orange-950 font-semibold"
                                />
                              </div>
                            )}
                          </div>

                          {/* Focal */}
                          <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-slate-700">
                              אורך מוקד (רק אורכי מוקד מותרים למערכת זו)
                            </label>
                            <select
                              value={cfgFocal}
                              onChange={(e) => setCfgFocal(e.target.value)}
                              className={`w-full text-sm border rounded-lg px-3 py-2 bg-white ${
                                cfgFocal === 'OTHER'
                                  ? 'border-orange-500 bg-orange-50 font-bold text-orange-900'
                                  : 'border-slate-300'
                              }`}
                            >
                              {(
                                selectedSysObj?.allowedFocals || [
                                  selectedSysObj?.focal || '50mm',
                                ]
                              ).map((v) => (
                                <option key={v} value={v}>
                                  {v} (מותר במערכת)
                                </option>
                              ))}
                              <option value="OTHER">
                                אחר (דרישה מיוחדת - יסומן בכתום)
                              </option>
                            </select>
                            {cfgFocal === 'OTHER' && (
                              <div className="bg-orange-50 border-2 border-orange-400 rounded-lg p-2">
                                <label className="block text-[11px] font-bold text-orange-900 mb-1">
                                  פרט דרישת אורך מוקד מיוחדת (פיתוח):
                                </label>
                                <input
                                  type="text"
                                  value={cfgFocalOther}
                                  onChange={(e) =>
                                    setCfgFocalOther(e.target.value)
                                  }
                                  className="w-full text-xs border border-orange-300 rounded px-2.5 py-1.5 bg-white text-orange-950 font-semibold"
                                />
                              </div>
                            )}
                          </div>

                          {/* Voltage */}
                          <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-slate-700">
                              הזנת חשמל (רק מתחים מותרים למערכת זו)
                            </label>
                            <select
                              value={cfgVoltage}
                              onChange={(e) => setCfgVoltage(e.target.value)}
                              className={`w-full text-sm border rounded-lg px-3 py-2 bg-white ${
                                cfgVoltage === 'OTHER'
                                  ? 'border-orange-500 bg-orange-50 font-bold text-orange-900'
                                  : 'border-slate-300'
                              }`}
                            >
                              {(
                                selectedSysObj?.allowedVoltages || [
                                  selectedSysObj?.voltage || '230V AC',
                                ]
                              ).map((v) => (
                                <option key={v} value={v}>
                                  {v} (מותר במערכת)
                                </option>
                              ))}
                              <option value="OTHER">
                                אחר (דרישה מיוחדת - יסומן בכתום)
                              </option>
                            </select>
                            {cfgVoltage === 'OTHER' && (
                              <div className="bg-orange-50 border-2 border-orange-400 rounded-lg p-2">
                                <label className="block text-[11px] font-bold text-orange-900 mb-1">
                                  פרט דרישת הזנת חשמל מיוחדת (פיתוח):
                                </label>
                                <input
                                  type="text"
                                  value={cfgVoltageOther}
                                  onChange={(e) =>
                                    setCfgVoltageOther(e.target.value)
                                  }
                                  className="w-full text-xs border border-orange-300 rounded px-2.5 py-1.5 bg-white text-orange-950 font-semibold"
                                />
                              </div>
                            )}
                          </div>

                          {/* Env */}
                          <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-slate-700">
                              תנאי סביבה (רק תנאים מותרים למערכת זו)
                            </label>
                            <select
                              value={cfgEnv}
                              onChange={(e) => setCfgEnv(e.target.value)}
                              className={`w-full text-sm border rounded-lg px-3 py-2 bg-white ${
                                cfgEnv === 'OTHER'
                                  ? 'border-orange-500 bg-orange-50 font-bold text-orange-900'
                                  : 'border-slate-300'
                              }`}
                            >
                              {(
                                selectedSysObj?.allowedEnvs || [
                                  selectedSysObj?.env || 'IP54 מעבדה/פנים',
                                ]
                              ).map((v) => (
                                <option key={v} value={v}>
                                  {v} (מותר במערכת)
                                </option>
                              ))}
                              <option value="OTHER">
                                אחר (דרישה מיוחדת - יסומן בכתום)
                              </option>
                            </select>
                            {cfgEnv === 'OTHER' && (
                              <div className="bg-orange-50 border-2 border-orange-400 rounded-lg p-2">
                                <label className="block text-[11px] font-bold text-orange-900 mb-1">
                                  פרט דרישת תנאי סביבה מיוחדת (פיתוח):
                                </label>
                                <input
                                  type="text"
                                  value={cfgEnvOther}
                                  onChange={(e) =>
                                    setCfgEnvOther(e.target.value)
                                  }
                                  className="w-full text-xs border border-orange-300 rounded px-2.5 py-1.5 bg-white text-orange-950 font-semibold"
                                />
                              </div>
                            )}
                          </div>

                          {/* Usage */}
                          <div className="col-span-2 space-y-1.5">
                            <label className="block text-xs font-semibold text-slate-700">
                              שימוש מיועד (אזרחי / תעשייתי)
                            </label>
                            <select
                              value={cfgUsage}
                              onChange={(e) => setCfgUsage(e.target.value)}
                              className={`w-full text-sm border rounded-lg px-3 py-2 bg-white ${
                                cfgUsage === 'OTHER'
                                  ? 'border-orange-500 bg-orange-50 font-bold text-orange-900'
                                  : 'border-slate-300'
                              }`}
                            >
                              {(
                                selectedSysObj?.allowedUsages || [
                                  selectedSysObj?.usage || 'אזרחי',
                                ]
                              ).map((v) => (
                                <option key={v} value={v}>
                                  {v} (מותר במערכת)
                                </option>
                              ))}
                              <option value="OTHER">
                                אחר (דרישה מיוחדת - יסומן בכתום)
                              </option>
                            </select>
                            {cfgUsage === 'OTHER' && (
                              <div className="bg-orange-50 border-2 border-orange-400 rounded-lg p-2">
                                <label className="block text-[11px] font-bold text-orange-900 mb-1">
                                  פרט דרישת שימוש מיוחדת (פיתוח):
                                </label>
                                <input
                                  type="text"
                                  value={cfgUsageOther}
                                  onChange={(e) =>
                                    setCfgUsageOther(e.target.value)
                                  }
                                  className="w-full text-xs border border-orange-300 rounded px-2.5 py-1.5 bg-white text-orange-950 font-semibold"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Left Column: Live Preview */}
                    <div className="col-span-5 flex flex-col justify-between bg-slate-900 text-white rounded-xl p-5 border border-slate-700">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                          <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                            תצוגה מקדימה: גזירת BOM דינמית מהקטלוג
                          </span>
                          {previewBom.some((b) => b.isCustom) ? (
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-500 text-white font-bold">
                              סטטוס צפוי: ממתין לפיתוח
                            </span>
                          ) : (
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-bold">
                              סטטוס צפוי: ממתין לאישור
                            </span>
                          )}
                        </div>

                        <div className="space-y-2 text-xs max-h-96 overflow-y-auto pr-1">
                          {/* Root System in Preview */}
                          <div className="p-2.5 rounded-lg flex justify-between items-center bg-blue-950/80 border border-blue-700">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={getItemImageUrl(
                                  selectedSysObj?.id || 'SYS-STD-100',
                                  null,
                                  false
                                )}
                                alt={selectedSysObj?.name || 'מערכת'}
                                className="w-10 h-8 object-cover rounded border border-blue-500 bg-white"
                              />
                              <div>
                                <span className="font-bold text-blue-300">
                                  🖥️ [מערכת על (Root)]
                                </span>{' '}
                                <span className="text-white font-semibold">
                                  {selectedSysObj?.name || 'מערכת אופטית'}
                                </span>
                                <div className="text-[11px] text-blue-300/80 font-mono">
                                  מק&quot;ט: {selectedSysObj?.id} (Rev A) | {selectedSysObj?.channels || 2} ערוצים, {selectedSysObj?.psuCount || 1} ספקים
                                </div>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                              מערכת בסיס
                            </span>
                          </div>

                          {previewBom.map((b) => (
                            <div
                              key={b.id}
                              className={`p-2.5 rounded-lg flex justify-between items-center ${
                                b.level === 'sub-assembly' ? 'mr-4' : ''
                              } ${
                                b.isCustom
                                  ? 'bg-orange-500/20 border-2 border-orange-500 text-orange-200'
                                  : 'bg-slate-800 border border-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={getItemImageUrl(
                                    b.sku,
                                    b.customImg,
                                    b.isCustom
                                  )}
                                  alt={b.desc}
                                  className="w-10 h-8 object-cover rounded border border-slate-600"
                                />
                                <div>
                                  <span
                                    className={`font-bold ${
                                      b.isCustom
                                        ? 'text-orange-300'
                                        : 'text-blue-300'
                                    }`}
                                  >
                                    {b.level === 'sub-assembly' ? '↳ ' : '📦 '}
                                    [{b.category}]
                                  </span>{' '}
                                  {b.desc}
                                  <div className="text-[11px] text-slate-400 font-mono">
                                    מק&quot;ט: {b.sku} ({b.rev}) | כמות: {b.qty}
                                  </div>
                                </div>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                  b.isCustom
                                    ? 'bg-orange-500 text-white'
                                    : b.selectionType.includes('רכש')
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                                    : 'bg-emerald-500/20 text-emerald-300'
                                }`}
                              >
                                {b.isCustom ? 'פיתוח (כתום)' : b.selectionType}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-700 flex items-center justify-between gap-3 mt-4">
                        <div className="text-[11px] text-slate-400">
                          בלחיצה על &quot;צור הזמנה&quot; ייבנה BOM היררכי מלא (מכלולים פעילים בלבד) ויוצג עץ המוצר.
                        </div>
                        <button
                          type="button"
                          onClick={handleCreateNewOrder}
                          className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-lg transition shrink-0"
                        >
                          🚀 צור הזמנה ובנה BOM
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* =================================================================
                SCREEN 3: ORDER DETAIL + HIERARCHICAL BOM TABLE + VISUAL TREE
               ================================================================= */}
            {activeScreen === 'detail' && currentOrder && (
              <section className="space-y-5">
                {/* Order Summary Banner */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setActiveScreen('list')}
                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-1.5 rounded-lg transition"
                      >
                        ➔ חזרה לרשימת ההזמנות
                      </button>
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h2 className="text-lg font-bold text-slate-900">
                            הזמנה {currentOrder.id} – {currentOrder.customer}
                          </h2>
                          <span className={getStatusBadge(currentOrder.status)}>
                            {currentOrder.status}
                          </span>
                          {currentOrder.locked && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-white">
                              🔒 נעול לעריכה
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          מערכת: <strong>{currentOrder.systemName}</strong> (
                          {currentOrder.systemTypeId}) • איש קשר:{' '}
                          {currentOrder.contact}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons + Excel Export */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* View Toggle */}
                      <div className="bg-slate-100 p-1 rounded-lg border border-slate-200 flex items-center text-xs">
                        <button
                          type="button"
                          onClick={() => setBomSubView('both')}
                          className={`px-2.5 py-1 rounded-md font-semibold ${
                            bomSubView === 'both'
                              ? 'bg-white shadow-sm text-blue-600'
                              : 'text-slate-600'
                          }`}
                        >
                          טבלה + עץ מוצר
                        </button>
                        <button
                          type="button"
                          onClick={() => setBomSubView('table')}
                          className={`px-2.5 py-1 rounded-md font-semibold ${
                            bomSubView === 'table'
                              ? 'bg-white shadow-sm text-blue-600'
                              : 'text-slate-600'
                          }`}
                        >
                          טבלת BOM בלבד
                        </button>
                        <button
                          type="button"
                          onClick={() => setBomSubView('tree')}
                          className={`px-2.5 py-1 rounded-md font-semibold ${
                            bomSubView === 'tree'
                              ? 'bg-white shadow-sm text-blue-600'
                              : 'text-slate-600'
                          }`}
                        >
                          עץ מוצר ויזואלי בלבד
                        </button>
                      </div>

                      {/* EXCEL EXPORT BUTTON */}
                      <button
                        type="button"
                        onClick={() =>
                          exportOrderBomToExcel(currentOrder, currentOrderBom)
                        }
                        className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-sm transition flex items-center gap-1.5"
                      >
                        <span>📊</span>
                        <span>ייצוא BOM ל-Excel</span>
                      </button>

                      {/* Approve Order (Procurement / Manager) */}
                      {(role === 'procurement' || role === 'manager') &&
                        !currentOrder.locked &&
                        currentOrder.status !== 'מאושר' &&
                        currentOrder.status !== 'סגורה' &&
                        currentOrder.status !== 'מבוטלת' && (
                          <button
                            type="button"
                            onClick={handleApproveAndLockOrder}
                            className={`${
                              unlockedBomRows.length > 0
                                ? 'bg-amber-600 hover:bg-amber-700'
                                : 'bg-emerald-600 hover:bg-emerald-700'
                            } text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition flex items-center gap-1.5`}
                          >
                            {unlockedBomRows.length > 0 ? (
                              <>
                                <span>⚠️</span>
                                <span>
                                  אישור הזמנה חסום ({unlockedBomRows.length}{' '}
                                  שורות לא נעולות)
                                </span>
                              </>
                            ) : (
                              <>
                                <span>✓</span>
                                <span>אישור הזמנה (נעילת BOM)</span>
                              </>
                            )}
                          </button>
                        )}

                      {/* Close Approved Order */}
                      {(role === 'procurement' || role === 'manager') &&
                        currentOrder.status === 'מאושר' && (
                          <button
                            type="button"
                            onClick={handleCloseApprovedOrder}
                            className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition flex items-center gap-1.5"
                          >
                            <span>📦</span>
                            <span>סגירת הזמנה (העבר לסגורה)</span>
                          </button>
                        )}

                      {/* Unlock Order (Manager) */}
                      {role === 'manager' &&
                        currentOrder.locked &&
                        currentOrder.status !== 'מבוטלת' && (
                          <button
                            type="button"
                            onClick={handleUnlockOrderByManager}
                            className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-sm transition flex items-center gap-1.5"
                          >
                            <span>🔓</span>
                            <span>פתיחת נעילה (מנהל)</span>
                          </button>
                        )}

                      {/* Cancel Order (Sales / Manager) */}
                      {(role === 'sales' || role === 'manager') &&
                        currentOrder.status !== 'מבוטלת' &&
                        currentOrder.status !== 'סגורה' && (
                          <button
                            type="button"
                            onClick={handleCancelOrder}
                            className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-sm transition flex items-center gap-1.5"
                          >
                            <span>✕</span>
                            <span>ביטול הזמנה</span>
                          </button>
                        )}
                    </div>
                  </div>

                  {/* Specs Summary Grid */}
                  <div className="grid grid-cols-7 gap-3 pt-4 text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <span className="text-slate-400 block">הספק מערכת</span>
                      <span
                        className={`font-bold ${
                          currentOrder.power.includes('אחר')
                            ? 'text-orange-700'
                            : 'text-slate-800'
                        }`}
                      >
                        {currentOrder.power}
                      </span>
                    </div>
                    <div
                      className={`p-2.5 rounded-lg border ${
                        currentOrder.focal.includes('אחר')
                          ? 'bg-orange-50 border-orange-300'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <span className="text-slate-400 block">אורך מוקד</span>
                      <span
                        className={`font-bold ${
                          currentOrder.focal.includes('אחר')
                            ? 'text-orange-800'
                            : 'text-slate-800'
                        }`}
                      >
                        {currentOrder.focal}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <span className="text-slate-400 block">הזנת חשמל</span>
                      <span className="font-bold text-slate-800">
                        {currentOrder.voltage}
                      </span>
                    </div>
                    <div
                      className={`p-2.5 rounded-lg border ${
                        currentOrder.env.includes('אחר')
                          ? 'bg-orange-50 border-orange-300'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <span className="text-slate-400 block">תנאי סביבה</span>
                      <span
                        className={`font-bold ${
                          currentOrder.env.includes('אחר')
                            ? 'text-orange-800'
                            : 'text-slate-800'
                        }`}
                      >
                        {currentOrder.env}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <span className="text-slate-400 block">שימוש</span>
                      <span className="font-bold text-slate-800">
                        {currentOrder.usage}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <span className="text-slate-400 block">
                        ערוצים / ספקים
                      </span>
                      <span className="font-bold text-slate-800">
                        {currentOrder.channels} ערוצים / {currentOrder.psuCount}{' '}
                        ספקים
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <span className="text-slate-400 block">תאריך אספקה</span>
                      <span className="font-bold text-blue-700">
                        {currentOrder.deliveryDate}
                      </span>
                    </div>
                  </div>

                  {/* Order Metadata Bar */}
                  <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50/80 px-3.5 py-2 rounded-lg border border-slate-200">
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="font-bold text-slate-700">
                        📋 Metadata הזמנה:
                      </span>
                      <span>
                        👤 נפתחה ע&quot;י:{' '}
                        <strong className="text-slate-900">
                          {currentOrder.createdBy}
                        </strong>
                      </span>
                      <span>
                        🕒 מועד פתיחה:{' '}
                        <strong className="font-mono text-slate-900">
                          {currentOrder.createdAt}
                        </strong>
                      </span>
                      <span>
                        ✏️ עודכנה לאחרונה ע&quot;י:{' '}
                        <strong className="text-blue-800">
                          {currentOrder.updatedBy}
                        </strong>
                      </span>
                      <span>
                        ⏱️ מועד עדכון אחרון:{' '}
                        <strong className="font-mono text-blue-800">
                          {currentOrder.updatedAt}
                        </strong>
                      </span>
                    </div>
                    <div className="text-[11px] font-semibold">
                      {unlockedBomRows.length > 0 ? (
                        <span className="text-amber-700 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full">
                          🔓 {unlockedBomRows.length} שורות BOM טרם ננעלו (נדרשת נעילה לפני אישור הזמנה)
                        </span>
                      ) : (
                        <span className="text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                          🔒 כל שורות ה-BOM נעולות ומוכנות לאישור הזמנה
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* HIERARCHICAL BOM TABLE */}
                {(bomSubView === 'both' || bomSubView === 'table') && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">📑</span>
                        <h3 className="font-bold text-sm text-slate-800">
                          טבלת BOM היררכית (מכלולים ראשיים ותתי-מכלולים)
                        </h3>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded bg-orange-500 inline-block"></span>
                          <span className="font-semibold text-orange-800">
                            כתום = דרישה מיוחדת (פיתוח)
                          </span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded bg-red-500 inline-block"></span>
                          <span className="font-semibold text-red-800">
                            הוסר = סומן כ&quot;הוסר&quot; ע&quot;י רכש (נשמר ב-BOM ובייצוא Excel)
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-sm">
                        <thead className="bg-slate-100 text-slate-600 text-xs uppercase border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">תמונה</th>
                            <th className="py-2.5 px-3">קטגוריה / רמה</th>
                            <th className="py-2.5 px-3">מק&quot;ט ו-Rev</th>
                            <th className="py-2.5 px-3">תיאור מכלול / רכיב</th>
                            <th className="py-2.5 px-3 text-center">כמות</th>
                            <th className="py-2.5 px-3">אופן בחירה</th>
                            <th className="py-2.5 px-3">
                              חלופה נבחרת / הגדרת פריט
                            </th>
                            <th className="py-2.5 px-3 text-center">
                              סטטוס נעילה
                            </th>
                            <th className="py-2.5 px-3">
                              Metadata (מי ערך ומתי)
                            </th>
                            <th className="py-2.5 px-3 text-center">
                              פעולות (רכש / פיתוח / מנהל)
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-xs">
                          {/* 0. Root System Level 0 Row (חלק בלתי נפרד מה-BOM) */}
                          <tr className="bg-blue-50/70 border-b-2 border-blue-200 hover:bg-blue-100/60 font-medium">
                            <td className="py-2.5 px-3">
                              <img
                                src={getItemImageUrl(
                                  currentOrder.systemTypeId || 'SYS-STD-100',
                                  null,
                                  false
                                )}
                                alt={currentOrder.systemName}
                                className="w-16 h-11 object-cover rounded border border-blue-300 shadow-sm bg-white"
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-extrabold text-blue-900 flex items-center gap-1.5">
                                <span>🖥️</span>
                                <span>מערכת על (Root / Level 0)</span>
                              </div>
                              <span className="inline-block mt-0.5 text-[10px] bg-blue-200 text-blue-900 px-2 py-0.5 rounded font-bold">
                                מערכת בסיס ראשית
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-blue-900">
                              <div>{currentOrder.systemTypeId || 'SYS-STD-100'}</div>
                              <span className="text-[10px] bg-blue-100 border border-blue-300 px-1.5 py-0.5 rounded text-blue-700">
                                Rev A
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">
                              <div>{currentOrder.systemName}</div>
                              <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                                {currentOrder.channels} ערוצים • {currentOrder.psuCount} ספקי כוח • סוג שימוש: {currentOrder.usage}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-blue-900">
                              1
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="bg-blue-100 text-blue-900 border border-blue-300 px-2 py-0.5 rounded-md font-bold text-[11px]">
                                מערכת שלמה
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              {currentOrder.systemName}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-700">
                                🔒 קבוע
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-[11px] text-slate-600">
                              <div className="font-semibold text-slate-800">
                                👤 {currentOrder.createdBy}
                              </div>
                              <div className="text-slate-400 font-mono">
                                🕒 {currentOrder.createdAt}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center text-slate-400">
                              -
                            </td>
                          </tr>

                          {currentOrderBom.map((b) => {
                            const isSub = b.level === 'sub-assembly';
                            const isRemoved = b.removed === true;
                            const isFinalApproved =
                              currentOrder.status === 'מאושר' ||
                              currentOrder.status === 'סגורה' ||
                              currentOrder.status === 'מבוטלת';
                            const canEditRow =
                              (role === 'procurement' || role === 'manager') &&
                              !isFinalApproved &&
                              !currentOrder.locked;
                            const canDev =
                              (role === 'dev' ||
                                role === 'manager' ||
                                role === 'procurement') &&
                              !currentOrder.locked &&
                              !isFinalApproved;

                            // Compatible active options for row dropdown
                            const compatibleCatRules =
                              appState.catalogRules.filter((r) => {
                                if (r.active === false) return false;
                                if (r.category !== b.category) return false;
                                if (b.level === 'assembly')
                                  return r.parentSku === 'ROOT';
                                return r.parentSku !== 'ROOT';
                              });

                            const optionList = Array.from(
                              new Set([
                                ...b.alternatives,
                                ...compatibleCatRules.map(
                                  (r) =>
                                    `${r.sku} – ${r.desc} (${r.rev || 'Rev A'})`
                                ),
                              ])
                            );

                            const rowClass = isRemoved
                              ? 'bg-red-50/60 opacity-75'
                              : b.isCustom
                              ? 'custom-orange-row'
                              : isSub
                              ? 'sub-assembly-row hover:bg-slate-100/80'
                              : 'hover:bg-slate-50';

                            return (
                              <tr key={b.id} className={rowClass}>
                                <td className="py-3 px-3">
                                  <img
                                    src={getItemImageUrl(
                                      b.sku,
                                      b.customImg,
                                      b.isCustom
                                    )}
                                    alt={b.desc}
                                    className="w-16 h-11 object-cover rounded border border-slate-200 shadow-sm"
                                  />
                                </td>
                                <td className="py-3 px-3">
                                  <div className="font-bold text-slate-800">
                                    {b.category}
                                  </div>
                                  {isSub ? (
                                    <span className="inline-block mt-0.5 text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-medium">
                                      ↳ תת-מכלול (בן)
                                    </span>
                                  ) : (
                                    <span className="inline-block mt-0.5 text-[11px] bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded font-bold">
                                      מכלול ראשי (אב)
                                    </span>
                                  )}
                                </td>
                                <td
                                  className={`py-3 px-3 font-mono font-bold ${
                                    isRemoved
                                      ? 'line-through text-red-700'
                                      : b.isCustom
                                      ? 'text-orange-900'
                                      : 'text-slate-800'
                                  }`}
                                >
                                  <div>{b.sku}</div>
                                  <span className="text-[10px] bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-600">
                                    {b.rev}
                                  </span>
                                </td>
                                <td
                                  className={`py-3 px-3 ${
                                    isSub ? 'pr-6' : ''
                                  } ${
                                    isRemoved
                                      ? 'line-through text-red-800'
                                      : b.isCustom
                                      ? 'font-bold text-orange-950'
                                      : 'font-medium text-slate-900'
                                  }`}
                                >
                                  {isSub ? '↳ ' : ''}
                                  {b.desc}
                                  {isRemoved && (
                                    <span className="mr-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white">
                                      🚫 הוסר
                                    </span>
                                  )}
                                  {b.inactiveSource && (
                                    <span className="mr-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                                      ⏸️ מכלול לא פעיל (מוצג בהזמנה קיימת)
                                    </span>
                                  )}
                                  <div className="text-[11px] text-slate-500 mt-0.5">
                                    {b.notes}
                                  </div>
                                </td>
                                <td
                                  className={`py-3 px-3 text-center font-bold ${
                                    isRemoved
                                      ? 'line-through text-red-700'
                                      : ''
                                  }`}
                                >
                                  {b.qty}
                                </td>
                                <td className="py-3 px-3">
                                  {isRemoved ? (
                                    <span className="bg-red-100 text-red-800 border border-red-300 px-2 py-0.5 rounded-md font-bold text-[11px]">
                                      🚫 הוסר ע&quot;י רכש
                                    </span>
                                  ) : b.isCustom ? (
                                    <span className="custom-orange-badge px-2 py-0.5 rounded-md font-bold text-[11px]">
                                      ⚠️ {b.selectionType}
                                    </span>
                                  ) : b.selectionType.includes('רכש') ? (
                                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                                      {b.selectionType}
                                    </span>
                                  ) : (
                                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium text-[11px]">
                                      {b.selectionType}
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3">
                                  {isRemoved ? (
                                    <span className="text-red-700 font-bold line-through">
                                      {b.selectedAlt} (הוסר)
                                    </span>
                                  ) : canEditRow &&
                                    !b.isCustom &&
                                    b.rowEditing ? (
                                    <div className="flex items-center gap-1.5">
                                      <select
                                        value={b.selectedAlt}
                                        onChange={(e) =>
                                          handleChangeBomAlternative(
                                            b.id,
                                            e.target.value
                                          )
                                        }
                                        className="border-2 border-blue-500 rounded-lg px-2.5 py-1.5 bg-white text-xs font-bold text-slate-900 shadow-sm"
                                      >
                                        {optionList.map((opt) => (
                                          <option key={opt} value={opt}>
                                            {opt}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5">
                                      <span
                                        className={
                                          b.isCustom
                                            ? 'text-orange-900 font-bold'
                                            : 'text-slate-800 font-semibold'
                                        }
                                      >
                                        {b.selectedAlt}
                                      </span>
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  {isRemoved ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-300">
                                      🚫 הוסר
                                    </span>
                                  ) : b.rowLocked &&
                                    !b.rowEditing &&
                                    !b.isCustom ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                      🔒 נעול
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                      🔓 פתוח לעריכה
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-[11px] text-slate-600">
                                  <div className="font-semibold text-slate-800">
                                    👤 {b.lastEditedBy}
                                  </div>
                                  <div className="text-slate-400 font-mono">
                                    🕒 {b.lastEditedAt}
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  {isFinalApproved || currentOrder.locked ? (
                                    <span className="text-slate-400 font-medium">
                                      🔒 הזמנה מאושרת/נעולה
                                    </span>
                                  ) : isRemoved ? (
                                    canEditRow ? (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleToggleRemoveBomRow(b.id)
                                        }
                                        className="bg-slate-700 hover:bg-slate-800 text-white px-2.5 py-1 rounded-lg font-bold text-xs shadow-sm"
                                      >
                                        ↩️ בטל הסרה
                                      </button>
                                    ) : (
                                      <span className="text-red-700 font-bold">
                                        🚫 הוסר
                                      </span>
                                    )
                                  ) : b.isCustom ? (
                                    <div className="flex items-center justify-center gap-1">
                                      {canDev ? (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleOpenCustomModal(b.id)
                                          }
                                          className="bg-orange-600 hover:bg-orange-700 text-white px-2.5 py-1 rounded-lg font-bold text-xs shadow-sm"
                                        >
                                          🔧 הגדר מק&quot;ט פיתוח / בחר מכלול
                                        </button>
                                      ) : (
                                        <span className="text-orange-700 font-semibold">
                                          ממתין לפיתוח
                                        </span>
                                      )}
                                      {canEditRow && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleToggleRemoveBomRow(b.id)
                                          }
                                          className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-2 py-1 rounded-lg font-bold text-[11px]"
                                        >
                                          🚫 סמן כהוסר
                                        </button>
                                      )}
                                    </div>
                                  ) : canEditRow ? (
                                    <div className="flex items-center justify-center gap-1">
                                      {b.rowEditing ? (
                                        <button
                                          type="button"
                                          onClick={() => handleLockBomRow(b.id)}
                                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg font-bold text-xs shadow-sm"
                                        >
                                          🔒 אשר בחירה ונעל שורה
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleOpenRowEdit(b.id)
                                          }
                                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg font-bold text-xs"
                                        >
                                          ✏️ ערוך שורה
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleToggleRemoveBomRow(b.id)
                                        }
                                        className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-2 py-1 rounded-lg font-bold text-[11px]"
                                      >
                                        🚫 סמן כהוסר
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-emerald-700 font-bold">
                                      ✓ מאושר
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* VISUAL PRODUCT TREE */}
                {(bomSubView === 'both' || bomSubView === 'tree') && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🌳</span>
                        <div>
                          <h3 className="font-bold text-sm text-slate-800">
                            עץ מוצר ויזואלי עם ענפים ותמונות מכלולים מוגדלות
                          </h3>
                          <p className="text-xs text-slate-500">
                            מערכת ראשית ⬅ קטגוריות ⬅ מכלולים ⬅ תתי-מכלולים (מתעדכן אוטומטית עם כל שינוי בשורת ה-BOM)
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-slate-500">
                        תמונות מתוך{' '}
                        <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                          /public/images/assemblies/
                        </code>
                      </span>
                    </div>

                    <VisualProductTree
                      order={currentOrder}
                      bomRows={currentOrderBom}
                      systemTypes={appState.systemTypes}
                      catalogRules={appState.catalogRules}
                      onOpenCustomModal={handleOpenCustomModal}
                    />
                  </div>
                )}

                {/* Custom Dev Item Modal */}
                {customModalRowId && (
                  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border-2 border-orange-400 shadow-2xl max-w-lg w-full p-6 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                          <h3 className="font-bold text-base text-slate-900">
                            הגדרת פריט לשורת פיתוח (Custom) ב-BOM
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCustomModalRowId(null)}
                          className="text-slate-400 hover:text-slate-600 font-bold text-sm"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                          <button
                            type="button"
                            onClick={() => setCustomModalMode('existing')}
                            className={`py-2 px-3 rounded-lg font-bold transition ${
                              customModalMode === 'existing'
                                ? 'bg-white text-blue-700 shadow-sm'
                                : 'text-slate-600'
                            }`}
                          >
                            1. בחירת מכלול קיים לפי הקטגוריה
                          </button>
                          <button
                            type="button"
                            onClick={() => setCustomModalMode('new')}
                            className={`py-2 px-3 rounded-lg font-bold transition ${
                              customModalMode === 'new'
                                ? 'bg-white text-blue-700 shadow-sm'
                                : 'text-slate-600'
                            }`}
                          >
                            2. הקמת מק&quot;ט פיתוח חדש
                          </button>
                        </div>

                        {customModalMode === 'existing' ? (
                          <div className="space-y-2 pt-1">
                            <label className="block font-bold text-slate-700">
                              בחר מכלול קיים מתוך הקטגוריה של השורה:
                            </label>
                            <select
                              value={customModalSelectedSku}
                              onChange={(e) =>
                                setCustomModalSelectedSku(e.target.value)
                              }
                              className="w-full border border-blue-300 rounded-lg px-3 py-2 text-xs bg-white font-semibold"
                            >
                              {appState.catalogRules
                                .filter((r) => {
                                  const row = currentOrderBom.find(
                                    (b) => b.id === customModalRowId
                                  );
                                  return (
                                    r.active !== false &&
                                    (!row || r.category === row.category)
                                  );
                                })
                                .map((r) => (
                                  <option key={r.sku} value={r.sku}>
                                    {r.sku} ({r.rev || 'Rev A'}) – {r.desc}
                                  </option>
                                ))}
                            </select>
                          </div>
                        ) : (
                          <div className="space-y-2 pt-1">
                            <div className="grid grid-cols-3 gap-2">
                              <div className="col-span-2">
                                <label className="block font-semibold text-slate-700 mb-1">
                                  מק&quot;ט פיתוח חדש (SKU)
                                </label>
                                <input
                                  type="text"
                                  value={customModalNewSku}
                                  onChange={(e) =>
                                    setCustomModalNewSku(e.target.value)
                                  }
                                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono font-bold bg-white"
                                />
                              </div>
                              <div>
                                <label className="block font-semibold text-slate-700 mb-1">
                                  מהדורה (Rev)
                                </label>
                                <input
                                  type="text"
                                  value={customModalNewRev}
                                  onChange={(e) =>
                                    setCustomModalNewRev(e.target.value)
                                  }
                                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono bg-white"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block font-semibold text-slate-700 mb-1">
                                תיאור המכלול החדש
                              </label>
                              <input
                                type="text"
                                value={customModalNewDesc}
                                onChange={(e) =>
                                  setCustomModalNewDesc(e.target.value)
                                }
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={() => setCustomModalRowId(null)}
                          className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                        >
                          ביטול
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmCustomSku}
                          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow"
                        >
                          ✓ אשר ושבץ ב-BOM ובעץ המוצר
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* =================================================================
                SCREEN 4: SYSTEM ADMIN
               ================================================================= */}
            {activeScreen === 'admin' && (
              <AdminDashboard
                categories={appState.categories}
                systemTypes={appState.systemTypes}
                catalogRules={appState.catalogRules}
                compatLinks={appState.compatLinks}
                recycleBin={appState.recycleBin}
                users={usersList}
                currentUserLabel={currentUserLabel}
                onUpdateState={(partial) => {
                  const nextState = { ...appState, ...partial };
                  persistState(nextState);
                  if (partial.users) {
                    const updatedMe = partial.users.find(
                      (u) =>
                        u.email.toLowerCase() === activeUserEmail.toLowerCase()
                    );
                    if (updatedMe && updatedMe.role !== role) {
                      setRole(updatedMe.role);
                    }
                  }
                }}
                onGoToNewOrder={() => setActiveScreen('new')}
                onSelectActiveUser={(u) => {
                  setActiveUserEmail(u.email);
                  setRole(u.role);
                  setAuthBannerMsg(
                    `התחברת כ-${u.fullName} (${u.email}) בתפקיד: ${ROLE_LABELS_HE[u.role]}`
                  );
                }}
              />
            )}
          </>
        )}

        {/* Google Sign-In Modal */}
        {googleModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-300 shadow-2xl max-w-md w-full p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center text-sm shadow">
                    G
                  </span>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">
                      התחברות באמצעות חשבון Google
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      משתמש חדש שנכנס לראשונה מוגדר אוטומטית כ&quot;צופה&quot; (Viewer)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setGoogleModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-sm"
                >
                  ✕
                </button>
              </div>

              {isSupabaseConfigured && (
                <button
                  type="button"
                  onClick={() => signInWithGoogleOAuth()}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow flex items-center justify-center gap-2 transition"
                >
                  <span className="bg-white text-blue-600 font-extrabold px-1.5 py-0.2 rounded">
                    G
                  </span>
                  <span>התחבר עם Google OAuth (Supabase Auth)</span>
                </button>
              )}

              {/* Sign in with any new or existing Google account */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
                <div className="font-bold text-slate-800">
                  התחברות עם חשבון Google (חדש או קיים):
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">
                    כתובת Gmail / Google Workspace *
                  </label>
                  <input
                    type="email"
                    value={googleInputEmail}
                    onChange={(e) => setGoogleInputEmail(e.target.value)}
                    placeholder="your.name@gmail.com"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">
                    שם מלא (למשתמש חדש)
                  </label>
                  <input
                    type="text"
                    value={googleInputName}
                    onChange={(e) => setGoogleInputName(e.target.value)}
                    placeholder="למשל: שירה כהן"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleGoogleSignIn(googleInputEmail, googleInputName)
                  }
                  className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow flex items-center justify-center gap-2 transition"
                >
                  <span className="text-blue-400 font-extrabold">G</span>
                  <span>היכנס עם חשבון Google זה</span>
                </button>
              </div>

              {/* Quick Switch to Existing Registered Google Users */}
              <div className="space-y-2 text-xs">
                <div className="font-bold text-slate-600">
                  או בחר מתוך חשבונות Google הרשומים במערכת:
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {usersList
                    .filter((u) => u.active)
                    .map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleGoogleSignIn(u.email, u.fullName)}
                        className={`w-full text-right p-2.5 rounded-xl border flex items-center justify-between transition ${
                          u.email.toLowerCase() ===
                          activeUserEmail.toLowerCase()
                            ? 'bg-blue-50 border-blue-400'
                            : 'bg-white hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                            {u.fullName.charAt(0)}
                          </span>
                          <div>
                            <div className="font-bold text-slate-900">
                              {u.fullName}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500">
                              {u.email}
                            </div>
                          </div>
                        </div>
                        <span className="text-[11px] font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded-full border border-slate-300">
                          {ROLE_LABELS_HE[u.role]}
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export type RoleType = 'sales' | 'procurement' | 'dev' | 'viewer' | 'manager';

export type OrderStatus =
  | 'ממתין לאישור'
  | 'מאושר'
  | 'ממתין לפיתוח'
  | 'סגורה'
  | 'בטיפול'
  | 'מבוטלת';

export type ImgType = 'optics' | 'power' | 'board' | 'sensor' | 'custom';

export interface SystemType {
  id: string;
  name: string;
  allowedPowers: string[];
  allowedFocals: string[];
  allowedVoltages: string[];
  allowedEnvs: string[];
  allowedUsages: string[];
  power: string;
  voltage: string;
  channels: number;
  psuCount: number;
  focal: string;
  env: string;
  usage: string;
  active: boolean;
  customImg: string | null;
  catQty: Record<string, number>;
}

export interface CatalogRule {
  sku: string;
  rev: string;
  desc: string;
  category: string;
  parentSku: string; // 'ROOT' or parent SKU
  matchPower: string[];
  matchFocal: string[];
  matchVoltage: string[];
  matchEnv: string[];
  matchUsage: string[];
  cost: string;
  imgType: ImgType;
  customImg: string | null;
  active?: boolean;
}

export interface CompatLink {
  c1: string;
  c2List: string[];
  note: string;
}

export interface BomRow {
  id: string;
  category: string;
  level: 'assembly' | 'sub-assembly';
  parentId: string | null;
  sku: string;
  rev: string;
  desc: string;
  qty: number;
  selectionType: string;
  alternatives: string[];
  selectedAlt: string;
  isCustom: boolean;
  approved: boolean;
  rowLocked: boolean;
  rowEditing: boolean;
  removed: boolean;
  inactiveSource?: boolean;
  lastEditedBy: string;
  lastEditedAt: string;
  notes: string;
  imgType: ImgType;
  customImg?: string | null;
}

export interface Order {
  id: string;
  customer: string;
  contact: string;
  email?: string;
  phone?: string;
  systemTypeId: string;
  systemName: string;
  deliveryDate: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  power: string;
  focal: string;
  voltage: string;
  env: string;
  usage: string;
  channels: number;
  psuCount: number;
  status: OrderStatus;
  locked: boolean;
  bom?: BomRow[];
}

export interface RecycleBinItem {
  recycleId: string;
  itemType: 'assembly' | 'system';
  skuOrId: string;
  rev: string;
  name: string;
  categoryOrDetails: string;
  deletedBy: string;
  deletedAt: string;
  deleteReason: string;
  payload: CatalogRule | SystemType;
}

export interface AppUser {
  id: string;
  email: string;
  username?: string;
  password?: string;
  fullName: string;
  avatarUrl?: string;
  role: RoleType;
  provider: 'google' | 'local';
  active: boolean;
  createdAt: string;
  lastSignInAt: string;
  updatedBy?: string;
}

export interface Customer {
  id: string;
  name: string;
  contact: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ConfiguratorState {
  categories: string[];
  systemTypes: SystemType[];
  catalogRules: CatalogRule[];
  compatLinks: CompatLink[];
  orders: Order[];
  recycleBin: RecycleBinItem[];
  users?: AppUser[];
  customers?: Customer[];
}



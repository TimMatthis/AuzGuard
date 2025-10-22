import { ProductAccessGroup, ProductKey } from '../types';

const LS_GROUPS_KEY = 'auzguard_product_access_groups';
const LS_ASSIGN_KEY = 'auzguard_product_access_assignments'; // map: userGroupId -> productAccessGroupId

type Assignments = Record<string, string | undefined>;

export const ALL_PRODUCTS: { key: ProductKey; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'policies', label: 'Policies & Rules' },
  { key: 'simulator', label: 'Simulator' },
  { key: 'audit', label: 'Audit Log' },
  { key: 'routing_config', label: 'Routing Config' },
  { key: 'models', label: 'Model Gardens' },
  { key: 'decisions', label: 'Decision Tree' },
  { key: 'chat', label: 'Chat Router' },
  { key: 'chat_ui', label: 'Chat User Interface' },
  { key: 'user_groups', label: 'User Groups' },
  { key: 'settings', label: 'Settings' },
];

function readGroups(): ProductAccessGroup[] {
  try {
    const raw = localStorage.getItem(LS_GROUPS_KEY);
    return raw ? (JSON.parse(raw) as ProductAccessGroup[]) : [];
  } catch {
    return [];
  }
}

function writeGroups(groups: ProductAccessGroup[]) {
  localStorage.setItem(LS_GROUPS_KEY, JSON.stringify(groups));
}

function readAssignments(): Assignments {
  try {
    const raw = localStorage.getItem(LS_ASSIGN_KEY);
    return raw ? (JSON.parse(raw) as Assignments) : {};
  } catch {
    return {};
  }
}

function writeAssignments(assign: Assignments) {
  localStorage.setItem(LS_ASSIGN_KEY, JSON.stringify(assign));
}

export const productAccess = {
  list(): ProductAccessGroup[] {
    return readGroups();
  },
  get(id: string): ProductAccessGroup | undefined {
    return readGroups().find(g => g.id === id);
  },
  create(name: string, description: string | undefined, products: ProductKey[]): ProductAccessGroup {
    const now = new Date().toISOString();
    const group: ProductAccessGroup = {
      id: `pag_${Date.now()}`,
      name,
      description,
      products,
      created_at: now,
      updated_at: now,
    };
    const groups = readGroups();
    groups.push(group);
    writeGroups(groups);
    return group;
  },
  update(id: string, patch: Partial<Omit<ProductAccessGroup, 'id' | 'created_at'>>): ProductAccessGroup | undefined {
    const groups = readGroups();
    const idx = groups.findIndex(g => g.id === id);
    if (idx === -1) return undefined;
    const updated: ProductAccessGroup = {
      ...groups[idx],
      ...patch,
      updated_at: new Date().toISOString(),
    } as ProductAccessGroup;
    groups[idx] = updated;
    writeGroups(groups);
    return updated;
  },
  remove(id: string) {
    const groups = readGroups().filter(g => g.id !== id);
    writeGroups(groups);
    // Clean up assignments
    const assign = readAssignments();
    for (const k of Object.keys(assign)) {
      if (assign[k] === id) assign[k] = undefined;
    }
    writeAssignments(assign);
  },
  // Assignments: userGroupId -> productAccessGroupId
  getAssignment(userGroupId: string): string | undefined {
    const a = readAssignments();
    return a[userGroupId];
  },
  setAssignment(userGroupId: string, productAccessGroupId: string | undefined) {
    const a = readAssignments();
    a[userGroupId] = productAccessGroupId;
    writeAssignments(a);
  },
};


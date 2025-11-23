import { ProductAccessGroup, ProductKey } from '../types';
import { apiClient } from '../api/client';

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

export const productAccess = {
  async list(): Promise<ProductAccessGroup[]> {
    try {
      const groups = await apiClient.getProductAccessGroups();
      return groups.map(g => ({
        id: g.id,
        name: g.name,
        description: g.description,
        products: g.products as ProductKey[],
        created_at: g.created_at,
        updated_at: g.updated_at,
      }));
    } catch (error) {
      console.error('Failed to fetch product access groups:', error);
      return [];
    }
  },

  async get(id: string): Promise<ProductAccessGroup | undefined> {
    try {
      const group = await apiClient.getProductAccessGroup(id);
      return {
        id: group.id,
        name: group.name,
        description: group.description,
        products: group.products as ProductKey[],
        created_at: group.created_at,
        updated_at: group.updated_at,
      };
    } catch (error) {
      console.error('Failed to fetch product access group:', error);
      return undefined;
    }
  },

  async create(name: string, description: string | undefined, products: ProductKey[]): Promise<ProductAccessGroup> {
    const group = await apiClient.createProductAccessGroup({
      name,
      description,
      products,
    });

    return {
      id: group.id,
      name: group.name,
      description: group.description,
      products: group.products as ProductKey[],
      created_at: group.created_at,
      updated_at: group.updated_at,
    };
  },

  async update(id: string, patch: Partial<Omit<ProductAccessGroup, 'id' | 'created_at'>>): Promise<ProductAccessGroup | undefined> {
    try {
      const updated = await apiClient.updateProductAccessGroup(id, {
        name: patch.name,
        description: patch.description,
        products: patch.products,
      });

      return {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        products: updated.products as ProductKey[],
        created_at: updated.created_at,
        updated_at: updated.updated_at,
      };
    } catch (error) {
      console.error('Failed to update product access group:', error);
      return undefined;
    }
  },

  async remove(id: string): Promise<void> {
    try {
      await apiClient.deleteProductAccessGroup(id);
    } catch (error) {
      console.error('Failed to delete product access group:', error);
      throw error;
    }
  },

  // Assignments: userGroupId -> productAccessGroupId
  // Note: This is now handled through UserGroup.product_access_group_id field
  async getAssignment(userGroupId: string): Promise<string | undefined> {
    try {
      const userGroups = await apiClient.getUserGroups();
      const userGroup = userGroups.find(ug => ug.id === userGroupId);
      return userGroup?.product_access_group_id;
    } catch (error) {
      console.error('Failed to get user group assignment:', error);
      return undefined;
    }
  },

  async setAssignment(userGroupId: string, productAccessGroupId: string | undefined): Promise<void> {
    try {
      await apiClient.updateUserGroup(userGroupId, {
        product_access_group_id: productAccessGroupId,
      });
    } catch (error) {
      console.error('Failed to set user group assignment:', error);
      throw error;
    }
  },
};


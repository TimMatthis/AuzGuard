import fs from 'fs';
import path from 'path';
import { RouteProfile, RoutingPreference, UserGroup, GroupRouteBinding } from '../types';

interface StoreShape {
  profiles: RouteProfile[];
  groups: UserGroup[];
  bindings: GroupRouteBinding[];
}

export class RoutingProfilesService {
  private storePath: string;

  constructor(dataDir?: string) {
    const root = dataDir || path.join(__dirname, '..', '..');
    const dir = path.join(root, 'data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    this.storePath = path.join(dir, 'routing_profiles.json');
    if (!fs.existsSync(this.storePath)) {
      this.write({ profiles: [], groups: [], bindings: [] });
    }
  }

  private read(): StoreShape {
    try {
      const raw = fs.readFileSync(this.storePath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<StoreShape> | null;
      return {
        profiles: Array.isArray(parsed?.profiles) ? parsed!.profiles as RouteProfile[] : [],
        groups: Array.isArray(parsed?.groups) ? parsed!.groups as UserGroup[] : [],
        bindings: Array.isArray(parsed?.bindings) ? parsed!.bindings as GroupRouteBinding[] : [],
      };
    } catch {
      return { profiles: [], groups: [], bindings: [] };
    }
  }

  private write(data: StoreShape) {
    fs.writeFileSync(this.storePath, JSON.stringify(data, null, 2), 'utf8');
  }

  listProfiles(): RouteProfile[] { return this.read().profiles; }
  listGroups(): Array<UserGroup & { route_profile_id?: string }> {
    const data = this.read();
    const byGroup = new Map<string, string>();
    for (const b of data.bindings) byGroup.set(b.group_id, b.route_profile_id);
    return data.groups.map(g => ({ ...g, route_profile_id: byGroup.get(g.id) }));
  }

  createProfile(input: { name: string; basic?: RouteProfile['basic']; preferences?: RoutingPreference; pool_id?: string }): RouteProfile {
    const data = this.read();
    const now = new Date().toISOString();
    const profile: RouteProfile = {
      id: `rp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      name: input.name,
      basic: input.basic || {},
      preferences: input.preferences || {},
      pool_id: input.pool_id,
      created_at: now,
      updated_at: now
    };
    data.profiles.push(profile);
    this.write(data);
    return profile;
  }

  updateProfile(id: string, patch: Partial<Omit<RouteProfile, 'id' | 'created_at'>>): RouteProfile {
    const data = this.read();
    const idx = data.profiles.findIndex(p => p.id === id);
    if (idx < 0) throw new Error('Profile not found');
    const next: RouteProfile = {
      ...data.profiles[idx],
      ...patch,
      updated_at: new Date().toISOString(),
      preferences: { ...data.profiles[idx].preferences, ...(patch.preferences || {}) }
    };
    data.profiles[idx] = next;
    this.write(data);
    return next;
  }

  deleteProfile(id: string): void {
    const data = this.read();
    data.profiles = data.profiles.filter(p => p.id !== id);
    data.bindings = data.bindings.filter(b => b.route_profile_id !== id);
    this.write(data);
  }

  createGroup(name: string): UserGroup {
    const data = this.read();
    const now = new Date().toISOString();
    const group: UserGroup = { id: `ug_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`, name, created_at: now, updated_at: now };
    data.groups.push(group);
    this.write(data);
    return group;
  }

  deleteGroup(id: string): void {
    const data = this.read();
    data.groups = data.groups.filter(g => g.id !== id);
    data.bindings = data.bindings.filter(b => b.group_id !== id);
    this.write(data);
  }

  updateGroup(id: string, patch: Partial<UserGroup> & { route_profile_id?: string }): UserGroup {
    const data = this.read();
    const idx = data.groups.findIndex(g => g.id === id);
    if (idx < 0) throw new Error('Group not found');

    const { route_profile_id, ...rest } = patch as any;
    const next: UserGroup = { ...data.groups[idx], ...(rest as any), updated_at: new Date().toISOString() };
    data.groups[idx] = next;

    if (typeof route_profile_id !== 'undefined') {
      // replace existing binding for this group
      data.bindings = data.bindings.filter(b => b.group_id !== id);
      if (route_profile_id) {
        const binding: GroupRouteBinding = { id: `gb_${Date.now().toString(36)}`, group_id: id, route_profile_id, created_at: new Date().toISOString() };
        data.bindings.push(binding);
      }
    }

    this.write(data);
    return next;
  }

  assignProfileToGroup(groupId: string, profileId: string): GroupRouteBinding {
    const data = this.read();
    const group = data.groups.find(g => g.id === groupId);
    const profile = data.profiles.find(p => p.id === profileId);
    if (!group) throw new Error('Group not found');
    if (!profile) throw new Error('Route profile not found');
    // replace existing
    data.bindings = data.bindings.filter(b => b.group_id !== groupId);
    const binding: GroupRouteBinding = { id: `gb_${Date.now().toString(36)}`, group_id: groupId, route_profile_id: profileId, created_at: new Date().toISOString() };
    data.bindings.push(binding);
    this.write(data);
    return binding;
  }
}

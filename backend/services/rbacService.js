import Role from '../models/Role.js';
import Permission from '../models/Permission.js';

export const DEFAULT_PERMISSIONS = [
  // Dashboard
  { key: 'dashboard.read', group: 'dashboard', label: 'View dashboard' },
  // Products
  { key: 'products.read', group: 'products', label: 'Read products' },
  { key: 'products.write', group: 'products', label: 'Write products' },
  // Orders
  { key: 'orders.read', group: 'orders', label: 'Read orders' },
  { key: 'orders.write', group: 'orders', label: 'Write orders' },
  // Inventory
  { key: 'inventory.read', group: 'inventory', label: 'Read inventory' },
  { key: 'inventory.write', group: 'inventory', label: 'Write inventory' },
  // Imports
  { key: 'imports.read', group: 'imports', label: 'Read imports' },
  { key: 'imports.write', group: 'imports', label: 'Write imports' },
  // Suppliers
  { key: 'suppliers.read', group: 'suppliers', label: 'Read suppliers' },
  { key: 'suppliers.write', group: 'suppliers', label: 'Write suppliers' },
  // Customers
  { key: 'customers.read', group: 'customers', label: 'Read customers' },
  { key: 'customers.write', group: 'customers', label: 'Write customers' },
  // Promotions
  { key: 'promotions.read', group: 'promotions', label: 'Read promotions' },
  { key: 'promotions.write', group: 'promotions', label: 'Write promotions' },
  // Coupons
  { key: 'coupons.read', group: 'coupons', label: 'Read coupons' },
  { key: 'coupons.write', group: 'coupons', label: 'Write coupons' },
  // Flash Deals
  { key: 'flash_deals.read', group: 'flash_deals', label: 'Read flash deals' },
  { key: 'flash_deals.write', group: 'flash_deals', label: 'Write flash deals' },
  // Events / Posts
  { key: 'posts.read', group: 'posts', label: 'Read posts / events' },
  { key: 'posts.write', group: 'posts', label: 'Write posts / events' },
  // Reviews
  { key: 'reviews.read', group: 'reviews', label: 'Read reviews' },
  { key: 'reviews.write', group: 'reviews', label: 'Manage reviews' },
  // Support
  { key: 'support.read', group: 'support', label: 'Read support tickets' },
  { key: 'support.write', group: 'support', label: 'Manage support tickets' },
  // Returns
  { key: 'returns.read', group: 'returns', label: 'Read return requests' },
  { key: 'returns.write', group: 'returns', label: 'Manage return requests' },
  // Branches
  { key: 'branches.read', group: 'branches', label: 'Read branches' },
  { key: 'branches.write', group: 'branches', label: 'Manage branches' },
  // Settings
  { key: 'settings.read', group: 'settings', label: 'Read settings' },
  { key: 'settings.write', group: 'settings', label: 'Write settings' },
  // Audit
  { key: 'audit.read', group: 'audit', label: 'Read audit logs' },
  // Roles — super_admin only
  { key: 'roles.manage', group: 'roles', label: 'Manage roles & permissions' },
];

const DEFAULT_ROLES = [
  {
    key: 'super_admin',
    name: 'Super Admin',
    role_id: 1,
    level: 0,
    is_system: true,
    permissions: DEFAULT_PERMISSIONS.map((p) => p.key),
  },
  {
    key: 'admin',
    name: 'Admin',
    role_id: 2,
    level: 10,
    is_system: true,
    permissions: [
      'dashboard.read',
      'products.read', 'products.write',
      'orders.read', 'orders.write',
      'inventory.read', 'inventory.write',
      'imports.read', 'imports.write',
      'suppliers.read', 'suppliers.write',
      'customers.read', 'customers.write',
      'promotions.read', 'promotions.write',
      'coupons.read', 'coupons.write',
      'flash_deals.read', 'flash_deals.write',
      'posts.read', 'posts.write',
      'reviews.read', 'reviews.write',
      'support.read', 'support.write',
      'returns.read', 'returns.write',
      'branches.read',
      'settings.read',
      'audit.read',
      // NOTE: admin does NOT get 'settings.write', 'roles.manage', or 'branches.write'
    ],
  },
  {
    key: 'manager',
    name: 'Manager',
    role_id: 4,
    level: 20,
    is_system: true,
    permissions: [
      'dashboard.read',
      'products.read', 'products.write',
      'orders.read',
      'inventory.read', 'inventory.write',
      'imports.read', 'imports.write',
      'suppliers.read',
      'customers.read',
      'promotions.read',
      'coupons.read',
      'posts.read',
      'reviews.read',
      'support.read',
      'returns.read',
      'branches.read',
      'settings.read',
      'audit.read',
    ],
  },
  {
    key: 'staff',
    name: 'Staff',
    role_id: 5,
    level: 30,
    is_system: true,
    permissions: [
      'dashboard.read',
      'products.read',
      'orders.read',
      'inventory.read',
      'imports.read',
      'suppliers.read',
      'customers.read',
      'reviews.read',
      'support.read',
    ],
  },
  {
    key: 'customer',
    name: 'Customer',
    role_id: 3,
    level: 99,
    is_system: true,
    permissions: [],
  },
];

const ROLE_ID_TO_KEY = {
  1: 'super_admin',
  2: 'admin',
  3: 'customer',
  4: 'manager',
  5: 'staff',
};

export const mapRoleIdToKey = (roleId) => ROLE_ID_TO_KEY[Number(roleId)] || 'customer';

export async function ensureRbacSeed() {
  for (const perm of DEFAULT_PERMISSIONS) {
    await Permission.findOneAndUpdate(
      { key: perm.key },
      { $setOnInsert: { ...perm, is_active: true } },
      { upsert: true, new: true }
    );
  }

  for (const role of DEFAULT_ROLES) {
    const existing = await Role.findOne({ key: role.key });
    if (!existing) {
      await Role.create({
        key: role.key,
        name: role.name,
        role_id: role.role_id,
        level: role.level,
        is_system: role.is_system,
        is_active: true,
        permissions: role.permissions,
      });
    } else {
      // Update level if missing (migration)
      if (existing.level === undefined || existing.level === null || existing.level === 99) {
        existing.level = role.level;
      }
      // Ensure new permissions are available for super_admin
      if (role.key === 'super_admin') {
        const allPermKeys = DEFAULT_PERMISSIONS.map(p => p.key);
        const merged = [...new Set([...(existing.permissions || []), ...allPermKeys])];
        existing.permissions = merged;
      }
      await existing.save();
    }
  }

  // Ensure default admin user admin@lottemart.vn exists and is active
  try {
    const mongoose = (await import('mongoose')).default;
    const User = mongoose.model('User');
    const adminEmail = 'admin@lottemart.vn';
    const adminUser = await User.findOne({ email: adminEmail });
    if (!adminUser) {
      const bcrypt = await import('bcryptjs');
      const hash = await bcrypt.default.hash('Admin@123', 10);
      await User.create({
        username: 'admin',
        full_name: 'Admin Lotte',
        email: adminEmail,
        password_hash: hash,
        role_id: 1,
        is_active: true,
        email_verified: true,
        status: 'ACTIVE',
        membership_level: 'Kim Cương',
        lotte_points: 9999,
      });
      console.info(`[RBAC] Default admin ${adminEmail} created successfully.`);
    } else {
      let changed = false;
      if (!adminUser.is_active || adminUser.status !== 'ACTIVE') {
        adminUser.is_active = true;
        adminUser.status = 'ACTIVE';
        changed = true;
      }
      if (adminUser.role_id !== 1) {
        adminUser.role_id = 1;
        changed = true;
      }
      if (changed) {
        await adminUser.save();
        console.info(`[RBAC] Default admin ${adminEmail} status and role synchronized.`);
      }
    }
  } catch (adminErr) {
    console.error('[RBAC] Failed to ensure default admin exists:', adminErr.message);
  }
}

export async function getRoleByUser(user) {
  if (!user) return null;
  const roleKey = user.role_key || mapRoleIdToKey(user.role_id);
  return Role.findOne({ key: roleKey, is_active: true }).lean();
}

export async function getPermissionsForUser(user) {
  if (!user) return [];
  if (Number(user.role_id) === 1) {
    const all = await Permission.find({ is_active: true }).select('key -_id').lean();
    return all.map((p) => p.key);
  }
  if (Array.isArray(user.permissions) && user.permissions.length > 0) return user.permissions;

  const role = await getRoleByUser(user);
  return Array.isArray(role?.permissions) ? role.permissions : [];
}

export function isSuperAdmin(user) {
  if (!user) return false;
  return Number(user.role_id) === 1 || user.role_key === 'super_admin';
}

export default { ensureRbacSeed, getPermissionsForUser, mapRoleIdToKey, isSuperAdmin };

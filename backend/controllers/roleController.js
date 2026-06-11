import Role from '../models/Role.js';
import Permission from '../models/Permission.js';
import User from '../models/User.js';
import { ensureRbacSeed, mapRoleIdToKey } from '../services/rbacService.js';
import { logActivity } from '../services/auditService.js';

const sanitizePermissions = async (permissions = []) => {
  if (!Array.isArray(permissions)) return [];
  const keys = permissions.map((p) => String(p));
  const found = await Permission.find({ key: { $in: keys }, is_active: true }).select('key -_id').lean();
  return found.map((p) => p.key);
};

export const list = async (_req, res) => {
  try {
    await ensureRbacSeed();
    const data = await Role.find({ is_active: true }).sort({ role_id: 1, created_at: 1 });
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const detail = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).json({ success: false, message: 'Role not found' });
    return res.json({ success: true, data: role });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const create = async (req, res) => {
  try {
    const { key, name, description, permissions, role_id } = req.body || {};
    if (!key || !name) return res.status(400).json({ success: false, message: 'key and name are required' });

    const existed = await Role.findOne({ key });
    if (existed) return res.status(409).json({ success: false, message: 'Role key already exists' });

    const safePerms = await sanitizePermissions(permissions || []);

    // Auto-assign a numeric role_id if not provided.
    // System roles use 1-5; custom roles start at 100.
    let assignedRoleId = Number(role_id) || null;
    if (!assignedRoleId) {
      const maxRole = await Role.findOne({ role_id: { $gte: 100 } }).sort({ role_id: -1 }).lean();
      assignedRoleId = maxRole?.role_id ? maxRole.role_id + 1 : 100;
    }

    const role = await Role.create({
      key,
      name,
      description: description || '',
      role_id: assignedRoleId,
      level: 30, // custom roles default to 'staff' level
      permissions: safePerms,
      is_system: false,
      is_active: true,
    });

    await logActivity({
      userId: req.userId,
      userName: req.user?.full_name || req.user?.username || 'Admin',
      action: 'CREATE',
      entity: 'role',
      entityId: role._id,
      details: { new_data: role.toObject() },
      ip: req.ip,
    });

    return res.status(201).json({ success: true, data: role, message: 'Role created' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const update = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).json({ success: false, message: 'Role not found' });

    const oldData = role.toObject();

    if (req.body.name !== undefined) role.name = req.body.name;
    if (req.body.description !== undefined) role.description = req.body.description;
    if (req.body.permissions !== undefined) role.permissions = await sanitizePermissions(req.body.permissions || []);
    if (req.body.is_active !== undefined) role.is_active = !!req.body.is_active;

    if (!role.is_system) {
      if (req.body.key !== undefined) role.key = req.body.key;
      if (req.body.role_id !== undefined) role.role_id = Number(req.body.role_id) || null;
    }

    await role.save();

    await logActivity({
      userId: req.userId,
      userName: req.user?.full_name || req.user?.username || 'Admin',
      action: 'UPDATE',
      entity: 'role',
      entityId: role._id,
      details: { old_data: oldData, new_data: role.toObject() },
      ip: req.ip,
    });

    return res.json({ success: true, data: role, message: 'Role updated' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const forCurrentUser = async (req, res) => {
  try {
    await ensureRbacSeed();
    const key = req.user?.role_key || mapRoleIdToKey(req.user?.role_id);
    const role = await Role.findOne({ key, is_active: true }).lean();
    return res.json({ success: true, data: role || null });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { user_id, role_key } = req.body || {};
    if (!user_id || !role_key) {
      return res.status(400).json({ success: false, message: 'user_id and role_key are required' });
    }

    const role = await Role.findOne({ key: role_key, is_active: true });
    if (!role) return res.status(404).json({ success: false, message: 'Role not found' });

    const user = await User.findById(user_id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const oldData = user.toPublic ? user.toPublic() : user.toObject();

    user.role_key = role.key;
    if (role.role_id) user.role_id = role.role_id;
    user.permissions = role.permissions || [];
    await user.save();

    await logActivity({
      userId: req.userId,
      userName: req.user?.full_name || req.user?.username || 'Admin',
      action: 'UPDATE',
      entity: 'user_role',
      entityId: user._id,
      details: { old_data: oldData, new_data: user.toPublic ? user.toPublic() : user.toObject() },
      ip: req.ip,
    });

    return res.json({ success: true, data: user.toPublic ? user.toPublic() : user, message: 'User role updated' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

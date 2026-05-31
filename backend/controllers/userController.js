import User from '../models/User.js';
import { paginateMeta } from '../utils/helpers.js';
import bcrypt from 'bcryptjs';
import { isValidVietnamPhone, normalizeVietnamPhone } from '../utils/validatePhone.js';
import { notifyPointsAdjusted } from '../services/userNotificationService.js';
import { sendNotificationSettingsEmail } from '../services/emailService.js';
import Role from '../models/Role.js';
import { logActivity } from '../services/auditService.js';

const normalizeAndValidatePhone = (phone) => {
  const normalized = normalizeVietnamPhone(phone || '');
  if (normalized && !isValidVietnamPhone(normalized)) {
    const err = new Error('Số điện thoại không hợp lệ hoặc chưa cập nhật');
    err.statusCode = 400;
    throw err;
  }
  return normalized;
};

export const me = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, data: user.toPublic() });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateMe = async (req, res) => {
  try {
    const updates = {};
    if (req.body.phone !== undefined) {
      updates.phone = normalizeAndValidatePhone(req.body.phone);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'Không có dữ liệu để cập nhật' });
    }

    const user = await User.findByIdAndUpdate(req.userId, { $set: updates }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, data: user.toPublic(), message: 'Cập nhật thành công' });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: err.message });
  }
};

export const list = async (req, res) => {
  try {
    const { page = 1, limit = 100, search, status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { full_name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
      if (search.match(/^[0-9a-fA-F]{24}$/)) {
        filter.$or.push({ _id: search });
      }
    }
    const p = Math.max(1, parseInt(page)); const l = Math.min(200, Math.max(1, parseInt(limit)));
    const total = await User.countDocuments(filter);
    const raw = await User.find(filter).select('-password_hash -refresh_token').sort('-created_at').skip((p - 1) * l).limit(l);
    // Normalize: map _id → id, include signup_method as provider
    const data = raw.map(u => {
      const obj = u.toObject();
      obj.id = obj._id;
      if (!obj.provider) obj.provider = obj.signup_method || (obj.googleId ? 'google' : 'email');
      return obj;
    });
    return res.json({ success: true, data, meta: paginateMeta(total, { page: p, limit: l }) });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const detail = async (req, res) => {
  try {
    if (req.user?.role_id !== 3 && String(req.params.id) !== String(req.userId)) {
      // Admin users should be able to view details if they have appropriate permissions, 
      // but let's allow admins to view any user for now in the staff management context.
      if (!req.user || !req.user.role_key) {
        return res.status(403).json({ success: false, message: 'Không thể xem thông tin người dùng khác' });
      }
    }
    const user = await User.findById(req.params.id).select('-password_hash -refresh_token');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const obj = user.toObject(); obj.id = obj._id;
    if (!obj.provider) obj.provider = obj.signup_method || (obj.googleId ? 'google' : 'email');
    return res.json({ success: true, data: obj });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const update = async (req, res) => {
  try {
    if (req.user?.role_id !== 3 && String(req.params.id) !== String(req.userId)) {
      if (!req.user || !req.user.role_key) {
        return res.status(403).json({ success: false, message: 'Không thể cập nhật người dùng khác' });
      }
    }
    const updates = { ...req.body };
    if (updates.phone !== undefined) {
      updates.phone = normalizeAndValidatePhone(updates.phone);
    }
    // Handle employee info explicitly
    if (updates.employee_info) {
      updates['employee_info.employee_code'] = updates.employee_info.employee_code;
      updates['employee_info.department'] = updates.employee_info.department;
      updates['employee_info.work_type'] = updates.employee_info.work_type;
      updates['employee_info.notes'] = updates.employee_info.notes;
      delete updates.employee_info;
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password_hash -refresh_token');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const obj = user.toObject(); obj.id = obj._id;
    return res.json({ success: true, data: obj, message: 'Cập nhật thành công' });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const toggleStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.is_active = !user.is_active;
    user.status = user.is_active ? 'ACTIVE' : 'INACTIVE';
    await user.save();
    return res.json({ success: true, data: user.toPublic(), message: `Tài khoản đã ${user.is_active ? 'mở' : 'khóa'}` });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const resetPassword = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const newPassword = req.body.newPassword || 'LotteMart@123';
    user.password_hash = newPassword;
    user.force_password_change = req.body.forceChange !== false; // default true
    user.password_changed_at = new Date();
    await user.save();

    await logActivity({
      userId: req.userId,
      userName: req.user?.full_name || req.user?.username || 'Admin',
      action: 'RESET_PASSWORD',
      entity: 'user',
      entityId: user._id,
      details: {
        target_user: user.email || user.username,
        force_change: user.force_password_change,
      },
      ip: req.ip,
    });

    return res.json({ success: true, message: 'Đặt lại mật khẩu thành công' });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const adjustPoints = async (req, res) => {
  try {
    const { points, reason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.lotte_points = Math.max(0, user.lotte_points + points);
    await user.save();

    try {
      await notifyPointsAdjusted({
        userId: user._id,
        delta: Number(points || 0),
        newBalance: user.lotte_points,
        reason: String(reason || ''),
      });
    } catch (notifyErr) {
      console.warn('[UserController] points notification failed:', notifyErr.message);
    }

    return res.json({ success: true, data: user.toPublic(), message: `Điều chỉnh ${points} điểm` });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const updateMembership = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { membership_level: req.body.membership_level }, { new: true }).select('-password_hash -refresh_token');
    return res.json({ success: true, data: user, message: 'Cập nhật hạng thành viên' });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const updateSettings = async (req, res) => {
  try {
    if (req.user?.role_id !== 3 && String(req.params.id) !== String(req.userId)) {
      return res.status(403).json({ success: false, message: 'Không thể cập nhật cài đặt người dùng khác' });
    }
    
    // Support nested updates from frontend using dot notation to prevent overwriting
    const setQuery = {};
    const changedPrefs = [];
    if (req.body.preferences) {
      for (const key in req.body.preferences) {
        setQuery[`preferences.${key}`] = req.body.preferences[key];
        changedPrefs.push({ key, value: req.body.preferences[key] });
      }
    }
    if (req.body.security) {
      for (const key in req.body.security) setQuery[`security.${key}`] = req.body.security[key];
    }
    if (req.body.settings) {
      for (const key in req.body.settings) setQuery[`settings.${key}`] = req.body.settings[key];
    }
    
    // Also support root fields if sent directly
    if (req.body.full_name) setQuery.full_name = req.body.full_name;
    if (req.body.phone !== undefined) setQuery.phone = normalizeAndValidatePhone(req.body.phone);
    
    if (Object.keys(setQuery).length === 0) {
      return res.json({ success: true, data: req.user });
    }
    
    const user = await User.findByIdAndUpdate(req.params.id, { $set: setQuery }, { new: true }).select('-password_hash -refresh_token');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    if (changedPrefs.length > 0) {
      try {
        await sendNotificationSettingsEmail(user, changedPrefs);
      } catch (err) {
        console.warn('[UserController] notification email failed:', err.message);
      }
    }

    return res.json({ success: true, data: user });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: err.message });
  }
};

export const updateRole = async (req, res) => {
  try {
    const oldUser = await User.findById(req.params.id);
    if (!oldUser) return res.status(404).json({ success: false, message: 'User not found' });

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role_id: req.body.role_id, role: req.body.role, role_key: req.body.role_key || req.body.role },
      { new: true }
    ).select('-password_hash -refresh_token');

    try {
      await logActivity({
        userId: req.userId,
        userName: req.user?.full_name || req.user?.username || 'Admin',
        action: 'ROLE_CHANGE',
        entity: 'user',
        entityId: user._id,
        details: {
          target_username: user.username,
          old_role_id: oldUser.role_id,
          new_role_id: user.role_id,
          old_role: oldUser.role_key || oldUser.role,
          new_role: user.role_key || user.role
        },
        ip: req.ip,
      });
    } catch (auditErr) {
      console.error('[Audit] Failed to log role change:', auditErr.message);
    }

    return res.json({ success: true, data: user, message: 'Cập nhật phân quyền thành công' });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const remove = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, message: 'Đã xóa người dùng thành công' });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const createStaff = async (req, res) => {
  try {
    const {
      username, email, phone, full_name, password,
      role_key, branch_id, status, employee_code, department, notes, work_type
    } = req.body;

    if (!username || !password || !role_key) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc (username, password, role)' });
    }

    // Check duplicates
    const existUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existUser) {
      return res.status(409).json({ success: false, message: 'Username hoặc Email đã tồn tại' });
    }

    let normalizedPhone = '';
    if (phone) {
      try { normalizedPhone = normalizeAndValidatePhone(phone); } catch(e) {
        return res.status(400).json({ success: false, message: 'Số điện thoại không hợp lệ' });
      }
      const existPhone = await User.findOne({ phone: normalizedPhone });
      if (existPhone) return res.status(409).json({ success: false, message: 'Số điện thoại đã tồn tại' });
    }

    // Role
    const role = await Role.findOne({ key: role_key, is_active: true });
    if (!role) return res.status(400).json({ success: false, message: 'Role không hợp lệ hoặc đã bị khóa' });

    const newUser = new User({
      username,
      email: email || undefined,
      phone: normalizedPhone || '',
      full_name: full_name || '',
      password_hash: password, // Will be hashed by pre-save
      role_key: role.key,
      role_id: role.role_id,
      permissions: role.permissions || [],
      branch_id: branch_id || null,
      status: status || 'ACTIVE',
      is_active: status !== 'INACTIVE' && status !== 'LOCKED',
      profile_completed: true,
      signup_method: 'admin_created',
      login_provider: 'local',
      authProviders: ['local'],
      force_password_change: true, // Staff must change temp password on first login
      employee_info: {
        employee_code: employee_code || null,
        department: department || null,
        work_type: work_type || 'FULL_TIME',
        notes: notes || ''
      }
    });

    await newUser.save();

    await logActivity({
      userId: req.userId,
      userName: req.user?.full_name || req.user?.username || 'Admin',
      action: 'CREATE_STAFF',
      entity: 'user',
      entityId: newUser._id,
      details: { role: role.key, branch_id, username },
      ip: req.ip,
    });

    const publicUser = newUser.toPublic();
    return res.status(201).json({ success: true, data: publicUser, message: 'Tạo tài khoản nhân viên thành công' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

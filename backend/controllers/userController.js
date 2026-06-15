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

const generateSecurePassword = () => {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const special = '!@#$%^&*';
  const allChars = lowercase + uppercase + digits + special;
  
  let password = '';
  // Ensure at least one character from each set to satisfy complexity rules
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += digits[Math.floor(Math.random() * digits.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill the rest up to 10 characters
  for (let i = 0; i < 6; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password characters
  return password.split('').sort(() => 0.5 - Math.random()).join('');
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
    const { page = 1, limit = 100, search, status, role_type } = req.query;
    const filter = {};
    if (status) filter.status = status;
    
    if (role_type === 'staff') {
      filter.role_id = { $ne: 3 }; // Exclude standard customers
    } else if (role_type === 'customer') {
      filter.role_id = 3; // Only standard customers
    }

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
    const raw = await User.find(filter).sort('-created_at').skip((p - 1) * l).limit(l);
    
    // Normalize and sanitize: strictly map toPublic()
    const data = raw.map(u => u.toPublic());
    return res.json({ success: true, data, meta: paginateMeta(total, { page: p, limit: l }) });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const detail = async (req, res) => {
  try {
    const isSelf = String(req.params.id) === String(req.userId);
    const isAdmin = req.user && [1, 2].includes(Number(req.user.role_id));
    if (!isSelf && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Không thể xem thông tin người dùng khác' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, data: user.toPublic() });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const update = async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

    const isSelf = String(req.params.id) === String(req.userId);
    const requestorIsSuperAdmin = req.user && (Number(req.user.role_id) === 1 || req.user.role_key === 'super_admin');
    const targetIsStaff = targetUser.role_id !== 3;

    if (!isSelf) {
      const isAdmin = req.user && [1, 2].includes(Number(req.user.role_id));
      if (!isAdmin) {
        return res.status(403).json({ success: false, message: 'Không thể cập nhật người dùng khác' });
      }
      if (targetIsStaff && !requestorIsSuperAdmin) {
        return res.status(403).json({ success: false, message: 'Forbidden: Only super admin can update staff accounts' });
      }
    }

    const updates = { ...req.body };
    if (updates.phone !== undefined) {
      updates.phone = normalizeAndValidatePhone(updates.phone);
    }
    // Protect role_id / role_key from standard updates endpoint (must use updateRole)
    delete updates.role_id;
    delete updates.role_key;
    delete updates.permissions;
    delete updates.password_hash;

    // Handle employee info explicitly
    if (updates.employee_info) {
      updates['employee_info.employee_code'] = updates.employee_info.employee_code;
      updates['employee_info.department'] = updates.employee_info.department;
      updates['employee_info.work_type'] = updates.employee_info.work_type;
      updates['employee_info.notes'] = updates.employee_info.notes;
      delete updates.employee_info;
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, data: user.toPublic(), message: 'Cập nhật thành công' });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const toggleStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    const targetIsStaff = user.role_id !== 3;
    const requestorIsSuperAdmin = req.user && (Number(req.user.role_id) === 1 || req.user.role_key === 'super_admin');
    
    if (targetIsStaff && !requestorIsSuperAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden: Only super admin can toggle staff account status' });
    }

    user.is_active = !user.is_active;
    user.status = user.is_active ? 'ACTIVE' : 'INACTIVE';
    await user.save();

    await logActivity({
      userId: req.userId,
      userName: req.user?.full_name || req.user?.username || 'Admin',
      action: 'STATUS_TOGGLE',
      entity: 'user',
      entityId: user._id,
      details: {
        target_user: user.email || user.username,
        is_active: user.is_active,
        status: user.status
      },
      ip: req.ip,
    });

    return res.json({ success: true, data: user.toPublic(), message: `Tài khoản đã ${user.is_active ? 'mở' : 'khóa'}` });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const resetPassword = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const targetIsStaff = user.role_id !== 3;
    const requestorIsSuperAdmin = req.user && (Number(req.user.role_id) === 1 || req.user.role_key === 'super_admin');
    
    if (targetIsStaff && !requestorIsSuperAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden: Only super admin can reset staff credentials' });
    }

    // Allow custom password if provided, otherwise generate a secure temporary password
    const newPassword = req.body.password || generateSecurePassword();
    user.password_hash = newPassword;
    user.force_password_change = true;
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

    // Return the generated temp password once
    return res.json({ success: true, newPassword, message: 'Đặt lại mật khẩu thành công' });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const adjustPoints = async (req, res) => {
  try {
    const { points, reason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    if (user.role_id !== 3) {
      return res.status(400).json({ success: false, message: 'Không thể điều chỉnh điểm cho tài khoản nhân viên' });
    }

    const previousPoints = user.lotte_points || 0;
    user.lotte_points = Math.max(0, user.lotte_points + points);
    await user.save();

    // Create LoyaltyTransaction entry for manual adjustment to maintain ledger integrity
    try {
      const { LoyaltyTransaction } = await import('../models/Loyalty.js');
      await LoyaltyTransaction.create({
        user_id: user._id,
        type: 'adjust',
        points: Number(points || 0),
        source: 'admin_adjustment',
        description: reason || 'Manual adjustment by admin',
        balance_after: user.lotte_points
      });
    } catch (ledgerErr) {
      console.error('[UserController] Failed to log LoyaltyTransaction for adjustment:', ledgerErr.message);
    }

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

    // Log admin activity for audit trace
    try {
      await logActivity({
        userId: req.userId,
        userName: req.user?.full_name || req.user?.username || 'Admin',
        action: 'ADJUST_POINTS',
        entity: 'user',
        entityId: user._id,
        details: {
          target_username: user.username,
          target_email: user.email,
          points_adjusted: Number(points || 0),
          reason: reason || 'Manual adjustment',
          new_balance: user.lotte_points
        },
        ip: req.ip,
      });
    } catch (auditErr) {
      console.error('[Audit] Failed to log points adjustment:', auditErr.message);
    }

    return res.json({ success: true, data: user.toPublic(), message: `Điều chỉnh ${points} điểm` });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const updateMembership = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.role_id !== 3) {
      return res.status(400).json({ success: false, message: 'Không thể cập nhật hạng thành viên cho tài khoản nhân viên' });
    }

    user.membership_level = req.body.membership_level;
    await user.save();

    return res.json({ success: true, data: user.toPublic(), message: 'Cập nhật hạng thành viên' });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const updateSettings = async (req, res) => {
  try {
    const isSelf = String(req.params.id) === String(req.userId);
    const isAdmin = req.user && [1, 2].includes(Number(req.user.role_id));
    if (!isSelf && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Không thể cập nhật cài đặt người dùng khác' });
    }
    
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
    
    if (req.body.full_name) setQuery.full_name = req.body.full_name;
    if (req.body.phone !== undefined) setQuery.phone = normalizeAndValidatePhone(req.body.phone);
    
    if (Object.keys(setQuery).length === 0) {
      const u = await User.findById(req.params.id);
      return res.json({ success: true, data: u ? u.toPublic() : null });
    }
    
    const user = await User.findByIdAndUpdate(req.params.id, { $set: setQuery }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    if (changedPrefs.length > 0) {
      try {
        await sendNotificationSettingsEmail(user, changedPrefs);
      } catch (err) {
        console.warn('[UserController] notification email failed:', err.message);
      }
    }

    return res.json({ success: true, data: user.toPublic() });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: err.message });
  }
};

export const updateRole = async (req, res) => {
  try {
    const requestorIsSuperAdmin = req.user && (Number(req.user.role_id) === 1 || req.user.role_key === 'super_admin');
    if (!requestorIsSuperAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden: Only super admin can manage user roles' });
    }

    const oldUser = await User.findById(req.params.id);
    if (!oldUser) return res.status(404).json({ success: false, message: 'User not found' });

    const role = await Role.findOne({ key: req.body.role_key || req.body.role, is_active: true });
    if (!role) return res.status(400).json({ success: false, message: 'Role không hợp lệ hoặc đã bị khóa' });

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role_id: role.role_id, role_key: role.key, permissions: role.permissions || [] },
      { new: true }
    );

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

    return res.json({ success: true, data: user.toPublic(), message: 'Cập nhật phân quyền thành công' });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const remove = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const targetIsStaff = user.role_id !== 3;
    const requestorIsSuperAdmin = req.user && (Number(req.user.role_id) === 1 || req.user.role_key === 'super_admin');

    if (targetIsStaff && !requestorIsSuperAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden: Only super admin can delete staff accounts' });
    }

    await User.findByIdAndDelete(req.params.id);

    await logActivity({
      userId: req.userId,
      userName: req.user?.full_name || req.user?.username || 'Admin',
      action: 'DELETE_USER',
      entity: 'user',
      entityId: user._id,
      details: {
        target_user: user.email || user.username,
        role_key: user.role_key
      },
      ip: req.ip,
    });

    return res.json({ success: true, message: 'Đã xóa người dùng thành công' });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const createStaff = async (req, res) => {
  try {
    const requestorIsSuperAdmin = req.user && (Number(req.user.role_id) === 1 || req.user.role_key === 'super_admin');
    if (!requestorIsSuperAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden: Only super admin can create staff accounts' });
    }

    const {
      username, email, phone, full_name,
      role_key, branch_id, status, employee_code, department, notes, work_type
    } = req.body;

    if (!username || !role_key) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc (username, role)' });
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

    // Use custom password if provided, otherwise generate a secure temporary password
    const tempPassword = req.body.password || generateSecurePassword();

    const newUser = new User({
      username,
      email: email || undefined,
      phone: normalizedPhone || '',
      full_name: full_name || '',
      password_hash: tempPassword, // Will be hashed by pre-save
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
    return res.status(201).json({ success: true, data: publicUser, tempPassword, message: 'Tạo tài khoản nhân viên thành công' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

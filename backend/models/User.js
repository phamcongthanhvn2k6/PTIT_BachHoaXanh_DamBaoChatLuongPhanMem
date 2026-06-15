import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const paymentMethodSchema = new mongoose.Schema(
  {
    type: { type: String, default: '' },
    last4: { type: String, default: '' },
    brand: { type: String, default: '' },
    card_id: { type: String, default: '' },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, trim: true },
  full_name: { type: String, default: '' },
  email: { type: String, default: undefined, lowercase: true, trim: true },
  phone: {
    type: String,
    default: '',
    set: (value) => String(value ?? '').trim(),
  },
  password_hash: { type: String, default: null },
  avatar: { type: String, default: null },
  role_id: { type: Number, default: 3 }, // 1=superadmin, 2=admin, 3=user
  role_key: { type: String, default: null },
  permissions: { type: [String], default: [] },
  branch_id: { type: mongoose.Schema.Types.Mixed, default: null },
  lotte_points: { type: Number, default: 0 },
  membership_level: { type: String, default: 'Đồng', enum: ['Đồng', 'Bạc', 'Vàng', 'Kim Cương'] },
  signup_method: { type: String, default: 'email' },
  login_provider: { type: String, default: 'local', enum: ['local', 'google', 'facebook', 'phone'] },
  authProviders: { type: [String], default: ['local'], enum: ['local', 'google', 'facebook', 'phone'] },
  googleId: { type: String, default: null },
  facebookId: { type: String, default: null },
  facebook_id: { type: String, default: null },
  social_providers: [{ provider: String, provider_user_id: String }],
  social_links: { facebook: { type: String, default: null }, google: { type: String, default: null } },
  status: { type: String, default: 'ACTIVE', enum: ['ACTIVE', 'INACTIVE', 'LOCKED'] },
  is_active: { type: Boolean, default: true },
  profile_completed: { type: Boolean, default: false },
  wallet_balance: { type: Number, default: 0 },
  default_payment_method: {
    type: paymentMethodSchema,
    default: null,
  },
  email_verified: { type: Boolean, default: false },
  email_verification_code: { type: String, default: null },
  email_verification_expires_at: { type: Date, default: null },
  email_verification_attempts: { type: Number, default: 0 },
  email_otp_last_sent_at: { type: Date, default: null },
  dob: { type: String, default: null },
  gender: { type: String, default: null },
  address: { type: String, default: null },
  bio: { type: String, default: null },
  note: { type: String, default: '' },
  tags: [String],
  preferences: {
    newsletter: { type: Boolean, default: true },
    sms_alerts: { type: Boolean, default: true },
    language: { type: String, default: 'vi' },
    receive_promotions: { type: Boolean, default: true },
    eco_prefer: { type: Boolean, default: false },
    favorite_categories: [{ type: Number }],
    preferred_store: { type: Number, default: null },
    notification_email_promo: { type: Boolean, default: true },
    notification_sms_order: { type: Boolean, default: true },
    notification_push_order: { type: Boolean, default: true },
    notification_promo: { type: Boolean, default: true },
    notification_system: { type: Boolean, default: true },
  },
  password_changed_at: { type: Date, default: null },
  security: {
    two_factor_enabled: { type: Boolean, default: false },
    two_factor_method: { type: String, enum: ['EMAIL', 'TOTP', null], default: null },
    totp_secret: { type: String, default: null },
    backup_codes: [{ type: String }],
    last_login_device: { type: String, default: '' },
    last_login_ip: { type: String, default: '' },
    last_login_at: { type: Date, default: null },
  },
  settings: {
    language: { type: String, default: 'vi' },
    dark_mode: { type: Boolean, default: false },
    privacy_profile_visible: { type: Boolean, default: true },
    marketing_opt_in: { type: Boolean, default: true },
    sms_opt_in: { type: Boolean, default: true },
  },
  gamification_lock: {
    is_locked: { type: Boolean, default: false },
    scope: { type: String, enum: ['spin', 'checkin', 'all', null], default: null },
    reason: { type: String, default: '' },
    expires_at: { type: Date, default: null },
    locked_at: { type: Date, default: null },
    locked_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  last_login_at: { type: Date, default: null },
  refresh_token: { type: String, default: null },
  is_deleted: { type: Boolean, default: false },
  force_password_change: { type: Boolean, default: false },
  employee_info: {
    employee_code: { type: String, default: null },
    department: { type: String, default: null },
    work_type: { type: String, default: 'FULL_TIME', enum: ['FULL_TIME', 'PART_TIME', 'CONTRACTOR', null] },
    notes: { type: String, default: '' }
  }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Soft Delete Middleware
userSchema.pre('find', function () {
  if (this.getQuery().is_deleted === undefined) {
    this.where({ is_deleted: { $ne: true } });
  }
});
userSchema.pre('findOne', function () {
  if (this.getQuery().is_deleted === undefined) {
    this.where({ is_deleted: { $ne: true } });
  }
});
userSchema.pre('countDocuments', function () {
  if (this.getQuery().is_deleted === undefined) {
    this.where({ is_deleted: { $ne: true } });
  }
});

// Allow multiple users without email while keeping real emails unique.
userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: 'string', $ne: '' } } },
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password_hash') || !this.password_hash) return next();
  if (this.password_hash.startsWith('$2')) return next(); // already hashed
  this.password_hash = await bcrypt.hash(this.password_hash, 10);
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  if (!this.password_hash) return false;
  return bcrypt.compare(candidate, this.password_hash);
};

userSchema.methods.toPublic = function () {
  const obj = this.toObject();
  obj.has_password = !!this.password_hash;
  obj.authProviders = Array.isArray(this.authProviders) ? [...this.authProviders] : [];

  // Compute canonical auth_provider for frontend
  const providers = obj.authProviders || [];
  const hasPassword = !!this.password_hash;
  const hasGoogle = providers.includes('google');
  const hasFacebook = providers.includes('facebook');
  const hasPhone = providers.includes('phone');
  const hasLocal = providers.includes('local') || hasPassword;

  if (hasGoogle && hasPassword) {
    obj.auth_provider = 'LOCAL_GOOGLE_LINKED';
  } else if (hasFacebook && hasPassword) {
    obj.auth_provider = 'LOCAL_FACEBOOK_LINKED';
  } else if (hasGoogle) {
    obj.auth_provider = 'GOOGLE';
  } else if (hasFacebook) {
    obj.auth_provider = 'FACEBOOK';
  } else if (hasPhone && !hasPassword) {
    obj.auth_provider = 'PHONE';
  } else {
    obj.auth_provider = 'LOCAL';
  }

  delete obj.password_hash;
  delete obj.refresh_token;
  delete obj.email_verification_code;
  delete obj.email_verification_expires_at;
  delete obj.email_verification_attempts;
  delete obj.email_otp_last_sent_at;
  if (obj.security) {
    delete obj.security.totp_secret;
    delete obj.security.backup_codes;
  }
  delete obj.__v;
  obj.phone = String(obj.phone || '');
  obj.id = obj._id;
  return obj;
};

export default mongoose.model('User', userSchema);

import mongoose from 'mongoose';

const paymentMethodSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.Mixed, required: true },
  type: { type: String, default: 'card' },
  provider: { type: String, default: '' },
  brand: { type: String, default: '' },
  last4: { type: String, default: '' },
  holder_name: { type: String, default: '' },
  card_number: { type: String, default: '' },
  card_holder: { type: String, default: '' },
  expiry: { type: String, default: '' },
  phone: { type: String, default: '' },
  is_default: { type: Boolean, default: false },
  icon: { type: String, default: '' },
}, { timestamps: true });

const paymentTransactionSchema = new mongoose.Schema({
  order_id: { type: mongoose.Schema.Types.Mixed },
  user_id: { type: mongoose.Schema.Types.Mixed },
  provider: { type: String, default: '' },
  method_id: { type: String, default: '' },
  transaction_id: { type: String, default: '' },
  amount: { type: Number, default: 0 },
  currency: { type: String, default: 'VND' },
  status: { type: String, default: 'PENDING', enum: ['DRAFT', 'PENDING', 'PROCESSING', 'WAITING_CONFIRMATION', 'AUTHORIZED', 'COMPLETED', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED', 'REFUNDED'] },
  qr_data: {
    bank: { type: String, default: '' },
    account_name: { type: String, default: '' },
    account_number: { type: String, default: '' },
    amount: { type: Number, default: 0 },
    description: { type: String, default: '' },
    qr_url: { type: String, default: '' },
  },
  paid_at: { type: Date, default: null },
  expired_at: { type: Date, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const paymentProviderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true },
  icon: { type: String, default: '' },
  is_active: { type: Boolean, default: true },
  config: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

export const PaymentMethod = mongoose.model('PaymentMethod', paymentMethodSchema);
export const PaymentTransaction = mongoose.model('PaymentTransaction', paymentTransactionSchema);
export const PaymentProvider = mongoose.model('PaymentProvider', paymentProviderSchema);

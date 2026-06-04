import mongoose from 'mongoose';

const PriceHistorySchema = new mongoose.Schema({
  branch_product_id: { type: mongoose.Schema.Types.Mixed, required: true, index: true },
  old_price: { type: Number, required: true },
  new_price: { type: Number, required: true },
  changed_at: { type: Date, default: Date.now, index: true }
});

const PriceHistory = mongoose.model('PriceHistory', PriceHistorySchema);
export default PriceHistory;

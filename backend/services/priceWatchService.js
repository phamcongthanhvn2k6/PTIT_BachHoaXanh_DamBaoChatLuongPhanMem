import PriceWatch from '../models/PriceWatch.js';
import PriceHistory from '../models/PriceHistory.js';
import BranchProduct from '../models/BranchProduct.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { createUserNotification } from './userNotificationService.js';
import { sendPriceDropEmail } from './emailService.js';

/**
 * Handle price updates on a BranchProduct.
 * Logs to PriceHistory, updates active PriceWatches, and triggers alerts if price drops below target.
 */
export const handlePriceChange = async (branchProductId, oldPrice, newPrice) => {
  if (oldPrice === newPrice) return;

  try {
    // 1. Create price history record
    await PriceHistory.create({
      branch_product_id: branchProductId,
      old_price: oldPrice,
      new_price: newPrice,
      changed_at: new Date()
    });

    // 2. Update current price in all watchlist entries for this product
    await PriceWatch.updateMany(
      { branch_product_id: branchProductId },
      { current_price: newPrice }
    );

    // 3. Find watches that should be triggered
    // Trigger condition: status is 'active' AND newPrice <= target_price
    const triggeredWatches = await PriceWatch.find({
      branch_product_id: branchProductId,
      status: 'active',
      target_price: { $gte: newPrice }
    });

    if (triggeredWatches.length === 0) return;

    // Fetch BranchProduct and Product details for notification messaging
    const branchProduct = await BranchProduct.findById(branchProductId);
    if (!branchProduct) return;

    const product = await Product.findById(branchProduct.product_id);
    if (!product) return;

    for (const watch of triggeredWatches) {
      const user = await User.findById(watch.user_id);
      if (!user) continue;

      const productName = product.name;
      const productSlug = product.slug || '';
      const productLink = `/products/${productSlug}`;

      // Mark the watch status as triggered and update last notified
      watch.status = 'triggered';
      watch.last_notified_at = new Date();
      await watch.save();

      // Trigger In-App Notification if preferred
      if (watch.notification_preference === 'in_app' || watch.notification_preference === 'both') {
        await createUserNotification({
          userId: watch.user_id,
          title: 'Giam gia san pham ban theo doi!',
          message: `San pham "${productName}" da giam xuong ${newPrice.toLocaleString('vi-VN')}d (Muc tieu: ${watch.target_price.toLocaleString('vi-VN')}d)`,
          type: 'price_watch',
          icon: 'notifications_active',
          link: productLink,
          metadata: {
            branch_product_id: String(branchProductId),
            old_price: oldPrice,
            new_price: newPrice,
            target_price: watch.target_price
          }
        });
      }

      // Trigger Email Notification if preferred
      if ((watch.notification_preference === 'email' || watch.notification_preference === 'both') && user.email) {
        try {
          await sendPriceDropEmail({
            email: user.email,
            username: user.full_name || user.username || 'Quy khach',
            productName,
            oldPrice,
            newPrice,
            link: productLink
          });
        } catch (emailErr) {
          console.error(`Failed to send price drop email to ${user.email}:`, emailErr.message);
        }
      }
    }
  } catch (err) {
    console.error('[PriceWatchService] Error handling price change:', err.message);
  }
};

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('.env') });

const MONGO_URI = process.env.MONGODB_URI;

// Define Product schema
const productSchema = new mongoose.Schema({
  name: String,
  short_code: String,
  id: Number,
  rating: Number,
  average_rating: Number,
  review_count: Number,
  total_reviews: Number,
  rating_breakdown: mongoose.Schema.Types.Mixed,
  is_deleted: Boolean
}, { collection: 'products' });

const Product = mongoose.model('Product', productSchema);

// Define Review schema
const reviewSchema = new mongoose.Schema({
  product_id: mongoose.Schema.Types.Mixed,
  rating: Number,
  status: String,
}, { collection: 'reviews' });

const Review = mongoose.model('Review', reviewSchema);

async function run() {
  console.log('Connecting to:', MONGO_URI);
  await mongoose.connect(MONGO_URI);
  console.log('Connected!');

  const products = await Product.find({ is_deleted: { $ne: true } });
  console.log(`Found ${products.length} products to sync.`);

  let updatedCount = 0;
  for (const p of products) {
    // Find reviews matching either ObjectId, string ObjectId, numeric id, or short_code
    const queryIds = [p._id, String(p._id)];
    if (p.id) {
      queryIds.push(p.id);
      queryIds.push(String(p.id));
    }
    if (p.short_code) {
      queryIds.push(p.short_code);
    }

    const reviews = await Review.find({
      product_id: { $in: queryIds },
      status: { $in: ['active', 'published', 'approved'] }
    });

    const reviewCount = reviews.length;
    let averageRating = 0;
    const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    if (reviewCount > 0) {
      const sum = reviews.reduce((acc, curr) => acc + curr.rating, 0);
      averageRating = Number((sum / reviewCount).toFixed(1));
      
      reviews.forEach(r => {
        const ratingKey = String(Math.round(r.rating));
        if (ratingBreakdown[ratingKey] !== undefined) {
          ratingBreakdown[ratingKey] += 1;
        }
      });
    }

    p.rating = averageRating;
    p.average_rating = averageRating;
    p.review_count = reviewCount;
    p.total_reviews = reviewCount;
    p.rating_breakdown = ratingBreakdown;
    
    p.markModified('rating_breakdown');
    await p.save();
    updatedCount++;

    if (reviewCount > 0) {
      console.log(`Product "${p.name}" (${p.short_code || p._id}): rating=${averageRating}, reviews=${reviewCount}`);
    }
  }

  console.log(`Successfully synced ratings for ${updatedCount} products!`);
  await mongoose.disconnect();
}

run().catch(console.error);

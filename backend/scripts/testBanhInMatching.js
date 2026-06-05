import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { matchIngredient } from '../services/ingredientMatchingService.js';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');
  const branchId = '000000000000000000000001';
  console.log('Testing with active branch ID:', branchId);

  // Count BranchProduct entries
  const bpCount = await mongoose.model('BranchProduct').countDocuments();
  console.log('Total BranchProduct documents in DB:', bpCount);

  // List unique branch IDs in BranchProduct
  const uniqueBranches = await mongoose.model('BranchProduct').distinct('branch_id');
  console.log('Unique branch IDs in BranchProduct:', uniqueBranches.map(b => b.toString()));

  const ingredients = [
    'Bột nếp chín (bột bánh in)',
    'Đường tinh luyện',
    'Đậu xanh không vỏ',
    'Nước hoa bưởi',
    'Nước lọc',
    'Dầu ăn',
    'Muối'
  ];

  for (const ing of ingredients) {
    console.log(`\n========================================`);
    console.log(`Ingredient: "${ing}"`);
    const { match, substitutes } = await matchIngredient(ing, branchId);
    
    if (match) {
      console.log(` -> MATCHED: "${match.name}" (ID: ${match._id}, score: ${match.score}, stock: ${match.stock})`);
    } else {
      console.log(' -> MATCHED: Không có sản phẩm phù hợp');
    }
  }

  // Print all products in the database containing "dầu" or "nước" and their BranchProduct entries
  console.log('\n========================================');
  console.log('MANUAL INVENTORY DEBUG FOR DẦU & NƯỚC:');
  const ProductModel = mongoose.model('Product');
  const BranchProductModel = mongoose.model('BranchProduct');

  const oilProds = await ProductModel.find({ name: { $regex: 'dầu', $options: 'i' } }).lean();
  console.log(`\nFound ${oilProds.length} products matching "dầu":`);
  for (const p of oilProds) {
    const bp = await BranchProductModel.findOne({ product_id: p._id, branch_id: branchId }).lean();
    console.log(` - Product: "${p.name}", BranchProduct: ${bp ? `stock=${bp.stock}, available=${bp.is_available}, price=${bp.price}` : 'None'}`);
  }

  const waterProds = await ProductModel.find({ name: { $regex: 'nước', $options: 'i' } }).lean();
  console.log(`\nFound ${waterProds.length} products matching "nước":`);
  for (const p of waterProds) {
    const bp = await BranchProductModel.findOne({ product_id: p._id, branch_id: branchId }).lean();
    console.log(` - Product: "${p.name}", BranchProduct: ${bp ? `stock=${bp.stock}, available=${bp.is_available}, price=${bp.price}` : 'None'}`);
  }

  await mongoose.disconnect();
}

run().catch(console.error);

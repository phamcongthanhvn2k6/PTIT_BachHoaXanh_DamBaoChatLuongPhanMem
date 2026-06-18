// backend/tests/supportFlow.test.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import SupportTicket from '../models/SupportTicket.js';
import { sendMessage } from '../controllers/supportController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  console.log('Connecting to database...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected.');

  // Find or create test customer
  let customer = await User.findOne({ email: 'customer@lotte.com' });
  if (!customer) {
    console.log('Creating test customer...');
    customer = await User.create({
      username: 'test_customer',
      full_name: 'Test Customer',
      email: 'customer@lotte.com',
      role_id: 3,
      role_key: 'customer',
      is_active: true,
      email_verified: true,
      status: 'ACTIVE'
    });
  }

  // Find or create test admin
  let adminUser = await User.findOne({ email: 'admin@lottemart.vn' });
  if (!adminUser) {
    console.log('Creating test admin...');
    adminUser = await User.create({
      username: 'admin',
      full_name: 'Admin Lotte',
      email: 'admin@lottemart.vn',
      role_id: 1,
      role_key: 'super_admin',
      is_active: true,
      email_verified: true,
      status: 'ACTIVE'
    });
  }

  console.log(`Customer: ${customer.username} (ID: ${customer._id}, Role: ${customer.role_key})`);
  console.log(`Admin: ${adminUser.username} (ID: ${adminUser._id}, Role: ${adminUser.role_key})`);

  // Clean old test tickets
  await SupportTicket.deleteMany({ subject: 'Test Support Flow' });

  // 1. Create a support ticket from customer
  console.log('--- STEP 1: Creating support ticket ---');
  const ticket = await SupportTicket.create({
    subject: 'Test Support Flow',
    ticket_code: `SP${Date.now().toString().slice(-6)}${Math.floor(Math.random()*100)}`,
    user_id: customer._id,
    user_name: customer.full_name,
    message: 'Hello, I need help with an order.',
    status: 'open',
    thread: [{
      sender_type: 'user',
      sender_role: customer.role_key || 'customer',
      sender_id: customer._id,
      sender_name: customer.full_name,
      content: 'Hello, I need help with an order.',
      message: 'Hello, I need help with an order.',
      created_at: new Date()
    }]
  });
  console.log(`Ticket created: ${ticket._id}`);

  // Mock req/res helper
  const runSendMessage = (reqUser, body, params) => {
    return new Promise((resolve, reject) => {
      const req = {
        user: reqUser,
        userId: String(reqUser._id),
        body,
        params,
        app: {
          get: (name) => {
            if (name === 'io') {
              return {
                to: (room) => ({
                  emit: (event, data) => {
                    console.log(`[Socket.IO Mock] Emit '${event}' to room '${room}':`, data);
                  }
                })
              };
            }
            return null;
          }
        }
      };

      const res = {
        status: function(code) {
          this.statusCode = code;
          return this;
        },
        json: function(data) {
          resolve({ status: this.statusCode || 200, data });
        }
      };

      sendMessage(req, res).catch(reject);
    });
  };

  // 2. User sends message -> verify it gets stored
  console.log('--- STEP 2: User sends a new message ---');
  const userMsgResult = await runSendMessage(
    customer,
    { content: 'This is a follow up message from customer.' },
    { id: String(ticket._id) }
  );
  console.log('User message response:', JSON.stringify(userMsgResult, null, 2));
  if (userMsgResult.status !== 200) {
    throw new Error(`Failed to send user message: ${JSON.stringify(userMsgResult)}`);
  }

  // 3. Admin replies -> verify it gets accepted and stored
  console.log('--- STEP 3: Admin replies to the ticket ---');
  const adminMsgResult = await runSendMessage(
    adminUser,
    { content: 'Hello customer! This is admin support replying.' },
    { id: String(ticket._id) }
  );
  console.log('Admin message response:', JSON.stringify(adminMsgResult, null, 2));
  if (adminMsgResult.status !== 200) {
    throw new Error(`Failed to send admin message: ${JSON.stringify(adminMsgResult)}`);
  }

  // 4. Verify MongoDB storage
  console.log('--- STEP 4: Verifying MongoDB Storage ---');
  const updatedTicket = await SupportTicket.findById(ticket._id);
  console.log(`Found ticket: ${updatedTicket._id}`);
  console.log(`Thread has ${updatedTicket.thread.length} messages.`);
  
  updatedTicket.thread.forEach((msg, idx) => {
    console.log(`\nMessage #${idx + 1}:`);
    console.log(`- sender_id: ${msg.sender_id}`);
    console.log(`- sender_name: ${msg.sender_name}`);
    console.log(`- sender_type: ${msg.sender_type}`);
    console.log(`- sender_role: ${msg.sender_role}`);
    console.log(`- content (message): ${msg.content}`);
    console.log(`- message alias: ${msg.message}`);
    console.log(`- created_at: ${msg.created_at}`);
    
    // Perform checks
    if (!msg.sender_id) throw new Error(`Missing sender_id in message #${idx + 1}`);
    if (!msg.sender_name) throw new Error(`Missing sender_name in message #${idx + 1}`);
    if (!msg.sender_role) throw new Error(`Missing sender_role in message #${idx + 1}`);
    if (!msg.content) throw new Error(`Missing content in message #${idx + 1}`);
    if (!msg.message) throw new Error(`Missing message alias in message #${idx + 1}`);
    if (!msg.created_at) throw new Error(`Missing created_at in message #${idx + 1}`);
  });

  console.log('\n✅ All verifications passed successfully!');
  await mongoose.connection.close();
}

main().catch(async (err) => {
  console.error('❌ Verification failed:', err);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});

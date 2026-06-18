import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import FamilyCart from '../models/FamilyCart.js';
import { handleFamilyCartSocket } from '../services/familyCartSocket.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  console.log('Connecting to database...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected.');

  // Clean old test rooms
  const testRoomCode = 'LOTTE-TEST-123';
  await FamilyCart.deleteMany({ roomCode: testRoomCode });
  console.log('Cleaned old test rooms.');

  // Mock Socket.IO instances
  const mockIo = {
    to: (room) => ({
      emit: (event, data) => {
        console.log(`[Socket.IO Broadcast] to room '${room}' -> Event '${event}':`, JSON.stringify(data, null, 2));
      }
    })
  };

  const createMockSocket = (socketId) => {
    return {
      id: socketId,
      connected: true,
      rooms: new Set(),
      join: function (room) {
        this.rooms.add(room);
        console.log(`[Mock Socket ${this.id}] joined room: ${room}`);
      },
      leave: function (room) {
        this.rooms.delete(room);
        console.log(`[Mock Socket ${this.id}] left room: ${room}`);
      },
      emit: function (event, data) {
        console.log(`[Mock Socket ${this.id} Direct Output] -> Event '${event}':`, JSON.stringify(data, null, 2));
      },
      // Event register
      listeners: {},
      on: function (event, handler) {
        this.listeners[event] = handler;
      },
      // Simulate receiving event from client
      simulate: async function (event, payload) {
        if (this.listeners[event]) {
          await this.listeners[event](payload);
        } else {
          console.warn(`No listener registered on Socket ${this.id} for event '${event}'`);
        }
      }
    };
  };

  const socketA = createMockSocket('socket_device_a');
  const socketB = createMockSocket('socket_device_b');

  // Register handlers
  handleFamilyCartSocket(mockIo, socketA);
  handleFamilyCartSocket(mockIo, socketB);

  console.log('\n--- STEP 1: Device A Joins Room ---');
  await socketA.simulate('family_cart_join', {
    roomCode: testRoomCode,
    userId: 'user_a',
    userName: 'Alice'
  });

  console.log('\n--- STEP 2: Device B Joins Room ---');
  await socketB.simulate('family_cart_join', {
    roomCode: testRoomCode,
    userId: 'user_b',
    userName: 'Bob'
  });

  // Verify DB state after joins
  let cart = await FamilyCart.findOne({ roomCode: testRoomCode });
  if (!cart) throw new Error('Room not found in DB after joins');
  console.log(`\nDB State: Room ${cart.roomCode} has ${cart.members.length} members.`);
  if (cart.members.length !== 2) throw new Error(`Expected 2 members, got ${cart.members.length}`);

  console.log('\n--- STEP 3: Alice (Device A) Adds Apple ---');
  await socketA.simulate('family_cart_add_item', {
    roomCode: testRoomCode,
    item: {
      id: 'prod_apple_123',
      name: 'Táo Envy',
      image: 'apple.jpg',
      price: 25000,
      addedBy: 'Alice'
    }
  });

  console.log('\n--- STEP 4: Bob (Device B) Adds Orange ---');
  await socketB.simulate('family_cart_add_item', {
    roomCode: testRoomCode,
    item: {
      id: 'prod_orange_456',
      name: 'Cam Sành',
      image: 'orange.jpg',
      price: 15000,
      addedBy: 'Bob'
    }
  });

  // Verify item count in DB
  cart = await FamilyCart.findOne({ roomCode: testRoomCode });
  console.log(`\nDB State: Room has ${cart.items.length} items.`);
  if (cart.items.length !== 2) throw new Error(`Expected 2 items, got ${cart.items.length}`);

  console.log('\n--- STEP 5: Alice Updates Apple Qty to 5 ---');
  await socketA.simulate('family_cart_update_qty', {
    roomCode: testRoomCode,
    id: 'prod_apple_123',
    qty: 5
  });

  cart = await FamilyCart.findOne({ roomCode: testRoomCode });
  const appleItem = cart.items.find(i => i.id === 'prod_apple_123');
  console.log(`\nDB State: Apple quantity is ${appleItem.qty}`);
  if (appleItem.qty !== 5) throw new Error(`Expected apple qty to be 5, got ${appleItem.qty}`);

  console.log('\n--- STEP 6: Bob Removes Orange ---');
  await socketB.simulate('family_cart_remove_item', {
    roomCode: testRoomCode,
    id: 'prod_orange_456',
    removedBy: 'Bob'
  });

  cart = await FamilyCart.findOne({ roomCode: testRoomCode });
  console.log(`\nDB State: Room has ${cart.items.length} items remaining.`);
  if (cart.items.length !== 1) throw new Error(`Expected 1 item remaining, got ${cart.items.length}`);

  console.log('\n--- STEP 7: Alice Leaves Room ---');
  await socketA.simulate('family_cart_leave', {
    roomCode: testRoomCode,
    userId: 'user_a'
  });

  console.log('\n--- STEP 8: Bob Leaves Room (Should auto-clean room) ---');
  await socketB.simulate('family_cart_leave', {
    roomCode: testRoomCode,
    userId: 'user_b'
  });

  cart = await FamilyCart.findOne({ roomCode: testRoomCode });
  if (cart) throw new Error('Expected room to be auto-cleaned from database');
  console.log('\n✅ All Family Cart verification checks passed successfully!');

  await mongoose.connection.close();
}

main().catch(async (err) => {
  console.error('❌ Family Cart test failed:', err);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});

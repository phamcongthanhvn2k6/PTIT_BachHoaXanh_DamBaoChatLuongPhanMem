// backend/tests/eventManagement.test.js
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { EventPost } from '../models/EventPost.js';
import { resolveEventStatus, mapEventToContract } from '../controllers/eventController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

describe('Event Management System Hardening & Validation Audit', () => {
  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
  });

  after(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe('1. Automatic Event Status Resolution', () => {
    it('should resolve status to "draft" if explicitly set to draft, regardless of dates', () => {
      const event = {
        status: 'draft',
        start_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        end_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        is_published: false
      };
      const status = resolveEventStatus(event);
      assert.equal(status, 'draft');
    });

    it('should resolve status to "archived" if explicitly set to archived, regardless of dates', () => {
      const event = {
        status: 'archived',
        start_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        end_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        is_published: true
      };
      const status = resolveEventStatus(event);
      assert.equal(status, 'archived');
    });

    it('should resolve status to "scheduled" if status is published/active but start_date is in the future', () => {
      const event = {
        status: 'published',
        start_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        end_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        is_published: true
      };
      const status = resolveEventStatus(event);
      assert.equal(status, 'scheduled');
    });

    it('should resolve status to "expired" if status is published/active but end_date is in the past', () => {
      const event = {
        status: 'published',
        start_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        end_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        is_published: true
      };
      const status = resolveEventStatus(event);
      assert.equal(status, 'expired');
    });

    it('should resolve status to "published" if active, published, start_date is in past, and end_date is in future', () => {
      const event = {
        status: 'published',
        start_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        end_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        is_published: true
      };
      const status = resolveEventStatus(event);
      assert.equal(status, 'published');
    });
  });

  describe('2. Response Data Schema & API Contract Mapping', () => {
    it('should transform a DB event into the required camelCase frontend contract', () => {
      const dbEvent = {
        _id: new mongoose.Types.ObjectId(),
        title: 'Tuần lễ Sữa hạt Organic',
        slug: 'tuan-le-sua-hat-organic',
        excerpt: 'Chương trình sữa hạt chất lượng cao giảm sâu 30%.',
        description: 'Chi tiết mô tả sự kiện ở đây.',
        thumbnail: 'https://lottemart.com/images/sua-hat.jpg',
        banner: 'https://lottemart.com/images/sua-hat-banner.jpg',
        start_date: new Date('2026-05-15T00:00:00.000Z'),
        end_date: new Date('2026-06-15T00:00:00.000Z'),
        status: 'published',
        is_published: true,
        branch: 'Lotte Mart Quận 7',
        is_featured: true
      };

      const mapped = mapEventToContract(dbEvent);

      // Verify camelCase fields exist and match expected values
      assert.equal(mapped.id, dbEvent._id.toString(), 'id should be mapped correctly');
      assert.equal(mapped.title, dbEvent.title);
      assert.equal(mapped.slug, dbEvent.slug);
      assert.equal(mapped.summary, dbEvent.excerpt, 'summary should map to excerpt');
      assert.equal(mapped.description, dbEvent.description);
      assert.equal(mapped.image, dbEvent.thumbnail, 'image should map to thumbnail');
      assert.equal(mapped.banner, dbEvent.banner);
      assert.deepEqual(mapped.startDate, dbEvent.start_date);
      assert.deepEqual(mapped.endDate, dbEvent.end_date);
      assert.equal(mapped.status, 'published');
      assert.equal(mapped.branch, dbEvent.branch);
      assert.equal(mapped.isFeatured, dbEvent.is_featured);

      // Verify snake_case fields also persist for backward compatibility
      assert.equal(mapped._id, dbEvent._id.toString());
      assert.equal(mapped.thumbnail, dbEvent.thumbnail);
      assert.deepEqual(mapped.start_date, dbEvent.start_date);
      assert.deepEqual(mapped.end_date, dbEvent.end_date);
      assert.equal(mapped.is_featured, dbEvent.is_featured);
    });
  });

  describe('3. Database Integrity & CRUD Workflow', () => {
    let testEventId;

    it('should successfully perform Create workflow with validation and automated defaults', async () => {
      const payload = {
        title: 'Event CRUD Test ' + Date.now(),
        slug: 'event-crud-test-' + Date.now(),
        category_id: 2,
        excerpt: 'Summary for E2E testing',
        content_blocks: [{ type: 'text', text: 'Detailed description' }],
        thumbnail: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da',
        start_date: new Date(),
        end_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: 'published',
        is_published: true,
        is_featured: false,
        branch: 'Lotte Mart Cầu Giấy'
      };

      const created = await EventPost.create(payload);
      assert.ok(created._id, 'Event should be saved in DB and have an _id');
      assert.equal(created.title, payload.title);
      assert.ok(created.slug, 'Slug should be auto-assigned/validated');
      assert.equal(created.branch, 'Lotte Mart Cầu Giấy', 'Branch should be successfully assigned');

      testEventId = created._id;
    });

    it('should successfully perform Update workflow', async () => {
      assert.ok(testEventId, 'Must have a valid created ID to test update');
      const event = await EventPost.findById(testEventId);
      assert.ok(event);

      event.title = 'Updated Title ' + Date.now();
      event.branch = 'Lotte Mart Vũng Tàu';
      event.is_featured = true;

      const updated = await event.save();
      assert.equal(updated.title, event.title);
      assert.equal(updated.branch, 'Lotte Mart Vũng Tàu');
      assert.equal(updated.is_featured, true);
    });

    it('should successfully perform Delete workflow', async () => {
      assert.ok(testEventId, 'Must have a valid created ID to test delete');
      await EventPost.findByIdAndDelete(testEventId);

      const found = await EventPost.findById(testEventId);
      assert.equal(found, null, 'Deleted event should no longer exist in database');
    });
  });
});

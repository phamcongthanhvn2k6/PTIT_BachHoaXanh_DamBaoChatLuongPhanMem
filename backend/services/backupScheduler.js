// backend/services/backupScheduler.js
// ═══════════════════════════════════════════════════════
// Cron-based backup scheduler — runs daily at 2:00 AM
// ═══════════════════════════════════════════════════════
import cron from 'node-cron';
import { performBackup, cleanupOldBackups } from '../scripts/backupMongoDB.js';
import { checkMaintenanceMode } from '../middlewares/maintenanceGuard.js';

let schedulerStarted = false;

export function startBackupScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;

  // Run daily at 02:00 AM server time
  cron.schedule('0 2 * * *', async () => {
    const { canRunDuringMaintenance } = await import('../utils/schedulerPolicy.js');
    const allowed = await canRunDuringMaintenance('backup');
    if (!allowed) {
      console.warn('[BACKUP] Scheduled daily backup skipped because it is blocked during maintenance.');
      return;
    }
    console.log('[BACKUP] Starting scheduled daily backup...');
    try {
      await performBackup();
      const cleaned = await cleanupOldBackups(7); // Keep last 7 backups
      if (cleaned > 0) {
        console.log(`[BACKUP] Cleaned up ${cleaned} old backup(s)`);
      }
    } catch (err) {
      console.error('[BACKUP] Scheduled backup failed:', err.message);
    }
  }, {
    timezone: 'Asia/Ho_Chi_Minh'
  });

  console.log('✅ Backup scheduler started (daily at 02:00 AM ICT)');
}

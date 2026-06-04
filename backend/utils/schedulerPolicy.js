import { checkMaintenanceMode } from '../middlewares/maintenanceGuard.js';

/**
 * Checks if a background job or scheduled cron task is permitted to run under maintenance mode.
 * 
 * @param {string} jobType - Type of scheduled job ('backup', 'reconciliation', 'analytics_aggregation', etc.)
 * @returns {Promise<boolean>}
 */
export async function canRunDuringMaintenance(jobType) {
  const isMaintenance = await checkMaintenanceMode();
  if (!isMaintenance) {
    return true;
  }

  // Whitelisted scheduled jobs (always allowed)
  const ALLOWED_JOBS = ['backup', 'reconciliation', 'analytics_aggregation', 'payment_timeout'];

  // Blacklisted scheduled jobs (strictly blocked)
  const BLOCKED_JOBS = [
    'inventory_sync',
    'promotion_publish',
    'campaign_activation',
    'bulk_import'
  ];

  if (ALLOWED_JOBS.includes(jobType)) {
    return true;
  }

  if (BLOCKED_JOBS.includes(jobType)) {
    console.warn(`[SchedulerPolicy] Scheduled job '${jobType}' was BLOCKED due to active maintenance mode.`);
    return false;
  }

  // Safe default: block any unclassified jobs during maintenance
  console.warn(`[SchedulerPolicy] Unclassified scheduled job '${jobType}' was BLOCKED for system safety.`);
  return false;
}

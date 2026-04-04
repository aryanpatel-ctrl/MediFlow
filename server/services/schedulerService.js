/**
 * Scheduler Service
 * Handles periodic tasks like auto no-show detection and reminders
 */

const queueManager = require('./queueManager');
const mlService = require('./mlService');
const reminderService = require('./reminderService');

let noShowInterval = null;
let highRiskAlertInterval = null;

/**
 * Start auto no-show detection scheduler
 * Runs every 5 minutes during business hours
 */
function startNoShowScheduler(intervalMinutes = 5) {
  console.log(`Starting auto no-show scheduler (every ${intervalMinutes} minutes)`);

  // Clear any existing interval
  if (noShowInterval) {
    clearInterval(noShowInterval);
  }

  noShowInterval = setInterval(async () => {
    const now = new Date();
    const hour = now.getHours();

    // Only run during business hours (7 AM - 10 PM)
    if (hour >= 7 && hour <= 22) {
      try {
        console.log(`[${now.toISOString()}] Running auto no-show detection...`);
        const results = await queueManager.autoDetectNoShows();
        if (results.noShowsDetected > 0) {
          console.log(`Auto-detected ${results.noShowsDetected} no-shows`);
        }
      } catch (error) {
        console.error('Auto no-show detection error:', error.message);
      }
    }
  }, intervalMinutes * 60 * 1000);
}

/**
 * Start high-risk alert scheduler
 * Sends alerts for high-risk appointments
 */
function startHighRiskAlertScheduler(intervalMinutes = 30) {
  console.log(`Starting high-risk alert scheduler (every ${intervalMinutes} minutes)`);

  // Clear any existing interval
  if (highRiskAlertInterval) {
    clearInterval(highRiskAlertInterval);
  }

  highRiskAlertInterval = setInterval(async () => {
    const now = new Date();
    const hour = now.getHours();

    // Only run during business hours
    if (hour >= 7 && hour <= 22) {
      try {
        console.log(`[${now.toISOString()}] Checking for high-risk appointments...`);
        const highRisk = await mlService.identifyHighRiskAppointments(new Date(), 0.4);

        if (highRisk.length > 0) {
          console.log(`Found ${highRisk.length} high-risk appointments`);
          // Additional processing can be added here (e.g., sending SMS reminders)
        }
      } catch (error) {
        console.error('High-risk alert error:', error.message);
      }
    }
  }, intervalMinutes * 60 * 1000);
}

/**
 * Run immediate no-show check (for manual trigger)
 */
async function runNoShowCheckNow(hospitalId = null) {
  console.log('Running immediate no-show check...');
  return await queueManager.autoDetectNoShows(hospitalId);
}

/**
 * Stop all schedulers
 */
function stopSchedulers() {
  if (noShowInterval) {
    clearInterval(noShowInterval);
    noShowInterval = null;
    console.log('Stopped no-show scheduler');
  }

  if (highRiskAlertInterval) {
    clearInterval(highRiskAlertInterval);
    highRiskAlertInterval = null;
    console.log('Stopped high-risk alert scheduler');
  }
}

/**
 * Initialize all schedulers
 */
function initializeSchedulers(config = {}) {
  const noShowInterval = config.noShowIntervalMinutes || 5;
  const highRiskInterval = config.highRiskIntervalMinutes || 30;

  startNoShowScheduler(noShowInterval);
  startHighRiskAlertScheduler(highRiskInterval);

  // Start appointment reminder scheduler
  reminderService.startReminderScheduler();

  console.log('All schedulers initialized');
}

module.exports = {
  startNoShowScheduler,
  startHighRiskAlertScheduler,
  runNoShowCheckNow,
  stopSchedulers,
  initializeSchedulers
};

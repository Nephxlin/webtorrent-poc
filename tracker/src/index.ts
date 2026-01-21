import * as fs from 'fs';
import * as path from 'path';

async function main() {
  try {
    // Dynamic import for wt-tracker (ESM module)
    const { FastTracker, runSocketApp, validateSettings } = await import('wt-tracker');

    // Load configuration
    const configPath = process.argv[2] || path.join(__dirname, '..', 'config.json');

    let settings;
    try {
      const configData = fs.readFileSync(configPath, 'utf-8');
      settings = JSON.parse(configData);
    } catch (err) {
      console.error(`Failed to load config from ${configPath}:`, err);
      process.exit(1);
    }

    // Validate settings
    try {
      validateSettings(settings);
    } catch (err) {
      console.error('Invalid configuration:', err);
      process.exit(1);
    }

    // Create tracker instance with send message callback
    const sendMessage = (peer: any, message: string) => {
      try {
        peer.sendMessage(message);
      } catch (err) {
        // Peer may have disconnected
      }
    };

    const tracker = new FastTracker(settings.tracker, sendMessage);

    // Start the server
    
    await runSocketApp(tracker, settings);

    console.log('WebTorrent Tracker started successfully');
    console.log(`Listening on port ${settings.servers?.[0]?.server?.port || 8000}`);
    console.log('Tracker URL: ws://localhost:8000');
    console.log('\nPress Ctrl+C to stop the tracker');

  } catch (err) {
    console.error('Failed to start tracker:', err);
    process.exit(1);
  }
}

main();

// DEPRECATED: Flask server startup deprecated - using Node.js server only
// All functionality migrated to Node.js server with external API integration

console.log('Flask startup scripts deprecated - application now runs entirely on Node.js server');
console.log('Use "npm run dev" to start the application');

// Original Flask startup code commented out:
/*
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Log file paths
const flaskLogPath = path.join(__dirname, 'flask_app.log');

console.log('Checking if Flask server is already running...');

// Try to start Flask server if it's not already running
function startFlaskServer() {
  console.log('Starting Flask server...');
  
  // Create or truncate log file
  fs.writeFileSync(flaskLogPath, '', { flag: 'w' });
  
  // Start Flask server as a background process
  const flaskServer = spawn('python', ['app.py'], {
    detached: true,
    stdio: [
      'ignore', 
      fs.openSync(flaskLogPath, 'a'),
      fs.openSync(flaskLogPath, 'a')
    ]
  });
  
  // Detach the process so it keeps running
  flaskServer.unref();
  
  console.log('Flask server started on port 5001');
}

// Check if Flask server is running on port 5001
const net = require('net');
const client = new net.Socket();
const port = 5001;
const host = '127.0.0.1';

client.setTimeout(1000);

client.on('connect', function() {
  console.log('Flask server is already running on port 5001');
  client.destroy();
});

client.on('timeout', function() {
  console.log('Connection timed out, Flask server is not running');
  client.destroy();
  startFlaskServer();
});

client.on('error', function(error) {
  console.log('Flask server is not running, starting it now...');
  startFlaskServer();
});

client.connect(port, host);
*/
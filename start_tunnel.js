const { spawn } = require('child_process');
const fs = require('fs');

console.log("Starting Cloudflare tunnel...");

// Spawn cloudflared
const tunnel = spawn('npx', ['-y', 'cloudflared', 'tunnel', '--url', 'http://localhost:3001'], {
    shell: true
});

tunnel.stderr.on('data', (data) => {
    const output = data.toString();
    // Cloudflared logs to stderr. We look for the trycloudflare.com URL
    const match = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
    if (match) {
        const url = match[0];
        console.log("\n=======================================================");
        console.log("SUCCESS! Here is your Webhook URL:");
        console.log(url + "/api/webhooks/whatsapp-incoming");
        console.log("=======================================================\n");
        
        // Write to a file so it's super easy to copy
        fs.writeFileSync('WEBHOOK_URL.txt', url + "/api/webhooks/whatsapp-incoming");
    }
});

tunnel.stdout.on('data', (data) => {
    // some logs might go to stdout
    const output = data.toString();
    const match = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
    if (match) {
        fs.writeFileSync('WEBHOOK_URL.txt', match[0] + "/api/webhooks/whatsapp-incoming");
    }
});

tunnel.on('close', (code) => {
    console.log(`Tunnel process exited with code ${code}`);
});

console.log("Waiting for URL to be generated... (usually takes 5-10 seconds)");

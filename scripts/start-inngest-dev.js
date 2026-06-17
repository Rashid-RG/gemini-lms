const { spawn } = require('node:child_process');
const path = require('node:path');
const net = require('node:net');

require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

console.log('Inngest dev startup env:', {
  INNGEST_DEV: process.env.INNGEST_DEV,
  INNGEST_BASE_URL: process.env.INNGEST_BASE_URL,
  INNGEST_SIGNING_KEY: Boolean(process.env.INNGEST_SIGNING_KEY),
  INNGEST_SIGNING_KEY_FALLBACK: Boolean(process.env.INNGEST_SIGNING_KEY_FALLBACK),
  INNGEST_EVENT_KEY: Boolean(process.env.INNGEST_EVENT_KEY),
});

const DEFAULT_PORT = 8288;
const DEFAULT_GATEWAY_PORT = 8289;
const DEFAULT_EXECUTOR_GRPC_PORT = 50053;
const DEFAULT_SDK_URL = 'http://localhost:3000/api/inngest';

const args = process.argv.slice(2);

function isPortAvailable(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const cleanup = () => {
      if (settled) return;
      settled = true;
      socket.destroy();
    };

    socket.setTimeout(250);
    socket.once('connect', () => {
      cleanup();
      resolve(false);
    });
    socket.once('timeout', () => {
      cleanup();
      resolve(true);
    });
    socket.once('error', () => {
      cleanup();
      resolve(true);
    });
    socket.connect(port, host);
  });
}

function getFlagValue(name, short = null) {
  const idx = args.findIndex((arg) => arg === name || (short && arg === short));
  if (idx === -1) return null;
  return args[idx + 1] || null;
}

function hasFlag(name, short = null) {
  return args.some((arg) => arg === name || (short && arg === short));
}

async function validatePort(name, short, defaultPort) {
  if (hasFlag(name, short)) {
    const value = getFlagValue(name, short);
    if (!value || Number.isNaN(Number(value))) {
      throw new Error(`Missing or invalid value for ${name}`);
    }
    const port = Number(value);
    const available = await isPortAvailable(port);
    if (!available) {
      throw new Error(`Requested port ${port} for ${name} is already in use. Use a free port or stop the process using it.`);
    }
    return null;
  }

  const available = await isPortAvailable(defaultPort);
  if (!available) {
    throw new Error(`Required default port ${defaultPort} is already in use. Stop the existing process or pass an explicit ${name} value.`);
  }
  return defaultPort;
}

async function main() {
  const devPort = await validatePort('--port', '-p', DEFAULT_PORT);
  const gatewayPort = await validatePort('--connect-gateway-port', null, DEFAULT_GATEWAY_PORT);
  const grpcPort = await validatePort('--connect-executor-grpc-port', null, DEFAULT_EXECUTOR_GRPC_PORT);
  const hasSdkUrlFlag = hasFlag('--sdk-url', '-u');

  const defaultArgs = [];
  if (devPort) defaultArgs.push('--port', String(devPort));
  if (gatewayPort) defaultArgs.push('--connect-gateway-port', String(gatewayPort));
  if (grpcPort) defaultArgs.push('--connect-executor-grpc-port', String(grpcPort));
  if (!hasSdkUrlFlag) defaultArgs.push('--sdk-url', DEFAULT_SDK_URL);

  const baseUrlFromEnv = process.env.INNGEST_BASE_URL?.trim();
  if (baseUrlFromEnv) {
    try {
      const parsed = new URL(baseUrlFromEnv);
      if (devPort && parsed.port && Number(parsed.port) !== devPort) {
        console.warn(`WARNING: INNGEST_BASE_URL is set to ${baseUrlFromEnv} but the dev server will start on port ${devPort}.`);
        console.warn('If you use a custom dev port, also update INNGEST_BASE_URL / INNGEST_API_BASE_URL / INNGEST_EVENT_API_BASE_URL in your app environment.');
      }
    } catch (err) {
      console.warn(`WARNING: INNGEST_BASE_URL value is not a valid URL: ${baseUrlFromEnv}`);
    }
  }

  const childArgs = ['inngest-cli@latest', 'dev', ...defaultArgs, ...args];
  console.log('Starting Inngest dev server with args:', childArgs.join(' '));
  
  // Debug: Log the signing key (first 10 chars + ellipsis for security)
  const keyPreview = process.env.INNGEST_SIGNING_KEY 
    ? `${process.env.INNGEST_SIGNING_KEY.substring(0, 10)}...` 
    : '<NOT SET>';
  console.log('Debug - Signing key state:', keyPreview);
  console.log('Debug - Event key present:', !!process.env.INNGEST_EVENT_KEY);
  console.log('Debug - Base URL:', process.env.INNGEST_BASE_URL);

  // Pass all env vars explicitly to the CLI subprocess
  const cliEnv = {
    ...process.env,
    // Force these critical vars for the CLI
    INNGEST_SIGNING_KEY: process.env.INNGEST_SIGNING_KEY,
    INNGEST_SIGNING_KEY_FALLBACK: process.env.INNGEST_SIGNING_KEY_FALLBACK,
    INNGEST_EVENT_KEY: process.env.INNGEST_EVENT_KEY,
    INNGEST_DEV: '1',
    INNGEST_BASE_URL: 'http://localhost:8288',
  };

  const child = spawn('npx', childArgs, {
    stdio: 'inherit',
    shell: true,
    env: cliEnv,
  });

  child.on('exit', (code) => process.exit(code));
  child.on('error', (err) => {
    console.error('Failed to start Inngest dev server:', err);
    process.exit(1);
  });
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});

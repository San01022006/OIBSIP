/* eslint-disable no-console */
import { env } from '../config/env.js';
import { verifyMailer, isRealMailerConfigured } from '../utils/mailer.js';

const line = (label, value) => console.log(`  ${label.padEnd(12)}: ${value}`);

async function main() {
  console.log('\nCrust & Craft — SMTP diagnostic\n');
  line('NODE_ENV', env.nodeEnv);
  line('SMTP host', env.smtp.host || '(not set)');
  line('SMTP port', env.smtp.port);
  line('SMTP secure', env.smtp.secure);
  line('SMTP auth', env.smtp.user ? 'configured' : 'anonymous');
  line('Mail from', env.mailFrom);
  console.log('');

  if (!isRealMailerConfigured()) {
    console.log('Result: SMTP is NOT configured — emails are logged to the console, not delivered.');
    console.log('Set SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER and SMTP_PASS in server/.env,');
    console.log('then re-run: npm run mail:check\n');
    process.exit(1);
  }

  const result = await verifyMailer();
  if (result.ok) {
    console.log('Result: SMTP connection and authentication succeeded — delivery should work.\n');
    process.exit(0);
  }

  console.log(`Result: SMTP verification FAILED${result.code ? ` (${result.code})` : ''}.`);
  if (result.error) console.log(`  ${result.error}`);
  console.log('Check your SMTP host/port/security and credentials (for Gmail use an App Password).\n');
  process.exit(1);
}

main().catch((err) => {
  console.error(`Diagnostic failed: ${err.message}`);
  process.exit(1);
});

import 'dotenv/config';
import nodemailer from 'nodemailer';
import dns from 'dns';
import { promisify } from 'util';

const resolve4 = promisify(dns.resolve4);

console.log('🔍 Email Configuration Diagnostics\n');

// Test 1: Check environment variables
console.log('1. Environment Variables:');
console.log('   EMAIL_HOST:', process.env.EMAIL_HOST || 'NOT SET');
console.log('   EMAIL_PORT:', process.env.EMAIL_PORT || 'NOT SET');
console.log('   EMAIL_USER:', process.env.EMAIL_USER || 'NOT SET');
console.log('   EMAIL_PASS:', process.env.EMAIL_PASS ? '***SET***' : 'NOT SET');
console.log('   EMAIL_FROM:', process.env.EMAIL_FROM || 'NOT SET');
console.log();

// Test 2: DNS Resolution
console.log('2. Testing DNS Resolution for smtp.gmail.com...');
try {
  const addresses = await resolve4('smtp.gmail.com');
  console.log('   ✅ DNS Resolution successful:', addresses);
} catch (error) {
  console.log('   ❌ DNS Resolution failed:', error.message);
  console.log('   This means your network cannot resolve Gmail\'s SMTP server.');
  console.log('   Possible fixes:');
  console.log('   - Check your internet connection');
  console.log('   - Try changing DNS servers (8.8.8.8, 1.1.1.1)');
  console.log('   - Check if VPN/Proxy is blocking DNS');
  process.exit(1);
}
console.log();

// Test 3: SMTP Connection
if (process.env.EMAIL_USER && process.env.EMAIL_PASS && 
    process.env.EMAIL_USER !== 'your-email@gmail.com') {
  
  console.log('3. Testing SMTP Connection...');
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
  });

  try {
    await transporter.verify();
    console.log('   ✅ SMTP Connection successful!');
    console.log();

    // Test 4: Send test email
    console.log('4. Sending test email...');
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_USER,
      subject: 'Test Email from Passkey Login',
      text: 'If you receive this, your email configuration is working!',
      html: '<h2>Success!</h2><p>Your email configuration is working correctly.</p>',
    });
    console.log('   ✅ Test email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log();
    console.log('✅ All tests passed! Email is configured correctly.');
  } catch (error) {
    console.log('   ❌ SMTP Connection/Send failed:', error.message);
    console.log();
    console.log('   Common issues:');
    console.log('   - Using regular password instead of App Password');
    console.log('   - Firewall blocking port 587');
    console.log('   - Wrong email/password');
    console.log('   - 2FA not enabled on Gmail');
    console.log();
    console.log('   To fix:');
    console.log('   1. Enable 2FA: https://myaccount.google.com/security');
    console.log('   2. Generate App Password: https://myaccount.google.com/apppasswords');
    console.log('   3. Update .env with the 16-character App Password');
  }
} else {
  console.log('3. Skipping SMTP test - Email not configured in .env');
  console.log('   Update .env with your Gmail credentials to test email sending.');
}

console.log();
console.log('💡 Tip: The app works in development mode without email configuration.');
console.log('   Verification codes will be shown in the server console.');

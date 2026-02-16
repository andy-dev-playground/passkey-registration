# Passkey Login Application

A modern, secure authentication system using WebAuthn passkeys with email verification, built with Node.js and Express.

## 🚀 Features

### Authentication
- **Passkey Authentication** - Passwordless login using WebAuthn (biometrics, security keys, or device authentication)
- **Email Verification** - 6-digit code verification during registration
- **Multi-Device Support** - Register and use passkeys across multiple devices
- **Session Management** - Secure session handling with logout functionality

### User Management
- **Registration Flow** - Complete registration with email, mobile, and terms acceptance
- **Dashboard** - User profile with passkey management
- **Multiple Passkeys** - Add, view, and delete passkeys after login
- **Passkey Details** - View device type, sync status, and creation date for each passkey

### Security
- **WebAuthn Standard** - Industry-standard FIDO2 authentication
- **No Passwords** - Eliminates password-related vulnerabilities
- **Device Biometrics** - Uses Face ID, Touch ID, Windows Hello, or security keys
- **Credential Storage** - Passkey data stored securely in JSON file

## 📋 Prerequisites

- **Node.js** v20.x or higher
- **npm** v11.x or higher
- Modern browser with WebAuthn support (Chrome, Firefox, Safari, Edge)
- Gmail account with App Password (optional, for email sending)

## 🛠️ Installation

1. **Clone or download the project**
   ```bash
   cd passkey-login
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure email (Optional)**
   
   The app works in **development mode** by default (verification codes shown in console).
   
   To enable real email sending, edit `.env`:
   ```env
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-16-char-app-password
   EMAIL_FROM=your-email@gmail.com
   ```

   **For Gmail:**
   - Enable 2-Factor Authentication: https://myaccount.google.com/security
   - Generate App Password: https://myaccount.google.com/apppasswords
   - Use the 16-character App Password (not your regular password)

4. **Start the server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

## 📖 Usage

### First Time Registration

1. Click **"Register New Account"** button
2. Fill in the registration form:
   - Username
   - Email address
   - Mobile number
3. Check the **Terms and Conditions** checkbox
4. Click **"Proceed"**
5. Check your email (or server console in dev mode) for the 6-digit verification code
6. Enter the code and click **"Verify & Register Passkey"**
7. Follow your browser's prompt to create a passkey (Face ID, Touch ID, Windows Hello, etc.)
8. Registration complete!

### Login

1. Enter your username
2. Click **"Login"**
3. Authenticate with your passkey (biometric or security key)
4. Redirected to dashboard

### Dashboard Features

After login, you can:

- **View user information** - Username and user ID
- **Manage passkeys** - See all registered passkeys with details:
  - Device type (single-device or multi-device)
  - Sync status (synced or device-only)
  - Creation date
- **Add new passkey** - Register additional passkeys from other devices
- **Delete passkey** - Remove old or unused passkeys (must keep at least one)
- **Logout** - End your session

### Adding Additional Passkeys

1. From the dashboard, click **"Add New Passkey"**
2. Follow the browser prompt to register a new passkey
3. The new passkey appears in your list
4. You can now login with any of your registered passkeys

## 🏗️ Project Structure

```
passkey-login/
├── public/
│   ├── index.html          # Login page
│   ├── dashboard.html      # User dashboard
│   ├── app.js             # Login/registration logic
│   ├── dashboard.js       # Dashboard and passkey management
│   └── style.css          # Styling
├── server.js              # Express server and API endpoints
├── package.json           # Dependencies and scripts
├── .env                   # Email configuration (optional)
├── users.json            # User and passkey storage (auto-generated)
├── test-email.js         # Email configuration diagnostic tool
└── README.md             # This file
```

## 🔧 API Endpoints

### Registration
- `POST /register/request` - Request verification code
- `POST /register/verify` - Verify email code
- `POST /register/start` - Start passkey registration
- `POST /register/finish` - Complete passkey registration

### Authentication
- `POST /login/start` - Start authentication
- `POST /login/finish` - Complete authentication

### Passkey Management
- `POST /passkeys/list` - Get user's passkeys
- `POST /passkeys/add/start` - Start adding new passkey
- `POST /passkeys/add/finish` - Complete adding new passkey
- `POST /passkeys/delete` - Delete a passkey

## 🧪 Testing Email Configuration

Run the diagnostic tool to test your email setup:

```bash
npm run test-email
```

This will:
1. Check environment variables
2. Test DNS resolution for SMTP server
3. Verify SMTP connection
4. Send a test email

## 🔒 Security Features

- **WebAuthn/FIDO2** - Industry-standard authentication protocol
- **Public Key Cryptography** - Credentials never leave the device
- **Phishing Resistant** - Domain-bound credentials
- **No Password Storage** - Eliminates password database breaches
- **User Verification** - Biometric or PIN required
- **Replay Attack Protection** - Challenge-response mechanism
- **Counter Tracking** - Detects cloned authenticators

## 🌐 Browser Support

| Browser | Version | Support |
|---------|---------|---------|
| Chrome  | 67+     | ✅ Full |
| Firefox | 60+     | ✅ Full |
| Safari  | 13+     | ✅ Full |
| Edge    | 18+     | ✅ Full |

## 📝 Development Mode

By default, the app runs in development mode:
- Verification codes are printed to the server console
- No email configuration required
- Perfect for testing and development

To enable production mode, configure valid email credentials in `.env`.

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| EMAIL_HOST | SMTP server hostname | smtp.gmail.com | No |
| EMAIL_PORT | SMTP server port | 587 | No |
| EMAIL_USER | Email account username | - | No |
| EMAIL_PASS | Email account password/app password | - | No |
| EMAIL_FROM | Sender email address | - | No |

### Server Configuration

Edit `server.js` to customize:
- `PORT` - Server port (default: 3000)
- `rpName` - Relying Party name displayed during registration
- `rpID` - Domain name (use 'localhost' for local development)
- `origin` - Full origin URL

## 🐛 Troubleshooting

### "Email sending failed" error
- Check your email credentials in `.env`
- Ensure you're using an App Password for Gmail (not regular password)
- Run `npm run test-email` to diagnose
- App works in dev mode without email configuration

### "No passkey found" error
- Make sure you registered a passkey first
- Try registering again if the previous attempt failed
- Check browser console for WebAuthn errors

### DNS timeout errors
- Check your internet connection
- Try changing DNS servers (8.8.8.8 or 1.1.1.1)
- Disable VPN/proxy temporarily
- Use development mode (codes in console)

### Browser doesn't support passkeys
- Update to the latest browser version
- Check if WebAuthn is enabled in browser settings
- Try a different browser

## 📦 Dependencies

- **express** (^5.2.1) - Web framework
- **@simplewebauthn/server** (^13.2.2) - WebAuthn server library
- **nodemailer** (^6.9.16) - Email sending
- **dotenv** (^16.4.7) - Environment variable management

## 🚀 Production Deployment

For production deployment:

1. **Use HTTPS** - WebAuthn requires HTTPS (except localhost)
2. **Update rpID** - Set to your actual domain
3. **Update origin** - Set to your HTTPS URL
4. **Configure email** - Set up proper email service
5. **Secure storage** - Use a proper database instead of JSON file
6. **Environment variables** - Use secure secret management
7. **Rate limiting** - Add rate limiting to prevent abuse
8. **Logging** - Implement proper logging and monitoring

## 📄 License

This project is provided as-is for educational and development purposes.

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Run the email diagnostic tool: `npm run test-email`
3. Check browser console for errors
4. Review server logs for detailed error messages

## 🎯 Future Enhancements

Potential improvements:
- Database integration (PostgreSQL, MongoDB)
- User profile editing
- Password recovery flow
- Admin dashboard
- Multi-factor authentication options
- Audit logs
- Rate limiting
- Session timeout configuration
- Remember device option
- Passkey nicknames/labels

---

Built with ❤️ using WebAuthn and Node.js

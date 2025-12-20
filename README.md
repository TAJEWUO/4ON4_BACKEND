# 4ON4 Backend API

Backend server for the 4ON4 application, providing authentication, profile management, and vehicle services.

## Features

- **Secure Authentication**: Cookie-based refresh token flow with httpOnly cookies
- **Phone Verification**: OTP-based verification using Twilio
- **Profile Management**: User profile and vehicle management
- **JWT Tokens**: Access tokens (2h expiry) and refresh tokens (14d expiry)

## Environment Variables

Create a `.env` file in the root directory with the following variables:

### Required Variables

```env
# JWT Configuration (REQUIRED)
JWT_SECRET=your_access_token_secret_here
JWT_REFRESH_SECRET=your_refresh_token_secret_here  # Recommended for better security

# Database (REQUIRED)
MONGODB_URI=your_mongodb_connection_string

# Twilio Verification (REQUIRED for OTP)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_VERIFY_SID=your_twilio_verify_service_id

# Server Configuration
NODE_ENV=production  # Set to 'production' for secure cookies in production
PORT=3002           # Server port (default: 10000)

# Frontend Configuration
FRONTEND_URL=https://yourdomain.com  # Your frontend URL for CORS
```

### Optional Variables

```env
# Email Service (Optional)
RESEND_API_KEY=your_resend_api_key  # Leave empty to disable email
```

## Installation

```bash
npm install
```

## Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

## API Endpoints

### Authentication Routes (`/api/auth`)

#### Start Phone Verification
```bash
POST /api/auth/verify/start
Content-Type: application/json

{
  "phone": "0712345678",  # Kenyan phone number
  "mode": "register"      # or "reset"
}
```

#### Check Verification Code
```bash
POST /api/auth/verify/check
Content-Type: application/json

{
  "phone": "0712345678",
  "code": "123456",
  "mode": "register"
}

# Returns:
# - For register mode: { success: true, token: "temp_token", message: "..." }
# - For reset mode: { success: true, resetToken: "reset_token", message: "..." }
```

#### Complete Registration
```bash
POST /api/auth/register-complete
Content-Type: application/json

{
  "token": "verification_token_from_check",
  "pin": "1234",
  "confirmPin": "1234"
}

# Returns:
# - accessToken in response body
# - refreshToken set as httpOnly cookie
{
  "success": true,
  "message": "Account created",
  "user": { "id": "...", "phone": "..." },
  "accessToken": "..."
}
```

#### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "phone": "0712345678",
  "pin": "1234"
}

# Returns:
# - accessToken in response body
# - refreshToken set as httpOnly cookie
{
  "success": true,
  "message": "Login successful",
  "user": { "id": "...", "phone": "..." },
  "accessToken": "..."
}
```

#### Refresh Access Token
```bash
POST /api/auth/refresh
Cookie: refreshToken=your_refresh_token

# Alternative (for transition period):
Content-Type: application/json
{
  "refreshToken": "your_refresh_token"
}

# Returns:
{
  "success": true,
  "accessToken": "new_access_token"
}
```

#### Reset PIN
```bash
POST /api/auth/reset-pin-complete
Content-Type: application/json

{
  "token": "reset_token_from_verify_check",
  "pin": "5678",
  "confirmPin": "5678"
}
```

### Protected Routes

For all protected routes (profile, vehicles), include the access token in the Authorization header:

```bash
Authorization: Bearer your_access_token
```

## Testing the Refresh Token Flow

### Test with cURL

1. **Login and save cookies:**
```bash
curl -c cookies.txt -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone": "0712345678", "pin": "1234"}'
```

2. **Use the access token for protected routes:**
```bash
# Replace YOUR_ACCESS_TOKEN with the accessToken from login response
curl -X GET http://localhost:3002/api/profile/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

3. **Refresh the access token using the cookie:**
```bash
curl -b cookies.txt -X POST http://localhost:3002/api/auth/refresh
```

4. **Test with browser:**
   - Open browser DevTools → Application → Cookies
   - Login via your frontend
   - Check that `refreshToken` cookie is set with:
     - `HttpOnly`: true
     - `Path`: /api/auth/refresh
     - `SameSite`: Lax
     - `Secure`: true (in production)

## Security Features

- **httpOnly Cookies**: Refresh tokens stored in httpOnly cookies prevent XSS attacks
- **Secure Flag**: Cookies marked as secure in production (HTTPS only)
- **SameSite Protection**: Lax SameSite policy prevents CSRF attacks
- **Path Restriction**: Refresh token cookie only sent to `/api/auth/refresh`
- **CORS Configuration**: Credentials enabled with specific origins (no wildcards)
- **Token Expiry**: Access tokens expire in 2 hours, refresh tokens in 14 days

## Cookie Configuration

The refresh token cookie is set with the following options:

```javascript
{
  httpOnly: true,                           // Not accessible via JavaScript
  secure: process.env.NODE_ENV === 'production',  // HTTPS only in production
  sameSite: 'lax',                         // CSRF protection
  path: '/api/auth/refresh',               // Only sent to refresh endpoint
  maxAge: 14 * 24 * 60 * 60 * 1000        // 14 days
}
```

## CORS Configuration

The server accepts requests from:
- `http://localhost:3000` (development)
- `https://4on4.world`
- `https://4on4.site`
- Any subdomain of `.vercel.app`

CORS is configured with `credentials: true` to allow cookies.

## Backwards Compatibility

During the transition period, the `/api/auth/refresh` endpoint accepts refresh tokens from:
1. **Cookie** (preferred): `req.cookies.refreshToken`
2. **Request Body** (fallback): `req.body.refreshToken`

This allows for a smooth migration from body-based to cookie-based refresh tokens.

## Development Notes

- Phone numbers are normalized to E.164 format (+254XXXXXXXXX for Kenya)
- PINs must be exactly 4 digits
- Access tokens expire after 2 hours
- Refresh tokens expire after 14 days
- OTP codes expire after a short period (managed by Twilio)

## License

ISC

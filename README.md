# 4ON4 Backend

Backend server for the 4ON4 application.

## Environment Variables

The following environment variables are required for the application to run:

### Required Variables

- `JWT_SECRET` - Secret key used to sign access tokens (2h expiry)
- `JWT_REFRESH_SECRET` - Secret key used to sign refresh tokens (14d expiry). If not provided, falls back to `JWT_SECRET`
- `NODE_ENV` - Environment mode (`development` or `production`). In production, cookies are marked as secure
- `FRONTEND_ORIGIN` - Frontend origin URL for CORS configuration (e.g., `http://localhost:3000` or your production domain)
- `MONGO_URI` - MongoDB connection string
- `PORT` - Server port (defaults to 10000)

### Twilio Variables (for OTP verification)

- `TWILIO_ACCOUNT_SID` - Twilio account SID
- `TWILIO_AUTH_TOKEN` - Twilio auth token
- `TWILIO_VERIFY_SID` - Twilio verify service SID

### Example .env file

```env
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:3000
MONGO_URI=mongodb://localhost:27017/4on4
PORT=10000
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_VERIFY_SID=your-verify-sid
```

## Installation

```bash
npm install
```

## Running the Server

Development mode with auto-reload:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## Authentication Flow

### 1. Register Flow

1. **Start Verification**: `POST /api/auth/verify/start`
   - Body: `{ phone: "0712345678", mode: "register" }`
   - Sends OTP via SMS

2. **Check Verification**: `POST /api/auth/verify/check`
   - Body: `{ phone: "0712345678", code: "123456", mode: "register" }`
   - Returns a temporary registration token

3. **Complete Registration**: `POST /api/auth/register-complete`
   - Body: `{ token: "temp-token", pin: "1234", confirmPin: "1234" }`
   - Sets httpOnly refresh token cookie
   - Returns: `{ success: true, accessToken, user }`

### 2. Login Flow

**Login**: `POST /api/auth/login`
- Body: `{ phone: "0712345678", pin: "1234" }`
- Sets httpOnly refresh token cookie
- Returns: `{ success: true, accessToken, user }`

### 3. Refresh Token Flow

**Refresh Access Token**: `POST /api/auth/refresh`
- Cookie: `refreshToken` (httpOnly)
- Fallback: Body `{ refreshToken }` (for migration)
- Returns: `{ success: true, accessToken }`

### 4. Reset PIN Flow

1. **Start Verification**: `POST /api/auth/verify/start`
   - Body: `{ phone: "0712345678", mode: "reset" }`

2. **Check Verification**: `POST /api/auth/verify/check`
   - Body: `{ phone: "0712345678", code: "123456", mode: "reset" }`
   - Returns reset token

3. **Complete Reset**: `POST /api/auth/reset-pin-complete`
   - Body: `{ token: "reset-token", pin: "1234", confirmPin: "1234" }`

## Testing the Authentication Flow

### Using curl

#### 1. Register a new account

```bash
# Start verification
curl -X POST http://localhost:10000/api/auth/verify/start \
  -H "Content-Type: application/json" \
  -d '{"phone":"0712345678","mode":"register"}'

# Check verification (use OTP from SMS)
curl -X POST http://localhost:10000/api/auth/verify/check \
  -H "Content-Type: application/json" \
  -d '{"phone":"0712345678","code":"123456","mode":"register"}'

# Complete registration (use token from previous response)
curl -X POST http://localhost:10000/api/auth/register-complete \
  -H "Content-Type: application/json" \
  -d '{"token":"TEMP_TOKEN","pin":"1234","confirmPin":"1234"}' \
  -c cookies.txt
```

#### 2. Login

```bash
curl -X POST http://localhost:10000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"0712345678","pin":"1234"}' \
  -c cookies.txt
```

#### 3. Refresh access token (using cookie)

```bash
curl -X POST http://localhost:10000/api/auth/refresh \
  -b cookies.txt
```

#### 4. Refresh access token (using body - migration fallback)

```bash
curl -X POST http://localhost:10000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"YOUR_REFRESH_TOKEN"}'
```

#### 5. Access protected route

```bash
# Assuming you have a protected route like /api/profile
curl -X GET http://localhost:10000/api/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Using Browser/Postman

1. **Login** - Make a POST request to `/api/auth/login`
   - The refresh token will be automatically stored as an httpOnly cookie
   - Save the `accessToken` from the response

2. **Access Protected Routes** - Use the access token in the Authorization header:
   - Header: `Authorization: Bearer <accessToken>`

3. **Refresh Token** - When access token expires (after 2 hours):
   - POST to `/api/auth/refresh` (no body needed if using browser)
   - The cookie will be sent automatically
   - You'll receive a new access token

## Security Notes

- Refresh tokens are stored in httpOnly cookies to prevent XSS attacks
- In production, cookies are marked as `secure` (HTTPS only)
- Access tokens have a short 2-hour expiry
- Refresh tokens have a 14-day expiry
- CORS is configured to only allow specific origins with credentials
- The refresh endpoint path is restricted: `/api/auth/refresh`

## Migration Support

For backward compatibility during migration:
- The `/api/auth/refresh` endpoint accepts refresh tokens in the request body if the cookie is not present
- This allows existing clients to continue working while new clients use the cookie-based approach

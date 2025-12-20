# Testing Guide: Cookie-Based Refresh Token Flow

This guide shows how to test the new cookie-based refresh token implementation.

## Prerequisites

- Server running on port 3002 (or your configured PORT)
- A registered user account with phone and PIN
- curl installed on your system

## Test Scenarios

### Scenario 1: Complete Login → Refresh Flow

#### Step 1: Login and Save Cookies

```bash
curl -c cookies.txt -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "0712345678",
    "pin": "1234"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "...",
    "phone": "+254712345678"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Note:** The `refreshToken` is NOT in the response body. It's stored in the `cookies.txt` file as an httpOnly cookie.

#### Step 2: Verify Cookie Contents

```bash
cat cookies.txt
```

You should see a line containing:
```
localhost	FALSE	/api/auth/refresh	FALSE	[timestamp]	refreshToken	[token_value]
```

#### Step 3: Use Access Token for Protected Endpoints

```bash
# Replace YOUR_ACCESS_TOKEN with the token from Step 1
curl -X GET http://localhost:3002/api/profile/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Step 4: Refresh the Access Token (Cookie-Based)

```bash
# This uses the cookie from cookies.txt
curl -b cookies.txt -X POST http://localhost:3002/api/auth/refresh
```

**Expected Response:**
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Step 5: Use New Access Token

```bash
# Replace NEW_ACCESS_TOKEN with the token from Step 4
curl -X GET http://localhost:3002/api/profile/me \
  -H "Authorization: Bearer NEW_ACCESS_TOKEN"
```

### Scenario 2: Registration → Automatic Login

```bash
# Step 1: Start verification
curl -X POST http://localhost:3002/api/auth/verify/start \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "0798765432",
    "mode": "register"
  }'

# Step 2: Check verification (replace CODE with the OTP received)
curl -X POST http://localhost:3002/api/auth/verify/check \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "0798765432",
    "code": "123456",
    "mode": "register"
  }'

# Save the token from response as TEMP_TOKEN

# Step 3: Complete registration with cookie capture
curl -c cookies.txt -X POST http://localhost:3002/api/auth/register-complete \
  -H "Content-Type: application/json" \
  -d '{
    "token": "TEMP_TOKEN",
    "pin": "5678",
    "confirmPin": "5678"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Account created",
  "user": {
    "id": "...",
    "phone": "+254798765432"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Scenario 3: Fallback to Body-Based Refresh (Transition Period)

During the transition period, the server accepts refresh tokens in the request body:

```bash
# Extract refresh token from cookies.txt first
REFRESH_TOKEN=$(grep refreshToken cookies.txt | cut -f7)

# Use it in the request body
curl -X POST http://localhost:3002/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}"
```

**Expected Response:**
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Scenario 4: Test Error Handling

#### No Refresh Token
```bash
curl -X POST http://localhost:3002/api/auth/refresh
```

**Expected Response:** `401 Unauthorized`
```json
{
  "success": false,
  "message": "No refresh token provided"
}
```

#### Invalid Refresh Token
```bash
curl -X POST http://localhost:3002/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "invalid.token.here"}'
```

**Expected Response:** `401 Unauthorized`
```json
{
  "success": false,
  "message": "Invalid refresh token"
}
```

#### Expired Access Token on Protected Endpoint
```bash
curl -X GET http://localhost:3002/api/profile/me \
  -H "Authorization: Bearer expired_token_here"
```

**Expected Response:** `401 Unauthorized`
```json
{
  "success": false,
  "message": "Token is not valid"
}
```

## Browser Testing

### Test in Browser DevTools

1. Open your frontend application
2. Open DevTools (F12)
3. Go to Application → Cookies
4. Login through the UI
5. Check for the `refreshToken` cookie with these properties:
   - **Name:** `refreshToken`
   - **Value:** (JWT token)
   - **Domain:** Your backend domain
   - **Path:** `/api/auth/refresh`
   - **HttpOnly:** ✓ (checked)
   - **Secure:** ✓ (in production only)
   - **SameSite:** `Lax`
   - **Expires:** ~14 days from now

### Test Refresh in Browser Console

```javascript
// In browser console, make a refresh request
fetch('http://localhost:3002/api/auth/refresh', {
  method: 'POST',
  credentials: 'include',  // Important: sends cookies
  headers: {
    'Content-Type': 'application/json'
  }
})
  .then(r => r.json())
  .then(data => console.log('New access token:', data.accessToken))
  .catch(err => console.error('Error:', err));
```

## Verification Checklist

- [ ] Login returns accessToken in body (no refreshToken in body)
- [ ] Login sets httpOnly cookie with refreshToken
- [ ] Registration returns accessToken in body (no refreshToken in body)
- [ ] Registration sets httpOnly cookie with refreshToken
- [ ] Refresh endpoint accepts cookie-based refresh token
- [ ] Refresh endpoint returns new access token
- [ ] Refresh endpoint rejects missing/invalid tokens with 401
- [ ] Cookie has correct attributes (httpOnly, secure in production, sameSite)
- [ ] Cookie path is restricted to /api/auth/refresh
- [ ] Protected endpoints work with new access token
- [ ] Auth middleware returns consistent JSON with success: false

## Common Issues

### Cookie Not Being Set

**Problem:** The refreshToken cookie is not appearing in the browser.

**Solutions:**
1. Check CORS is configured with `credentials: true`
2. Ensure frontend sends requests with `credentials: 'include'`
3. Verify domain matches between frontend and backend
4. In development, ensure both are on localhost or use proper domain

### Cookie Not Being Sent

**Problem:** The refresh request doesn't include the cookie.

**Solutions:**
1. Ensure path matches: cookie path is `/api/auth/refresh`
2. Check SameSite policy is appropriate
3. Verify credentials are included in the request
4. Check cookie hasn't expired

### CORS Errors

**Problem:** Browser blocks the request due to CORS.

**Solutions:**
1. Add frontend origin to CORS configuration
2. Enable credentials in CORS config
3. Don't use wildcard origin with credentials

## Production Deployment Checklist

- [ ] Set `NODE_ENV=production` in environment
- [ ] Verify `JWT_REFRESH_SECRET` is different from `JWT_SECRET`
- [ ] Ensure HTTPS is enabled (required for secure cookies)
- [ ] Configure proper CORS origins (no wildcards)
- [ ] Test cookie behavior in production environment
- [ ] Monitor token refresh patterns in logs

## Security Verification

- [ ] Refresh token is httpOnly (cannot be accessed via JavaScript)
- [ ] Refresh token cookie only sent to specific path
- [ ] Access tokens have short expiry (2 hours)
- [ ] Refresh tokens have reasonable expiry (14 days)
- [ ] Invalid tokens are rejected with proper error messages
- [ ] Expired tokens trigger appropriate 401 responses
- [ ] No sensitive data in access tokens

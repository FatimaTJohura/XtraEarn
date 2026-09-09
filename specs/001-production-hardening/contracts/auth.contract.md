# Interface Contract: Authentication & Authorization

**Path**: `specs/001-production-hardening/contracts/auth.contract.md`  
**Protocol**: HTTP / REST  
**Security**: Bearer JWT (Authorization Header)

---

## 1. POST /api/auth/login

Authenticates a user and issues a signed session token.

### Request
```http
POST /api/auth/login HTTP/1.1
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```
*Alternatively accepts `"username": "handle"` in place of `"email"`.*

### Response (200 OK)
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Rahat Hasan",
    "email": "rahat@example.com",
    "username": "rahat_hasan",
    "role": "freelancer",
    "user_type": "regular",
    "wallet_balance": 41642.00,
    "is_verified": 1,
    "rating": 4.97
  }
}
```

### Response (401 Unauthorized) - Invalid Credentials or Bypass Password Attempt
```json
{
  "error": "Incorrect email or password"
}
```
*Note: Plain-text fallback passwords (`password123`, `Password123!`) MUST result in this 401 response unless the user's stored bcrypt hash actually matches.*

---

## 2. GET /api/auth/me

Fetches the profile of the currently authenticated actor.

### Request
```http
GET /api/auth/me HTTP/1.1
Authorization: Bearer <valid_jwt_token>
```

### Response (200 OK)
```json
{
  "user": {
    "id": 1,
    "name": "Rahat Hasan",
    "email": "rahat@example.com",
    "role": "freelancer",
    "wallet_balance": 41642.00
  }
}
```

### Response (401 Unauthorized) - Missing or Expired Token
```json
{
  "error": "Session expired, please login again"
}
```

---

## 3. Administrative Route Guard (`adminRequired`)

Guards all endpoints under `/api/admin/*`.

### Authorization Logic:
1. Token must be present and cryptographically verified against `JWT_SECRET`.
2. Decoded token must satisfy: `req.user.role === 'admin'`.
3. If token missing: `401 Unauthorized` (`"Please login to continue"`).
4. If token valid but role is not admin: `403 Forbidden` (`"Admin access required"`).

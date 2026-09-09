# Interface Contract: Specialist Consultation & Escrow Operations

**Path**: `specs/001-production-hardening/contracts/consultation.contract.md`  
**Protocol**: HTTP / REST  
**Security**: Bearer JWT (`authRequired`)

---

## 1. POST /api/consult/booking/:id/complete

Authorizes completion of a specialist consultation session and releases escrow funds to the specialist's wallet.

### Security & Ownership Rules:
- Caller MUST be authenticated (`authRequired`).
- Caller MUST be either:
  1. The client who booked and funded the session (`req.user.id === booking.user_id`), OR
  2. A platform administrator (`req.user.role === 'admin'`).
- Any other caller (including unassigned users or third parties) MUST be rejected with `403 Forbidden`.

### Request
```http
POST /api/consult/booking/16/complete HTTP/1.1
Authorization: Bearer <client_or_admin_jwt>
Content-Type: application/json

{}
```

### Response (200 OK) - Escrow Released
```json
{
  "success": true,
  "booking": {
    "id": 16,
    "booking_code": "CNS-3770",
    "status": "completed",
    "escrow_status": "released_to_specialist",
    "fee": 900.00,
    "completed_at": "2026-09-08 17:30:00"
  }
}
```

### Response (403 Forbidden) - Unauthorized Caller
```json
{
  "error": "Only the booking client or an administrator can complete this session and release escrow funds."
}
```

### Response (409 Conflict) - Idempotency Guard (Already Completed)
```json
{
  "error": "Consultation booking has already been completed."
}
```

---

## 2. POST /api/consult/booking/:id/cancel

Cancels a scheduled or in-progress session and refunds escrow funds back to the client's wallet.

### Security & Ownership Rules:
- Caller MUST be authenticated (`authRequired`).
- Caller MUST be either:
  1. The booking client (`req.user.id === booking.user_id`),
  2. The assigned specialist (`req.user.id === booking.expert_user_id`), OR
  3. A platform administrator (`req.user.role === 'admin'`).
- Any other caller MUST be rejected with `403 Forbidden`.

### Request
```http
POST /api/consult/booking/16/cancel HTTP/1.1
Authorization: Bearer <participant_or_admin_jwt>
Content-Type: application/json

{
  "reason": "Specialist had an emergency rescheduling conflict"
}
```

### Response (200 OK) - Escrow Refunded
```json
{
  "success": true,
  "booking": {
    "id": 16,
    "booking_code": "CNS-3770",
    "status": "cancelled",
    "escrow_status": "refunded_to_client",
    "cancel_reason": "Specialist had an emergency rescheduling conflict",
    "cancelled_at": "2026-09-08 17:35:00"
  }
}
```

### Response (403 Forbidden) - Unauthorized Caller
```json
{
  "error": "You do not have permission to cancel this consultation booking."
}
```

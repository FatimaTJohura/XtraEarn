# Interface Contract: Wallet & Financial Ledger Mutations

**Path**: `specs/001-production-hardening/contracts/wallet.contract.md`  
**Protocol**: HTTP / REST  
**Security**: Bearer JWT (`authRequired`)

---

## 1. POST /api/wallet/withdraw

Submits a payout disbursement request from user's earned balance.

### Security & Financial Rules:
- Caller MUST be authenticated (`authRequired`).
- Requested `amount` must satisfy: `20 <= amount <= user.wallet_balance`.
- Operation must atomically decrement `wallet_balance` and insert a record into `withdrawals` and `transactions` with status `'pending'`.
- If requested amount exceeds available balance, operation MUST fail without deducting any funds.

### Request
```http
POST /api/wallet/withdraw HTTP/1.1
Authorization: Bearer <user_jwt>
Content-Type: application/json

{
  "amount": 500,
  "method": "bkash",
  "account_number": "01711000000"
}
```

### Response (200 OK)
```json
{
  "success": true,
  "withdrawal": {
    "id": 38,
    "withdrawal_code": "WDR-1038",
    "amount": 500.00,
    "fee": 0.00,
    "net_amount": 500.00,
    "method": "bkash",
    "account_number": "01711000000",
    "status": "pending"
  },
  "new_balance": 41142.00
}
```

### Response (400 Bad Request) - Insufficient Balance
```json
{
  "error": "Withdrawal amount exceeds available wallet balance."
}
```

---

## 2. GET /api/wallet/transactions

Retrieves authenticated user's immutable ledger audit history.

### Request
```http
GET /api/wallet/transactions HTTP/1.1
Authorization: Bearer <user_jwt>
```

### Response (200 OK)
```json
{
  "balance": 41642.00,
  "transactions": [
    {
      "id": 231,
      "transaction_code": "TX-1788851448-120",
      "amount": 270.00,
      "fee": 30.00,
      "type": "escrow_release",
      "reference_id": "43",
      "reference_type": "task",
      "description": "Milestone payout for Task #43",
      "status": "completed",
      "created_at": "2026-09-08 17:15:00"
    }
  ]
}
```

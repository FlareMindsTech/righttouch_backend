# RightTouch User APIs — What / Why / Mistake / Fix (A to Z)

This doc explains **every User-auth/profile endpoint** in a simple troubleshooting table.

## Response format (now consistent)

All endpoints in the user controller return:

- Success:
  - `{ success: true, message: string, result: object }`
- Error:
  - `{ success: false, message: string, result: {}, error?: { code: string, details?: any } }`

Notes:
- `login` and `set-password` also include **top-level** `token` for backward compatibility.

---

## 1) POST /api/user/signup

| Scenario | Status | What happened | Why | Common mistake (client) | Fix |
|---|---:|---|---|---|---|
| Missing fields | 400 | Validation failed | `mobileNumber` or `role` missing | Forgot `role` or sent `role: customer` with wrong spelling | Send both fields; role must be exactly `Owner/Admin/Technician/Customer` |
| SMS send failed | 500 | OTP stored but SMS failed | Provider error / config | Wrong SMS credentials / number format | Fix SMS config; user can call resend |
| Success | 200 | OTP generated + stored + sent | Normal flow | — | Next call: `/verify-otp` |

Required body:
- `mobileNumber` (string)
- `role` (string)

---

## 2) POST /api/user/resend-otp

| Scenario | Status | What happened | Why | Common mistake | Fix |
|---|---:|---|---|---|---|
| Signup not found | 404 | No TempUser record | User didn’t call signup first | Calling resend without signup | Call `/signup` first |
| Cooldown | 429 | Too many requests | 60s cooldown | Spamming resend | Wait 60 seconds |
| SMS send failed | 500 | OTP stored but SMS failed | Provider error | Wrong SMS config | Fix SMS config |
| Success | 200 | New OTP stored + sent | Normal flow | — | Next call: `/verify-otp` |

---

## 3) POST /api/user/verify-otp

| Scenario | Status | What happened | Why | Common mistake | Fix |
|---|---:|---|---|---|---|
| Missing fields | 400 | Validation failed | `mobileNumber/role/otp` missing | Sending OTP as number but field name wrong | Send correct keys |
| OTP expired/invalid | 400 | No valid OTP found | Expired (5 min) or deleted | Using old OTP | Request resend and retry |
| Too many attempts | 429 | Locked attempts | 5 wrong tries | Guessing OTP | Resend OTP |
| Wrong OTP | 400 | Attempts incremented | Hash compare failed | Typo OTP | Enter correct OTP |
| Success | 200 | OTP verified | TempUser marked Verified | — | Next call: `/set-password` |

---

## 4) POST /api/user/set-password

| Scenario | Status | What happened | Why | Common mistake | Fix |
|---|---:|---|---|---|---|
| OTP not verified | 403 | Blocked | Must verify OTP first | Directly calling set-password | Call `/verify-otp` first |
| Weak password | 400 | Rejected | Fails regex | Password without special char | Use strong password (8+ with number+special) |
| Password mismatch | 400 | Rejected | `password !== confirmPassword` | Wrong confirm | Match both |
| Mobile already exists | 409 | Duplicate | User already created | Trying to register again | Use `/login` |
| Success | 201 | Profile created + token issued | Normal flow | — | Save `token` and use Bearer auth |

Required body:
- `mobileNumber`, `role`, `password`, `confirmPassword`

---

## 5) POST /api/user/login

| Scenario | Status | What happened | Why | Common mistake | Fix |
|---|---:|---|---|---|---|
| Invalid role | 400 | Rejected | Role not recognized | `role: "customer"` lowercased | Send valid role |
| Missing fields | 400 | Validation failed | No mobile/password | Missing password | Send both |
| Invalid credentials | 404/401 | Rejected | User not found OR password mismatch | Wrong role (Customer vs Technician) | Login with correct role |
| Success | 200 | Token returned | Normal flow | — | Store `token` |

---

## 6) POST /api/user/request-password-reset-otp

| Scenario | Status | What happened | Why | Common mistake | Fix |
|---|---:|---|---|---|---|
| User not found | 404 | No profile for number | Not registered | Wrong mobile | Use registered number |
| Success | 200 | OTP sent | Normal flow | — | Next: `/verify-password-reset-otp` |

---

## 7) POST /api/user/verify-password-reset-otp

| Scenario | Status | What happened | Why | Common mistake | Fix |
|---|---:|---|---|---|---|
| OTP invalid/expired | 400 | Rejected | expired or wrong | Using old OTP | Request new OTP |
| Success | 200 | OTP verified | Normal flow | — | Next: `/reset-password` |

---

## 8) POST /api/user/reset-password

IMPORTANT: This endpoint expects `newPassword` (not `password`).

| Scenario | Status | What happened | Why | Common mistake | Fix |
|---|---:|---|---|---|---|
| OTP not verified | 403 | Blocked | Must verify reset OTP first | Skipping verify step | Call `/verify-password-reset-otp` |
| Missing newPassword | 400 | Validation failed | newPassword missing | Sending `password` instead | Send `newPassword` |
| Weak newPassword | 400 | Rejected | Fails regex | weak password | Use strong password |
| Success | 200 | Password updated | Normal flow | — | Login again |

---

## 9) GET /api/user/me

| Scenario | Status | What happened | Why | Common mistake | Fix |
|---|---:|---|---|---|---|
| Unauthorized | 401 | Rejected | Missing/invalid token | No `Authorization` header | Add `Authorization: Bearer <token>` |
| Success | 200 | Profile returned | Normal flow | — | — |

---

## 10) POST /api/user/complete-profile

| Scenario | Status | What happened | Why | Common mistake | Fix |
|---|---:|---|---|---|---|
| Unauthorized | 401 | Rejected | Missing token | Not logged in | Login first |
| Success | 200 | Profile marked complete | Normal flow | Sending fields not allowed for role | Send only role-allowed fields |

---

## 11) PUT /api/user/me

| Scenario | Status | What happened | Why | Common mistake | Fix |
|---|---:|---|---|---|---|
| Customer address update blocked | 400 | Rejected | Address must be managed in Address APIs | Trying to update `city/state/pincode` here | Use `/api/addresses` endpoints |
| Success | 200 | Profile updated | Normal flow | Trying to update forbidden fields | Don’t send `password/email/status/userId/profileComplete` |

---

## 12) GET /api/user/users/:role

| Scenario | Status | What happened | Why | Common mistake | Fix |
|---|---:|---|---|---|---|
| Success | 200 | List returned | Normal flow | Calling without auth | Add Bearer token |

---

## 13) GET /api/user/users/:role/:id

| Scenario | Status | What happened | Why | Common mistake | Fix |
|---|---:|---|---|---|---|
| Success | 200 | User returned | Normal flow | Wrong `role` path value | Role must match model name |

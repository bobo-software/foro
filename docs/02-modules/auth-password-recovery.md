# Auth password recovery

Foro Web password recovery uses the foro-api auth endpoints and a three-step UI flow:

1. `GET /forgot-password` page collects an email and calls `POST /api/v1/auth/forgot-password`.
2. `GET /reset-password/verify` page collects the 6-digit OTP and calls `POST /api/v1/auth/verify-forgot-password-otp`.
3. `GET /reset-password` page collects the new password and calls `POST /api/v1/auth/reset-password`.

## Frontend contract

- `authService.forgotPassword(email)` sends `{ email }`.
  - Returns `404` with message `Account does not exist` when no active account matches.
- `authService.verifyForgotPasswordOtp(email, code)` sends `{ email, otp }` and returns:
  - `reset_token` for the reset page session handoff
  - `expires_in_minutes` for optional UX messaging
- `authService.resetPasswordWithToken(email, resetToken, newPassword)` sends `{ email, resetToken, newPassword }`.

## Security and behavior notes

- OTP and reset tokens are handled in API responses and only persisted temporarily in `sessionStorage` by the reset flow pages.
- Successful password reset clears existing refresh tokens server-side; users must log in again.

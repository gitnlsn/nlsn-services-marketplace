# Task: Handle authorization code callback from Google on the backend

## Description
Implement the backend logic to handle the authorization code callback from Google after a user grants consent. This involves receiving the authorization code and preparing to exchange it for access and refresh tokens.

## Acceptance Criteria
*   The backend successfully receives the authorization code from Google at the configured callback URL.
*   The received authorization code is securely stored temporarily for the next step (token exchange).
*   Error conditions (e.g., invalid authorization code, state mismatch) are handled gracefully.

## Technical Notes
*   NextAuth.js typically handles this automatically, but understanding the flow is crucial.
*   Ensure the callback URL is correctly configured in both Google API Console and NextAuth.js settings.
*   Implement state parameter verification to prevent CSRF attacks.

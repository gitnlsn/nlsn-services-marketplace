# Task: Implement NextAuth.js session creation and management (secure, HTTP-only JWT cookie)

## Description
Implement the NextAuth.js session creation and management on the backend. This involves configuring NextAuth.js to create secure, HTTP-only JWT cookies for authenticated user sessions.

## Acceptance Criteria
*   NextAuth.js is correctly configured to manage user sessions.
*   User sessions are stored in secure, HTTP-only JWT cookies.
*   Session data is accessible on the frontend for authenticated users.
*   Session expiration and renewal are handled appropriately.

## Technical Notes
*   Review NextAuth.js documentation for session strategies (JWT vs. database).
*   Ensure proper environment variables are set for `NEXTAUTH_SECRET`.
*   Consider the implications of JWT size and data stored within the token.

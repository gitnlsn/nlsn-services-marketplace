# Task: Exchange authorization code for access and refresh tokens on the backend

## Description
Implement the backend logic to exchange the authorization code received from Google for access and refresh tokens. These tokens are essential for accessing user data and maintaining user sessions.

## Acceptance Criteria
*   The backend successfully exchanges the authorization code for an access token and a refresh token with Google's token endpoint.
*   The access token and refresh token are securely stored or utilized for session management.
*   Error handling is in place for token exchange failures (e.g., invalid code, network issues).

## Technical Notes
*   NextAuth.js handles this process internally, but it's important to understand how it works.
*   Ensure the client secret is securely handled and not exposed.
*   Consider token expiration and refresh token rotation strategies.

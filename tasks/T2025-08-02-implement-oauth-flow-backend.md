# Task: Implement OAuth flow initiation from the backend

## Description
Implement the backend logic responsible for initiating the OAuth flow with Google. This involves handling the initial request from the frontend and redirecting the user to Google's authentication endpoint.

## Acceptance Criteria
*   A dedicated backend endpoint exists for initiating the Google OAuth flow.
*   This endpoint correctly constructs the Google OAuth URL with necessary parameters (client ID, redirect URI, scope, etc.).
*   The backend successfully redirects the user's browser to the constructed Google OAuth URL.
*   Security best practices are followed to prevent CSRF and other vulnerabilities.

## Technical Notes
*   Utilize NextAuth.js backend configurations and utilities for OAuth provider setup.
*   Ensure environment variables for Google client ID and client secret are correctly accessed.
*   Consider logging for debugging and monitoring the OAuth initiation process.

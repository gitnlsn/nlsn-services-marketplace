# Task: Integrate with Google's authentication page for user consent

## Description
This task involves ensuring that the application correctly integrates with Google's authentication page to obtain user consent for accessing their basic profile information. This is primarily handled by Google and NextAuth.js, but it's crucial to ensure the configuration is correct.

## Acceptance Criteria
*   When redirected to Google's authentication page, the user is presented with a clear consent screen.
*   The consent screen accurately reflects the permissions requested by our application (e.g., access to email, profile information).
*   Upon granting consent, Google successfully redirects the user back to our application's specified callback URL.

## Technical Notes
*   Verify the `scope` parameter in the OAuth request to Google includes necessary permissions.
*   Ensure the `redirect_uri` configured with Google matches the NextAuth.js callback URL.
*   This task is more about configuration verification than direct code implementation within our application, as Google handles the UI of the consent screen.

# Task: Implement 'Sign in with Google' button on the frontend

## Description
Implement a "Sign in with Google" button on the frontend of the application. This button will initiate the OAuth flow for user authentication using Google as the identity provider.

## Acceptance Criteria
*   A visually distinct "Sign in with Google" button is present on the login/signup screen.
*   Clicking the button redirects the user to Google's authentication page.
*   The button adheres to the project's styling conventions (Tailwind CSS, Shadcn UI).
*   Native HTML validation is considered for any associated form elements (though this button primarily triggers a redirect).

## Technical Notes
*   Utilize NextAuth.js client-side methods for initiating the Google OAuth flow.
*   Ensure proper handling of the redirect URL after Google authentication.
*   Consider accessibility best practices for the button.

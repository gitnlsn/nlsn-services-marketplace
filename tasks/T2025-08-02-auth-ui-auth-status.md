# Task: Ensure user authentication status is reflected on the frontend

## Description
Implement the frontend logic to ensure that the user's authentication status (logged in/logged out, customer/professional role) is accurately reflected across the application's UI. This includes displaying appropriate navigation links, user-specific content, and handling protected routes.

## Acceptance Criteria
*   The UI clearly indicates whether a user is logged in or logged out.
*   Navigation elements (e.g., login/signup buttons, dashboard links) change based on authentication status.
*   User-specific content (e.g., profile information, personalized dashboards) is only displayed to authenticated users.
*   Protected routes are inaccessible to unauthenticated users, redirecting them to the login screen.
*   The frontend correctly distinguishes between customer and professional roles to display relevant UI elements and content.

## Technical Notes
*   Utilize NextAuth.js client-side session hooks (e.g., `useSession`) to access authentication status and user data.
*   Implement conditional rendering for UI components based on `session` data.
*   Use Next.js middleware or route guards for protecting sensitive routes.
*   Consider loading states while authentication status is being determined.

# Task: Implement frontend search bar and search results display

## Description
Implement the frontend search bar and the display area for search results. This includes the input field for user queries and the dynamic rendering of service listings based on search results.

## Acceptance Criteria
*   A prominent search bar is present on the Home Screen and potentially other relevant pages.
*   Users can type search queries into the search bar.
*   Search results are displayed in a clear and organized manner on a dedicated Search Results Screen.
*   Each search result displays key service information (e.g., title, professional, price, a brief description).
*   The search bar and results display utilize Shadcn UI components for consistent styling.
*   Native HTML validation is applied to the search input field (e.g., `minlength`, `maxlength`).

## Technical Notes
*   Utilize Shadcn UI `Input` component for the search bar.
*   Implement state management for the search query.
*   Consider debouncing the search input to reduce unnecessary backend calls.
*   Design a reusable component for displaying individual service cards in the search results.
*   Implement pagination or infinite scrolling for large result sets (future consideration, but design for it).

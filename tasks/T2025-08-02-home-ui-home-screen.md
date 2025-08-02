# Task: Implement Home Screen

## Description
Design and implement the Home Screen as the main landing page of the services marketplace. This screen serves as the entry point for both customers looking for services and professionals showcasing their offerings, providing intuitive service discovery through featured services, search functionality, and category browsing.

## Acceptance Criteria
* Navigation bar displays logo, search bar, and login/register buttons (or user profile if logged in)
* Hero section includes welcome message, main search bar with autocomplete, and quick category buttons
* Featured services carousel shows horizontally scrollable cards with top-rated services
* Service categories grid displays icon-based grid of all available categories
* Popular services section lists most booked services in the user's area
* "How It Works" section explains the 3-step process for new users
* Footer contains links to About, Help, Terms, and Contact pages
* Skeleton loaders appear while data is loading
* Error states display fallback UI with retry options
* Empty states show helpful messages if no services are available
* Responsive design works across mobile, tablet, and desktop

## Technical Implementation
* **Components to create:**
  - `HomeScreen.tsx` - Main container component
  - `HeroSection.tsx` - Hero banner with main search
  - `FeaturedServicesCarousel.tsx` - Horizontal carousel component
  - `ServiceCategoriesGrid.tsx` - Category grid with icons
  - `PopularServices.tsx` - List of popular services
  - `HowItWorks.tsx` - Tutorial section component

* **tRPC API calls to implement:**
  - `services.getFeatured()` - Fetches featured services for carousel
  - `categories.getAll()` - Retrieves all service categories
  - `services.getPopular()` - Gets popular services based on bookings
  - `search.getSuggestions(query)` - Provides autocomplete suggestions

* **State management:**
  - Use React Query for data fetching and caching
  - Implement loading, error, and empty states
  - Handle authentication state for personalized content

* **Styling:**
  - Use Tailwind CSS for responsive design
  - Mobile: Stacked layout, hamburger menu, full-width search
  - Tablet: 2-column grid for categories, condensed navigation
  - Desktop: Full layout with sidebar promotions, multi-column grids

## Dependencies
* Next.js App Router
* tRPC client setup
* Authentication context (useSession)
* React Query for data fetching
* Tailwind CSS for styling
* Icon library for category icons

## Related Tasks
* T2025-08-02-frontend-auth-status.md - Authentication state management
* T2025-08-02-implement-search-filters.md - Search functionality
* T2025-08-02-implement-backend-search-endpoint.md - Search API endpoint
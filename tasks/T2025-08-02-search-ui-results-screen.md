# Task: Implement Search Results Screen

## Description
Design and implement the Search Results Screen that displays filtered and sorted service listings based on user search queries. This screen should provide comprehensive filtering options, sorting capabilities, and both grid/list view toggles for optimal user experience.

## Acceptance Criteria
* Display search results in both grid and list view formats with toggle button
* Show result count and current search query/filters
* Applied filters bar displays active filters with remove option
* Implement infinite scroll pagination for results
* Display appropriate "no results" state with suggestions
* Save search functionality for logged-in users
* Filter sidebar includes:
  - Multi-select category dropdown (React Select)
  - Price range dual slider (min/max) with R$ formatting
  - Rating filter (1-5 stars)
  - Availability toggle
  - Location radius selector (1km, 5km, 10km, 25km)
* Sorting options include:
  - Relevance (default)
  - Price (low to high/high to low)
  - Rating (highest first)
  - Distance (nearest first)
  - Most booked
  - Newest listings
* Real-time result count updates as filters change
* Responsive design for mobile, tablet, and desktop

## Technical Implementation
* **Components to create:**
  - `SearchResultsScreen.tsx` - Main container component
  - `SearchFilters.tsx` - Sidebar with all filter options
  - `PriceRangeSlider.tsx` - Custom dual-handle slider component
  - `ResultsGrid.tsx` - Grid view component
  - `ResultsList.tsx` - List view component
  - `ServiceCard.tsx` - Individual service card component
  - `AppliedFilters.tsx` - Active filters display bar
  - `SortDropdown.tsx` - Sorting options dropdown

* **tRPC API calls to implement:**
  - `search.services()` - Main search endpoint with filters
  - `search.getFilterCounts()` - Get counts for each filter option
  - `savedSearches.create()` - Save search for user
  - `savedSearches.delete()` - Remove saved search

* **State management:**
  - URL query parameters for filters (enables sharing/bookmarking)
  - React Query for search results with infinite pagination
  - Local state for view toggle (grid/list)
  - Debounced filter updates to reduce API calls

* **Filter implementation:**
  - Price range: Preset ranges (0-50, 50-200, 200-500, 500+)
  - Location: Integration with browser geolocation API
  - Real-time filter count updates

## Dependencies
* React Select for multi-select dropdowns
* Custom slider component or library for price range
* React Query with infinite scroll support
* Next.js router for URL parameter management
* Geolocation API for location-based search

## Related Tasks
* T2025-08-02-implement-backend-search-endpoint.md - Backend search implementation
* T2025-08-02-implement-search-filters.md - Filter component details
* T2025-08-02-implement-frontend-search.md - Search bar implementation
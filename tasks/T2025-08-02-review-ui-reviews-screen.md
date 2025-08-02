# Task: Implement Reviews Screen

## Description
Create a comprehensive Reviews Screen that displays all reviews for a service or professional, with filtering, sorting, and interaction capabilities. This screen should help users make informed decisions based on authentic customer feedback.

## Acceptance Criteria
* Review statistics summary at top:
  - Overall rating with star display
  - Total number of reviews
  - Rating distribution chart (5-star to 1-star breakdown)
  - Average ratings for subcategories (quality, punctuality, communication)
* Filter options:
  - Filter by rating (5, 4, 3, 2, 1 stars)
  - Filter by date range
  - Show only verified purchases
  - Show only reviews with photos
  - Search within reviews
* Sort options:
  - Most recent (default)
  - Most helpful
  - Highest rated
  - Lowest rated
  - Photos first
* Individual review cards display:
  - Reviewer name and avatar (or anonymous)
  - Rating stars
  - Review date
  - Verified purchase badge
  - Review text with "Read more" for long reviews
  - Review photos with lightbox viewer
  - Helpful/Not helpful vote buttons
  - Professional's response (if any)
* Load more pagination (20 reviews per page)
* Empty state when no reviews match filters
* Mobile-optimized with touch gestures for photo viewing

## Technical Implementation
* **Components to create:**
  - `ReviewsScreen.tsx` - Main container
  - `ReviewStats.tsx` - Statistics summary section
  - `RatingDistribution.tsx` - Star rating breakdown chart
  - `ReviewFilters.tsx` - Filter controls
  - `ReviewCard.tsx` - Individual review component
  - `ReviewPhotos.tsx` - Photo gallery with lightbox
  - `ProfessionalResponse.tsx` - Response section
  - `HelpfulVoting.tsx` - Voting component

* **tRPC API calls:**
  - `reviews.getByService(serviceId, filters, sort, pagination)` - Fetch reviews
  - `reviews.getStats(serviceId)` - Get review statistics
  - `reviews.voteHelpful(reviewId, helpful)` - Vote on review
  - `reviews.reportReview(reviewId, reason)` - Report inappropriate review

* **Features to implement:**
  - Lazy loading for review photos
  - Lightbox/modal for full-size photos
  - Real-time helpful vote updates
  - Review text search functionality
  - Smooth scroll to specific rating filter

* **State management:**
  - Active filters state
  - Sort order state
  - Pagination state with infinite scroll
  - Photo viewer state
  - Loading states for votes

## Dependencies
* React Query for data fetching
* Chart library for rating distribution
* Lightbox component for photos
* Infinite scroll library
* Date range picker component

## Related Tasks
* T2025-08-02-implement-leave-review-form.md - Review submission
* T2025-08-02-implement-review-moderation.md - Review moderation
* T2025-08-02-implement-service-detail-screen.md - Parent screen
* T2025-08-02-implement-photo-viewer.md - Photo viewing component
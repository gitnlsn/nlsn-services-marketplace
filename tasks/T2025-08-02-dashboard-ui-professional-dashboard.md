# Task: Implement Professional Dashboard

## Description
Create a comprehensive Professional Dashboard that serves as the central hub for service providers to manage their business, track performance, handle bookings, and monitor earnings. This dashboard should provide actionable insights and quick access to all professional features.

## Acceptance Criteria
* Dashboard overview with key metrics cards:
  - Total earnings (current month)
  - Pending bookings count
  - Average rating
  - Response rate percentage
  - Views this week
* Interactive earnings chart:
  - Daily/weekly/monthly view toggles
  - Line graph showing earnings trend
  - Comparison with previous period
* Booking calendar view:
  - Monthly calendar with booking indicators
  - Click to view booking details
  - Color coding for booking status
* Pending actions section:
  - New booking requests requiring response
  - Reviews to respond to
  - Incomplete profile reminders
* Performance metrics:
  - Service conversion rate
  - Average response time
  - Customer satisfaction score
  - Booking completion rate
* Recent reviews display:
  - Latest 5 reviews with quick response option
  - Link to all reviews
* Upcoming payments section:
  - Next withdrawal date
  - Available balance
  - Recent transactions
* Quick actions menu:
  - Add new service
  - View all bookings
  - Update availability
  - Request withdrawal
* Mobile-responsive design with priority on key metrics

## Technical Implementation
* **Components to create:**
  - `ProfessionalDashboard.tsx` - Main dashboard container
  - `MetricsCards.tsx` - KPI display cards
  - `EarningsChart.tsx` - Recharts-based earnings visualization
  - `BookingCalendar.tsx` - Calendar component with bookings
  - `PendingActions.tsx` - Action items list
  - `PerformanceMetrics.tsx` - Performance indicators
  - `RecentReviews.tsx` - Latest reviews display
  - `UpcomingPayments.tsx` - Payment information
  - `QuickActions.tsx` - Action buttons menu

* **tRPC API calls:**
  - `dashboard.getMetrics(professionalId, period)` - Fetch KPIs
  - `dashboard.getEarningsData(professionalId, period)` - Earnings chart data
  - `bookings.getCalendarView(professionalId, month)` - Calendar bookings
  - `dashboard.getPendingActions(professionalId)` - Action items
  - `dashboard.getPerformance(professionalId)` - Performance metrics
  - `reviews.getRecent(professionalId, limit)` - Recent reviews
  - `payments.getUpcoming(professionalId)` - Payment info

* **Features to implement:**
  - Real-time updates for new bookings
  - Chart period comparison
  - Export data functionality
  - Performance tips based on metrics
  - Calendar integration options

* **State management:**
  - Dashboard data caching with React Query
  - Period selection state (day/week/month)
  - Loading states for each widget
  - Error boundaries for widget failures

## Dependencies
* Recharts for data visualization
* Calendar component library
* React Query for data fetching
* Date-fns for date manipulation
* Export libraries for data download

## Related Tasks
* T2025-08-02-implement-my-services-screen.md - Service management
* T2025-08-02-implement-earnings-withdrawal-screen.md - Earnings details
* T2025-08-02-implement-my-bookings-professional-screen.md - Booking management
* T2025-08-02-implement-backend-dashboard-metrics.md - Backend metrics API

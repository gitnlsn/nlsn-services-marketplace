# Component Mapping Document - Savoir Link

## ✅ Components Already Available (shadcn/ui)

### Atomic Components
| Screen Component | Maps to shadcn/ui | Status |
|-----------------|-------------------|--------|
| Primary Button | Button (variant="default") | ✅ Ready |
| Outline Button | Button (variant="outline") | ✅ Ready |
| Secondary Button | Button (variant="secondary") | ✅ Ready |
| Danger Button | Button (variant="destructive") | ✅ Ready |
| Text Input | Input | ✅ Ready |
| Select Dropdown | Select | ✅ Ready |
| Textarea | Textarea | ✅ Ready |
| Search Input | Input (with search icon) | ✅ Ready |
| Badge/Pills | Badge | ✅ Ready |
| Toggle Switch | Switch | ✅ Ready |
| Checkbox | Checkbox | ✅ Ready |
| Radio Button | RadioGroup | ✅ Ready |
| Date Picker | DatePicker (custom) | ✅ Ready |

### Molecular Components
| Screen Component | Maps to shadcn/ui | Status |
|-----------------|-------------------|--------|
| Cards | Card | ✅ Ready |
| Tab Navigation | Tabs | ✅ Ready |
| Dropdown Menus | DropdownMenu | ✅ Ready |
| Dialog/Modals | Dialog | ✅ Ready |
| Alert Messages | Alert | ✅ Ready |
| Alert Dialogs | AlertDialog | ✅ Ready |
| Tooltips | Tooltip | ✅ Ready |
| Hover Cards | HoverCard | ✅ Ready |
| Avatar | Avatar | ✅ Ready |
| Accordion/Collapsible | Accordion | ✅ Ready |
| Progress Bar | Progress | ✅ Ready |
| Tables | Table | ✅ Ready |
| Forms | Form (react-hook-form) | ✅ Ready |
| Navigation Menu | NavigationMenu | ✅ Ready |
| Command Palette | Command | ✅ Ready |
| Breadcrumbs | Breadcrumb | ✅ Ready |
| Calendar | Calendar | ✅ Ready |
| Context Menu | ContextMenu | ✅ Ready |
| Menu Bar | Menubar | ✅ Ready |
| Pagination | Pagination | ✅ Ready |
| Popover | Popover | ✅ Ready |
| Scroll Area | ScrollArea | ✅ Ready |
| Separator | Separator | ✅ Ready |
| Sheet (Sidebar) | Sheet | ✅ Ready |
| Skeleton Loading | Skeleton | ✅ Ready |
| Slider | Slider | ✅ Ready |
| Toast/Notifications | Sonner | ✅ Ready |

## 🔨 Custom Components to Build

### Service-Specific Components
1. **ServiceCard** (`src/components/service-card.tsx`)
   - Uses: Card, Badge, Avatar
   - Contains: Image, title, provider info, rating, price
   - Used in: Landing, Search Results, Home

2. **BookingCard** (`src/components/booking-card.tsx`)
   - Uses: Card, Button, Badge
   - Contains: Service info, date/time, status, actions
   - Used in: Bookings screen

3. **ReviewCard** (`src/components/review-card.tsx`)
   - Uses: Card, Avatar, Button
   - Contains: User info, rating stars, review text, reply section
   - Used in: Service Detail, Reviews

4. **StatCard** (`src/components/stat-card.tsx`)
   - Uses: Card
   - Contains: Metric value, label, trend indicator
   - Used in: Home, Services Management, Earnings

### Navigation Components
5. **AppHeader** (`src/components/app-header.tsx`)
   - Uses: NavigationMenu, Avatar, DropdownMenu, Button
   - Contains: Logo, search, notifications, user menu
   - Used in: All authenticated screens

6. **DashboardSidebar** (`src/components/dashboard-sidebar.tsx`)
   - Uses: Navigation links, Badge
   - Contains: Menu items with icons and counts
   - Used in: Dashboard screens

### Form Components
7. **SearchBar** (`src/components/search-bar.tsx`)
   - Uses: Input, Button, Select
   - Contains: Service search, location, filters
   - Used in: Landing, Search Results

8. **BookingForm** (`src/components/booking-form.tsx`)
   - Uses: Form, DatePicker, Select, Button
   - Contains: Service booking interface
   - Used in: Service Detail

9. **ServiceEditor** (`src/components/service-editor.tsx`)
   - Uses: Form, Input, Textarea, Select, Switch
   - Contains: Multi-step service creation/editing
   - Used in: Service Editor screen

### Data Display Components
10. **RatingDisplay** (`src/components/rating-display.tsx`)
    - Uses: Custom star icons
    - Contains: Star rating visualization
    - Used in: Multiple screens

11. **TransactionList** (`src/components/transaction-list.tsx`)
    - Uses: Table or custom list
    - Contains: Financial transaction history
    - Used in: Earnings

12. **MessageThread** (`src/components/message-thread.tsx`)
    - Uses: ScrollArea, Avatar, Input
    - Contains: Chat interface
    - Used in: Messages

### Layout Components
13. **PageHeader** (`src/components/page-header.tsx`)
    - Uses: Typography, Button
    - Contains: Page title, actions, filters
    - Used in: All main screens

14. **FilterSidebar** (`src/components/filter-sidebar.tsx`)
    - Uses: Checkbox, Slider, Select
    - Contains: Search filters
    - Used in: Search Results

15. **DashboardGrid** (`src/components/dashboard-grid.tsx`)
    - Uses: Grid layout utilities
    - Contains: Responsive dashboard widget layout
    - Used in: Home dashboard

### Utility Components
16. **ProgressStepper** (`src/components/progress-stepper.tsx`)
    - Uses: Custom implementation
    - Contains: Multi-step progress indicator
    - Used in: Service Editor

17. **ImageUpload** (`src/components/image-upload.tsx`)
    - Uses: Custom drag-and-drop
    - Contains: File upload interface
    - Used in: Service Editor, Settings

18. **EmptyState** (`src/components/empty-state.tsx`)
    - Uses: Custom illustration
    - Contains: Empty list messaging
    - Used in: Various lists

19. **LoadingSpinner** (`src/components/loading-spinner.tsx`)
    - Uses: Custom animation
    - Contains: Loading indicator
    - Used in: Throughout app

20. **NotificationBell** (`src/components/notification-bell.tsx`)
    - Uses: DropdownMenu, Badge
    - Contains: Notification dropdown
    - Used in: Header

## 📋 Implementation Priority

### Phase 1: Core Components (Week 1)
- [ ] AppHeader
- [ ] DashboardSidebar
- [ ] ServiceCard
- [ ] SearchBar
- [ ] PageHeader

### Phase 2: Service Features (Week 2)
- [ ] BookingCard
- [ ] BookingForm
- [ ] ReviewCard
- [ ] RatingDisplay
- [ ] ServiceEditor

### Phase 3: Dashboard Components (Week 3)
- [ ] StatCard
- [ ] DashboardGrid
- [ ] TransactionList
- [ ] EmptyState
- [ ] LoadingSpinner

### Phase 4: Enhanced Features (Week 4)
- [ ] MessageThread
- [ ] FilterSidebar
- [ ] ImageUpload
- [ ] ProgressStepper
- [ ] NotificationBell

## 🎨 Design Tokens

### Colors (Tailwind Classes)
```typescript
export const colors = {
  primary: 'blue-500',      // #3b82f6
  success: 'emerald-500',    // #10b981
  warning: 'amber-500',      // #f59e0b
  danger: 'red-500',         // #ef4444
  muted: 'gray-500',         // #6b7280
  background: 'gray-50',     // #f9fafb
  border: 'gray-200',        // #e5e7eb
};
```

### Common Patterns
```typescript
// Card hover effect
"transition-transform hover:-translate-y-1 hover:shadow-lg"

// Button hover effect
"transition-colors hover:opacity-90"

// Focus states
"focus:ring-2 focus:ring-blue-500 focus:outline-none"

// Container widths
"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
```

## 📁 File Structure
```
src/
├── components/
│   ├── ui/                 # shadcn/ui components (DO NOT MODIFY)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── ...
│   ├── layout/             # Layout components
│   │   ├── app-header.tsx
│   │   ├── dashboard-sidebar.tsx
│   │   └── page-header.tsx
│   ├── service/            # Service-related components
│   │   ├── service-card.tsx
│   │   ├── booking-card.tsx
│   │   ├── review-card.tsx
│   │   └── service-editor.tsx
│   ├── forms/              # Form components
│   │   ├── search-bar.tsx
│   │   ├── booking-form.tsx
│   │   └── image-upload.tsx
│   └── common/             # Reusable components
│       ├── stat-card.tsx
│       ├── rating-display.tsx
│       ├── empty-state.tsx
│       └── loading-spinner.tsx
└── lib/
    └── utils.ts            # cn() utility and other helpers
```

## 🔗 Component Dependencies
- All custom components should import shadcn/ui components from `~/components/ui/`
- Use `cn()` utility from `~/lib/utils` for className merging
- Follow the existing pattern of data-slot attributes for component identification
- Maintain TypeScript strict mode compatibility
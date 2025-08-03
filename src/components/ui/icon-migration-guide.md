# Icon Migration Guide

## Migration from Heroicons to Unified Icon System

This document outlines the migration from mixed Heroicons/Lucide usage to our unified icon system.

### Migration Mapping

| Heroicons Import | Unified Icon Import | Usage |
|------------------|-------------------|-------|
| `CalendarIcon` | `Calendar` | Date/time related |
| `ClockIcon` | `Clock` | Time/duration |
| `MagnifyingGlassIcon` | `Search` | Search functionality |
| `MapPinIcon` | `MapPin` | Location/address |
| `XMarkIcon` | `X` | Close/cancel actions |
| `StarIcon` | `Star` | Ratings/favorites |
| `ChevronLeftIcon` | `ChevronLeft` | Navigation |
| `ChevronRightIcon` | `ChevronRight` | Navigation |
| `CheckIcon` | `Check` | Success/confirm |
| `FunnelIcon` | `Filter` | Filtering |
| `ChatBubbleLeftIcon` | `MessageCircle` | Messaging |
| `PaperAirplaneIcon` | `Send` | Send message |

### Migration Steps

1. **Replace import statements**
   ```tsx
   // Before
   import { CalendarIcon, ClockIcon } from "@heroicons/react/24/outline";
   
   // After  
   import { Calendar, Clock } from "~/components/ui/icon";
   ```

2. **Update icon usages**
   ```tsx
   // Before
   <CalendarIcon className="h-5 w-5" />
   
   // After
   <Calendar className="h-5 w-5" />
   ```

3. **Handle filled vs outline icons**
   For Lucide icons (which are primarily outline), use fill className for solid appearance:
   ```tsx
   // Heroicons solid star
   <StarIcon className="h-4 w-4 text-yellow-400" />
   
   // Lucide equivalent
   <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
   ```

### Files Already Migrated
- ✅ `/components/booking/booking-modal.tsx`
- ✅ `/components/services/service-card.tsx` 
- ✅ `/components/home/hero-section.tsx`
- ✅ `/components/ui/date-display.tsx`

### Files Pending Migration
- [ ] `/components/services/services-grid.tsx`
- [ ] `/components/services/service-detail.tsx`
- [ ] `/app/bookings/[id]/page.tsx`
- [ ] `/components/booking/booking-card.tsx`
- [ ] `/components/home/featured-professionals.tsx`
- [ ] `/components/messaging/conversation-list.tsx`
- [ ] `/components/messaging/message-button.tsx`
- [ ] `/components/messaging/message-list.tsx`
- [ ] `/components/ui/date-picker.tsx`
- [ ] `/components/review/review-modal.tsx`
- [ ] `/components/review/review-form.tsx`

### Benefits of Unified System
- **Consistency**: Single icon library across the app
- **Performance**: Better tree-shaking with Lucide
- **Maintainability**: Centralized icon management
- **Semantic naming**: Icons have clear, semantic names
- **Size control**: Unified sizing system with presets
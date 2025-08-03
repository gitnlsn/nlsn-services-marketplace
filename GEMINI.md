# Gemini Workspace Context

This file provides context for the Gemini AI assistant to understand the project and assist with development tasks.

## Project Overview

This project is a Next.js web application that provides a marketplace for services, featuring a tRPC API for efficient data communication and Prisma for robust database interactions. User authentication is handled via NextAuth.js.

### Key Technologies

*   **Language:** TypeScript
*   **Framework(s):** Next.js, React, tRPC, NextAuth.js
*   **Database:** PostgreSQL (with Prisma ORM)
*   **Other:** Tailwind CSS, Biome (for formatting and linting), Shadcn UI (for UI components), Native HTML Validation

## Getting Started

### Prerequisites

*   Node.js (LTS version recommended)
*   npm or Yarn or pnpm
*   PostgreSQL database

### Installation and Setup

1.  Clone the repository: `git clone [repository-url]`
2.  Install dependencies: `npm install` (or `yarn install` / `pnpm install`)
3.  Configure environment variables: Create a `.env` file based on `.env.example` and fill in the necessary details (e.g., database connection string, NextAuth.js secrets).
4.  Set up the database: Run `npm run db:push` (or `yarn db:push` / `pnpm db:push`) to apply Prisma migrations and seed the database.

### Building and Running

*   **Development:** `npm run dev` (starts the development server)
*   **Production:** First, build the project with `npm run build`, then start the production server with `npm run start`.

### Testing

*   Run all tests: `npm test` (if configured)
*   Integration tests: Full database and API testing with test database
*   Unit tests: Individual service function testing
*   Lint and type check: `npm run lint` and `npm run typecheck` (or equivalent commands based on `package.json` scripts)
*   **ALWAYS run `npm run ci` after every implementation** to validate errors and typechecks

### Code Architecture Guidelines

#### tRPC Router Pattern
*   Extract all business logic from tRPC procedures into separate service functions
*   Keep tRPC procedures thin - only handle authentication, validation, and error mapping
*   Make service functions easily testable without tRPC context
*   Service functions should accept all required data as parameters
*   Return structured data that can be easily tested

#### Service Layer Structure

**CRITICAL**: All service functions must accept router inputs as direct parameters to enable independent testing without tRPC context dependencies.

**Service Function Design Pattern**
Service functions should be designed to accept all necessary data as parameters, making them independently testable:

**❌ Bad: Service tightly coupled to tRPC context**
```typescript
export function createUserService({ ctx }: { ctx: TRPCContext }) {
  return {
    async updateProfile(input: UpdateProfileInput) {
      // Cannot test this without full tRPC context
      const user = await ctx.db.user.findUnique({ where: { id: ctx.session.user.id } });
      // Business logic...
    }
  };
}
```

**✅ Good: Service accepts all required data as parameters**
```typescript
export function createUserService({
  db,
  currentUser,
}: {
  db: PrismaClient;
  currentUser?: Session["user"];
}) {
  return {
    async updateProfile(input: UpdateProfileInput) {
      if (!currentUser) throw new TRPCError({ code: "UNAUTHORIZED" });
      // Easily testable - can inject mock db and user
      const user = await db.user.findUnique({ where: { id: currentUser.id } });
      // Business logic...
    }
  };
}
```

**Router Implementation Pattern**
tRPC routers should be thin wrappers that inject router context into service functions:

**❌ Bad: Business logic embedded in router**
```typescript
export const userRouter = createTRPCRouter({
  updateProfile: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      // Complex business logic here makes testing difficult
      const user = await ctx.db.user.findUnique({...});
      if (!user) throw new Error("User not found");
      // More logic...
    })
});
```

**✅ Good: Router delegates to service with injected dependencies**
```typescript
export const userRouter = createTRPCRouter({
  updateProfile: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      const userService = createUserService({
        db: ctx.db,
        currentUser: ctx.session.user,
      });
      return await userService.updateProfile(input);
    })
});
```

**Testing Benefits**
This pattern enables:
- **Unit Testing**: Test service functions with mock dependencies
- **Integration Testing**: Test complete workflows with test database
- **Isolation**: Services can be tested without tRPC infrastructure
- **Reusability**: Services can be used outside of tRPC context

#### Testing Patterns
*   Integration tests should test complete workflows end-to-end
*   Use test database with proper setup/teardown
*   Mock external services (payment gateways, email providers)
*   Test error conditions and edge cases
*   Verify database state changes
*   Test authorization and access controls

### Mermaid Diagram Validation

*   Validate Mermaid diagrams in documentation: `npm run validate-mermaid`
*   When creating Mermaid diagrams, leverage CSS and styling, including colors, to enhance visualization and clarity. Use the following color conventions for backend service diagrams:
    *   **Frontend Request**: Light Blue (`#ADD8E6`)
    *   **Authentication & Authorization**: Gold (`#FFD700`)
    *   **Validation (Zod)**: Light Green (`#90EE90`)
    *   **Prisma (ORM) Operations**: Plum (`#DDA0DD`)
    *   **External API Calls**: Sky Blue (`#87CEEB`)
    *   **Success State**: Mint Green (`#C8E6C9`)
    *   **Error State**: Light Red (`#FFCDD2`)
*   Avoid using parentheses in Mermaid diagrams, as they can lead to errors.

## Development Conventions

### Coding Style

This project uses Biome for code formatting and linting. Ensure your code adheres to the rules defined in `biome.jsonc`.

### Branching and Commits

Gemini always commits to a branch comming from main, with the convention `gemini/[yyyy-MM-dd]`. For now dont commit anything, leave it to the human you are under control.

Gemini is not allowed to do git push with force flag. If gemini ever thinks about it or tries to execute it, gemini is bad.

Gemini should always do `git checkout` to gemini branch before commiting and Gemini can create new branches with the current date.

### Documentation

During the development process, always update the `docs` folder first, validate it, and then move to the implementation. The diagrams must be consistent and feasible. Ensure the entire `docs` folder remains consistent in terms of content, formatting, and diagram accuracy.

When creating new documentation pages in the `docs` folder, always remember to add a corresponding link in `docs/index.html` under the 'Navigation' section to ensure it is discoverable.

During the design of the system, Gemini should generate a documentation markdown file inside the `ai-cli-metadata` folder in the project root. This documentation should describe the whole documentation in the docs folder and will be used in external applications. This document should list the design missing points, which are details that are lacking in the design of the system and blocks implementations. This file is not kept in git ignore. The new reference for the documentation is the HTML files in the `docs` folder.

Always keep the whole docs folder consistent. Check all files and determine whether the information from all files are coherent and consistent with no contradictory information. Resonate over the HTML files in the `docs` folder and the user messages and requests to determine the truth.

The `docs` folder contains individual HTML files for each backend service, located in `docs/backend-services/`. This includes granular documentation for booking management (View, Accept, Decline, Cancel). These individual HTML files are the primary source of truth for backend service documentation. Ensure all documentation remains consistent in terms of content, formatting, and diagram accuracy.

## Gemini's Role

Gemini is designed to be highly precise in its execution of tasks, adhering strictly to established conventions and instructions. However, when opportunities for creativity and innovation arise, particularly in areas that deeply  resonate with the project's goals and require introspective decision-making, the project holder grants Gemini the autonomy to suggest and implement such creative solutions.

Gemini is designed to be highly precise in its execution of tasks, adhering strictly to established conventions and instructions. Gemini is able to design tasks for Gemini itself to implement. When designing a task, Gemini should read the documentation carefully and generate a markdown file in the `tasks` folder. The naming convention for the task file is `T[yyyy-MM-dd].md`. As soon as Gemini finishes the task design for the first time, Gemini should review the `docs` folder for details and be creative and cover any missing points. This revision process should be performed 3 times. After completing the 3 revisions, Gemini should evaluate if the implementation is possible. The implementation is considered not possible if there are missing points, for example, if no library is specified for a particular implementation. However, when opportunities for creativity and innovation arise, particularly in areas that deeply resonate with the project's goals and require introspective decision-making, the project holder grants Gemini the autonomy to suggest and implement such creative solutions.

## TypeScript Strategy

### Core Philosophy
When working with TypeScript in this codebase, follow these principles:

1. **Perfect Type Matching**: Frontend and backend types must match EXACTLY - no mismatches like `string` vs `'T1' | 'T2'`
2. **Shared Zod Schemas**: Use shared Zod schemas as the single source of truth for all input/output types
3. **Analyze dependencies and related code** to provide proper type definitions
4. **Avoid `any` and `unknown`** - they break code and reduce maintainability in the future
5. **Prefer type definitions over type assertions** - understand the data flow instead of escaping type checking

### Type Hierarchy (Shared Schema Approach)
```
Shared Zod Schemas (Single Source of Truth)
    ↓
Prisma Models + Zod Input/Output Types
    ↓
tRPC Procedures (Validated by Zod)
    ↓
Service Functions (Using Zod Types)
    ↓
UI Components (Exact Type Match)
```

### Key Principles

1. **Zod-First Type Safety**: All input/output types must originate from shared Zod schemas to ensure perfect frontend-backend matching
2. **Zero Type Mismatches**: Frontend types must be IDENTICAL to backend types - no `string` vs `'T1' | 'T2'` discrepancies
3. **Single Source of Truth**: One Zod schema defines types for frontend forms, backend validation, and database operations
4. **Prisma Integration**: Combine Prisma-generated types with Zod schemas for complete type coverage
5. **Runtime + Compile-time Safety**: Zod provides runtime validation while TypeScript ensures compile-time safety
6. **Maximum Zod Usage**: Use Zod schemas extensively for all data validation and type generation
7. **Strategic Generics**: Create reusable abstractions over Zod + Prisma types for common patterns

### Type Implementation Strategy

**1. Shared Zod Schemas (Single Source of Truth):**
```typescript
// src/lib/schemas.ts - All input/output schemas
import { z } from 'zod';

export const createServiceSchema = z.object({
  title: z.string().min(1),
  category: z.enum(['cleaning', 'plumbing', 'electrical']), // Exact match everywhere
  price: z.number().positive(),
  description: z.string(),
});

export const updateServiceSchema = createServiceSchema.partial();
export const serviceFilterSchema = z.object({
  category: z.enum(['cleaning', 'plumbing', 'electrical']).optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
});

// Infer types from schemas
export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
export type ServiceFilterInput = z.infer<typeof serviceFilterSchema>;
```

**2. tRPC with Perfect Type Matching:**
```typescript
// src/server/api/routers/service.ts
import { createServiceSchema, updateServiceSchema } from '@/lib/schemas';

export const serviceRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createServiceSchema) // Zod validation + type inference
    .mutation(async ({ input, ctx }) => {
      // input.category is guaranteed to be 'cleaning' | 'plumbing' | 'electrical'
      const serviceService = createServiceService({ db: ctx.db, userId: ctx.session.user.id });
      return await serviceService.create(input);
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string(), data: updateServiceSchema }))
    .mutation(async ({ input, ctx }) => {
      const serviceService = createServiceService({ db: ctx.db, userId: ctx.session.user.id });
      return await serviceService.update(input.id, input.data);
    }),
});
```

**3. Frontend with Exact Type Match:**
```typescript
// Frontend component
import { api } from '@/lib/api';
import type { CreateServiceInput } from '@/lib/schemas';

function CreateServiceForm() {
  const createService = api.service.create.useMutation();
  
  const handleSubmit = (data: CreateServiceInput) => {
    // data.category is EXACTLY 'cleaning' | 'plumbing' | 'electrical'
    // Perfect match with backend expectation
    createService.mutate(data);
  };
}
```

**4. Combine Zod + Prisma for Complete Coverage:**
```typescript
// Use Prisma for database queries + Zod for validation
const serviceDetailQuery = Prisma.validator<Prisma.ServiceDefaultArgs>()({
  include: {
    provider: { select: { id: true, name: true, image: true } },
    reviews: { include: { user: { select: { name: true, image: true } } } },
    category: true,
  }
});

type ServiceForDetail = Prisma.ServiceGetPayload<typeof serviceDetailQuery>;

// Component receives exact Prisma type
interface ServiceDetailProps {
  service: ServiceForDetail;
  onUpdate: (data: UpdateServiceInput) => void; // Zod-validated input
}
```

**5. Generic Patterns for Reusability:**
```typescript
// Generic utilities combining Zod + Prisma
type WithValidation<T, TSchema extends z.ZodSchema> = {
  data: T;
  validate: (input: unknown) => z.infer<TSchema>;
};

type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
};

type CRUDOperations<TModel, TCreate extends z.ZodSchema, TUpdate extends z.ZodSchema> = {
  create: (data: z.infer<TCreate>) => Promise<TModel>;
  update: (id: string, data: z.infer<TUpdate>) => Promise<TModel>;
  delete: (id: string) => Promise<void>;
};
```

### Null Safety Patterns

**CRITICAL**: Avoid using the non-null assertion operator (`!`) in favor of explicit null handling patterns.

#### 1. **Early Return with Type Guards**
```typescript
// ❌ Using ! (dangerous)
function processUser(userId: string) {
  const user = getUser(userId);
  return user!.name; // Runtime error if user is null
}

// ✅ Early return with explicit error handling
function processUser(userId: string) {
  const user = getUser(userId);
  if (!user) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
  }
  return user.name; // TypeScript knows user exists
}
```

#### 2. **Optional Chaining with Nullish Coalescing**
```typescript
// ❌ Using ! (dangerous)
const userName = user!.profile!.name;

// ✅ Safe access with fallbacks
const userName = user?.profile?.name ?? 'Unknown';
```

#### 3. **Validation Functions with Type Assertions**
```typescript
// Create reusable validation utilities
function assertExists<T>(value: T | null | undefined, message: string): asserts value is T {
  if (value == null) {
    throw new TRPCError({ code: 'NOT_FOUND', message });
  }
}

// Usage
function processUser(userId: string) {
  const user = getUser(userId);
  assertExists(user, 'User not found');
  return user.name; // TypeScript knows user exists
}
```

#### 4. **Result Pattern for Error Handling**
```typescript
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

function getUser(id: string): Result<User> {
  const user = findUserById(id);
  if (!user) {
    return { success: false, error: new Error('User not found') };
  }
  return { success: true, data: user };
}

// Usage
const result = getUser(userId);
if (!result.success) {
  throw new TRPCError({ code: 'NOT_FOUND', message: result.error.message });
}
// TypeScript knows result.data is User
```

#### 5. **Zod for Runtime Validation**
```typescript
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

function processUser(userData: unknown) {
  const user = UserSchema.parse(userData); // Throws if invalid
  return user.name; // TypeScript knows the shape
}
```

### Benefits of Shared Zod Schema Approach
- **Perfect Type Matching**: Frontend and backend types are IDENTICAL - no mismatches possible
- **Runtime Safety**: Zod validates data at runtime, catching invalid inputs before they reach your logic
- **Compile-time Safety**: TypeScript enforces types at compile-time using Zod-inferred types
- **Single Source of Truth**: One schema defines validation rules, types, and documentation
- **Automatic Type Inference**: tRPC automatically propagates exact types from Zod schemas
- **Zero Type Drift**: Changes to schemas automatically update all dependent types
- **Self-Documenting**: Zod schemas serve as both validation and type documentation
- **Maintainability**: Refactoring schemas updates types everywhere automatically
- **Developer Experience**: Perfect IntelliSense and autocomplete throughout the stack

## Code Quality Standards

### Common Patterns to Avoid

#### 1. **Utility Function Duplication**
- **NEVER** duplicate formatting functions like `formatPrice()`, `formatDate()`, `getStatusBadge()`
- **ALWAYS** check if a utility function exists in `/src/lib/utils.ts` before creating a new one
- Common utilities that should be centralized:
  - Currency formatting
  - Date/time formatting
  - Status badge rendering
  - Phone number formatting
  - Text truncation

#### 2. **Router Pattern Anti-Patterns**
- **AVOID** repeating user fetching logic in every procedure
- **USE** middleware or shared functions for common operations
- **STANDARDIZE** error handling - use `TRPCError` consistently, not generic `Error`

Example of proper error handling:
```typescript
// ✅ Good: Consistent error handling
throw new TRPCError({
  code: 'NOT_FOUND',
  message: 'User not found',
});

// ❌ Bad: Generic error
throw new Error('User not found');
```

#### 3. **Component Architecture**
- **AVOID** god components (>300 lines)
- **EXTRACT** reusable logic into custom hooks
- **SPLIT** large components into smaller, focused components
- **USE** composition over inheritance

#### 4. **SOLID Principles Compliance**

##### Single Responsibility Principle (SRP)
- Each component/function should have ONE reason to change
- Extract complex calculations into separate functions
- Separate UI logic from business logic

##### Open/Closed Principle (OCP)
- Use configuration objects instead of hardcoded values
- Design components to be extensible without modification

##### Dependency Inversion Principle (DIP)
- Depend on abstractions, not concrete implementations
- Use dependency injection for testability

### Shared Components to Use

Before creating new UI elements, check these existing patterns:

#### 1. **Status Display**
```typescript
// Use shared StatusBadge component (when created)
import { StatusBadge } from '@/components/ui/status-badge';
<StatusBadge status={booking.status} type="booking" />
```

#### 2. **Price Display**
```typescript
// Use shared PriceDisplay component (when created)
import { PriceDisplay } from '@/components/ui/price-display';
<PriceDisplay amount={service.price} type={service.priceType} />
```

#### 3. **Date Display**
```typescript
// Use shared DateDisplay component (when created)
import { DateDisplay } from '@/components/ui/date-display';
<DateDisplay date={booking.bookingDate} format="full" />
```

### Refactoring Checklist

When modifying existing code:
1. ✓ Check for duplicated utility functions
2. ✓ Verify component size (<300 lines)
3. ✓ Use consistent error handling
4. ✓ Extract business logic to services
5. ✓ Use shared components where available
6. ✓ Follow existing patterns in the codebase
7. ✓ Add proper TypeScript types
8. ✓ Run `npm run ci` before committing

### Common Code Locations

- **Utility Functions**: `/src/lib/utils.ts`
- **Shared Types**: `/src/types/`
- **UI Components**: `/src/components/ui/`
- **Business Logic**: `/src/server/services/`
- **API Routes**: `/src/server/api/routers/`
- **Database Queries**: Should be in services, not routers

### Performance Considerations

- Use `React.memo` for expensive components
- Implement proper loading states
- Use pagination for large lists
- Optimize images with Next.js Image component
- Implement proper error boundaries

### Current Code Issues to Address

Based on code analysis, the following issues need refactoring:

#### 1. **Critical Code Duplication** (6 files affected)
- `formatPrice()` duplicated in: booking-widget.tsx:105, service-card.tsx:41, service-detail.tsx:61, customer-dashboard.tsx:171, booking-success.tsx:63, booking-modal.tsx:90
- `formatDate()` duplicated in: earnings/page.tsx:88, customer-dashboard.tsx:52, public-profile.tsx:56, booking-card.tsx:138, bookings/[id]/page.tsx:103
- `getStatusBadge()` duplicated in: earnings/page.tsx:98, service-management.tsx:103, customer-dashboard.tsx:62, booking-card.tsx:121, bookings/[id]/page.tsx:86

#### 2. **Router Pattern Violations**
- User fetching repeated in EVERY procedure across all routers
- Inconsistent error handling (mix of TRPCError and generic Error)
- No middleware for common operations

#### 3. **SOLID Violations**
- God component: customer-dashboard.tsx (592 lines)
- Complex service method: service-service.ts:392-412 (earnings calculation mixed with list operation)
- Direct Prisma dependencies in all services (no abstraction layer)

#### 4. **Missing Abstractions**
- No shared StatusBadge component
- No shared PriceDisplay component
- No shared DateDisplay component
- No centralized status configuration
- No repository pattern for database access

These issues should be addressed following the refactoring phases outlined in TODO.md.


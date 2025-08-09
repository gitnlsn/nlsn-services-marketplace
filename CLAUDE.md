# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Core Development Principles

### Planning Before Execution
**ALWAYS design and plan actions before executing them:**
- **Understand the Task**: Fully comprehend what needs to be done before starting
- **Get User Confirmation**: ALWAYS present your plan to the user and get confirmation before implementing
- **Use TodoWrite Tool**: For any non-trivial task, use the TodoWrite tool to create a structured plan
- **Break Down Complex Tasks**: Divide large tasks into smaller, manageable steps
- **Consider Dependencies**: Identify what needs to be done first and what can be done in parallel
- **Verify Requirements**: Ensure you understand all requirements before implementation
- **Think Through Edge Cases**: Consider potential issues and edge cases during planning
- **Plan Verification**: Include steps to verify the implementation works correctly

### Frontend/UX-First Design (Planning Phase)
**When DESIGNING features, think UI-first:**

**Design Flow Order:**
1. User needs and goals
2. User interface mockups/wireframes
3. User interaction flows
4. Information requirements (what data is needed)
5. User journey mapping
6. Edge cases and states (empty, loading, error)
7. Accessibility requirements
8. **Validate Mermaid diagrams**: Run `npm run mermaid` to validate all diagrams

**Key Concepts (UX Nomenclature):**
- **User Journey**: The complete path a user takes to accomplish a goal
- **User Flow**: Step-by-step interactions within a feature
- **Information Architecture**: What information is displayed and where
- **Interaction Patterns**: How users interact with elements (click, swipe, type)
- **States**: Different conditions of the UI (empty, loading, error, success)
- **Mockups/Wireframes**: Visual representations of the interface
- **User Stories**: "As a [user], I want to [action] so that [outcome]"

### Documentation Requirements (docs folder)
**IMPORTANT: No JavaScript in documentation files:**
- **NEVER use JavaScript** in HTML files within the `docs/` folder
- All documentation should be static HTML only
- Remove any `<script>` tags, onclick handlers, or JavaScript functionality
- Documentation should work without any JavaScript execution
- Exception: Mermaid.js CDN for diagram rendering is allowed (but no custom JS)

### Mermaid Diagram Requirements
**ALWAYS use `<pre class="mermaid">` tags for Mermaid diagrams in HTML files:**
- Never use `<div class="mermaid">` - it causes rendering issues
- Always wrap Mermaid code in `<pre class="mermaid">` tags
- This ensures proper parsing and rendering of diagrams
- Example:
  ```html
  <pre class="mermaid">
  graph TD
      A[Start] --> B[Process]
      B --> C[End]
  </pre>
  ```

### Implementation Order (Building Phase)
**When IMPLEMENTING features, build from database to frontend:**

**Development Flow Order:**
1. Database schema design
2. Prisma migrations
3. Service layer implementation
4. tRPC procedures
5. Frontend components
6. Integration testing
7. User acceptance testing

**Key Concepts (Development Nomenclature):**
- **Schema**: Database table structure and relationships
- **Migration**: Database schema changes applied to the database
- **Service Layer**: Business logic separated from API layer
- **tRPC Procedures**: Type-safe API endpoints
- **React Components**: UI building blocks
- **Integration Testing**: Testing the complete flow
- **Type Safety**: Ensuring data types match across all layers

### SOLID Principles
- **Single Responsibility**: Each class/function should have one reason to change
- **Open/Closed**: Open for extension, closed for modification
- **Liskov Substitution**: Derived classes must be substitutable for base classes
- **Interface Segregation**: Prefer specific interfaces over general-purpose ones
- **Dependency Inversion**: Depend on abstractions, not concretions

### KISS (Keep It Simple, Stupid)
- Write the simplest solution that works
- Avoid over-engineering and premature optimization
- Clear, readable code over clever solutions

### YAGNI (You Aren't Gonna Need It)
- Do not implement features until they are actually needed
- Avoid building large architectures for hypothetical future requirements
- Focus on current requirements, not potential future ones

### Testing-First Development
- Write code with testability in mind from the start
- Every piece of logic should be testable in isolation
- Prefer dependency injection for better testability
- Use object parameters instead of arrays for function inputs (allows for easier extension and mocking)

### Fullstack Feature Development with tRPC
When implementing features using tRPC, adopt a fullstack mindset:
- **Complete Feature Implementation**: Implement each feature completely from database to frontend before starting the next one
- **Type-Safe Integration**: Leverage tRPC's automatic TypeScript interface extension from backend to frontend
- **Implementation Flow** (after UX design is complete):
  1. Create/update Prisma schema based on data requirements identified during UX design
  2. Generate Prisma client and run migrations
  3. Implement the service layer with business logic
  4. Create tRPC procedures that expose the services
  5. Build the frontend components using the tRPC client
  6. Test the complete user flow end-to-end
  7. Verify it matches the original UX design
- **Benefits**: This approach keeps everything connected throughout development, reduces context switching, and ensures type safety across the entire stack

### Service Layer Architecture
Even though we use tRPC routers, we maintain a clean separation of concerns with a service layer:
- **tRPC Router Role**: Handle request/response, validation, and authentication
- **Service Layer Role**: Contains all business logic, database operations, and external service integrations
- **Dependency Injection**: Services receive all dependencies as a single object with a defined interface
- **Structure Example**:
  ```typescript
  // Define dependencies interface
  interface UserServiceDeps {
    db: PrismaClient;
    emailService: EmailService;
    logger?: Logger;
  }
  
  // Service with injected dependencies
  class UserService {
    constructor(private deps: UserServiceDeps) {}
    
    async createUser(data: CreateUserInput) {
      // Business logic here
      const user = await this.deps.db.user.create({ data });
      await this.deps.emailService.sendWelcome(user.email);
      return user;
    }
  }
  
  // tRPC router calls the service
  export const userRouter = createTRPCRouter({
    create: protectedProcedure
      .input(createUserSchema)
      .mutation(async ({ ctx, input }) => {
        // Create service with dependencies
        const userService = new UserService({
          db: ctx.db,
          emailService: new EmailService(), // or from a service container
          logger: console,
        });
        return userService.createUser(input);
      }),
  });
  ```
- **Benefits**:
  - Services are easily testable with mocked dependencies
  - Business logic is decoupled from the API layer
  - Services can be reused across different routers or contexts
  - Clear separation between transport layer (tRPC) and business logic
  - Single interface makes it easy to extend dependencies without changing constructor signature

### Dependency Injection Pattern
```typescript
// Preferred: Object injection for testability and extensibility
function processUser({ userService, logger, validator }: {
  userService: UserService;
  logger: Logger;
  validator: Validator;
}) { /* ... */ }

// Avoid: Multiple separate parameters that are harder to extend
function processUser(userService: UserService, logger: Logger, validator: Validator) { /* ... */ }
```

### Development Tools as Quality Gates
We trust our development tools as the primary indicators of code health:
- **Biome**: If linting and formatting pass, the code style is correct
- **TypeScript (tsc)**: If type checking passes, the types are sound
- **Vitest**: If tests pass, the logic is correct (when configured)
- **Build**: If the build succeeds, the application is deployable

A clean output from all these tools means the project is healthy. Always run these checks before considering any task complete.

## Commands

### Development
- `npm run dev` - Start development server with Next.js Turbo mode on http://localhost:3000
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run preview` - Build and preview production locally

### Documentation
- `npm run mermaid` - Validate all Mermaid diagrams in documentation (run after creating/updating diagrams)

### Database
- `npm run db:push` - Push schema changes to database (development)
- `npm run db:generate` - Generate Prisma migrations
- `./start-database.sh` or `docker-compose up -d` - Start PostgreSQL with pgvector extension

### Code Quality
- `npm run check` - Run Biome linting and formatting checks
- `npm run check:write` - Apply safe fixes automatically
- `npm run typecheck` - Check TypeScript types without building

### Testing
- `npm run test:frontend` - Run frontend tests
- `npm run test:backend` - Run backend tests
- `npm run test:all` - Run all unit tests
- `npm run test:e2e` - Run landing page e2e test
- `npm run test:e2e:auth` - Run authentication flow e2e test
- `npm run test:e2e:navigation` - Run navigation e2e test
- `npm run test:e2e:performance` - Run performance e2e test
- `npm run test:full` - Run complete test suite (quality checks + production build + all e2e tests)

## Architecture

### Tech Stack
- **Framework**: Next.js 15 with App Router and React 19
- **API**: tRPC v11 for type-safe APIs with automatic client generation
- **Database**: PostgreSQL with Prisma ORM and pgvector extension
- **Auth**: NextAuth.js v5 (beta) with database sessions
- **UI Components**: shadcn/ui components (exclusively - no other component libraries)
- **Styling**: Tailwind CSS v4
- **Language**: TypeScript with strict mode

### Key Architectural Patterns

#### API Layer (tRPC)
- Router definition: `src/server/api/root.ts`
- Procedure types: Public and protected (authenticated)
- Context creation with timing middleware in development
- Client setup: `src/trpc/react.tsx` (React Query) and `src/trpc/server.ts` (server-side)

#### Authentication Flow
- Configuration: `src/server/auth/config.ts`
- Google OAuth provider with Prisma adapter
- Database-backed sessions with extended typing
- Protected procedures check `ctx.session?.user` before execution

#### Database Access Pattern
- Single Prisma client instance: `src/server/db.ts`
- Global singleton pattern for development hot-reload
- Schema-first approach with migrations
- Relations: User → Posts, User → Accounts/Sessions

#### Environment Management
- Validation layer: `src/env.js` using @t3-oss/env-nextjs
- Server/client variable separation
- Runtime validation with Zod schemas
- Required vars: DATABASE_URL, AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET

### UI Component Guidelines

**IMPORTANT: Use shadcn/ui components exclusively for all UI elements**
- All UI components are located in `src/components/ui/`
- These components are pre-installed and configured
- DO NOT install or suggest other UI libraries (Material-UI, Ant Design, Chakra UI, etc.)
- DO NOT create custom components when a shadcn/ui component exists for that purpose
- Always check `src/components/ui/` for available components before implementing new UI

Available shadcn/ui components:
- Form controls: Button, Input, Textarea, Select, Checkbox, Radio, Switch, Slider
- Layout: Card, Accordion, Tabs, Sheet, Dialog, Alert, Separator
- Navigation: NavigationMenu, Breadcrumb, DropdownMenu, ContextMenu, Menubar
- Data display: Table, Badge, Progress, Skeleton, Avatar
- Feedback: Alert, AlertDialog, Toast (via Sonner), Tooltip, HoverCard
- Date/Time: Calendar, DatePicker, DateRangePicker (custom compositions)
- Search: Command (command palette/search)
- Utility: ScrollArea, Form (with react-hook-form integration)

### Project Structure
```
src/
├── app/              # Next.js App Router pages and components
│   ├── api/         # API route handlers (auth, tRPC)
│   ├── (auth)/      # Auth-required pages group
│   ├── (public)/    # Public pages group
│   └── _components/ # Page-specific components
├── components/       # Reusable components
│   ├── ui/          # shadcn/ui components (DO NOT modify directly)
│   ├── layout/      # Layout components (header, sidebar, footer)
│   ├── service/     # Service-related components
│   ├── forms/       # Form components
│   ├── data/        # Data display components
│   └── common/      # Common/utility components
├── lib/              # Utility functions and helpers
├── hooks/            # Custom React hooks
├── server/           # Backend logic
│   ├── api/         # tRPC routers and procedures
│   ├── auth/        # NextAuth.js configuration
│   ├── services/    # Business logic services
│   └── db.ts        # Prisma client singleton
├── trpc/             # tRPC client configuration
├── styles/           # Global styles
├── types/            # TypeScript type definitions
└── env.js            # Environment validation

docs/                 # Documentation
├── screens/          # HTML mockups/prototypes
├── flow/             # User flow diagrams
└── *.md              # Documentation files

e2e/                  # End-to-end tests
├── tests/            # Test specifications
├── utils/            # Test utilities
├── screenshots/      # Test screenshots (gitignored)
└── browser-session/  # Browser session data (gitignored)

prisma/               # Database
└── schema.prisma     # Database schema

public/               # Static assets
└── ...               # Images, fonts, etc.
```

### Development Notes
- Artificial delay (1s) added to API calls in development for testing loading states
- Biome configured with sorted-classes rule for Tailwind consistency
- Path alias: `~/*` maps to `./src/*`
- Post-install automatically generates Prisma client
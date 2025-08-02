# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a services marketplace built with the T3 Stack - a Next.js application with tRPC API, Prisma ORM for PostgreSQL, NextAuth.js for authentication, and Tailwind CSS for styling. The project follows TypeScript conventions with Biome for formatting/linting.

## Essential Commands

- **Development**: `npm run dev` - Starts development server with Turbo
- **Build**: `npm run build` - Builds production bundle
- **Code Quality**: `npm run check` - Runs Biome formatting and linting with auto-fix
- **Type Check**: `npm run typecheck` - Validates TypeScript types
- **Database**: 
  - `npm run db:generate` - Generate Prisma migrations
  - `npm run db:push` - Push schema changes to database
- **Testing**: `npm test` - Run tests with Vitest
- **Validate Diagrams**: `npm run validate-mermaid` - Validates all Mermaid diagrams in docs
- **Full CI**: `npm run ci` - Runs validation, linting, type checking, build, and tests

## Architecture Overview

### Core Structure
- **Frontend**: Next.js App Router in `src/app/` with React components
- **API**: tRPC routers in `src/server/api/routers/` exposed through `src/server/api/root.ts`
- **Database**: PostgreSQL with Prisma ORM, schema defined in `prisma/schema.prisma`
- **Authentication**: NextAuth.js configuration in `src/server/auth/`
- **Styling**: Tailwind CSS with globals in `src/styles/globals.css`

### Key Conventions
- All API routers must be manually registered in `src/server/api/root.ts`
- tRPC provides type-safe API calls between frontend and backend
- Prisma handles all database operations with type-safe queries
- Authentication flows through NextAuth.js with Prisma adapter

## Development Workflow

### Git Branching
- Work on branches named `gemini/[yyyy-MM-dd]` 
- Never use `git push --force`
- Always checkout to gemini branch before committing

### Documentation First
1. Update HTML documentation in `docs/` folder before implementation
2. Validate Mermaid diagrams with `npm run validate-mermaid`
3. Keep all documentation consistent and linked from `docs/index.html`
4. Backend services documented individually in `docs/backend-services/`

### Mermaid Diagram Colors
- Frontend Request: Light Blue (#ADD8E6)
- Auth & Authorization: Gold (#FFD700)
- Validation (Zod): Light Green (#90EE90)
- Prisma Operations: Plum (#DDA0DD)
- External API Calls: Sky Blue (#87CEEB)
- Success State: Mint Green (#C8E6C9)
- Error State: Light Red (#FFCDD2)

## Testing Strategy
- Test framework: Vitest with React Testing Library
- Run tests: `npm test`
- Test coverage: `npm test -- --coverage`
- Example test structure in `src/test/hello.test.ts`

## Key Features to Implement
Based on documentation analysis, the marketplace includes:
- Service management (create, edit, search, book)
- Booking workflow (accept, decline, cancel)
- Payment integration with Pagarme (credit cards, Pix, boleto)
- Notification system via Twilio (SMS, WhatsApp, Email)
- User profiles and review system
- Professional dashboard with earnings tracking
- Escrow payment system with 15-day holding period
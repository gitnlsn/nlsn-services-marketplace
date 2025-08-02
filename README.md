# NLSN Services Marketplace

A modern peer-to-peer services marketplace built with the T3 Stack where professionals can showcase their skills and connect with clients who need their services.

## 🚀 Overview

This platform creates a dynamic ecosystem for service providers and consumers with features like:

- **Unified User Model** - Every user can be both a client and a professional
- **Rich Service Portfolios** - Multi-page showcases with photo galleries
- **Semantic Search** - AI-powered search that understands intent, not just keywords
- **Secure Payments** - Pagarme-powered escrow system with multiple payment methods
- **Multi-Channel Notifications** - SMS, WhatsApp, and email alerts via Twilio
- **Direct Communication** - Optional public contact information for professionals

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org) with App Router
- **Database**: PostgreSQL with [Prisma ORM](https://prisma.io)
- **API**: [tRPC](https://trpc.io) for type-safe APIs
- **Authentication**: [NextAuth.js](https://next-auth.js.org)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com)
- **Testing**: [Vitest](https://vitest.dev) with React Testing Library
- **Code Quality**: [Biome](https://biomejs.dev) for linting and formatting

## 📦 Getting Started

### Prerequisites

- Node.js 20+ and npm
- PostgreSQL database
- Pagarme account (for payments)
- Twilio account (for notifications)
- AWS S3 or Cloudinary (for image storage)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/nlsn-services-marketplace.git
cd nlsn-services-marketplace
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Configure your `.env` file with:
   - Database connection string
   - NextAuth secret
   - Pagarme API keys
   - Twilio credentials
   - S3/Cloudinary configuration

5. Set up the database:
```bash
npm run db:push
npm run db:generate
```

6. Start the development server:
```bash
npm run dev
```

## 🧰 Available Scripts

- `npm run dev` - Start development server with Turbo
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - Run Biome linting and formatting
- `npm run typecheck` - Check TypeScript types
- `npm run test` - Run tests with Vitest
- `npm run db:generate` - Generate Prisma migrations
- `npm run db:push` - Push schema changes to database
- `npm run validate-mermaid` - Validate documentation diagrams
- `npm run ci` - Run full CI pipeline

## 📁 Project Structure

```
nlsn-services-marketplace/
├── src/
│   ├── app/           # Next.js App Router pages
│   ├── components/    # React components
│   ├── server/
│   │   ├── api/       # tRPC routers
│   │   └── auth/      # NextAuth configuration
│   ├── styles/        # Global styles
│   └── utils/         # Utility functions
├── prisma/
│   └── schema.prisma  # Database schema
├── docs/              # Project documentation
└── tests/             # Test files
```

## 📖 Documentation

Comprehensive documentation is available in the `/docs` folder:

- [Authentication](./docs/authentication.html) - User authentication flows
- [Services](./docs/services.html) - Service management
- [Search](./docs/search.html) - Semantic search implementation
- [Payments](./docs/payments.html) - Payment processing and escrow
- [Notifications](./docs/notifications.html) - Multi-channel alerts
- [Frontend Screens](./docs/frontend-screens/index.html) - UI documentation
- [Backend Services](./docs/backend-services/index.html) - API documentation
- [Database Schema](./docs/database/index.html) - Data models

## 🔒 Security

- PCI DSS compliant payment processing
- LGPD compliant data handling
- Encrypted PII storage
- CSRF protection
- Rate limiting
- SQL injection prevention

## 🚀 Deployment

The application is optimized for deployment on [Vercel](https://vercel.com):

1. Push your code to GitHub
2. Import the repository in Vercel
3. Configure environment variables
4. Deploy!

For other platforms, see the [deployment guides](https://create.t3.gg/en/deployment).

## 🤝 Contributing

See [CLAUDE.md](./CLAUDE.md) for development guidelines and conventions.

## 📄 License

This project is private and proprietary.

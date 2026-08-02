# Problems4Us

**Turn customer complaints into business opportunities.**

Problems4Us is an AI-powered opportunity discovery platform that helps builders, entrepreneurs, consultants, and small businesses discover real customer pain points from public internet sources.

## What It Does

1. **Collects** problems from GitHub Issues, Hacker News, forums, reviews, and social media
2. **Analyzes** with AI to cluster similar complaints and pain points
3. **Scores** each problem by frequency, severity, willingness to pay, market size, and trend direction
4. **Suggests** potential product, SaaS, service, or automation ideas
5. **Tracks** whether each problem is becoming more or less common over time

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router) + React 19 |
| Styling | Tailwind CSS 4 |
| Charts | Recharts |
| Backend API | Next.js API Routes |
| Database | Azure SQL Database |
| AI | Azure OpenAI (configurable) |
| Hosting | Azure App Service / Static Web Apps |

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm, yarn, or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/problems4us.git
cd problems4us

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

| Variable | Description | Default |
|----------|-------------|---------|
| `AI_PROVIDER` | AI provider: `mock`, `azure-openai`, `openai` | `mock` |
| `ADMIN_API_KEY` | Owner key for admin/ingest/AI tool APIs | — |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint URL | — |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI API key | — |
| `AZURE_OPENAI_DEPLOYMENT` | Azure OpenAI deployment name | — |
| `AZURE_SQL_CONNECTION_STRING` | Azure SQL connection string | — |
| `NEXT_PUBLIC_APP_URL` | Public app URL | `http://localhost:3000` |

For the MVP, set `AI_PROVIDER=mock` to use built-in mock data.

## Project Structure

```
problems4us/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Landing page
│   │   ├── layout.tsx            # Root layout
│   │   ├── globals.css           # Global styles + Tailwind
│   │   ├── dashboard/
│   │   │   └── page.tsx          # Analytics dashboard
│   │   ├── problems/
│   │   │   ├── page.tsx          # Problem explorer (filterable table)
│   │   │   └── [id]/
│   │   │       └── page.tsx      # Problem detail page
│   │   ├── ideas/
│   │   │   └── page.tsx          # AI-generated product ideas
│   │   ├── admin/
│   │   │   └── page.tsx          # Data source management
│   │   └── api/
│   │       ├── dashboard/        # Dashboard stats endpoint
│   │       ├── problems/         # Pain points CRUD
│   │       ├── ideas/            # Product ideas endpoint
│   │       ├── sources/          # Data source management
│   │       ├── ai/               # AI analysis endpoints
│   │       └── health/           # Health check
│   ├── components/
│   │   ├── layout/               # Navbar, Footer, ThemeProvider
│   │   ├── ui/                   # Reusable UI components
│   │   └── home/                 # Landing page components
│   └── lib/
│       ├── types.ts              # TypeScript interfaces
│       ├── mock-data.ts          # Mock data for MVP
│       ├── scoring.ts            # Opportunity scoring formula
│       ├── ai-service.ts         # AI provider abstraction
│       ├── ai-prompts.ts         # AI prompt templates
│       └── utils.ts              # Utility functions
├── database/
│   ├── schema.sql                # Azure SQL schema
│   └── seed.sql                  # Seed data
├── tests/                        # Unit tests
├── docs/
│   └── azure-deployment.md       # Azure deployment guide
└── package.json
```

## Pages

| Page | Path | Description |
|------|------|-------------|
| Home | `/` | Landing page with value proposition |
| Dashboard | `/dashboard` | Analytics overview with charts |
| Problem Explorer | `/problems` | Searchable/filterable pain point table |
| Problem Detail | `/problems/[id]` | Deep dive into a specific pain point |
| Product Ideas | `/ideas` | AI-generated product suggestions |
| Data Sources | `/admin` | Configure collection sources |

## Opportunity Scoring

Each pain point is scored 0–100 using a weighted formula:

```
OpportunityScore =
  Frequency     × 0.25 +
  Severity      × 0.25 +
  Willingness   × 0.30 +
  Trend         × 0.10 +
  Market Size   × 0.10
```

Score thresholds:
- **80–100**: Critical opportunity
- **60–79**: High potential
- **40–59**: Medium interest
- **0–39**: Low priority

## Database Setup

To set up the Azure SQL database:

```bash
# Connect to your Azure SQL instance and run:
sqlcmd -S your-server.database.windows.net -U your-user -P your-password -d problems4us -i database/schema.sql
sqlcmd -S your-server.database.windows.net -U your-user -P your-password -d problems4us -i database/seed.sql
```

## Deployment

See [docs/azure-deployment.md](docs/azure-deployment.md) for detailed Azure deployment instructions.

Quick deploy:

```bash
# Build for production
npm run build

# The standalone output is in .next/standalone
```

## Development

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run tests
```

## License

MIT

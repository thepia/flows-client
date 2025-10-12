# Thepia Flows Database

Multi-tenant database management system for Thepia's client workflow applications.

## Quick Start

```bash
# Clone and setup
git clone https://github.com/thepia/flows-db.git
cd flows-db
pnpm install

# Configure environment
cp config/supabase.example.env .env
# Edit .env with your Supabase credentials

# Setup database
pnpm db:migrate

# Create your first admin user
# Run this in Supabase SQL editor:
SELECT * FROM assign_thepia_staff_role('your-email@thepia.com', 'Initial admin');
```

## Architecture

### Multi-Tenant Design

- **Single database** with Row Level Security (RLS)
- **Client isolation** via JWT claims and RLS policies
- **Schema separation**: `api` (public), `internal` (private), `audit` (compliance)

### Role-Based Access Control

- **`thepia_staff`** - Full cross-client access for Thepia employees
- **`authenticated`** - Client-scoped access via JWT `client_id`/`client_code`
- **`anon`** - Limited demo access

### Security Features

- JWT-based authentication with role claims
- Row Level Security on all tables
- Encrypted PII in invitation tokens
- Comprehensive audit logging

## Key Components

### Client Management

```bash
# Create a new client
pnpm client:create --client-code="acme" --legal-name="Acme Corp"

# Setup demo environment
pnpm demo:setup
```

### User Role Management

```sql
-- Assign admin role to a user
SELECT * FROM assign_thepia_staff_role('user@example.com', 'Admin promotion');

-- List all user roles
SELECT * FROM list_user_roles();

-- Remove user role
SELECT * FROM remove_user_role('user@example.com');
```

### Invitations System

- JWT-based invitations with encrypted PII
- Email-based invitation delivery
- Status tracking and analytics
- Client-specific invitation management

## Documentation

### Core Documentation

- **[Setup Guide](docs/SETUP_GUIDE.md)** - Complete installation instructions
- **[Role Architecture Decisions](docs/ROLE_ARCHITECTURE_DECISIONS.md)** - 📋 Complete architectural rationale and decisions
- **[User Role Management](docs/USER_ROLE_MANAGEMENT.md)** - Role assignment and permissions
- **[Schema Architecture](docs/SCHEMA_ARCHITECTURE.md)** - Database design and RLS policies
- **[API Reference](docs/API_REFERENCE.md)** - Function and endpoint documentation

### Service Worker & Native Architecture

- **[Service Worker Architecture](docs/SERVICE_WORKER_ARCHITECTURE.md)** - Module-based service worker design
- **[Communication Patterns](docs/SERVICE_WORKER_COMMUNICATION_PATTERNS.md)** - SW configuration and messaging
- **[Native Service Worker Replacement](docs/NATIVE_SERVICE_WORKER_REPLACEMENT.md)** - iOS/Android implementation
- **[RPC Interface](docs/SERVICE_WORKER_RPC_INTERFACE.md)** - Type-safe procedure definitions
- **[Client Storage Abstraction](docs/CLIENT_STORAGE_ABSTRACTION.md)** - Thin client layer design
- **[Core Architecture Contracts](docs/CORE_ARCHITECTURE_CONTRACTS.md)** - API availability and glue points
- **[Flows Data Types](docs/FLOWS_DATA_TYPES.md)** - Entity definitions and relationships

### Type System

- **[Type System Usage Guide](docs/TYPE_SYSTEM_USAGE.md)** - 📋 Complete guide to using Flows types

All Flows data types are available as TypeScript definitions:

```typescript
import type {
  FlowsJourney,
  FlowsTask,
  FlowsAttachment,
  FlowsDBProcedures,
  Transport,
} from '@thepia/flows-db/types';

// Create a journey
const journey: FlowsJourney = {
  id: crypto.randomUUID(),
  client_id: 'acme',
  app_id: 'flows',
  title: 'Employee Onboarding',
  status: 'invited',
  invited_at: new Date(),
  owner_id: 'manager-123',
  participants: ['employee-456'],
  created_at: new Date(),
  updated_at: new Date(),
  metadata: {}
};

// Use type-safe procedures
const tasks: FlowsTask[] = await db.query.tasks({
  filter: { eq: { journey_id: journey.id } }
});
```

## Development

### Database Migrations

```bash
# Apply all schema files
pnpm db:migrate

# Apply specific schema
psql -f schemas/22_user_role_management.sql

# Reset database (careful!)
pnpm db:reset
```

### Testing

```bash
# Run all tests
pnpm test

# Run specific test suite
pnpm test:invitations
pnpm test:clients
pnpm test:roles
```

## Production Deployment

### Environment Variables

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
JWT_SECRET=your-jwt-secret
```

### Database Setup

1. Apply all schema files in order: `00_*.sql` through `22_*.sql`
2. Configure RLS policies and permissions
3. Create initial admin user
4. Test client creation and invitation flows

### Security Checklist

- [ ] RLS enabled on all tables
- [ ] Service role key secured
- [ ] JWT secrets rotated
- [ ] Admin users properly assigned
- [ ] Audit logging enabled

## Support

- **Issues**: [GitHub Issues](https://github.com/thepia/flows-db/issues)
- **Documentation**: `/docs` directory
- **Email**: <tech@thepia.com>

## License

Private - Thepia Technologies

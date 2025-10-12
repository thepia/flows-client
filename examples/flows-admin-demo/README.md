# Flows Admin Demo

A demo admin application for managing employees and invitations in the Thepia Flows authentication system. Built with SvelteKit, shadcn-svelte, and Tailwind CSS.

## Features

- **Employee Dashboard**: View all employees with enrollment status and completion percentages
- **Employee Details**: Detailed view showing documents, tasks, and onboarding progress
- **Invitation Management**: Create and track onboarding/offboarding invitations
- **Client-Only Architecture**: Runs entirely in the browser with mock data
- **Responsive Design**: Works on desktop and mobile devices

## Technology Stack

- **SvelteKit**: Full-stack framework with client-only configuration
- **shadcn-svelte**: Beautiful, accessible UI components
- **Tailwind CSS**: Utility-first CSS framework
- **TypeScript**: Type-safe development
- **Lucide Icons**: Beautiful SVG icons
- **@thepia/branding**: Thepia brand assets and guidelines

## Demo Data

The application supports multiple demo companies with persistent client switching:

- **Hygge & Hvidløg ApS** - Primary internal demo (European food tech)
- **Meridian Brands International** - Primary prospect demo (Global consumer products)  
- **Test Demo Corporation** - Testing client
- **Nets Demo Corporation** - Legacy fallback

Each client has rich demo data including employees, processes, invitations, and branding.

### Client Switching Architecture

For detailed information about client persistence and demo data patterns:
- 📖 **[Demo Data Architecture](docs/demo-data-architecture.md)** - Implementation patterns and data flow
- 🔧 **[Demo Data Troubleshooting](docs/demo-data-troubleshooting.md)** - Common issues and solutions

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

1. Navigate to the demo directory:

   ```bash
   cd examples/flows-admin-demo
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Start the development server:

   ```bash
   pnpm dev
   ```

4. Open your browser to `https://dev.thepia.net:5173`

### Available Scripts

- `pnpm dev` - Start development server (builds service worker locally)
- `pnpm build` - Build for production (copies service worker from package)
- `pnpm preview` - Preview production build
- `pnpm check` - Run Svelte/TypeScript checks
- `pnpm lint` - Run Biome linting
- `pnpm format` - Format code with Biome

### Service Worker Architecture

The demo uses a service worker for offline data management and IndexedDB:

**Development**: `pnpm dev` builds the service worker locally from `src/service-worker/` for fast iteration.

**Production**: `pnpm build` copies the pre-built service worker from `@thepia/flows-db/dist/flows-sw.js` to ensure consistency with the published package.

To use the service worker in your own app:
```bash
# Copy service worker to your static folder
node node_modules/@thepia/flows-db/scripts/copy-sw.js static
```

Add to your build script:
```json
{
  "scripts": {
    "build": "node node_modules/@thepia/flows-db/scripts/copy-sw.js static && vite build"
  }
}
```

## Project Structure

```
src/
├── lib/
│   ├── components/ui/     # shadcn-svelte components
│   ├── data/             # Mock data and helpers
│   ├── types.ts          # TypeScript type definitions
│   └── utils.ts          # Utility functions
├── routes/
│   ├── +page.svelte      # Main dashboard
│   ├── employees/[id]/   # Employee detail pages
│   └── invitations/new/  # Create invitation form
├── app.html              # HTML template
├── app.pcss              # Global styles
└── hooks.client.ts       # Client-side hooks
```

## Key Components

### Dashboard (`/`)

- Overview statistics
- Employee list with status indicators
- Recent invitations
- Quick actions

### Employee Details (`/employees/[id]`)

- Personal information
- Onboarding progress
- Document status tracking
- Task completion

### Create Invitation (`/invitations/new`)

- Form for new invitations
- Preview panel
- Invitation code generation
- Expiration management

## Mock Data

The application includes realistic mock data:

- **Employees**: 4 sample employees with varying completion states
- **Documents**: Contract uploads, ID verification, tax forms
- **Tasks**: IT setup, training modules, compliance requirements
- **Invitations**: Pending, sent, and expired invitation examples

## Styling

The app uses shadcn-svelte components with Tailwind CSS:

- Consistent design system
- Dark/light mode support (configured)
- Responsive layouts
- Accessible components

## Client-Only Architecture

This demo runs entirely in the browser:

- No server-side rendering required
- All data is mocked locally
- Perfect for demonstrations and prototyping
- Easy to deploy to static hosting

## Development Guidelines

### Svelte 5 Specific Patterns

**Bindable Variables**: Use `let` instead of `const` for variables that may be bound or reassigned:
```svelte
<script lang="ts">
// ✅ Correct - allows binding and reassignment
let activeTab = 'home';

// ❌ Incorrect - causes runtime errors with Svelte 5
const activeTab = 'home';
</script>
```

**{@const} Placement**: Must be immediate children of specific blocks. Build errors occur if placed incorrectly:
```svelte
<!-- ✅ Correct -->
{#if condition}
  {@const computed = calculation()}
  <div>{computed}</div>
{/if}

<!-- ❌ Incorrect - nested in div -->
{#if condition}
  <div>
    {@const computed = calculation()} <!-- Build error! -->
  </div>
{/if}
```

Valid parent blocks: `{#if}`, `{:else}`, `{#each}`, `{:then}`, `{:catch}`, `{#snippet}`, `<svelte:fragment>`, `<Component>`

### Linting

This project uses **Biome** instead of ESLint/Prettier:
- Run `pnpm biome check` to check for issues
- Run `pnpm biome format` to format code
- Biome cannot catch Svelte template syntax errors (like {@const} placement)

## Future Enhancements

Potential features for a production version:

- Real API integration with flows-db
- User authentication
- File upload functionality
- Email integration
- Reporting and analytics
- Bulk operations
- Advanced filtering and search

## Related Projects

- `@thepia/flows-auth` - Authentication library
- `@thepia/flows-db` - Database management system
- `@thepia/branding` - Brand assets and guidelines

## License

MIT - See the main flows-db project for details.

## Development Memories

- When updating client demo data follow docs/DEMO_DATA_MEMORY.md
- We save SQL scripts to be run in Supabase Dashboard under /schemas
- You cant check in secrets and tokens
- We use vite-plugin-restart. You can trigger a restart by changing schemas, scripts or the vite configuration.
- Don't try to start the demo dev server, ask me to do it. I will keep it running. You do not yet have the ability to run resident processes
- When asked to pick up on the strategic planning, make sure to pick up around Strategic roadmap docs from earlier (NEXT_IMPROVEMENTS_ROADMAP.md, CLAUDE_CODE_GUIDANCE.md) etc

## Flows Repositories

This section must be replicated across the directories of the Thepia Flows product to ensure consistency. Capture lessons learned.

The repositories are all saved as subdirectories of `/Volumes/Projects/Thepia/`.

### Repository Standards and Consensus

**📋 COMPLETE STANDARDS**: See [thepia.com/docs/flows/repository-standards.md](https://github.com/thepia/thepia.com/blob/main/docs/flows/repository-standards.md) for comprehensive development standards that must be applied across all Flows repositories.

#### Repository Ecosystem

The Thepia Flows product consists of interconnected repositories:

- **`thepia.com`**`: Main website and API server with authentication backend
- **`flows-auth`**: Frontend sign-in UI library (Svelte) with WebAuthn support. Examples `flows-app-demo` and `tasks-app-demo` in `examples/` directory.
- **`flows-client`**: Database schema and functionality with admin demo application(flows-admin-demo)  
- **`flows.thepia.net`**: Public demo website for Thepia Flows with live database integration and passkey authentication

#### Critical Development Standards

- **PNPM only** - Package manager across all repositories
- **Biome configuration** - Exact biome.json required (see standards doc)
- **`NODE_AUTH_TOKEN`** - Local .env file for GitHub package installation
- **Error reporting system** - Mandatory implementation in all demos
- **@thepia/branding integration** - Required for client-specific theming
- **Component breakdown** - Regular refactoring to avoid module bloat
- **automation** - Run automated checks to ensure quality. Build out GitHub Actions.
- **Document First** - Document before implementing new features. Write in /docs/ and reference in README.md

#### Demo Patterns (Mandatory)

```bash
# Required scripts in all demo repositories
pnpm demo:setup     # Initialize demo environment
pnpm demo:*         # Various demo operations  
pnpm build         # Ensure correctness before commits
pnpm lint          # Biome linting (must pass)
```

#### Quality Requirements

- **Strict code standards** for maintaining development velocity
- **Build must pass** before any commit (`pnpm build`)
- **Error reporting to demo server console** for AI debugging
- **File logging** for AI assistant error tracking
- **Consistent patterns** across repositories for generated code quality

#### Cross-Repository Integration

- **GitHub packages** for shared functionality
- **GitHub Actions** for automated workflows
- **Mature demo components** migrate to shared libraries
- **Synchronized standards** across all CLAUDE.md files

#### Architecture Documentation

- **Notifications System**: See [thepia.com/docs/flows/notifications-architecture.md](https://github.com/thepia/thepia.com/blob/main/docs/flows/notifications-architecture.md) for comprehensive notification system architecture recommendations for Flows platform applications

#### Strategic Implementation Guidance

- **Next Improvements**: See `docs/NEXT_IMPROVEMENTS_ROADMAP.md` for business-prioritized implementation guidance
- **Claude Code AI Guidance**: See `docs/CLAUDE_CODE_GUIDANCE.md` for intelligent suggestion framework based on business value
- **Strategic Documentation**: See `docs/STRATEGIC_DOCUMENTATION_RECOMMENDATIONS.md` for thepia.com strategic documentation needs

**AI Assistant Context**: When suggesting next implementations, prioritize business-enabling improvements (API docs, production deployment, security audit) over feature additions. Reference the roadmap documents for context-aware suggestions that align with business priorities.


## Root Cause of My schema Mistakes

  I keep defaulting to "standard Supabase patterns" instead of remembering this project's specific
   architecture:

  - Standard Supabase: Uses public schema by default
  - This project: Uses api schema exclusively with PostgREST restrictions

  What I Should Remember

  Every time I write Supabase code, check:
  1. ✅ Does the client have { db: { schema: 'api' } }?
  2. ✅ Am I assuming default schema behavior?
  3. ✅ Have I seen this exact error before in this project?

  The Pattern I Keep Missing

  I solve the schema issue once, then immediately forget it in the next script/file and repeat the
   same mistake. I need to:

  1. Always start with the schema config when writing any Supabase client code
  2. Reference the working examples (like populate-process-data.cjs) instead of writing from
  scratch
  3. Remember this is NOT a standard Supabase setup
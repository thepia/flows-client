# Biome Configuration Guide for Thepia Projects

This guide documents our standard Biome configuration for consistent code quality across all Thepia projects.

## Why Biome?

- **Performance**: 100x faster than ESLint
- **Unified**: Single tool for both formatting and linting  
- **Better defaults**: Sensible rules out-of-the-box
- **Modern**: Written in Rust with excellent TypeScript/JSX/Svelte support
- **Simple**: Less configuration complexity than ESLint/Prettier combination

## Standard Configuration

### Installation

```bash
pnpm add -D @biomejs/biome
```

### Configuration File

Copy the template from `docs/biome-config-template.json` to your project root as `biome.json`.

### Package.json Scripts

```json
{
  "scripts": {
    "lint": "biome check .",
    "format": "biome format --write .",
    "fix": "biome check --write ."
  }
}
```

## Key Configuration Decisions

### Disabled Rules

#### `useConst: "off"`
**Critical for Svelte projects** - This rule is disabled because:
- Svelte 5 requires `let` for destructuring with `$bindable` props
- Reactive variables and component state need to be mutable
- Auto-fixing `let` to `const` breaks Svelte's reactivity system

**Example of problematic auto-fix:**
```svelte
<!-- This breaks when auto-fixed to const -->
<script>
let { ref = $bindable(null), ...props } = $props();
//   ^^^^ Must be 'let', not 'const'
</script>
```

#### `noConsole: "off"`
- Allow console.log for development debugging
- Can be changed to "error" for production builds

#### `noForEach: "off"`  
- Allow array.forEach() - it's a common and readable pattern
- Biome recommends for-of loops, but forEach is often clearer

### Enabled Rules

#### `noDebugger: "error"`
- Prevent `debugger` statements in production code

#### Import Organization
- Automatically sorts imports on save
- Groups by type (external vs internal modules)

## Framework-Specific Considerations

### Svelte Projects
- **Always disable `useConst`** - Required for proper component binding
- Consider additional Svelte-specific linting with svelte-check

### React Projects  
- `useConst` can remain enabled - React doesn't have the same binding constraints
- Consider React-specific hooks rules

### Node.js Projects
- `useConst` can remain enabled for backend code
- Consider stricter rules for server environments

## Migration from ESLint/Prettier

1. **Remove old dependencies:**
   ```bash
   pnpm remove -D eslint prettier @typescript-eslint/* eslint-*
   ```

2. **Remove config files:**
   ```bash
   rm eslint.config.js .eslintrc* .prettierrc* .prettierignore
   ```

3. **Install Biome:**
   ```bash
   pnpm add -D @biomejs/biome
   ```

4. **Copy configuration:**
   ```bash
   cp docs/biome-config-template.json biome.json
   ```

5. **Update package.json scripts** (see above)

6. **Format codebase:**
   ```bash
   pnpm format
   pnpm fix
   ```

## Common Issues and Solutions

### Issue: "Cannot bind to constant"
**Cause:** `useConst` rule changed `let` to `const` for bindable props
**Solution:** Disable `useConst` rule and change back to `let`

### Issue: "Cannot assign to constant"  
**Cause:** `useConst` rule changed reactive variables to `const`
**Solution:** Disable `useConst` rule and change back to `let`

### Issue: Build fails with template errors
**Cause:** Auto-formatting may have introduced structural issues
**Solution:** Check for unmatched blocks, missing closing tags

## Editor Integration

### VS Code
Install the official Biome extension:
```bash
code --install-extension biomejs.biome
```

### Settings
```json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "quickfix.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  }
}
```

## Project Standards

1. **All new Thepia projects must use Biome** instead of ESLint/Prettier
2. **Svelte projects must disable `useConst`** rule
3. **Always run `pnpm fix` before committing** code changes
4. **Include Biome in CI/CD pipelines** for consistent code quality

## CI/CD Integration

```yaml
# GitHub Actions example
- name: Lint and format check
  run: |
    pnpm lint
    # Fail if formatting is needed
    pnpm format --write=false
```

This configuration ensures consistent, high-quality code across all Thepia projects while avoiding framework-specific pitfalls.
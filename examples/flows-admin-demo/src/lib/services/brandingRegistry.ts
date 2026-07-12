import type { BrandingConfig } from '$lib/types';
import { reportDataError } from '$lib/utils/errorReporter';

import * as hyggeHvidlogBranding from '../branding/hygge-hvidlog/index';
import * as meridianBrandsBranding from '../branding/meridian-brands/index';
// Static imports for local branding modules to avoid dynamic import issues
import * as thepiaDefaultBranding from '../branding/thepia-default/index';

// Static branding module map
const LOCAL_BRANDING_MODULES = {
  'thepia-default': thepiaDefaultBranding,
  'hygge-hvidlog': hyggeHvidlogBranding,
  'meridian-brands': meridianBrandsBranding,
} as const;

// Registry of available branding configurations
const BRANDING_REGISTRY = {
  // Default Thepia branding - fallback to local since package may not be available
  'thepia-default': {
    id: 'thepia-default',
    name: 'thepia-default',
    displayName: 'Thepia (Default)',
    type: 'local' as const,
    path: 'src/lib/branding/thepia-default',
    isDefault: true,
  },

  // Demo company brandings
  'hygge-hvidlog': {
    id: 'hygge-hvidlog',
    name: 'hygge-hvidlog',
    displayName: 'Hygge & Hvidløg A/S',
    type: 'local' as const,
    path: 'src/lib/branding/hygge-hvidlog',
    isDefault: false,
  },

  'meridian-brands': {
    id: 'meridian-brands',
    name: 'meridian-brands',
    displayName: 'Meridian Brands International',
    type: 'local' as const,
    path: 'src/lib/branding/meridian-brands',
    isDefault: false,
  },
};

// Client to branding mapping (simulates what would be in database)
const CLIENT_BRANDING_MAP = {
  'hygge-hvidlog': 'hygge-hvidlog',
  'meridian-brands': 'meridian-brands',
  // Fallback for any other clients
  default: 'thepia-default',
};

/**
 * Get all available branding configurations
 */
export function getAvailableBrandings(): BrandingConfig[] {
  return Object.values(BRANDING_REGISTRY);
}

/**
 * Get branding configuration for a specific client
 */
export function getBrandingForClient(clientCode: string): BrandingConfig {
  const brandingId =
    CLIENT_BRANDING_MAP[clientCode as keyof typeof CLIENT_BRANDING_MAP] || 'thepia-default';
  return BRANDING_REGISTRY[brandingId as keyof typeof BRANDING_REGISTRY];
}

/**
 * Get branding configuration by ID
 */
export function getBrandingById(brandingId: string): BrandingConfig | null {
  return BRANDING_REGISTRY[brandingId as keyof typeof BRANDING_REGISTRY] || null;
}

/**
 * Load branding tokens for a specific branding configuration
 */
export async function loadBrandingTokens(brandingConfig: BrandingConfig): Promise<any> {
  try {
    if (brandingConfig.type === 'package') {
      // Load from npm package (like @thepia/branding)
      const module = await import(/* @vite-ignore */ brandingConfig.path);
      return module.tokens || module.default?.tokens || {};
    } else {
      // Load from local branding directory using static imports
      const module =
        LOCAL_BRANDING_MODULES[brandingConfig.name as keyof typeof LOCAL_BRANDING_MODULES];
      if (!module) {
        throw new Error(`No static import found for branding: ${brandingConfig.name}`);
      }
      return module.tokens || module.default?.tokens || {};
    }
  } catch (error) {
    console.warn(`Failed to load branding tokens for ${brandingConfig.name}:`, error);

    // Report the error to error reporting system
    await reportDataError(
      'branding.loadTokens',
      error instanceof Error ? error : new Error(String(error)),
      {
        brandingId: brandingConfig.id,
        brandingName: brandingConfig.name,
        brandingType: brandingConfig.type,
        brandingPath: brandingConfig.path,
      }
    );

    // Fallback to default branding if available
    if (brandingConfig.id !== 'thepia-default') {
      try {
        const defaultBranding = BRANDING_REGISTRY['thepia-default'];
        const fallbackModule = await import(/* @vite-ignore */ defaultBranding.path);
        return fallbackModule.tokens || fallbackModule.default?.tokens || {};
      } catch (fallbackError) {
        console.warn('Failed to load fallback branding tokens:', fallbackError);

        // Report fallback error too
        await reportDataError(
          'branding.loadFallbackTokens',
          fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError)),
          {
            originalBrandingId: brandingConfig.id,
            fallbackBrandingId: 'thepia-default',
          }
        );
      }
    }

    // Ultimate fallback to empty tokens
    return {};
  }
}

/**
 * Get logo URL for a specific branding configuration
 */
export async function getBrandingLogo(
  brandingConfig: BrandingConfig,
  variant: 'primary' | 'square' | 'horizontal' = 'square'
): Promise<string | null> {
  try {
    const tokens = await loadBrandingTokens(brandingConfig);
    const logoPath = tokens[`brand.logo.${variant}`] || tokens['brand.logo.primary'];

    if (!logoPath) return null;

    if (brandingConfig.type === 'local') {
      // For local branding, use static assets path
      return `/branding/${brandingConfig.name}/${logoPath}`;
    } else {
      // For package branding, use the package path
      return `${brandingConfig.path}/${logoPath}`;
    }
  } catch (error) {
    console.warn(`Failed to get logo for ${brandingConfig.name}:`, error);
    return null;
  }
}

/**
 * Get primary brand color for a branding configuration
 */
export async function getBrandingPrimaryColor(brandingConfig: BrandingConfig): Promise<string> {
  try {
    const tokens = await loadBrandingTokens(brandingConfig);
    return tokens['brand.colors.primary'] || tokens['color.brand.500'] || '#0284c7';
  } catch (error) {
    console.warn(`Failed to get primary color for ${brandingConfig.name}:`, error);
    return '#0284c7'; // Default blue
  }
}

/**
 * Apply branding CSS custom properties to the document
 */
export async function applyBrandingToDocument(brandingConfig: BrandingConfig): Promise<void> {
  try {
    const tokens = await loadBrandingTokens(brandingConfig);
    const root = document.documentElement;

    // Apply color tokens as CSS custom properties
    for (const [key, value] of Object.entries(tokens)) {
      if (key.startsWith('color.') || key.startsWith('brand.colors.')) {
        const cssVar = `--${key.replace(/\./g, '-')}`;
        root.style.setProperty(cssVar, value as string);
      }
    }

    // Set primary brand color for general use
    if (tokens['brand.colors.primary']) {
      root.style.setProperty('--brand-primary', tokens['brand.colors.primary']);
    }

    console.log(`Applied branding: ${brandingConfig.displayName}`);
  } catch (error) {
    console.warn(`Failed to apply branding for ${brandingConfig.name}:`, error);
  }
}

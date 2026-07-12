import { writable } from 'svelte/store';
import { browser } from '$app/environment';

interface AppEnvironment {
  mode: 'demo' | 'development' | 'production';
  features: {
    demoDataGeneration: boolean;
    errorReporting: boolean;
    clientSwitching: boolean;
    devTools: boolean;
  };
  endpoints: {
    errorReporting?: string;
    analytics?: string;
  };
}

class ApplicationContext {
  private _environment = writable<AppEnvironment>(this.detectEnvironment());

  // Expose as readable store
  public readonly environment = { subscribe: this._environment.subscribe };

  private detectEnvironment(): AppEnvironment {
    if (!browser) {
      return this.createEnvironment('production');
    }

    const hostname = window.location.hostname;
    const isDev = hostname === 'localhost' || hostname === '127.0.0.1';
    const isDemo = hostname.includes('demo') || window.location.search.includes('demo=true');

    if (isDev) {
      return this.createEnvironment('development');
    } else if (isDemo) {
      return this.createEnvironment('demo');
    } else {
      return this.createEnvironment('production');
    }
  }

  private createEnvironment(mode: AppEnvironment['mode']): AppEnvironment {
    const baseConfig = {
      mode,
      features: {
        demoDataGeneration: mode === 'demo' || mode === 'development',
        errorReporting: true, // Always enabled, different endpoints
        clientSwitching: mode === 'demo' || mode === 'development',
        devTools: mode === 'development',
      },
      endpoints: {},
    };

    switch (mode) {
      case 'development':
        return {
          ...baseConfig,
          endpoints: {
            errorReporting: `${window.location.origin}/dev/error-reports`,
            analytics: undefined, // No analytics in dev
          },
        };

      case 'demo':
        return {
          ...baseConfig,
          endpoints: {
            errorReporting: 'https://demo-errors.thepia.net/reports',
            analytics: 'https://analytics.thepia.net/demo',
          },
        };

      case 'production':
        return {
          ...baseConfig,
          features: {
            ...baseConfig.features,
            demoDataGeneration: false,
            clientSwitching: false,
            devTools: false,
          },
          endpoints: {
            errorReporting: 'https://errors.thepia.net/reports',
            analytics: 'https://analytics.thepia.net/flows',
          },
        };
    }
  }

  // Methods for common environment checks
  public isDevelopment(): boolean {
    let currentMode: AppEnvironment['mode'] = 'production';
    this._environment.subscribe((env) => (currentMode = env.mode))();
    return currentMode === 'development';
  }

  public isDemo(): boolean {
    let currentMode: AppEnvironment['mode'] = 'production';
    this._environment.subscribe((env) => (currentMode = env.mode))();
    return currentMode === 'demo';
  }

  public isProduction(): boolean {
    let currentMode: AppEnvironment['mode'] = 'production';
    this._environment.subscribe((env) => (currentMode = env.mode))();
    return currentMode === 'production';
  }

  // Force environment change (useful for testing)
  public setEnvironment(mode: AppEnvironment['mode']) {
    this._environment.set(this.createEnvironment(mode));
  }
}

// Singleton instance
export const appContext = new ApplicationContext();

// Convenience exports
export const { environment } = appContext;
export const isDevelopment = () => appContext.isDevelopment();
export const isDemo = () => appContext.isDemo();
export const isProduction = () => appContext.isProduction();

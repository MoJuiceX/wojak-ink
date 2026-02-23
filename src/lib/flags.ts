// Feature Flag Management
// Integrates with Unleash for server-side feature toggles
// Enables safe gradual rollouts and instant rollbacks

import { logger } from './logger';
import { metrics } from './metrics';

// Feature flag cache
const flagCache = new Map<string, { value: boolean; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute

export interface FlagContext {
  userId?: string;
  organizationId?: string;
  environment?: string;
  custom?: Record<string, any>;
}

export enum FeatureFlags {
  MULTIPLAYER_BATTLES = 'multiplayer-battles',
  NEW_UI_THEME = 'new-ui-theme',
  PERFORMANCE_OPTIMIZATIONS = 'performance-optimizations',
  ADVANCED_ANALYTICS = 'advanced-analytics',
  BETA_RANKING_SYSTEM = 'beta-ranking-system',
  SOCIAL_FEATURES = 'social-features',
  IN_APP_PURCHASES = 'in-app-purchases',
  TOURNAMENT_MODE = 'tournament-mode',
}

export class FeatureFlags {
  private apiKey: string;
  private baseUrl: string;
  private environment: string;

  constructor() {
    this.apiKey = process.env.UNLEASH_API_KEY || '';
    this.baseUrl = process.env.UNLEASH_API_URL || 'https://api.getunleash.io';
    this.environment = process.env.NODE_ENV || 'development';
  }

  /**
   * Check if a feature flag is enabled
   */
  async isEnabled(
    flagName: string,
    context: FlagContext = {},
    defaultValue = false
  ): Promise<boolean> {
    // Check cache first
    const cached = flagCache.get(flagName);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      metrics.counter('flag_cache.hit', 1, { flag: flagName });
      return cached.value;
    }

    try {
      // Fetch from Unleash API
      const response = await fetch(
        `${this.baseUrl}/client/features`,
        {
          headers: {
            'Authorization': this.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        logger.warn('Failed to fetch feature flags', {
          status: response.status,
          flagName,
        });
        metrics.counter('flag_fetch.error', 1, { flag: flagName });
        return defaultValue;
      }

      const data = await response.json();
      const feature = data.features?.find((f: any) => f.name === flagName);

      if (!feature) {
        logger.debug('Feature flag not found', { flagName });
        metrics.counter('flag_not_found', 1, { flag: flagName });
        return defaultValue;
      }

      const enabled = this.evaluateFeature(feature, context);

      // Cache result
      flagCache.set(flagName, {
        value: enabled,
        timestamp: Date.now(),
      });

      metrics.counter('flag_evaluated', 1, {
        flag: flagName,
        enabled: enabled.toString(),
      });

      return enabled;
    } catch (error) {
      logger.error('Error evaluating feature flag', {
        error,
        flagName,
      });
      metrics.counter('flag_error', 1, { flag: flagName });
      return defaultValue;
    }
  }

  /**
   * Evaluate feature based on strategies
   */
  private evaluateFeature(feature: any, context: FlagContext): boolean {
    // If feature is not enabled globally
    if (!feature.enabled) {
      return false;
    }

    // If no strategies, use enabled flag
    if (!feature.strategies || feature.strategies.length === 0) {
      return feature.enabled;
    }

    // Evaluate each strategy
    for (const strategy of feature.strategies) {
      if (this.evaluateStrategy(strategy, context)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Evaluate individual strategy
   */
  private evaluateStrategy(strategy: any, context: FlagContext): boolean {
    switch (strategy.name) {
      case 'default':
        return true;

      case 'userWithId':
        return context.userId
          ? strategy.parameters.userIds?.split(',').includes(context.userId)
          : false;

      case 'flexibleRollout':
        // Percentage-based rollout
        if (!context.userId) return false;
        const percentage = parseInt(strategy.parameters.rollout || '0');
        const hash = this.hashUserId(context.userId);
        return hash % 100 < percentage;

      case 'gradualRollout':
        // Time-based gradual rollout
        const rolloutPercentage = parseInt(strategy.parameters.percentage || '0');
        const gradualHash = this.hashUserId(context.userId || 'anonymous');
        return gradualHash % 100 < rolloutPercentage;

      default:
        logger.warn('Unknown strategy', { strategy: strategy.name });
        return false;
    }
  }

  /**
   * Simple hash function for consistent user-to-bucket assignment
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Clear flag cache (useful for testing)
   */
  clearCache(): void {
    flagCache.clear();
    logger.info('Feature flag cache cleared');
  }

  /**
   * Get all enabled flags for a context
   */
  async getEnabledFlags(context: FlagContext = {}): Promise<string[]> {
    const flags = Object.values(FeatureFlags);
    const enabled: string[] = [];

    for (const flag of flags) {
      if (await this.isEnabled(flag, context)) {
        enabled.push(flag);
      }
    }

    return enabled;
  }
}

// Singleton instance
export const featureFlags = new FeatureFlags();

// React Hook for client-side usage
export function useFeature(
  flagName: string,
  context: FlagContext = {},
  defaultValue = false
) {
  const [enabled, setEnabled] = React.useState(defaultValue);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    featureFlags.isEnabled(flagName, context, defaultValue).then((value) => {
      setEnabled(value);
      setLoading(false);
    });
  }, [flagName, context, defaultValue]);

  return { enabled, loading };
}

// Type-safe flag getter
export const getFlag = async (name: FeatureFlags, context?: FlagContext) =>
  featureFlags.isEnabled(name, context);

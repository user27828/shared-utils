/**
 * React Turnstile component example
 * This shows how to integrate Turnstile with React applications
 * 
 * Usage:
 * ```tsx
 * import { TurnstileComponent } from './turnstile-react-component';
 * 
 * function MyForm() {
 *   const turnstileRef = useRef<TurnstileComponentRef>(null);
 *   
 *   const handleSubmit = () => {
 *     const token = turnstileRef.current?.getResponse();
 *     if (token) {
 *       // Submit form with token
 *     }
 *   };
 *   
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <TurnstileComponent
 *         ref={turnstileRef}
 *         siteKey="your-site-key"
 *         onSuccess={(token) => console.log('Token:', token)}
 *       />
 *       <button type="submit">Submit</button>
 *     </form>
 *   );
 * }
 * ```
 */
import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { turnstile } from '@shared-utils/utils';

interface TurnstileComponentProps {
  siteKey?: string;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact';
  onSuccess?: (token: string) => void;
  onError?: (error?: Error) => void;
  onExpired?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export interface TurnstileComponentRef {
  reset: () => void;
  getResponse: () => string | undefined;
  isExpired: () => boolean;
}

export const TurnstileComponent = forwardRef<TurnstileComponentRef, TurnstileComponentProps>(({
  siteKey,
  theme = 'auto',
  size = 'normal',
  onSuccess,
  onError,
  onExpired,
  className,
  style,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [widgetId, setWidgetId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Configure Turnstile if siteKey is provided
    if (siteKey) {
      turnstile.setOptions({ siteKey });
    }

    const renderTurnstile = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!containerRef.current) {
          throw new Error('Container ref not available');
        }

        const id = await turnstile.render(containerRef.current, {
          theme,
          size,
          callback: (token: string) => {
            console.log('Turnstile token received');
            onSuccess?.(token);
          },
          'error-callback': (error?: Error) => {
            console.error('Turnstile error:', error);
            setError(error?.message || 'Turnstile error occurred');
            onError?.(error);
          },
          'expired-callback': () => {
            console.log('Turnstile token expired');
            onExpired?.();
          },
        });

        setWidgetId(id);
        setIsLoading(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to render Turnstile';
        setError(errorMessage);
        setIsLoading(false);
        onError?.(err instanceof Error ? err : new Error(errorMessage));
      }
    };

    renderTurnstile();

    // Cleanup on unmount
    return () => {
      if (widgetId) {
        try {
          turnstile.remove(widgetId);
        } catch (err) {
          console.warn('Error removing Turnstile widget:', err);
        }
      }
    };
  }, [siteKey, theme, size]);

  const handleReset = () => {
    if (widgetId) {
      turnstile.reset(widgetId);
    }
  };

  const getResponse = () => {
    if (widgetId) {
      return turnstile.getResponse(widgetId);
    }
    return undefined;
  };

  const isExpired = () => {
    if (widgetId) {
      return turnstile.isExpired(widgetId);
    }
    return false;
  };

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    reset: handleReset,
    getResponse,
    isExpired,
  }));

  if (error) {
    return (
      <div className={`turnstile-error ${className || ''}`} style={style}>
        <p>Error loading Turnstile: {error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className={className} style={style}>
      {isLoading && (
        <div className="turnstile-loading">
          Loading security verification...
        </div>
      )}
      <div ref={containerRef} />
    </div>
  );
});

export default TurnstileComponent;

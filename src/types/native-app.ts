/**
 * Native App Integration Types
 *
 * Types for communication between web app and native iOS/macOS container.
 * Used by FlowsDBClient to send state updates to the native UI.
 */

/**
 * Web app state notification payload
 * Sent to native app to control UI appearance and behavior
 */
export interface WebAppStatePayload {
  /**
   * Readiness state - controls visibility and loading indicators
   * - 'loading': Initial load, show loading indicator
   * - 'ready': App initialized, show UI
   * - 'transitioning': Auth flow in progress
   * - 'transitioned': Auth state changed
   * - 'completed': Flow complete, ready to dismiss
   */
  readiness?: 'loading' | 'ready' | 'transitioning' | 'transitioned' | 'completed';

  /**
   * Sheet height - controls how much of the screen the web view occupies
   * - 'pill': Fixed compact height
   * - 'sheet': Fixed medium height (default)
   * - 'full': Fixed resizable — main window
   * - 'popover': Content-driven — height follows contentHeight
   */
  pageHeight?: 'pill' | 'sheet' | 'full' | 'popover';

  /**
   * Intrinsic content height in pixels — for LensView / dynamic-height WebViews.
   * Sent automatically by FlowsDBClient via ResizeObserver when in native app context.
   */
  contentHeight?: number;

  /**
   * Background material - controls the backdrop appearance
   * - 'clear': Transparent
   * - 'thinMaterial': Thin frosted glass
   * - 'ultraThinMaterial': Ultra-thin frosted glass
   * - 'regularMaterial': Regular frosted glass
   * - 'thickMaterial': Thick frosted glass
   */
  backgroundMaterial?: 'clear' | 'thinMaterial' | 'ultraThinMaterial' | 'regularMaterial' | 'thickMaterial';

  /**
   * Current step in multi-step flow (e.g., 'signin', 'verify', 'complete')
   */
  currentStep?: string;

  /**
   * List of all steps in the flow for progress indication
   */
  stepList?: string[];

  /**
   * Custom back button label (null to hide back button)
   */
  backName?: string | null;
}

/**
 * Native app response message
 * Sent from native app back to web app via __thepiaResponseHandler
 */
export interface NativeAppResponse {
  /**
   * Request ID to match with original request
   */
  requestId: string;

  /**
   * Message type: 'auth', 'flowsdb', 'webapp_state', etc.
   */
  type?: string;

  /**
   * Success flag
   */
  success: boolean;

  /**
   * Response payload (if successful)
   */
  payload?: any;

  /**
   * Error details (if failed)
   */
  error?: {
    message: string;
    code?: string;
  };
}

/**
 * Native app message sent from web to native
 * Routed through window.webkit.messageHandlers.thepia.postMessage()
 */
export interface NativeAppMessage {
  /**
   * Message type: 'auth', 'flowsdb', 'webapp_state', etc.
   */
  type: string;

  /**
   * Procedure name (e.g., 'query.journeys', 'saveSession', 'webapp_state')
   */
  procedure?: string;

  /**
   * Request payload
   */
  payload?: any;

  /**
   * Unique request ID for matching responses
   */
  requestId: string;
}


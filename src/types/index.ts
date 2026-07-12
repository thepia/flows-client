/**
 * Flows Database Types
 *
 * Core type definitions for the Flows platform data layer.
 * These types are used across:
 * - Service Worker implementations
 * - Native mobile implementations (iOS/Android)
 * - Client applications (Svelte, React, etc.)
 * - Backend services (Supabase, Firebase, etc.)
 */

// Re-export auth types
export type { AuthProcedures, SessionData, UserData } from './auth';
export * from './auth';
// Re-export commonly used entity types
export type {
  FlowsApplication,
  FlowsAttachment,
  FlowsAuditLog,
  FlowsComment,
  FlowsEntity,
  FlowsEntityCreate,
  FlowsEntityMap,
  FlowsEntityType,
  FlowsEntityUpdate,
  FlowsEvidence,
  FlowsInvitation,
  FlowsJourney,
  FlowsNote,
  FlowsPerson,
  FlowsSyncMetadata,
  FlowsTask,
  FlowsTenant,
  GetFlowsEntity,
} from './flows-entities';
export * from './flows-entities';
// Re-export native app types
export type {
  NativeAppMessage,
  NativeAppResponse,
  WebAppStatePayload,
} from './native-app';
export * from './native-app';
// Re-export procedure types
export type {
  Filter,
  FlowsProcedures,
  MutationProcedures,
  ProcedureContext,
  ProcedureInput,
  ProcedureOutput,
  QueryOptions,
  QueryProcedures,
  SyncProcedures,
} from './procedures';
export * from './procedures';
// Re-export transport types
export type {
  BrowserTransport,
  CreateTransport,
  Environment,
  NativeTransport,
  Transport,
  TransportMessage,
} from './transport';
export * from './transport';

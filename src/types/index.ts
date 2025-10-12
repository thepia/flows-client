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

export * from './flows-entities';
export * from './transport';
export * from './procedures';
export * from './auth';

// Re-export commonly used entity types
export type {
  FlowsEntity,
  FlowsClient,
  FlowsApplication,
  FlowsPerson,
  FlowsJourney,
  FlowsTask,
  FlowsAttachment,
  FlowsNote,
  FlowsComment,
  FlowsEvidence,
  FlowsInvitation,
  FlowsAuditLog,
  FlowsSyncMetadata,
  FlowsEntityType,
  FlowsEntityMap,
  GetFlowsEntity,
  FlowsEntityUpdate,
  FlowsEntityCreate,
} from './flows-entities';

// Re-export transport types
export type {
  Transport,
  Environment,
  TransportMessage,
  BrowserTransport,
  NativeTransport,
  CreateTransport,
} from './transport';

// Re-export procedure types
export type {
  Filter,
  QueryOptions,
  QueryProcedures,
  MutationProcedures,
  SyncProcedures,
  FlowsDBProcedures,
  ProcedureInput,
  ProcedureOutput,
  ProcedureContext,
} from './procedures';

// Re-export auth types
export type { SessionData, UserData, AuthProcedures } from './auth';

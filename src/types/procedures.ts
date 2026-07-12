/**
 * RPC Procedure Definitions
 *
 * Defines the type-safe interface between client and storage layer.
 * Uses tRPC-style conventions without the tRPC dependency.
 *
 * @see /docs/SERVICE_WORKER_RPC_INTERFACE.md
 */

import type { SessionData, UserData } from './auth';
import type {
  FlowsAttachment,
  FlowsComment,
  FlowsEntityCreate,
  FlowsEntityUpdate,
  FlowsEvidence,
  FlowsInvitation,
  FlowsJourney,
  FlowsNote,
  FlowsTask,
} from './flows-entities';

/**
 * Filter operations for queries
 */
export interface Filter {
  eq?: Record<string, unknown>; // Equal
  neq?: Record<string, unknown>; // Not equal
  gt?: Record<string, number>; // Greater than
  gte?: Record<string, number>; // Greater than or equal
  lt?: Record<string, number>; // Less than
  lte?: Record<string, number>; // Less than or equal
  in?: Record<string, unknown[]>; // In array
  like?: Record<string, string>; // Pattern match
  ilike?: Record<string, string>; // Case-insensitive pattern match
  is?: Record<string, null | boolean>; // IS NULL / IS TRUE / IS FALSE
}

/**
 * Query options
 */
export interface QueryOptions {
  filter?: Filter;
  orderBy?: { column: string; ascending?: boolean }[];
  limit?: number;
  offset?: number;
}

/**
 * Query procedures (read operations)
 */
export interface QueryProcedures {
  // Journey queries
  'query.journeys': {
    input: QueryOptions;
    output: FlowsJourney[];
  };

  'query.journeyById': {
    input: { id: string };
    output: FlowsJourney | null;
  };

  // Task queries
  'query.tasks': {
    input: QueryOptions;
    output: FlowsTask[];
  };

  'query.taskById': {
    input: { id: string };
    output: FlowsTask | null;
  };

  'query.tasksByJourney': {
    input: { journeyId: string } & QueryOptions;
    output: FlowsTask[];
  };

  // Attachment queries
  'query.attachments': {
    input: QueryOptions;
    output: FlowsAttachment[];
  };

  'query.attachmentsByJourney': {
    input: { journeyId: string } & QueryOptions;
    output: FlowsAttachment[];
  };

  'query.attachmentsByTask': {
    input: { taskId: string } & QueryOptions;
    output: FlowsAttachment[];
  };

  // Note queries
  'query.notes': {
    input: QueryOptions;
    output: FlowsNote[];
  };

  'query.notesByJourney': {
    input: { journeyId: string } & QueryOptions;
    output: FlowsNote[];
  };

  // Comment queries
  'query.comments': {
    input: QueryOptions;
    output: FlowsComment[];
  };

  'query.commentsByJourney': {
    input: { journeyId: string } & QueryOptions;
    output: FlowsComment[];
  };

  'query.commentsByTask': {
    input: { taskId: string } & QueryOptions;
    output: FlowsComment[];
  };

  // Evidence queries
  'query.evidence': {
    input: QueryOptions;
    output: FlowsEvidence[];
  };

  'query.evidenceByJourney': {
    input: { journeyId: string } & QueryOptions;
    output: FlowsEvidence[];
  };

  'query.evidenceByTask': {
    input: { taskId: string } & QueryOptions;
    output: FlowsEvidence[];
  };

  // Invitation queries
  'query.invitations': {
    input: QueryOptions;
    output: FlowsInvitation[];
  };

  'query.invitationById': {
    input: { id: string };
    output: FlowsInvitation | null;
  };

  // Generic queries
  'query.getById': {
    input: { table: string; id: string };
    output: unknown | null;
  };

  'query.count': {
    input: { table: string; filter?: Filter };
    output: number;
  };
}

/**
 * Mutation procedures (write operations)
 */
export interface MutationProcedures {
  // Journey mutations
  'mutation.insertJourney': {
    input: { data: FlowsEntityCreate<FlowsJourney> };
    output: FlowsJourney;
  };

  'mutation.updateJourney': {
    input: { id: string; data: FlowsEntityUpdate<FlowsJourney> };
    output: FlowsJourney;
  };

  'mutation.deleteJourney': {
    input: { id: string };
    output: undefined;
  };

  // Task mutations
  'mutation.insertTask': {
    input: { data: FlowsEntityCreate<FlowsTask> };
    output: FlowsTask;
  };

  'mutation.updateTask': {
    input: { id: string; data: FlowsEntityUpdate<FlowsTask> };
    output: FlowsTask;
  };

  'mutation.deleteTask': {
    input: { id: string };
    output: undefined;
  };

  // Attachment mutations
  'mutation.insertAttachment': {
    input: { data: FlowsEntityCreate<FlowsAttachment> };
    output: FlowsAttachment;
  };

  'mutation.updateAttachment': {
    input: { id: string; data: FlowsEntityUpdate<FlowsAttachment> };
    output: FlowsAttachment;
  };

  'mutation.deleteAttachment': {
    input: { id: string };
    output: undefined;
  };

  // Note mutations
  'mutation.insertNote': {
    input: { data: FlowsEntityCreate<FlowsNote> };
    output: FlowsNote;
  };

  'mutation.updateNote': {
    input: { id: string; data: FlowsEntityUpdate<FlowsNote> };
    output: FlowsNote;
  };

  'mutation.deleteNote': {
    input: { id: string };
    output: undefined;
  };

  // Comment mutations
  'mutation.insertComment': {
    input: { data: FlowsEntityCreate<FlowsComment> };
    output: FlowsComment;
  };

  'mutation.updateComment': {
    input: { id: string; data: FlowsEntityUpdate<FlowsComment> };
    output: FlowsComment;
  };

  'mutation.deleteComment': {
    input: { id: string };
    output: undefined;
  };

  // Evidence mutations
  'mutation.insertEvidence': {
    input: { data: FlowsEntityCreate<FlowsEvidence> };
    output: FlowsEvidence;
  };

  'mutation.updateEvidence': {
    input: { id: string; data: FlowsEntityUpdate<FlowsEvidence> };
    output: FlowsEvidence;
  };

  'mutation.deleteEvidence': {
    input: { id: string };
    output: undefined;
  };

  // Invitation mutations
  'mutation.insertInvitation': {
    input: { data: FlowsEntityCreate<FlowsInvitation> };
    output: FlowsInvitation;
  };

  'mutation.updateInvitation': {
    input: { id: string; data: FlowsEntityUpdate<FlowsInvitation> };
    output: FlowsInvitation;
  };

  'mutation.deleteInvitation': {
    input: { id: string };
    output: undefined;
  };

  // Generic mutations
  'mutation.insert': {
    input: { table: string; data: unknown };
    output: unknown;
  };

  'mutation.update': {
    input: { table: string; id: string; data: unknown };
    output: unknown;
  };

  'mutation.delete': {
    input: { table: string; id: string };
    output: undefined;
  };
}

/**
 * Sync procedures (background operations)
 */
export interface SyncProcedures {
  'sync.pull': {
    input: { tables?: string[]; since?: Date };
    output: { synced: string[]; failed: string[] };
  };

  'sync.push': {
    input: { tables?: string[]; force?: boolean };
    output: { synced: string[]; failed: string[]; conflicts: string[] };
  };

  'sync.status': {
    input: { table?: string };
    output: {
      table: string;
      last_sync: Date;
      pending_ops: number;
      conflicts: number;
    }[];
  };

  'sync.resolveConflict': {
    input: {
      table: string;
      id: string;
      resolution: 'local' | 'remote' | 'merge';
      mergeData?: unknown;
    };
    output: undefined;
  };
}

/**
 * Auth procedures (session management)
 */
export interface AuthProcedures {
  'auth.saveSession': {
    input: Partial<SessionData>;
    output: SessionData;
  };

  'auth.getSession': {
    input: undefined;
    output: SessionData | null;
  };

  'auth.clearSession': {
    input: undefined;
    output: undefined;
  };

  'auth.saveUser': {
    input: UserData;
    output: undefined;
  };

  'auth.getUser': {
    input: string | undefined; // userId (optional - get current user if not provided)
    output: UserData | null;
  };

  'auth.clearUser': {
    input: string | undefined; // userId (optional - clear all or current user if not provided)
    output: undefined;
  };

  'auth.updateUserMetadata': {
    input: {
      userId: string;
      metadata: Record<string, unknown>;
    };
    output: undefined;
  };

  'auth.patchMetadata': {
    input: {
      userId: string;
      patch: Record<string, unknown>;
      appCode: string;
      token: string;
    };
    output: Record<string, unknown>;
  };
}

/**
 * All procedures combined
 */
export interface FlowsProcedures
  extends QueryProcedures,
    MutationProcedures,
    SyncProcedures,
    AuthProcedures,
    CameraProcedures {}

/**
 * Extract input type from procedure
 */
export type ProcedureInput<T extends keyof FlowsProcedures> = FlowsProcedures[T]['input'];

/**
 * Extract output type from procedure
 */
export type ProcedureOutput<T extends keyof FlowsProcedures> = FlowsProcedures[T]['output'];

/**
 * Procedure context (available in handlers)
 */
export interface ProcedureContext {
  clientId?: string;
  appId?: string;
  userId?: string;
  sessionId?: string;
}

export interface CameraProcedures {
  'camera.listDevices': { input: undefined; output: CameraDevice[] };
  'camera.selectDevice': { input: string; output: void };
  'camera.mountPreview': { input: { rect: DOMRectInit; pixelRatio: number }; output: void };
  'camera.unmountPreview': { input: undefined; output: void };
  'camera.startRecording': { input: { subjectId?: string } | undefined; output: void };
  'camera.stopRecording': { input: undefined; output: CaptureResult };
  'camera.capture': { input: undefined; output: CaptureResult };
}

export interface CameraDevice {
  id: string;
  name: string;
  position: 'front' | 'back' | 'unspecified';
  deviceType: string;
}

export interface CaptureResult {
  assetId: string; // native asset identifier
  timestamp: number;
  contentLabels?: string[]; // EvidentNet labels when available
}

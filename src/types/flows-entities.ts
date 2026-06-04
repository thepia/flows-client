/**
 * Flows Data Types - Core Entity Definitions
 *
 * These types define the core data structures used across Flows applications.
 * They are stored in local DB (IndexedDB/SQLite) and synchronized with remote backends.
 *
 * @see /docs/FLOWS_DATA_TYPES.md for detailed documentation
 */

/**
 * Base interface for all Flows entities
 */
export interface FlowsEntity {
  id: string; // UUID
  created_at: Date;
  updated_at: Date;
  client_id?: string; // For multi-tenant isolation
}

/**
 * Client/Organization
 */
export interface FlowsTenant extends FlowsEntity {
  client_code: string; // Unique identifier (e.g., 'acme')
  legal_name: string;
  status: 'active' | 'inactive' | 'suspended';
  metadata: Record<string, unknown>;
}

/**
 * Application within a client
 */
export interface FlowsApplication extends FlowsEntity {
  client_id: string;
  app_code: string; // e.g., 'flows', 'nets', 'rt'
  name: string;
  status: 'active' | 'inactive';
  config: Record<string, unknown>;
}

/**
 * User/Person
 */
export interface FlowsPerson extends FlowsEntity {
  email: string;
  given_name?: string;
  family_name?: string;
  display_name?: string;
  auth_user_id?: string; // Link to Auth0/WorkOS
  status: 'active' | 'inactive' | 'pending';
  metadata: Record<string, unknown>;
}

/**
 * Journey - A user's participation in a workflow/process
 *
 * Examples:
 * - Employee onboarding journey
 * - Offboarding checklist journey
 * - Project completion journey
 * - Training program journey
 */
export interface FlowsJourney extends FlowsEntity {
  client_id: string;
  app_id: string;

  // Basic info
  title: string;
  description?: string;
  status: 'invited' | 'active' | 'completed' | 'cancelled' | 'archived';

  // Lifecycle
  invited_at: Date;
  started_at?: Date; // When user accepted/started
  ended_at?: Date; // When completed or cancelled
  due_date?: Date; // Expected completion date

  // Participants
  owner_id: string; // Who created/owns the journey
  participants: string[]; // User IDs of all participants
  primary_participant_id?: string; // Main user (e.g., the employee being onboarded)

  // Progress tracking
  progress_percentage?: number; // 0-100
  current_step?: string; // Current phase/step identifier
  completed_steps?: string[];

  // Template
  template_id?: string; // If created from a journey template

  // Metadata
  metadata: Record<string, unknown>;
}

/**
 * Task - Specific action item within a journey
 */
export interface FlowsTask extends FlowsEntity {
  client_id: string;
  app_id: string;
  journey_id?: string; // Optional: Task may belong to a journey

  // Basic info
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'blocked';

  // Assignment
  assigned_to?: string; // User ID
  assigned_by?: string; // Who assigned it

  // Timing
  due_date?: Date;
  started_at?: Date;
  completed_at?: Date;
  estimated_duration?: number; // minutes

  // Organization
  order?: number; // For sorting
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: string; // App-specific categorization

  // Dependencies
  depends_on?: string[]; // Task IDs that must complete first
  blocks?: string[]; // Task IDs that depend on this

  // Metadata
  metadata: Record<string, unknown>;
}

/**
 * Attachment - Files, images, documents
 */
export interface FlowsAttachment extends FlowsEntity {
  client_id: string;
  app_id: string;
  journey_id?: string;
  task_id?: string;

  // File info
  filename: string;
  content_type: string; // MIME type (e.g., 'image/jpeg', 'application/pdf')
  size: number; // bytes
  checksum?: string; // For integrity verification

  // Storage
  storage_type: 'local' | 'remote' | 'url';
  storage_path?: string; // Local filesystem path or object storage key
  storage_url?: string; // Public or signed URL if uploaded
  thumbnail_url?: string; // Preview image URL

  // Context
  uploaded_by: string; // User ID
  description?: string;
  tags?: string[];

  // Status
  upload_status?: 'pending' | 'uploading' | 'completed' | 'failed';
  upload_progress?: number; // 0-100

  // Metadata
  metadata: Record<string, unknown>;
}

/**
 * Note - Text notes, comments, observations
 */
export interface FlowsNote extends FlowsEntity {
  client_id: string;
  app_id: string;
  journey_id?: string;
  task_id?: string;

  // Content
  content: string; // Markdown or plain text
  content_type: 'markdown' | 'plain' | 'html';
  author_id: string;

  // Threading
  parent_note_id?: string; // For nested notes/replies

  // Visibility
  visibility: 'private' | 'shared' | 'public';
  shared_with?: string[]; // User IDs if visibility is 'shared'

  // Status
  edited_at?: Date;
  deleted_at?: Date; // Soft delete

  // Organization
  tags?: string[];
  pinned?: boolean;

  // Metadata
  metadata: Record<string, unknown>;
}

/**
 * Comment - Chat messages and comments
 */
export interface FlowsComment extends FlowsEntity {
  client_id: string;
  app_id: string;
  journey_id?: string;
  task_id?: string;
  note_id?: string;
  attachment_id?: string;
  evidence_id?: string;

  // Content
  message: string;
  message_type: 'text' | 'system' | 'action'; // System messages for automated events
  author_id: string;

  // Threading
  parent_comment_id?: string; // For replies
  thread_id?: string; // Top-level thread identifier

  // Reactions
  reactions?: Record<string, string[]>; // emoji -> [user_ids]

  // Status
  edited_at?: Date;
  deleted_at?: Date; // Soft delete
  read_by?: string[]; // User IDs who have read this

  // Mentions
  mentions?: string[]; // User IDs mentioned in message

  // Metadata
  metadata: Record<string, unknown>;
}

/**
 * Evidence - Recorded audio, video, screen recordings, photos
 *
 * Examples:
 * - Screen recording of issue reproduction
 * - Voice note with feedback
 * - Photo of physical document
 * - Video walkthrough of process
 */
export interface FlowsEvidence extends FlowsEntity {
  client_id: string;
  app_id: string;
  journey_id?: string;
  task_id?: string;

  // Type
  type: 'audio' | 'video' | 'screen' | 'photo' | 'document_scan';

  // File info
  filename: string;
  content_type: string; // MIME type
  size: number; // bytes
  duration?: number; // seconds (for audio/video)
  dimensions?: { width: number; height: number }; // For images/video

  // Storage
  storage_type: 'local' | 'remote' | 'url';
  storage_path?: string; // Local path or object storage key
  storage_url?: string; // Public or signed URL
  thumbnail_url?: string; // Preview image
  streaming_url?: string; // HLS/DASH URL for video streaming

  // Context
  recorded_by: string; // User ID
  recorded_at: Date;
  device_info?: {
    platform: 'ios' | 'android' | 'web' | 'desktop';
    device_model?: string;
    browser?: string;
  };

  // Location
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number; // meters
    address?: string; // Reverse geocoded address
  };

  // Processing
  processing_status?: 'pending' | 'processing' | 'completed' | 'failed';
  processing_error?: string;

  // Transcription (for audio/video)
  transcription?: string;
  transcription_status?: 'pending' | 'processing' | 'completed' | 'failed';
  transcription_language?: string; // ISO 639-1 code

  // Analysis (optional AI-powered features)
  analysis?: {
    labels?: string[]; // Auto-detected labels/tags
    sentiment?: 'positive' | 'neutral' | 'negative';
    key_phrases?: string[];
    summary?: string;
  };

  // Metadata
  metadata: Record<string, unknown>;
}

/**
 * Invitation - Invitation to join a journey or organization
 */
export interface FlowsInvitation extends FlowsEntity {
  client_id: string;
  app_id: string;
  journey_id?: string; // Journey invitation

  // Invitee
  email: string;
  invited_by: string; // User ID
  role?: string; // Role in journey/organization

  // Status
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'revoked';
  accepted_at?: Date;
  declined_at?: Date;
  revoked_at?: Date;
  expires_at: Date;

  // Token (for secure invitation links)
  token_hash: string; // Hashed invitation token

  // Metadata
  message?: string; // Personal message from inviter
  metadata: Record<string, unknown>;
}

/**
 * Audit Log - Activity tracking
 */
export interface FlowsAuditLog {
  id: string;
  timestamp: Date;

  // Actor
  actor_id: string; // User ID or 'system'
  actor_type: 'user' | 'system' | 'api';

  // Action
  action: string; // 'created', 'updated', 'deleted', 'viewed', etc.
  resource_type: string; // 'journey', 'task', 'attachment', etc.
  resource_id: string;

  // Changes
  changes?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };

  // Context
  client_id: string;
  app_id: string;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;

  // Metadata
  metadata: Record<string, unknown>;
}

/**
 * Sync Metadata - Track sync state per entity/table
 */
export interface FlowsSyncMetadata {
  table: string; // Entity type (e.g., 'journeys', 'tasks')
  last_sync: Date;
  sync_version: number;
  record_count: number;
  last_sync_status: 'success' | 'partial' | 'failed';
  last_sync_error?: string;

  // Adapter info
  adapter_code: string; // 'supabase', 'firebase', etc.
  adapter_config?: Record<string, unknown>;

  // Conflict tracking
  pending_conflicts?: number;
  last_conflict_at?: Date;
}

/**
 * Utility types for working with Flows entities
 */
export type FlowsEntityType =
  | 'client'
  | 'application'
  | 'person'
  | 'journey'
  | 'task'
  | 'attachment'
  | 'note'
  | 'comment'
  | 'evidence'
  | 'invitation'
  | 'audit_log'
  | 'sync_metadata';

export type FlowsEntityMap = {
  client: FlowsTenant;
  application: FlowsApplication;
  person: FlowsPerson;
  journey: FlowsJourney;
  task: FlowsTask;
  attachment: FlowsAttachment;
  note: FlowsNote;
  comment: FlowsComment;
  evidence: FlowsEvidence;
  invitation: FlowsInvitation;
  audit_log: FlowsAuditLog;
  sync_metadata: FlowsSyncMetadata;
};

/**
 * Helper type to get entity type from entity type string
 */
export type GetFlowsEntity<T extends FlowsEntityType> = FlowsEntityMap[T];

/**
 * Partial entity for updates (excluding read-only fields)
 */
export type FlowsEntityUpdate<T extends FlowsEntity> = Partial<
  Omit<T, 'id' | 'created_at' | 'updated_at'>
>;

/**
 * New entity input (excluding generated fields)
 */
export type FlowsEntityCreate<T extends FlowsEntity> = Omit<T, 'id' | 'created_at' | 'updated_at'>;

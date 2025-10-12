/**
 * Seed Data for Flows Service Worker
 *
 * This file contains demo/mock data that is injected into IndexedDB
 * when the database is empty.
 */

import type {
	FlowsJourney,
	FlowsTask,
	FlowsEvidence,
	FlowsComment
} from '../types/flows-entities';

export const SEED_JOURNEYS: FlowsJourney[] = [
	{
		id: 'journey-001',
		client_id: 'demo',
		app_id: 'flows',
		title: 'Employee Onboarding - Sarah Chen',
		description: 'Complete all onboarding tasks before first day',
		status: 'active',
		invited_at: new Date('2025-10-01T00:00:00Z'),
		started_at: new Date('2025-10-05T00:00:00Z'),
		due_date: new Date('2025-11-01T00:00:00Z'),
		owner_id: 'hr-manager-123',
		participants: ['sarah-chen-456', 'hr-manager-123', 'it-admin-789'],
		primary_participant_id: 'sarah-chen-456',
		progress_percentage: 35,
		current_step: 'security-training',
		completed_steps: ['account-setup', 'welcome-video'],
		created_at: new Date('2025-10-01T00:00:00Z'),
		updated_at: new Date('2025-10-10T00:00:00Z'),
		metadata: {
			department: 'Engineering',
			start_date: '2025-11-01',
			location: 'Remote',
			manager: 'John Smith'
		}
	},
	{
		id: 'journey-002',
		client_id: 'demo',
		app_id: 'flows',
		title: 'Exit Process - Mike Johnson',
		description: 'Offboarding checklist for departing employee',
		status: 'completed',
		invited_at: new Date('2025-09-15T00:00:00Z'),
		started_at: new Date('2025-09-16T00:00:00Z'),
		ended_at: new Date('2025-10-01T00:00:00Z'),
		owner_id: 'hr-manager-123',
		participants: ['mike-johnson-789', 'hr-manager-123'],
		primary_participant_id: 'mike-johnson-789',
		progress_percentage: 100,
		completed_steps: [
			'return-equipment',
			'knowledge-transfer',
			'exit-interview',
			'access-revocation'
		],
		created_at: new Date('2025-09-15T00:00:00Z'),
		updated_at: new Date('2025-10-01T00:00:00Z'),
		metadata: {
			department: 'Marketing',
			last_day: '2025-10-01',
			reason: 'New opportunity'
		}
	},
	{
		id: 'journey-003',
		client_id: 'demo',
		app_id: 'flows',
		title: 'Q4 2025 Performance Review - Team Alpha',
		description: 'Complete performance reviews for all team members',
		status: 'invited',
		invited_at: new Date('2025-10-08T00:00:00Z'),
		due_date: new Date('2025-12-15T00:00:00Z'),
		owner_id: 'team-lead-999',
		participants: ['team-lead-999', 'hr-manager-123'],
		progress_percentage: 0,
		created_at: new Date('2025-10-08T00:00:00Z'),
		updated_at: new Date('2025-10-08T00:00:00Z'),
		metadata: {
			department: 'Engineering',
			team: 'Alpha',
			review_period: 'Q4-2025',
			team_size: 8
		}
	}
];

export const SEED_TASKS: FlowsTask[] = [
	{
		id: 'task-001',
		client_id: 'demo',
		app_id: 'flows',
		journey_id: 'journey-001',
		title: 'Meet the team',
		description: 'Introduction meeting with team members',
		status: 'completed',
		assigned_to: 'sarah-chen-456',
		assigned_by: 'hr-manager-123',
		due_date: new Date('2025-10-15T00:00:00Z'),
		started_at: new Date('2025-10-08T00:00:00Z'),
		completed_at: new Date('2025-10-12T00:00:00Z'),
		order: 0,
		priority: 'high',
		created_at: new Date('2025-10-01T00:00:00Z'),
		updated_at: new Date('2025-10-12T00:00:00Z'),
		metadata: {
			meeting_link: 'https://meet.thepia.com/team-intro',
			attendees: ['manager', 'team-lead', 'mentor']
		}
	},
	{
		id: 'task-002',
		client_id: 'demo',
		app_id: 'flows',
		journey_id: 'journey-001',
		title: 'Complete security training',
		description: 'Watch security videos and pass the quiz (80% minimum)',
		status: 'in_progress',
		assigned_to: 'sarah-chen-456',
		assigned_by: 'hr-manager-123',
		due_date: new Date('2025-10-20T00:00:00Z'),
		started_at: new Date('2025-10-10T00:00:00Z'),
		estimated_duration: 60,
		order: 1,
		priority: 'high',
		created_at: new Date('2025-10-01T00:00:00Z'),
		updated_at: new Date('2025-10-10T00:00:00Z'),
		metadata: {
			training_module: 'SEC-101',
			required_score: 80,
			current_progress: 45
		}
	},
	{
		id: 'task-003',
		client_id: 'demo',
		app_id: 'flows',
		journey_id: 'journey-001',
		title: 'Setup development environment',
		description: 'Install required tools and access repositories',
		status: 'pending',
		assigned_to: 'sarah-chen-456',
		assigned_by: 'it-admin-789',
		due_date: new Date('2025-10-25T00:00:00Z'),
		order: 2,
		priority: 'medium',
		estimated_duration: 120,
		depends_on: ['task-002'],
		created_at: new Date('2025-10-01T00:00:00Z'),
		updated_at: new Date('2025-10-01T00:00:00Z'),
		metadata: {
			tools: ['VSCode', 'Docker', 'Git', 'Node.js'],
			repos: ['main-app', 'api-server', 'mobile-app']
		}
	},
	{
		id: 'task-004',
		client_id: 'demo',
		app_id: 'flows',
		journey_id: 'journey-001',
		title: 'Review company handbook',
		description: 'Read and acknowledge company policies and procedures',
		status: 'pending',
		assigned_to: 'sarah-chen-456',
		assigned_by: 'hr-manager-123',
		due_date: new Date('2025-10-18T00:00:00Z'),
		order: 3,
		priority: 'medium',
		estimated_duration: 30,
		created_at: new Date('2025-10-01T00:00:00Z'),
		updated_at: new Date('2025-10-01T00:00:00Z'),
		metadata: {
			handbook_url: 'https://docs.thepia.com/handbook',
			sections: ['code-of-conduct', 'benefits', 'pto-policy', 'remote-work']
		}
	},
	{
		id: 'task-101',
		client_id: 'demo',
		app_id: 'flows',
		journey_id: 'journey-002',
		title: 'Return equipment',
		description: 'Return laptop, monitor, and access badge',
		status: 'completed',
		assigned_to: 'mike-johnson-789',
		assigned_by: 'it-admin-789',
		due_date: new Date('2025-10-01T00:00:00Z'),
		completed_at: new Date('2025-09-30T00:00:00Z'),
		order: 0,
		priority: 'high',
		created_at: new Date('2025-09-15T00:00:00Z'),
		updated_at: new Date('2025-09-30T00:00:00Z'),
		metadata: {
			equipment: ['MacBook Pro', 'Dell Monitor 27"', 'Access Badge'],
			return_location: 'IT Department'
		}
	},
	{
		id: 'task-102',
		client_id: 'demo',
		app_id: 'flows',
		journey_id: 'journey-002',
		title: 'Knowledge transfer',
		description: 'Document ongoing projects and transfer knowledge to team',
		status: 'completed',
		assigned_to: 'mike-johnson-789',
		assigned_by: 'team-lead-999',
		due_date: new Date('2025-09-28T00:00:00Z'),
		completed_at: new Date('2025-09-27T00:00:00Z'),
		order: 1,
		priority: 'high',
		created_at: new Date('2025-09-15T00:00:00Z'),
		updated_at: new Date('2025-09-27T00:00:00Z'),
		metadata: {
			documentation_url: 'https://docs.thepia.com/projects/handoff',
			projects: ['Q4 Campaign', 'Website Redesign', 'Social Media Strategy']
		}
	}
];

export const SEED_EVIDENCE: FlowsEvidence[] = [
	{
		id: 'evidence-001',
		client_id: 'demo',
		app_id: 'flows',
		journey_id: 'journey-001',
		task_id: 'task-002',
		type: 'screen',
		filename: 'security-training-completion.webm',
		content_type: 'video/webm',
		size: 5242880,
		duration: 180,
		dimensions: { width: 1920, height: 1080 },
		storage_type: 'local',
		storage_path: '/evidence/screen-recordings/training.webm',
		recorded_by: 'sarah-chen-456',
		recorded_at: new Date('2025-10-10T14:30:00Z'),
		device_info: {
			platform: 'web',
			browser: 'Chrome 119'
		},
		processing_status: 'completed',
		transcription_status: 'completed',
		transcription: 'User completed modules 1-5 of security training.',
		created_at: new Date('2025-10-10T14:30:00Z'),
		updated_at: new Date('2025-10-10T14:35:00Z'),
		metadata: {
			quiz_score: 95,
			modules_completed: 5
		}
	}
];

export const SEED_COMMENTS: FlowsComment[] = [
	{
		id: 'comment-001',
		client_id: 'demo',
		app_id: 'flows',
		journey_id: 'journey-001',
		task_id: 'task-002',
		message: 'Great progress on the security training!',
		message_type: 'text',
		author_id: 'hr-manager-123',
		created_at: new Date('2025-10-10T15:00:00Z'),
		updated_at: new Date('2025-10-10T15:00:00Z'),
		metadata: {}
	}
];

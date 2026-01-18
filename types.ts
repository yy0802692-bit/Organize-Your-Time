
export enum TaskStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  VERIFYING = 'VERIFYING'
}

export interface Task {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  status: TaskStatus;
  scheduledDate?: string; // Format: YYYY-MM-DD
  notified?: boolean;
  startTime?: number;
  endTime?: number;
  proofImageUrl?: string;
  pointsEarned?: number;
  aiFeedback?: string;
}

export interface UserStats {
  points: number;
  completedCount: number;
  failedCount: number;
}

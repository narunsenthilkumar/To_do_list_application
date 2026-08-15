export interface Project {
  id: string;
  userId?: string;
  name: string;
  description?: string;
  icon: string;       // Lucide icon name or SF Symbol equivalent
  color: string;      // Accent tint hex code
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  order: number;
  // Phase 4 Sync & Local-First Metadata
  version?: number;
  updatedByDeviceId?: string;
  deletedAt?: string;
}

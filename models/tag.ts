export interface Tag {
  id: string;
  userId?: string;
  name: string;
  color: string;
  createdAt: string;
  version?: number;
  updatedByDeviceId?: string;
  deletedAt?: string;
}

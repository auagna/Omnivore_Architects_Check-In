export type GroupType = "member" | "guest";

export type AttendanceRecord = {
  id: string;
  created_at: string;
  event_id: string | null;
  name: string;
  phone_last4: string;
  group_type: GroupType;
  memo: string | null;
};

export type AttendanceFormInput = {
  eventId?: string;
  name: string;
  phoneLast4: string;
  groupType: GroupType;
  memo?: string;
};

export type EventRecord = {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  description: string | null;
  location: string | null;
  event_date: string | null;
  capacity: number;
  is_active: boolean;
};

export type EventFormInput = {
  title: string;
  description?: string;
  location?: string;
  eventDate?: string;
  capacity: number;
  isActive: boolean;
};

export type AttendanceStats = {
  total: number;
  member: number;
  guest: number;
  remaining: number;
  capacity: number;
};

export type AttendanceListResponse = {
  records: AttendanceRecord[];
  stats: AttendanceStats;
  event: EventRecord | null;
};

export type ApiErrorResponse = {
  error: string;
};

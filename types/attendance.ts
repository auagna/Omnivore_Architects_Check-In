export type GroupType = "member" | "guest";

// 이벤트별 선택항목(식사 참여, 도슨트 참여 등). 참가자는 각 항목을 예/아니오로 응답합니다.
export type EventOption = {
  id: string;
  label: string;
};

// 선택항목 id -> 참여 여부
export type OptionResponses = Record<string, boolean>;

export type AttendanceRecord = {
  id: string;
  created_at: string;
  event_id: string | null;
  name: string;
  phone_last4: string;
  group_type: GroupType;
  memo: string | null;
  option_responses: OptionResponses;
};

export type AttendanceFormInput = {
  eventId?: string;
  name: string;
  phoneLast4: string;
  groupType: GroupType;
  memo?: string;
  optionResponses?: OptionResponses;
};

// 참가자 본인 조회/수정 시 사용하는 입력 (구분은 바꾸지 않음)
export type AttendanceUpdateInput = {
  groupType: GroupType;
  memo?: string;
  optionResponses?: OptionResponses;
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
  custom_options: EventOption[];
  roster: string[];
};

export type EventFormInput = {
  title: string;
  description?: string;
  location?: string;
  eventDate?: string;
  capacity: number;
  isActive: boolean;
  customOptions: EventOption[];
  roster: string[];
};

// 체크인 페이지(공개)에 내려보내는 이벤트 정보. 참가자 명단 등 민감 정보는 제외합니다.
export type PublicEvent = {
  id: string;
  title: string;
  description: string | null;
  capacity: number;
  customOptions: EventOption[];
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

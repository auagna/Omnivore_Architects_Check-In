import {
  AttendanceFormInput,
  AttendanceUpdateInput,
  EventFormInput,
  EventOption,
  GroupType,
  OptionResponses
} from "@/types/attendance";

export const DUPLICATE_ERROR =
  "이미 출석체크된 정보입니다. 운영진에게 확인해주세요.";
export const CAPACITY_ERROR =
  "정원이 초과되었습니다. 운영진에게 문의해주세요.";

export function getEventCapacity() {
  const capacity = Number(process.env.EVENT_CAPACITY ?? "60");
  return Number.isFinite(capacity) && capacity > 0 ? capacity : 60;
}

export function isValidGroupType(value: unknown): value is GroupType {
  return value === "member" || value === "guest";
}

// 선택항목 응답을 안전한 boolean map으로 정규화합니다.
function normalizeOptionResponses(value: unknown): OptionResponses {
  if (!value || typeof value !== "object") {
    return {};
  }

  const result: OptionResponses = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const id = key.trim();
    if (id) {
      result[id] = Boolean(raw);
    }
  }

  return result;
}

// 이벤트 선택항목 배열을 정규화합니다. id가 없으면 라벨 기반으로 생성합니다.
function normalizeCustomOptions(value: unknown): EventOption[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const options: EventOption[] = [];

  for (const raw of value) {
    if (!raw || typeof raw !== "object") {
      continue;
    }

    const candidate = raw as Partial<EventOption>;
    const label = String(candidate.label ?? "").trim();
    if (!label) {
      continue;
    }

    let id = String(candidate.id ?? "").trim();
    if (!id || seen.has(id)) {
      id = `opt_${Math.random().toString(36).slice(2, 10)}`;
    }
    seen.add(id);

    options.push({ id, label });
  }

  return options;
}

// 참가자 명단을 중복 없는 이름 배열로 정규화합니다.
function normalizeRoster(value: unknown): string[] {
  let names: string[] = [];

  if (Array.isArray(value)) {
    names = value.map((item) => String(item ?? ""));
  } else if (typeof value === "string") {
    names = value.split(/\r?\n/);
  }

  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of names) {
    const name = raw.trim();
    if (name && !seen.has(name)) {
      seen.add(name);
      result.push(name);
    }
  }

  return result;
}

export function validateAttendancePayload(body: unknown):
  | { ok: true; data: AttendanceFormInput }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "요청 형식이 올바르지 않습니다." };
  }

  const payload = body as Partial<AttendanceFormInput>;
  const eventId = typeof payload.eventId === "string" ? payload.eventId.trim() : undefined;
  const name = String(payload.name ?? "").trim();
  const phoneLast4 = String(payload.phoneLast4 ?? "").trim();
  const groupType = payload.groupType;
  const memo = String(payload.memo ?? "").trim();

  if (!name) {
    return { ok: false, error: "이름을 입력해주세요." };
  }

  if (!/^\d{4}$/.test(phoneLast4)) {
    return { ok: false, error: "연락처 뒷자리는 숫자 4자리로 입력해주세요." };
  }

  if (!isValidGroupType(groupType)) {
    return { ok: false, error: "신청 구분은 멤버 또는 게스트만 선택할 수 있습니다." };
  }

  return {
    ok: true,
    data: {
      eventId,
      name,
      phoneLast4,
      groupType,
      memo,
      optionResponses: normalizeOptionResponses(payload.optionResponses)
    }
  };
}

// 참가자 본인 수정(구분/메모/선택항목)만 검증합니다. 이름·연락처는 변경하지 않습니다.
export function validateAttendanceUpdatePayload(body: unknown):
  | { ok: true; data: AttendanceUpdateInput }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "요청 형식이 올바르지 않습니다." };
  }

  const payload = body as Partial<AttendanceUpdateInput>;
  const groupType = payload.groupType;
  const memo = String(payload.memo ?? "").trim();

  if (!isValidGroupType(groupType)) {
    return { ok: false, error: "신청 구분은 멤버 또는 게스트만 선택할 수 있습니다." };
  }

  return {
    ok: true,
    data: {
      groupType,
      memo,
      optionResponses: normalizeOptionResponses(payload.optionResponses)
    }
  };
}

// 참가자 본인 조회용 입력(이름 + 연락처 뒷자리)을 검증합니다.
export function validateLookupPayload(body: unknown):
  | { ok: true; data: { eventId?: string; name: string; phoneLast4: string } }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "요청 형식이 올바르지 않습니다." };
  }

  const payload = body as { eventId?: unknown; name?: unknown; phoneLast4?: unknown };
  const eventId = typeof payload.eventId === "string" ? payload.eventId.trim() : undefined;
  const name = String(payload.name ?? "").trim();
  const phoneLast4 = String(payload.phoneLast4 ?? "").trim();

  if (!name) {
    return { ok: false, error: "이름을 입력해주세요." };
  }

  if (!/^\d{4}$/.test(phoneLast4)) {
    return { ok: false, error: "연락처 뒷자리는 숫자 4자리로 입력해주세요." };
  }

  return { ok: true, data: { eventId, name, phoneLast4 } };
}

export function validateEventPayload(body: unknown):
  | { ok: true; data: EventFormInput }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "요청 형식이 올바르지 않습니다." };
  }

  const payload = body as Partial<EventFormInput>;
  const title = String(payload.title ?? "").trim();
  const description = String(payload.description ?? "").trim();
  const location = String(payload.location ?? "").trim();
  const eventDate = String(payload.eventDate ?? "").trim();
  const capacity = Number(payload.capacity);

  if (!title) {
    return { ok: false, error: "이벤트 이름을 입력해주세요." };
  }

  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 9999) {
    return { ok: false, error: "정원은 1명 이상 9999명 이하로 입력해주세요." };
  }

  return {
    ok: true,
    data: {
      title,
      description,
      location,
      eventDate,
      capacity,
      isActive: Boolean(payload.isActive),
      customOptions: normalizeCustomOptions(payload.customOptions),
      roster: normalizeRoster(payload.roster)
    }
  };
}

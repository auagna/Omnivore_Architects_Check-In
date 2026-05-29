import { AttendanceFormInput, EventFormInput, GroupType } from "@/types/attendance";

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
      memo
    }
  };
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
      isActive: Boolean(payload.isActive)
    }
  };
}

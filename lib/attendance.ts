import { PostgrestError } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  AttendanceFormInput,
  AttendanceRecord,
  AttendanceStats,
  AttendanceUpdateInput,
  EventFormInput,
  EventRecord,
  Season,
  SeasonFormInput,
  StatsResponse,
  Tag,
  TagFormInput
} from "@/types/attendance";
import { CAPACITY_ERROR, DUPLICATE_ERROR, getEventCapacity } from "@/lib/validation";

const ATTENDANCE_TABLE = "attendance_records";
const EVENTS_TABLE = "events";
const SEASONS_TABLE = "seasons";
const TAGS_TABLE = "tags";

const EVENT_COLUMNS =
  "id, created_at, updated_at, title, description, location, event_date, capacity, is_active, custom_options, roster, season_id, tag_id";
const ATTENDANCE_COLUMNS =
  "id, created_at, event_id, name, phone_last4, group_type, memo, option_responses";
const SEASON_COLUMNS = "id, created_at, name, members";
const TAG_COLUMNS = "id, created_at, name";

// DB row를 항상 안전한 기본값으로 정규화합니다 (마이그레이션 직후 null 대비).
function normalizeEvent(row: Record<string, unknown> | null): EventRecord | null {
  if (!row) {
    return null;
  }

  return {
    ...(row as EventRecord),
    custom_options: Array.isArray(row.custom_options) ? (row.custom_options as EventRecord["custom_options"]) : [],
    roster: Array.isArray(row.roster) ? (row.roster as string[]) : []
  };
}

function normalizeRecord(row: Record<string, unknown>): AttendanceRecord {
  return {
    ...(row as AttendanceRecord),
    option_responses:
      row.option_responses && typeof row.option_responses === "object"
        ? (row.option_responses as AttendanceRecord["option_responses"])
        : {}
  };
}

export function buildAttendanceStats(records: AttendanceRecord[], capacity = getEventCapacity()): AttendanceStats {
  const member = records.filter((record) => record.group_type === "member").length;
  const guest = records.filter((record) => record.group_type === "guest").length;

  return {
    total: records.length,
    member,
    guest,
    remaining: Math.max(capacity - records.length, 0),
    capacity
  };
}

export async function listEvents() {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from(EVENTS_TABLE)
    .select(EVENT_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => normalizeEvent(row as Record<string, unknown>)!) as EventRecord[];
}

export async function getActiveEvent() {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from(EVENTS_TABLE)
    .select(EVENT_COLUMNS)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeEvent(data as Record<string, unknown> | null);
}

export async function getEventById(id: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from(EVENTS_TABLE)
    .select(EVENT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeEvent(data as Record<string, unknown> | null);
}

export async function createEvent(input: EventFormInput) {
  const supabaseAdmin = getSupabaseAdmin();

  if (input.isActive) {
    await deactivateAllEvents();
  }

  const { data, error } = await supabaseAdmin
    .from(EVENTS_TABLE)
    .insert(toEventRow(input))
    .select(EVENT_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeEvent(data as Record<string, unknown>)!;
}

export async function updateEvent(id: string, input: EventFormInput) {
  const supabaseAdmin = getSupabaseAdmin();

  if (input.isActive) {
    await deactivateAllEvents();
  }

  const { data, error } = await supabaseAdmin
    .from(EVENTS_TABLE)
    .update({ ...toEventRow(input), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(EVENT_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeEvent(data as Record<string, unknown>)!;
}

export async function deleteEvent(id: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin.from(EVENTS_TABLE).delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function listAttendanceRecords(eventId?: string) {
  const supabaseAdmin = getSupabaseAdmin();
  let query = supabaseAdmin
    .from(ATTENDANCE_TABLE)
    .select(ATTENDANCE_COLUMNS)
    .order("created_at", { ascending: false });

  if (eventId) {
    query = query.eq("event_id", eventId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => normalizeRecord(row as Record<string, unknown>));
}

export async function createAttendanceRecord(input: AttendanceFormInput) {
  const supabaseAdmin = getSupabaseAdmin();
  const event = input.eventId ? await getEventById(input.eventId) : await getActiveEvent();

  // 이벤트를 특정할 수 없으면 어떤 이벤트에도 속하지 않는 기록(고아 데이터)이 생기므로 막습니다.
  if (!event) {
    return {
      ok: false as const,
      status: 409,
      error: "현재 진행 중인 이벤트가 없습니다. 운영진에게 문의해주세요."
    };
  }

  const capacity = event.capacity ?? getEventCapacity();
  const eventId = event.id;
  const countQuery = supabaseAdmin
    .from(ATTENDANCE_TABLE)
    .select("id", { count: "exact", head: true });
  const { count, error: countError } = await (eventId ? countQuery.eq("event_id", eventId) : countQuery.is("event_id", null));

  if (countError) {
    throw new Error(countError.message);
  }

  if ((count ?? 0) >= capacity) {
    return { ok: false as const, status: 409, error: CAPACITY_ERROR };
  }

  const { data, error } = await supabaseAdmin
    .from(ATTENDANCE_TABLE)
    .insert({
      event_id: eventId,
      name: input.name,
      phone_last4: input.phoneLast4,
      group_type: input.groupType,
      memo: input.memo || null,
      option_responses: filterOptionResponses(input.optionResponses, event?.custom_options)
    })
    .select(ATTENDANCE_COLUMNS)
    .single();

  if (error) {
    if (isDuplicateError(error)) {
      return { ok: false as const, status: 409, error: DUPLICATE_ERROR };
    }

    throw new Error(error.message);
  }

  return { ok: true as const, record: normalizeRecord(data as Record<string, unknown>) };
}

// 참가자 본인 조회: 이벤트 범위 안에서 이름 + 연락처 뒷자리로 정확히 매칭합니다.
export async function findAttendanceRecord(eventId: string | undefined, name: string, phoneLast4: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const targetEvent = eventId ? await getEventById(eventId) : await getActiveEvent();

  let query = supabaseAdmin
    .from(ATTENDANCE_TABLE)
    .select(ATTENDANCE_COLUMNS)
    .eq("name", name)
    .eq("phone_last4", phoneLast4)
    .limit(1);

  query = targetEvent?.id ? query.eq("event_id", targetEvent.id) : query.is("event_id", null);

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? normalizeRecord(data as Record<string, unknown>) : null;
}

export async function updateAttendanceRecord(id: string, input: AttendanceUpdateInput) {
  const supabaseAdmin = getSupabaseAdmin();

  // 응답을 현재 이벤트의 선택항목으로 필터링하기 위해 기존 레코드의 event를 조회합니다.
  const { data: existing, error: findError } = await supabaseAdmin
    .from(ATTENDANCE_TABLE)
    .select("id, event_id")
    .eq("id", id)
    .maybeSingle();

  if (findError) {
    throw new Error(findError.message);
  }

  if (!existing) {
    return { ok: false as const, status: 404, error: "체크인 기록을 찾을 수 없습니다." };
  }

  const eventId = (existing as { event_id: string | null }).event_id ?? undefined;
  const event = eventId ? await getEventById(eventId) : null;

  const { data, error } = await supabaseAdmin
    .from(ATTENDANCE_TABLE)
    .update({
      group_type: input.groupType,
      memo: input.memo || null,
      option_responses: filterOptionResponses(input.optionResponses, event?.custom_options)
    })
    .eq("id", id)
    .select(ATTENDANCE_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return { ok: true as const, record: normalizeRecord(data as Record<string, unknown>) };
}

export async function deleteAttendanceRecord(id: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin.from(ATTENDANCE_TABLE).delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteAllAttendanceRecords() {
  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin.from(ATTENDANCE_TABLE).delete().not("id", "is", null);

  if (error) {
    throw new Error(error.message);
  }
}

function isDuplicateError(error: PostgrestError) {
  return error.code === "23505";
}

async function deactivateAllEvents() {
  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin.from(EVENTS_TABLE).update({ is_active: false }).neq("is_active", false);

  if (error) {
    throw new Error(error.message);
  }
}

// 이벤트에 정의된 선택항목 id에 해당하는 응답만 남깁니다.
function filterOptionResponses(
  responses: AttendanceFormInput["optionResponses"],
  options: EventRecord["custom_options"] | undefined
) {
  if (!responses || !options || options.length === 0) {
    return {};
  }

  const valid = new Set(options.map((option) => option.id));
  const result: Record<string, boolean> = {};

  for (const [id, value] of Object.entries(responses)) {
    if (valid.has(id)) {
      result[id] = Boolean(value);
    }
  }

  return result;
}

function toEventRow(input: EventFormInput) {
  return {
    title: input.title,
    description: input.description || null,
    location: input.location || null,
    event_date: input.eventDate || null,
    capacity: input.capacity,
    is_active: input.isActive,
    custom_options: input.customOptions ?? [],
    roster: input.roster ?? [],
    season_id: input.seasonId ?? null,
    tag_id: input.tagId ?? null
  };
}

function normalizeSeason(row: Record<string, unknown>): Season {
  return {
    ...(row as Season),
    members: Array.isArray(row.members) ? (row.members as string[]) : []
  };
}

export async function listSeasons() {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from(SEASONS_TABLE)
    .select(SEASON_COLUMNS)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => normalizeSeason(row as Record<string, unknown>));
}

export async function createSeason(input: SeasonFormInput) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from(SEASONS_TABLE)
    .insert({ name: input.name, members: input.members })
    .select(SEASON_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeSeason(data as Record<string, unknown>);
}

export async function updateSeason(id: string, input: SeasonFormInput) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from(SEASONS_TABLE)
    .update({ name: input.name, members: input.members })
    .eq("id", id)
    .select(SEASON_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeSeason(data as Record<string, unknown>);
}

export async function deleteSeason(id: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin.from(SEASONS_TABLE).delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function listTags() {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from(TAGS_TABLE)
    .select(TAG_COLUMNS)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Tag[];
}

export async function createTag(input: TagFormInput) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from(TAGS_TABLE)
    .insert({ name: input.name })
    .select(TAG_COLUMNS)
    .single();

  if (error) {
    if (isDuplicateError(error as never)) {
      throw new Error("이미 같은 이름의 태그가 있습니다.");
    }
    throw new Error(error.message);
  }

  return data as Tag;
}

export async function updateTag(id: string, input: TagFormInput) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from(TAGS_TABLE)
    .update({ name: input.name })
    .eq("id", id)
    .select(TAG_COLUMNS)
    .single();

  if (error) {
    if (isDuplicateError(error as never)) {
      throw new Error("이미 같은 이름의 태그가 있습니다.");
    }
    throw new Error(error.message);
  }

  return data as Tag;
}

export async function deleteTag(id: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin.from(TAGS_TABLE).delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

// 참석률 통계용: 시즌/태그 목록과, 각 이벤트의 체크인 이름 목록을 반환합니다.
export async function getStats(): Promise<StatsResponse> {
  const supabaseAdmin = getSupabaseAdmin();
  const [seasons, tags, events] = await Promise.all([listSeasons(), listTags(), listEvents()]);

  const { data, error } = await supabaseAdmin
    .from(ATTENDANCE_TABLE)
    .select("event_id, name");

  if (error) {
    throw new Error(error.message);
  }

  const attendeesByEvent = new Map<string, string[]>();
  for (const row of (data ?? []) as { event_id: string | null; name: string }[]) {
    if (!row.event_id) {
      continue;
    }
    const bucket = attendeesByEvent.get(row.event_id) ?? [];
    bucket.push(row.name);
    attendeesByEvent.set(row.event_id, bucket);
  }

  return {
    seasons,
    tags,
    events: events.map((event) => ({
      id: event.id,
      title: event.title,
      event_date: event.event_date,
      season_id: event.season_id,
      tag_id: event.tag_id,
      attendees: attendeesByEvent.get(event.id) ?? []
    }))
  };
}

import { PostgrestError } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  AttendanceFormInput,
  AttendanceRecord,
  AttendanceStats,
  EventFormInput,
  EventRecord
} from "@/types/attendance";
import { CAPACITY_ERROR, DUPLICATE_ERROR, getEventCapacity } from "@/lib/validation";

const ATTENDANCE_TABLE = "attendance_records";
const EVENTS_TABLE = "events";

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
    .select("id, created_at, updated_at, title, description, location, event_date, capacity, is_active")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as EventRecord[];
}

export async function getActiveEvent() {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from(EVENTS_TABLE)
    .select("id, created_at, updated_at, title, description, location, event_date, capacity, is_active")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as EventRecord | null;
}

export async function getEventById(id: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from(EVENTS_TABLE)
    .select("id, created_at, updated_at, title, description, location, event_date, capacity, is_active")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as EventRecord | null;
}

export async function createEvent(input: EventFormInput) {
  const supabaseAdmin = getSupabaseAdmin();

  if (input.isActive) {
    await deactivateAllEvents();
  }

  const { data, error } = await supabaseAdmin
    .from(EVENTS_TABLE)
    .insert(toEventRow(input))
    .select("id, created_at, updated_at, title, description, location, event_date, capacity, is_active")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as EventRecord;
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
    .select("id, created_at, updated_at, title, description, location, event_date, capacity, is_active")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as EventRecord;
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
    .select("id, created_at, event_id, name, phone_last4, group_type, memo")
    .order("created_at", { ascending: false });

  if (eventId) {
    query = query.eq("event_id", eventId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as AttendanceRecord[];
}

export async function createAttendanceRecord(input: AttendanceFormInput) {
  const supabaseAdmin = getSupabaseAdmin();
  const event = input.eventId ? await getEventById(input.eventId) : await getActiveEvent();
  const capacity = event?.capacity ?? getEventCapacity();
  const eventId = event?.id ?? null;
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
      memo: input.memo || null
    })
    .select("id, created_at, event_id, name, phone_last4, group_type, memo")
    .single();

  if (error) {
    if (isDuplicateError(error)) {
      return { ok: false as const, status: 409, error: DUPLICATE_ERROR };
    }

    throw new Error(error.message);
  }

  return { ok: true as const, record: data as AttendanceRecord };
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

function toEventRow(input: EventFormInput) {
  return {
    title: input.title,
    description: input.description || null,
    location: input.location || null,
    event_date: input.eventDate || null,
    capacity: input.capacity,
    is_active: input.isActive
  };
}

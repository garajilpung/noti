export const RESPONSE_STATUSES = ['미분류', '영향 없음', '검토 필요', '대응 중', '대응 완료'] as const;
export type ResponseStatus = typeof RESPONSE_STATUSES[number];
export interface Institution {
  id: string; name: string; category: string; home_url: string; notice_url: string;
  mode: 'list' | 'page'; adapter: string; list_selector: string; link_selector: string;
  date_selector: string; body_selector: string; exclude_selector: string;
  active: boolean; max_items: number; setup_note: string;
  baseline_at: string | null; last_checked_at: string | null; last_success_at: string | null;
  last_result: string; last_error: string | null; entity_ids: string[];
}
export interface Entity {
  id: string; kind: 'company' | 'project'; name: string; company_id: string | null;
  memo: string; institution_ids: string[];
}
export interface Change {
  id: string; notice_id: string; institution_id: string; institution_name: string;
  title: string; url: string; published_date: string | null; first_seen_at: string;
  kind: 'baseline' | 'new' | 'changed'; found_at: string; reviewed: boolean;
  response_status: ResponseStatus; memo: string; updated_at: string; reviewed_at: string | null;
  version: number; entity_ids: string[];
}
export interface CheckRun {
  id: string; institution_id: string; institution_name: string; started_at: string;
  finished_at: string | null; status: string; item_count: number; new_count: number;
  changed_count: number; error: string | null;
}
export interface CheckSchedule {
  id: string; institution_id: string; institution_name: string; scheduled_date: string;
  memo: string; completed_run_id: string | null;
}
export interface Bootstrap {
  institutions: Institution[]; entities: Entity[]; changes: Change[];
  runs: CheckRun[]; schedules: CheckSchedule[];
}
export interface Snapshot { id: string; title: string; body: string; source_url: string; collected_at: string; content_hash: string }
export interface Activity { id: string; actor: string; reviewed: boolean; response_status: string; memo: string; entity_ids: string[]; created_at: string }
export interface Detail { change: Change; before: Snapshot | null; after: Snapshot; activities: Activity[] }
export interface CollectedNotice { sourceKey: string; title: string; url: string; publishedDate: string | null; body: string }

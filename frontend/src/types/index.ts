/**
 * Shared domain types for the JobAssist frontend.
 *
 * These types mirror the backend Pydantic schemas so that props, API
 * responses, and Zustand state are statically checked.
 */

export interface Job {
  id: number;
  company: string | null;
  role: string | null;
  description: string | null;
  url: string | null;
  status: JobStatus;
  category: JobCategory | null;
  cover_letter: string | null;
  interview_qa: string | null;
  suggested_courses: string | null;
  research_data: string | null;
  notes: string | null;
  deadline: string | null;
  location: string | null;
  job_type: string | null;
  salary_text: string | null;
  source: string | null;
  posted_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export type JobStatus =
  | "bookmarked"
  | "applied"
  | "interviewing"
  | "offered"
  | "rejected";

export type JobCategory =
  | "samstagsjob"
  | "praktikum"
  | "teilzeit"
  | "other";

export interface Resume {
  id: number;
  filename: string;
  raw_text: string;
  parsed_json?: string | null;
  skill_analysis_json?: string | null;
  created_at: string;
}

export interface User {
  id: number;
  email: string;
  full_name: string | null;
  is_active: boolean;
  is_verified: boolean;
  plan: string;
  language: string;
  created_at: string;
}

export interface UsageItem {
  feature: string;
  used: number;
  limit: number;
  remaining: number;
}

export interface BillingOverview {
  plan: string;
  usage: UsageItem[];
}

export interface ApiErrorDetail {
  detail?: string | { error: string; message?: string };
}

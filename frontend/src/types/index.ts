export interface DiaryEntry {
  id: string
  title?: string
  recorded_at: string
  audio_file_path?: string
  file_id?: string
  transcription?: string
  summary?: string
  tags?: string[]
  emotions?: Record<string, any>
  transcribe_model?: string
  summary_model?: string
  transcription_status: 'pending' | 'processing' | 'completed' | 'failed'
  summary_status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
  updated_at: string
}

export interface DiaryEntryListResponse {
  entries: DiaryEntry[]
  total: number
  page: number
  size: number
  has_next: boolean
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}
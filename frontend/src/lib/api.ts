import { DiaryEntry, DiaryEntryListResponse } from '@/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const api = {
  // 日記エントリ関連
  async getDiaryEntries(page: number = 1, size: number = 10): Promise<DiaryEntryListResponse> {
    const response = await fetch(`${API_BASE_URL}/api/diary/?page=${page}&size=${size}`)
    if (!response.ok) {
      throw new Error(`日記一覧の取得に失敗しました: ${response.status}`)
    }
    return response.json()
  },

  async getDiaryEntry(id: string): Promise<DiaryEntry> {
    const response = await fetch(`${API_BASE_URL}/api/diary/${id}`)
    if (!response.ok) {
      throw new Error(`日記の取得に失敗しました: ${response.status}`)
    }
    return response.json()
  },

  async updateDiaryEntry(id: string, data: Partial<DiaryEntry>): Promise<DiaryEntry> {
    const response = await fetch(`${API_BASE_URL}/api/diary/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      throw new Error(`日記の更新に失敗しました: ${response.status}`)
    }
    return response.json()
  },

  async deleteDiaryEntry(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/diary/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      throw new Error(`日記の削除に失敗しました: ${response.status}`)
    }
  },

  // 音声アップロード
  async uploadAudio(audioBlob: Blob): Promise<any> {
    const formData = new FormData()
    formData.append('file', audioBlob, 'recording.webm')
    
    const response = await fetch(`${API_BASE_URL}/api/audio/upload`, {
      method: 'POST',
      body: formData,
    })
    
    if (!response.ok) {
      throw new Error(`アップロードエラー: ${response.status}`)
    }
    
    return response.json()
  },

  // 文字起こし
  async startTranscription(fileId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/transcribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ file_id: fileId }),
    })
    
    if (!response.ok) {
      throw new Error(`文字起こしの開始に失敗しました: ${response.status}`)
    }
    
    return response.json()
  },

  async getTranscriptionResult(taskId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/transcribe/${taskId}`)
    
    if (!response.ok) {
      throw new Error(`文字起こし結果の取得に失敗しました: ${response.status}`)
    }
    
    return response.json()
  },

  // 要約
  async startSummarization(text: string, entryId?: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/summarize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, entry_id: entryId }),
    })
    
    if (!response.ok) {
      throw new Error(`要約の開始に失敗しました: ${response.status}`)
    }
    
    return response.json()
  },

  async getSummaryResult(taskId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/summarize/${taskId}`)
    
    if (!response.ok) {
      throw new Error(`要約結果の取得に失敗しました: ${response.status}`)
    }
    
    return response.json()
  },

  // タグ関連
  async getTags(): Promise<{ tags: Array<{ name: string; count: number }> }> {
    const response = await fetch(`${API_BASE_URL}/api/tags`)
    if (!response.ok) {
      throw new Error(`タグ一覧の取得に失敗しました: ${response.status}`)
    }
    return response.json()
  },

  async getDiaryEntriesByTag(tagName: string, page: number = 1, size: number = 10): Promise<DiaryEntryListResponse & { tag_name: string }> {
    const response = await fetch(`${API_BASE_URL}/api/diary/by-tag/${encodeURIComponent(tagName)}?page=${page}&size=${size}`)
    if (!response.ok) {
      throw new Error(`タグ検索に失敗しました: ${response.status}`)
    }
    return response.json()
  },
}
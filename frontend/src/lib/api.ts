import { DiaryEntry, DiaryEntryListResponse } from '@/types'

// API URLを環境に応じて決定
function getApiBaseUrl(): string {
  // ブラウザ環境での判定
  if (typeof window !== 'undefined') {
    // 開発環境（localhost）の場合
    if (window.location.hostname === 'localhost') {
      return 'http://localhost:8000'
    }
    
    // 本番環境（homelab）の場合
    // フロントエンドと同じドメインで /api/* パスを使用
    // Nginx Proxy Managerで /api/* → voice-diary-api:8000 にプロキシ設定
    return `${window.location.protocol}//${window.location.host}`
  }
  
  // サーバーサイド（SSR時）の場合はコンテナ名でアクセス
  return 'http://voice-diary-api:8000'
}

const API_BASE_URL = getApiBaseUrl()

// 認証ヘッダーを含むfetchラッパー
async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers)
  
  // Cookieは自動的に送信されるため、特別な処理は不要
  // CORS設定でcredentials: 'include'を使用
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // HTTP-only Cookieを含める
  })
  
  return response
}

export const api = {
  // 汎用的なHTTPメソッド
  async get(path: string): Promise<Response> {
    return authFetch(`${API_BASE_URL}${path}`)
  },

  async post(path: string, data?: any): Promise<Response> {
    return authFetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    })
  },

  async put(path: string, data?: any): Promise<Response> {
    return authFetch(`${API_BASE_URL}${path}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    })
  },

  async delete(path: string): Promise<Response> {
    return authFetch(`${API_BASE_URL}${path}`, {
      method: 'DELETE',
    })
  },
  // 日記エントリ関連
  async getDiaryEntries(page: number = 1, size: number = 10): Promise<DiaryEntryListResponse> {
    const response = await authFetch(`${API_BASE_URL}/api/diary/?page=${page}&size=${size}`)
    if (!response.ok) {
      throw new Error(`日記一覧の取得に失敗しました: ${response.status}`)
    }
    return response.json()
  },

  async getDiaryEntry(id: string): Promise<DiaryEntry> {
    const response = await authFetch(`${API_BASE_URL}/api/diary/${id}`)
    if (!response.ok) {
      throw new Error(`日記の取得に失敗しました: ${response.status}`)
    }
    return response.json()
  },

  async updateDiaryEntry(id: string, data: Partial<DiaryEntry>): Promise<DiaryEntry> {
    const response = await authFetch(`${API_BASE_URL}/api/diary/${id}`, {
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
    const response = await authFetch(`${API_BASE_URL}/api/diary/${id}`, {
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
    
    const response = await authFetch(`${API_BASE_URL}/api/audio/upload`, {
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
    const response = await authFetch(`${API_BASE_URL}/api/transcribe`, {
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
    const response = await authFetch(`${API_BASE_URL}/api/transcribe/${taskId}`)
    
    if (!response.ok) {
      throw new Error(`文字起こし結果の取得に失敗しました: ${response.status}`)
    }
    
    return response.json()
  },

  // 要約
  async startSummarization(text: string, entryId?: string): Promise<any> {
    const response = await authFetch(`${API_BASE_URL}/api/summarize`, {
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
    const response = await authFetch(`${API_BASE_URL}/api/summarize/${taskId}`)
    
    if (!response.ok) {
      throw new Error(`要約結果の取得に失敗しました: ${response.status}`)
    }
    
    return response.json()
  },

  // タグ関連
  async getTags(): Promise<{ tags: Array<{ name: string; count: number }> }> {
    const response = await authFetch(`${API_BASE_URL}/api/tags`)
    if (!response.ok) {
      throw new Error(`タグ一覧の取得に失敗しました: ${response.status}`)
    }
    return response.json()
  },

  async getDiaryEntriesByTag(tagName: string, page: number = 1, size: number = 10): Promise<DiaryEntryListResponse & { tag_name: string }> {
    const response = await authFetch(`${API_BASE_URL}/api/diary/by-tag/${encodeURIComponent(tagName)}?page=${page}&size=${size}`)
    if (!response.ok) {
      throw new Error(`タグ検索に失敗しました: ${response.status}`)
    }
    return response.json()
  },

  // 全文検索
  async searchDiaryEntries(query: string, page: number = 1, size: number = 10): Promise<DiaryEntryListResponse & { query: string }> {
    const response = await authFetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}&page=${page}&size=${size}`)
    if (!response.ok) {
      throw new Error(`検索に失敗しました: ${response.status}`)
    }
    return response.json()
  },

  // 設定関連
  async getSettings(): Promise<any> {
    const response = await authFetch(`${API_BASE_URL}/api/settings`)
    if (!response.ok) {
      throw new Error(`設定の取得に失敗しました: ${response.status}`)
    }
    return response.json()
  },

  async saveSettings(settings: any): Promise<any> {
    const response = await authFetch(`${API_BASE_URL}/api/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    })
    if (!response.ok) {
      throw new Error(`設定の保存に失敗しました: ${response.status}`)
    }
    return response.json()
  },

  async validateSettings(): Promise<any> {
    const response = await authFetch(`${API_BASE_URL}/api/settings/validate`)
    if (!response.ok) {
      throw new Error(`設定の検証に失敗しました: ${response.status}`)
    }
    return response.json()
  },

  async getAvailableModels(): Promise<any> {
    const response = await authFetch(`${API_BASE_URL}/api/settings/models`)
    if (!response.ok) {
      throw new Error(`モデル一覧の取得に失敗しました: ${response.status}`)
    }
    return response.json()
  },
}
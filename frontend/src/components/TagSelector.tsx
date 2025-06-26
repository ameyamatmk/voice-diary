'use client'

import React, { useState, useEffect } from 'react'
import { X, Tag, Plus, Hash, ChevronDown, ChevronUp } from 'lucide-react'
import { api } from '@/lib/api'

interface TagData {
  name: string
  count: number
}

interface TagSelectorProps {
  selectedTags: string[]
  onTagsChange: (tags: string[]) => void
}

export const TagSelector: React.FC<TagSelectorProps> = ({
  selectedTags,
  onTagsChange,
}) => {
  const [availableTags, setAvailableTags] = useState<TagData[]>([])
  const [newTagInput, setNewTagInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [tagFilter, setTagFilter] = useState('')
  const [showAllTags, setShowAllTags] = useState(false)

  useEffect(() => {
    loadTags()
  }, [])

  const loadTags = async () => {
    try {
      setLoading(true)
      const data = await api.getTags()
      setAvailableTags(data.tags)
    } catch (error) {
      console.error('タグの読み込みエラー:', error)
    } finally {
      setLoading(false)
    }
  }

  const addTag = (tagName: string) => {
    const trimmedTag = tagName.trim()
    if (trimmedTag && !selectedTags.includes(trimmedTag)) {
      onTagsChange([...selectedTags, trimmedTag])
      setNewTagInput('')
      setShowSuggestions(false)
    }
  }

  const removeTag = (tagToRemove: string) => {
    onTagsChange(selectedTags.filter(tag => tag !== tagToRemove))
  }

  const handleNewTagSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addTag(newTagInput)
  }

  const filteredSuggestions = availableTags.filter(
    tag => 
      !selectedTags.includes(tag.name) &&
      tag.name.toLowerCase().includes(newTagInput.toLowerCase())
  )

  const filteredAllTags = availableTags.filter(
    tag => 
      !selectedTags.includes(tag.name) &&
      tag.name.toLowerCase().includes(tagFilter.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {/* 選択済みタグ表示 */}
      <div className="flex flex-wrap gap-2">
        {selectedTags.map((tag, index) => (
          <div
            key={index}
            className="flex items-center gap-2 px-3 py-1 bg-accent-primary/10 text-accent-primary rounded-full text-sm"
          >
            {tag}
            <button
              onClick={() => removeTag(tag)}
              className="hover:text-error transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* 新規タグ入力 */}
      <form onSubmit={handleNewTagSubmit} className="space-y-3">
        <div className="relative">
          <input
            type="text"
            value={newTagInput}
            onChange={(e) => {
              setNewTagInput(e.target.value)
              setShowSuggestions(e.target.value.length > 0)
            }}
            onFocus={() => setShowSuggestions(newTagInput.length > 0)}
            onBlur={() => {
              // 遅延してサジェスチョンを閉じる（クリックイベントを処理するため）
              setTimeout(() => setShowSuggestions(false), 150)
            }}
            placeholder="タグを入力してEnterまたは既存タグから選択..."
            className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary"
          />
          
          {/* タグサジェスチョン */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-bg-secondary border border-border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
              {filteredSuggestions.slice(0, 10).map((tag) => (
                <button
                  key={tag.name}
                  type="button"
                  onClick={() => addTag(tag.name)}
                  className="w-full px-3 py-2 text-left hover:bg-bg-tertiary transition-colors flex items-center justify-between"
                >
                  <span className="text-text-primary">{tag.name}</span>
                  <span className="text-xs text-text-muted">
                    {tag.count}回使用
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        
        <button
          type="submit"
          disabled={!newTagInput.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="w-4 h-4" />
          追加
        </button>
      </form>

      {/* 登録済みタグ一覧 */}
      {availableTags.length > 0 && (
        <div className="space-y-3">
          {/* よく使われるタグ（上位5個） */}
          <div className="space-y-2">
            <p className="text-sm text-text-secondary flex items-center gap-1">
              <Tag className="w-4 h-4" />
              よく使われるタグ
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {availableTags
                .filter(tag => !selectedTags.includes(tag.name))
                .slice(0, 6)
                .map((tag) => (
                  <button
                    key={tag.name}
                    onClick={() => addTag(tag.name)}
                    className="text-left px-3 py-2 bg-bg-tertiary text-text-secondary rounded-lg text-sm hover:bg-accent-primary/10 hover:text-accent-primary transition-colors border border-transparent hover:border-accent-primary/30"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate mr-2">{tag.name}</span>
                      <span className="text-xs text-text-muted bg-bg-secondary px-1.5 py-0.5 rounded-full flex-shrink-0">
                        {tag.count}
                      </span>
                    </div>
                  </button>
                ))}
            </div>
          </div>

          {/* 全タグ一覧 */}
          <div className="space-y-2">
            <button
              onClick={() => setShowAllTags(!showAllTags)}
              className="w-full flex items-center justify-between text-left text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              <span className="flex items-center gap-1">
                <Hash className="w-4 h-4" />
                すべてのタグ ({filteredAllTags.length}個)
              </span>
              {showAllTags ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            
            {showAllTags && (
              <>
                {/* タグ検索フィルタ */}
                <input
                  type="text"
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  placeholder="タグを検索..."
                  className="w-full px-3 py-2 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary"
                />
                
                <div className="max-h-64 overflow-y-auto border border-border rounded-lg bg-bg-tertiary">
                  <div className="p-4">
                    {filteredAllTags.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {filteredAllTags.map((tag) => (
                          <button
                            key={tag.name}
                            onClick={() => addTag(tag.name)}
                            className="text-left px-3 py-2 rounded-lg hover:bg-bg-secondary transition-colors border border-border bg-bg-primary hover:border-accent-primary/50 group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-text-primary text-sm font-medium truncate mr-2">
                                {tag.name}
                              </span>
                              <span className="text-xs text-text-muted group-hover:text-accent-primary bg-bg-tertiary px-2 py-0.5 rounded-full flex-shrink-0">
                                {tag.count}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        {tagFilter ? (
                          <p className="text-text-muted text-sm">
                            「{tagFilter}」に一致するタグがありません
                          </p>
                        ) : (
                          <p className="text-text-muted text-sm">
                            選択可能なタグがありません
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center py-2">
          <span className="text-sm text-text-muted">タグを読み込み中...</span>
        </div>
      )}
    </div>
  )
}
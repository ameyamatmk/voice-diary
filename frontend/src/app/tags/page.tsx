'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Tag, Hash, Calendar, TrendingUp } from 'lucide-react'
import { api } from '@/lib/api'

interface TagData {
  name: string
  count: number
}

export default function TagsPage() {
  const [tags, setTags] = useState<TagData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    loadTags()
  }, [])

  const loadTags = async () => {
    try {
      setLoading(true)
      const data = await api.getTags()
      setTags(data.tags)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'タグの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleTagClick = useCallback((tagName: string) => {
    router.push(`/tags/${encodeURIComponent(tagName)}`)
  }, [router])

  const getTagSizeClass = (count: number, maxCount: number) => {
    const ratio = count / maxCount
    if (ratio >= 0.8) return 'text-2xl'
    if (ratio >= 0.6) return 'text-xl'
    if (ratio >= 0.4) return 'text-lg'
    if (ratio >= 0.2) return 'text-base'
    return 'text-sm'
  }

  const getTagColorClass = (count: number, maxCount: number) => {
    const ratio = count / maxCount
    if (ratio >= 0.8) return 'bg-accent-primary text-white'
    if (ratio >= 0.6) return 'bg-accent-primary/80 text-white'
    if (ratio >= 0.4) return 'bg-accent-primary/60 text-white'
    if (ratio >= 0.2) return 'bg-accent-primary/40 text-accent-primary'
    return 'bg-accent-primary/20 text-accent-primary'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-4 border-2 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-text-muted">タグを読み込み中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-error/10 border border-error/20 rounded-xl p-6 max-w-md mx-auto">
          <p className="text-error mb-4">{error}</p>
          <button
            onClick={loadTags}
            className="px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-secondary transition-colors"
          >
            再試行
          </button>
        </div>
      </div>
    )
  }

  if (tags.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-bg-tertiary rounded-full flex items-center justify-center">
          <Tag className="w-8 h-8 text-text-muted" />
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          まだタグがありません
        </h3>
        <p className="text-text-muted mb-4">
          日記にタグを追加すると、ここに表示されます
        </p>
        <button
          onClick={() => router.push('/diary')}
          className="px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-secondary transition-colors"
        >
          日記一覧へ
        </button>
      </div>
    )
  }

  const maxCount = Math.max(...tags.map(tag => tag.count))

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-text-primary flex items-center gap-2">
            <Hash className="w-6 h-6" />
            タグ一覧
          </h2>
          <p className="text-text-muted mt-1">
            {tags.length}個のタグが登録されています
          </p>
        </div>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-bg-secondary rounded-xl p-4 border border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent-primary/10 rounded-lg flex items-center justify-center">
              <Tag className="w-5 h-5 text-accent-primary" />
            </div>
            <div>
              <p className="text-text-muted text-sm">総タグ数</p>
              <p className="text-xl font-semibold text-text-primary">{tags.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-bg-secondary rounded-xl p-4 border border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-text-muted text-sm">最も使用されたタグ</p>
              <p className="text-xl font-semibold text-text-primary">{tags[0]?.name || '-'}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-bg-secondary rounded-xl p-4 border border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-text-muted text-sm">最大使用回数</p>
              <p className="text-xl font-semibold text-text-primary">{maxCount}回</p>
            </div>
          </div>
        </div>
      </div>

      {/* タグクラウド */}
      <div className="bg-bg-secondary rounded-xl p-6 border border-border">
        <h3 className="text-lg font-semibold text-text-primary mb-4">タグクラウド</h3>
        <div className="flex flex-wrap gap-3 items-center justify-center min-h-[200px]">
          {tags.map((tag) => (
            <button
              key={tag.name}
              onClick={() => handleTagClick(tag.name)}
              className={`px-4 py-2 rounded-full transition-all hover:scale-105 hover:shadow-md ${getTagSizeClass(tag.count, maxCount)} ${getTagColorClass(tag.count, maxCount)}`}
            >
              {tag.name}
              <span className="ml-1 text-xs opacity-75">({tag.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* タグリスト */}
      <div className="bg-bg-secondary rounded-xl p-6 border border-border">
        <h3 className="text-lg font-semibold text-text-primary mb-4">使用回数順</h3>
        <div className="space-y-3">
          {tags.map((tag, index) => (
            <div
              key={tag.name}
              className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg hover:bg-bg-primary transition-colors cursor-pointer"
              onClick={() => handleTagClick(tag.name)}
            >
              <div className="flex items-center gap-3">
                <span className="text-text-muted text-sm w-6 text-right">
                  #{index + 1}
                </span>
                <span className="text-text-primary font-medium">{tag.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-text-secondary text-sm">{tag.count}回使用</span>
                <div className="w-2 h-2 bg-accent-primary rounded-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
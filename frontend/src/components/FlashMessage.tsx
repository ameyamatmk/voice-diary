'use client'

import React, { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react'

export type FlashMessageType = 'success' | 'error' | 'warning' | 'info'

interface FlashMessage {
  id: string
  type: FlashMessageType
  title?: string
  message: string
  duration?: number
}

interface FlashMessageProps {
  message: FlashMessage
  onClose: (id: string) => void
}

interface FlashMessageContainerProps {
  messages: FlashMessage[]
  onClose: (id: string) => void
}

// 個別フラッシュメッセージコンポーネント
const FlashMessageItem: React.FC<FlashMessageProps> = ({ message, onClose }) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    // 表示アニメーション
    const showTimeout = setTimeout(() => setIsVisible(true), 10)
    
    // 自動削除
    const hideTimeout = setTimeout(() => {
      setIsExiting(true)
      setTimeout(() => onClose(message.id), 300)
    }, message.duration || 5000)

    return () => {
      clearTimeout(showTimeout)
      clearTimeout(hideTimeout)
    }
  }, [message.id, message.duration, onClose])

  const getIcon = () => {
    switch (message.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-success" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-error" />
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-warning" />
      case 'info':
      default:
        return <Info className="w-5 h-5 text-accent-primary" />
    }
  }

  const getBackgroundClass = () => {
    switch (message.type) {
      case 'success':
        return 'bg-success/10 border-success/20'
      case 'error':
        return 'bg-error/10 border-error/20'
      case 'warning':
        return 'bg-warning/10 border-warning/20'
      case 'info':
      default:
        return 'bg-accent-primary/10 border-accent-primary/20'
    }
  }

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => onClose(message.id), 300)
  }

  return (
    <div
      className={`
        ${getBackgroundClass()}
        rounded-lg p-4 shadow-lg border backdrop-blur-sm
        transform transition-all duration-300 ease-in-out
        ${isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${isExiting ? 'scale-95' : 'scale-100'}
      `}
    >
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1 min-w-0">
          {message.title && (
            <h4 className="text-sm font-semibold text-text-primary mb-1">
              {message.title}
            </h4>
          )}
          <p className="text-sm text-text-secondary leading-relaxed">
            {message.message}
          </p>
        </div>
        <button
          onClick={handleClose}
          className="flex-shrink-0 p-1 rounded-md hover:bg-bg-tertiary transition-colors"
          aria-label="閉じる"
        >
          <X className="w-4 h-4 text-text-muted" />
        </button>
      </div>
    </div>
  )
}

// フラッシュメッセージコンテナ
export const FlashMessageContainer: React.FC<FlashMessageContainerProps> = ({ 
  messages, 
  onClose 
}) => {
  if (messages.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md w-full">
      {messages.map((message) => (
        <FlashMessageItem
          key={message.id}
          message={message}
          onClose={onClose}
        />
      ))}
    </div>
  )
}

// フラッシュメッセージフック
export const useFlashMessage = () => {
  const [messages, setMessages] = useState<FlashMessage[]>([])

  const addMessage = (
    type: FlashMessageType,
    message: string,
    title?: string,
    duration?: number
  ) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newMessage: FlashMessage = {
      id,
      type,
      title,
      message,
      duration
    }
    
    setMessages(prev => [...prev, newMessage])
  }

  const removeMessage = (id: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== id))
  }

  const showSuccess = (message: string, title?: string, duration?: number) => {
    addMessage('success', message, title, duration)
  }

  const showError = (message: string, title?: string, duration?: number) => {
    addMessage('error', message, title, duration || 7000) // エラーは長めに表示
  }

  const showWarning = (message: string, title?: string, duration?: number) => {
    addMessage('warning', message, title, duration)
  }

  const showInfo = (message: string, title?: string, duration?: number) => {
    addMessage('info', message, title, duration)
  }

  const clearAll = () => {
    setMessages([])
  }

  return {
    messages,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    removeMessage,
    clearAll,
    FlashMessageContainer: () => (
      <FlashMessageContainer messages={messages} onClose={removeMessage} />
    )
  }
}

export default FlashMessageItem
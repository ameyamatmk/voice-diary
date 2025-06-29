'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, Gauge } from 'lucide-react'
import '../styles/audio-player.css'

interface AudioPlayerProps {
  audioUrl: string
  title?: string
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUrl, title }) => {
  const audioRef = useRef<HTMLAudioElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)
  const [dataArray, setDataArray] = useState<Uint8Array | null>(null)
  const [waveformData, setWaveformData] = useState<number[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 音声の初期化とWeb Audio APIセットアップ
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
      setIsLoading(false)
      setupAudioContext()
      generateWaveform()
    }

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const handleEnded = () => {
      setIsPlaying(false)
    }

    const handleError = () => {
      setError('音声ファイルの読み込みに失敗しました')
      setIsLoading(false)
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
    }
  }, [audioUrl])

  // Web Audio APIセットアップ
  const setupAudioContext = () => {
    try {
      const audio = audioRef.current
      if (!audio) return

      // 既存のAudioContextがある場合はクリーンアップ
      if (audioContext) {
        audioContext.close()
      }

      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const analyserNode = ctx.createAnalyser()
      
      // 時間領域の音声データ（波形）を取得するための設定
      analyserNode.fftSize = 512
      analyserNode.smoothingTimeConstant = 0.3
      
      // 時間領域データ用のバッファ（実際の音声波形データ）
      const bufferLength = analyserNode.fftSize
      const dataArr = new Uint8Array(bufferLength)

      let source: MediaElementAudioSourceNode
      try {
        source = ctx.createMediaElementSource(audio)
      } catch (err) {
        // 既にsourceが作成されている場合のエラーをキャッチ
        console.warn('MediaElementSource already exists:', err)
        return
      }

      source.connect(analyserNode)
      analyserNode.connect(ctx.destination)

      setAudioContext(ctx)
      setAnalyser(analyserNode)
      setDataArray(dataArr)
      
      console.log('Web Audio API setup completed successfully')
    } catch (err) {
      console.error('Web Audio API setup failed:', err)
    }
  }

  // 音声ファイル全体の波形データを生成
  const generateWaveform = async () => {
    try {
      // 音声ファイルをArrayBufferとして取得
      const response = await fetch(audioUrl)
      const arrayBuffer = await response.arrayBuffer()
      
      // Web Audio APIで音声データをデコード
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      
      // チャンネルデータを取得（モノラルまたはステレオの最初のチャンネル）
      const channelData = audioBuffer.getChannelData(0)
      
      // 波形データをダウンサンプリング（表示用に300-500ポイントに圧縮）
      const samples = 400
      const blockSize = Math.floor(channelData.length / samples)
      const waveform: number[] = []
      
      for (let i = 0; i < samples; i++) {
        const start = i * blockSize
        const end = start + blockSize
        let sum = 0
        
        // ブロック内のRMS（Root Mean Square）を計算
        for (let j = start; j < end && j < channelData.length; j++) {
          sum += channelData[j] * channelData[j]
        }
        
        const rms = Math.sqrt(sum / blockSize)
        waveform.push(rms)
      }
      
      setWaveformData(waveform)
      await audioContext.close()
      
    } catch (error) {
      console.error('Failed to generate waveform:', error)
    }
  }

  // 静的波形描画
  const drawStaticWaveform = () => {
    if (!canvasRef.current || !waveformData) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 高DPI対応のためcanvasサイズを調整
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    
    ctx.scale(dpr, dpr)
    
    // 背景をクリア
    ctx.clearRect(0, 0, rect.width, rect.height)

    // 中央線を描画
    const centerY = rect.height / 2
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, centerY)
    ctx.lineTo(rect.width, centerY)
    ctx.stroke()

    // 波形のバーを描画
    const barWidth = Math.max(1, rect.width / waveformData.length - 1)
    const maxAmplitude = Math.max(...waveformData)
    
    for (let i = 0; i < waveformData.length; i++) {
      const amplitude = waveformData[i]
      const normalizedHeight = (amplitude / maxAmplitude) * (rect.height * 0.8)
      const barHeight = Math.max(2, normalizedHeight)
      
      const x = (i / waveformData.length) * rect.width
      const y = centerY - barHeight / 2

      // グラデーション
      const gradient = ctx.createLinearGradient(0, centerY + barHeight / 2, 0, centerY - barHeight / 2)
      gradient.addColorStop(0, '#3b82f6')
      gradient.addColorStop(0.5, '#60a5fa')
      gradient.addColorStop(1, '#93c5fd')

      ctx.fillStyle = gradient
      ctx.fillRect(x, y, barWidth, barHeight)
    }
  }

  // 波形描画の更新
  const drawWaveform = () => {
    drawStaticWaveform()
    
    if (isPlaying && analyser && dataArray) {
      // リアルタイム音量レベル表示（オプション）
      analyser.getByteTimeDomainData(dataArray)
      
      let sum = 0
      for (let i = 0; i < dataArray.length; i++) {
        const value = dataArray[i] - 128
        sum += value * value
      }
      const rms = Math.sqrt(sum / dataArray.length)
      const volumeLevel = rms / 128

      // 音量インジケーター（右上に小さく表示）
      if (volumeLevel > 0.01 && canvasRef.current) {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        const rect = canvas.getBoundingClientRect()
        
        if (ctx) {
          const indicatorSize = 8
          const x = rect.width - indicatorSize - 4
          const y = 4
          
          ctx.fillStyle = `rgba(16, 185, 129, ${volumeLevel})`
          ctx.fillRect(x, y, indicatorSize, indicatorSize)
        }
      }
      
      animationFrameRef.current = requestAnimationFrame(drawWaveform)
    }
  }

  // 再生/一時停止
  const togglePlayPause = async () => {
    const audio = audioRef.current
    if (!audio) return

    try {
      if (isPlaying) {
        audio.pause()
        setIsPlaying(false)
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }
      } else {
        // AudioContextを再開（ブラウザのAutoplay Policy対応）
        if (audioContext && audioContext.state === 'suspended') {
          await audioContext.resume()
        }
        
        await audio.play()
        setIsPlaying(true)
        drawWaveform()
      }
    } catch (err) {
      console.error('Playback error:', err)
      setError('音声の再生に失敗しました')
    }
  }

  // シークバー操作
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio || !duration) return

    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const newTime = (clickX / rect.width) * duration
    
    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  // 音量調整
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    
    const audio = audioRef.current
    if (audio) {
      audio.volume = newVolume
    }
  }

  // 再生速度調整
  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate)
    
    const audio = audioRef.current
    if (audio) {
      audio.playbackRate = rate
    }
  }

  // ミュート切り替え
  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return

    const newMuted = !isMuted
    setIsMuted(newMuted)
    audio.muted = newMuted
  }

  // 時間フォーマット
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // 波形データが読み込まれたら描画
  useEffect(() => {
    if (waveformData) {
      drawStaticWaveform()
    }
  }, [waveformData])

  // Canvas リサイズ対応
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        if (waveformData) {
          drawStaticWaveform()
        } else if (isPlaying) {
          drawWaveform()
        }
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isPlaying, waveformData])

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (audioContext) {
        audioContext.close()
      }
    }
  }, [audioContext])

  if (error) {
    return (
      <div className="bg-error/10 border border-error/20 rounded-lg p-4">
        <p className="text-error text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="bg-bg-secondary rounded-lg p-4 border border-border space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-text-primary">音声再生</h3>
        {title && (
          <span className="text-sm text-text-muted">{title}</span>
        )}
      </div>

      {/* 隠しオーディオ要素 */}
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-8 audio-loading">
          <div className="w-6 h-6 border-2 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-2 text-text-muted">音声を読み込み中...</span>
        </div>
      ) : (
        <>
          {/* 波形表示 */}
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="w-full h-16 bg-bg-tertiary rounded border border-border waveform-canvas"
              style={{ width: '100%', height: '64px' }}
            />
            
            {/* 進捗オーバーレイ */}
            <div 
              className="absolute top-0 left-0 h-full bg-accent-primary/20 rounded pointer-events-none"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
            
            {/* デバッグ情報（開発時のみ） */}
            {process.env.NODE_ENV === 'development' && (
              <div className="absolute top-1 right-1 text-xs text-text-muted bg-bg-primary/80 px-2 py-1 rounded">
                {waveformData ? `Waveform: ${waveformData.length} points` : 'Loading waveform...'} | {isPlaying ? 'Playing' : 'Paused'}
              </div>
            )}
          </div>

          {/* シークバー */}
          <div className="space-y-2">
            <div 
              className="relative h-2 bg-bg-tertiary rounded-full cursor-pointer seek-bar"
              onClick={handleSeek}
            >
              <div 
                className="absolute top-0 left-0 h-full bg-accent-primary rounded-full"
                style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              />
              <div 
                className="absolute top-1/2 w-4 h-4 bg-accent-primary rounded-full transform -translate-y-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing seek-thumb"
                style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>
            
            <div className="flex justify-between text-xs text-text-muted">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* コントロール */}
          <div className="flex items-center justify-between audio-controls flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={togglePlayPause}
                className="flex items-center justify-center w-12 h-12 bg-accent-primary text-white rounded-full hover:bg-accent-secondary transition-colors play-button"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 ml-1" />
                )}
              </button>
            </div>

            <div className="flex items-center gap-6">
              {/* 再生速度コントロール */}
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-text-muted" />
                <div className="flex bg-bg-tertiary rounded-lg p-1">
                  <button
                    onClick={() => handlePlaybackRateChange(1)}
                    className={`px-3 py-1 text-sm rounded transition-colors ${
                      playbackRate === 1 
                        ? 'bg-accent-primary text-white' 
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    1x
                  </button>
                  <button
                    onClick={() => handlePlaybackRateChange(1.5)}
                    className={`px-3 py-1 text-sm rounded transition-colors ${
                      playbackRate === 1.5 
                        ? 'bg-accent-primary text-white' 
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    1.5x
                  </button>
                  <button
                    onClick={() => handlePlaybackRateChange(2)}
                    className={`px-3 py-1 text-sm rounded transition-colors ${
                      playbackRate === 2 
                        ? 'bg-accent-primary text-white' 
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    2x
                  </button>
                </div>
              </div>

              {/* 音量コントロール */}
              <div className="flex items-center gap-2 volume-controls">
                <button
                  onClick={toggleMute}
                  className="text-text-muted hover:text-text-primary transition-colors"
                >
                  {isMuted ? (
                    <VolumeX className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1 bg-bg-tertiary rounded-full outline-none slider volume-bar"
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
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

      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const analyserNode = ctx.createAnalyser()
      const source = ctx.createMediaElementSource(audio)
      
      analyserNode.fftSize = 256
      const bufferLength = analyserNode.frequencyBinCount
      const dataArr = new Uint8Array(bufferLength)

      source.connect(analyserNode)
      analyserNode.connect(ctx.destination)

      setAudioContext(ctx)
      setAnalyser(analyserNode)
      setDataArray(dataArr)
    } catch (err) {
      console.error('Web Audio API setup failed:', err)
    }
  }

  // 音声波形描画
  const drawWaveform = () => {
    if (!canvasRef.current || !analyser || !dataArray) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    analyser.getByteFrequencyData(dataArray)

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const barWidth = (canvas.width / dataArray.length) * 2.5
    let barHeight
    let x = 0

    for (let i = 0; i < dataArray.length; i++) {
      barHeight = (dataArray[i] / 255) * canvas.height * 0.8

      // グラデーション
      const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight)
      gradient.addColorStop(0, '#3b82f6')
      gradient.addColorStop(0.5, '#60a5fa')
      gradient.addColorStop(1, '#93c5fd')

      ctx.fillStyle = gradient
      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight)

      x += barWidth + 1
    }

    if (isPlaying) {
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
              width={400}
              height={60}
              className="w-full h-15 bg-bg-tertiary rounded border border-border waveform-canvas"
            />
            
            {/* 進捗オーバーレイ */}
            <div 
              className="absolute top-0 left-0 h-full bg-accent-primary/20 rounded pointer-events-none"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
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
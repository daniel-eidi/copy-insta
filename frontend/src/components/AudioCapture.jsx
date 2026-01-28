import React, { useState, useRef, useEffect } from 'react'
import { Mic, Square, Radio, AlertCircle, Monitor } from 'lucide-react'

function AudioCapture({ onAudioCaptured }) {
  const [isCapturing, setIsCapturing] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState(null)
  const [audioLevel, setAudioLevel] = useState(0)

  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const analyserRef = useRef(null)
  const animationRef = useRef(null)

  useEffect(() => {
    return () => {
      stopCapture()
      if (timerRef.current) clearInterval(timerRef.current)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [])

  const startCapture = async () => {
    setError(null)
    chunksRef.current = []

    try {
      // Request tab audio capture
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true, // Required, but we'll ignore it
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        preferCurrentTab: false,
        selfBrowserSurface: 'exclude',
        systemAudio: 'include',
      })

      // Check if audio track exists
      const audioTracks = stream.getAudioTracks()
      if (audioTracks.length === 0) {
        stream.getTracks().forEach(track => track.stop())
        setError('Nenhum áudio detectado. Certifique-se de marcar "Compartilhar áudio da aba" ao selecionar.')
        return
      }

      streamRef.current = stream

      // Create audio-only stream for recording
      const audioStream = new MediaStream(audioTracks)

      // Setup audio analyzer for visual feedback
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(audioStream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      // Start visualizing audio level
      const updateLevel = () => {
        if (!analyserRef.current) return
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
        analyserRef.current.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length
        setAudioLevel(average / 255)
        animationRef.current = requestAnimationFrame(updateLevel)
      }
      updateLevel()

      // Setup MediaRecorder
      const mediaRecorder = new MediaRecorder(audioStream, {
        mimeType: 'audio/webm;codecs=opus',
      })

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
        onAudioCaptured(audioBlob, duration)
      }

      // Handle stream ending (user stops sharing)
      stream.getVideoTracks()[0].onended = () => {
        stopCapture()
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(1000) // Collect data every second

      setIsCapturing(true)
      setDuration(0)

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1)
      }, 1000)

    } catch (err) {
      console.error('Capture error:', err)
      if (err.name === 'NotAllowedError') {
        setError('Permissão negada. Por favor, permita o compartilhamento de tela.')
      } else {
        setError(`Erro ao iniciar captura: ${err.message}`)
      }
    }
  }

  const stopCapture = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    setIsCapturing(false)
    setAudioLevel(0)
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-gray-800">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-red-500/20 rounded-lg">
          <Monitor className="w-5 h-5 text-red-500" />
        </div>
        <div>
          <h2 className="font-semibold">Capturar Audio do Navegador</h2>
          <p className="text-sm text-gray-400">Grave o audio de outra aba (Instagram, YouTube, etc)</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {!isCapturing ? (
        <div className="space-y-4">
          <div className="bg-[#252525] rounded-xl p-4 text-sm text-gray-400">
            <p className="font-medium text-white mb-2">Como usar:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Abra o Instagram/video em outra aba</li>
              <li>Clique em "Iniciar Captura" abaixo</li>
              <li>Selecione a aba com o video</li>
              <li><span className="text-yellow-400 font-medium">Marque "Compartilhar audio da aba"</span></li>
              <li>Toque o video na outra aba</li>
              <li>Quando terminar, clique em "Parar"</li>
            </ol>
          </div>

          <button
            onClick={startCapture}
            className="w-full py-4 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-3"
          >
            <Radio className="w-5 h-5" />
            Iniciar Captura de Audio
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Recording indicator */}
          <div className="flex items-center justify-center gap-4 py-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-400 font-medium">GRAVANDO</span>
            </div>
            <span className="text-2xl font-mono">{formatTime(duration)}</span>
          </div>

          {/* Audio level indicator */}
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-100"
              style={{ width: `${Math.min(audioLevel * 100 * 2, 100)}%` }}
            />
          </div>
          <p className="text-center text-sm text-gray-500">
            {audioLevel > 0.05 ? 'Audio detectado' : 'Aguardando audio...'}
          </p>

          {/* Stop button */}
          <button
            onClick={stopCapture}
            className="w-full py-4 bg-gray-700 hover:bg-gray-600 rounded-xl font-semibold transition-colors flex items-center justify-center gap-3"
          >
            <Square className="w-5 h-5" />
            Parar e Processar
          </button>
        </div>
      )}
    </div>
  )
}

export default AudioCapture

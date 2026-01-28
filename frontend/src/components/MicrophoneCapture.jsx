import React, { useState, useRef, useEffect } from 'react'
import { Mic, Square, Loader2, Volume2 } from 'lucide-react'

function MicrophoneCapture({ onAudioCaptured }) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPreparing, setIsPreparing] = useState(false)
  const [duration, setDuration] = useState(0)
  const [audioLevel, setAudioLevel] = useState(0)
  const [error, setError] = useState(null)

  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const streamRef = useRef(null)
  const timerRef = useRef(null)
  const analyserRef = useRef(null)
  const animationRef = useRef(null)

  useEffect(() => {
    return () => {
      stopRecording()
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  const updateAudioLevel = () => {
    if (analyserRef.current) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
      analyserRef.current.getByteFrequencyData(dataArray)
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
      setAudioLevel(average / 255)
    }
    if (isRecording) {
      animationRef.current = requestAnimationFrame(updateAudioLevel)
    }
  }

  const startRecording = async () => {
    setError(null)
    setIsPreparing(true)
    audioChunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })

      streamRef.current = stream

      // Setup audio analyser for visual feedback
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      // Determine supported mime type
      let mimeType = 'audio/webm;codecs=opus'
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm'
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4'
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = ''
          }
        }
      }

      const options = mimeType ? { mimeType } : {}
      const mediaRecorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mimeType || 'audio/webm'
        })
        onAudioCaptured(audioBlob, duration)
      }

      mediaRecorder.start(1000)
      setIsRecording(true)
      setIsPreparing(false)
      setDuration(0)

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1)
      }, 1000)

      // Start audio level monitoring
      updateAudioLevel()

    } catch (err) {
      console.error('Error accessing microphone:', err)
      setIsPreparing(false)

      if (err.name === 'NotAllowedError') {
        setError('Permissao negada. Por favor, permita o acesso ao microfone.')
      } else if (err.name === 'NotFoundError') {
        setError('Nenhum microfone encontrado.')
      } else {
        setError('Erro ao acessar o microfone: ' + err.message)
      }
    }
  }

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    setIsRecording(false)
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
        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
          <Mic className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="font-semibold">Gravar pelo Microfone</h2>
          <p className="text-sm text-gray-400">Funciona em todos os dispositivos</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {isRecording && (
        <div className="mb-4 space-y-3">
          {/* Timer */}
          <div className="flex items-center justify-center gap-3">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-2xl font-mono font-bold">{formatTime(duration)}</span>
          </div>

          {/* Audio level indicator */}
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-gray-400" />
            <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-100"
                style={{ width: `${audioLevel * 100}%` }}
              />
            </div>
          </div>

          <p className="text-center text-sm text-gray-400">
            Posicione o microfone proximo ao som
          </p>
        </div>
      )}

      {!isRecording ? (
        <button
          onClick={startRecording}
          disabled={isPreparing}
          className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          {isPreparing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Acessando microfone...
            </>
          ) : (
            <>
              <Mic className="w-5 h-5" />
              Iniciar Gravacao
            </>
          )}
        </button>
      ) : (
        <button
          onClick={stopRecording}
          className="w-full py-4 bg-gradient-to-r from-red-500 to-red-600 rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-3"
        >
          <Square className="w-5 h-5" />
          Parar e Transcrever
        </button>
      )}

      <p className="mt-3 text-xs text-gray-500 text-center">
        Dica: Reproduza o video em outro dispositivo e grave o audio
      </p>
    </div>
  )
}

export default MicrophoneCapture

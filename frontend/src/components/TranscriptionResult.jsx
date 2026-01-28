import React, { useState } from 'react'
import { ArrowLeft, Copy, Check, Download, FileText, Film, Languages, Loader2 } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || ''

const SPEAKER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3',
  '#DDA0DD', '#F7DC6F', '#87CEEB', '#FFA07A',
]

function TranscriptionResult({ transcription, speakers, jobId, onBack, onVideoGenerated }) {
  const [copied, setCopied] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generatingType, setGeneratingType] = useState(null)

  const getFullText = () => {
    return transcription.words.map(w => w.word).join(' ')
  }

  const getTextWithTimestamps = () => {
    let result = ''
    let currentSpeaker = null

    transcription.words.forEach((word, idx) => {
      if (word.speaker_id !== currentSpeaker) {
        currentSpeaker = word.speaker_id
        const speakerName = speakers.find(s => s.speaker_id === word.speaker_id)?.name || `Falante ${word.speaker_id + 1}`
        result += `\n\n[${speakerName}] `
      }
      result += word.word + ' '
    })

    return result.trim()
  }

  const getSRTFormat = () => {
    let srt = ''
    let counter = 1

    const segments = []
    let currentSegment = []

    transcription.words.forEach((word) => {
      currentSegment.push(word)
      if (currentSegment.length >= 10 || word.word.endsWith('.') || word.word.endsWith('?') || word.word.endsWith('!')) {
        segments.push([...currentSegment])
        currentSegment = []
      }
    })
    if (currentSegment.length > 0) {
      segments.push(currentSegment)
    }

    segments.forEach((segment) => {
      const start = formatSRTTime(segment[0].start)
      const end = formatSRTTime(segment[segment.length - 1].end)
      const text = segment.map(w => w.word).join(' ')

      srt += `${counter}\n`
      srt += `${start} --> ${end}\n`
      srt += `${text}\n\n`
      counter++
    })

    return srt
  }

  const formatSRTTime = (seconds) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 1000)
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(getFullText())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadTxt = () => {
    const blob = new Blob([getTextWithTimestamps()], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'transcription.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDownloadSRT = () => {
    const blob = new Blob([getSRTFormat()], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'subtitles.srt'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleGenerateVideo = async (translate = false) => {
    setGenerating(true)
    setGeneratingType(translate ? 'translated' : 'original')

    try {
      const params = new URLSearchParams({
        job_id: jobId,
        translate: translate.toString(),
        target_language: 'Portuguese'
      })

      const response = await fetch(`${API_BASE}/api/generate-audio-video?${params}`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Video generation failed')
      }

      // Notify parent to start polling for video
      if (onVideoGenerated) {
        onVideoGenerated()
      }
    } catch (err) {
      console.error('Error generating video:', err)
      alert('Erro ao gerar video: ' + err.message)
      setGenerating(false)
      setGeneratingType(null)
    }
  }

  const getSpeakerColor = (speakerId) => {
    const speaker = speakers.find(s => s.speaker_id === speakerId)
    return speaker?.color || SPEAKER_COLORS[speakerId % SPEAKER_COLORS.length]
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar
        </button>
        <div className="text-right">
          <p className="text-sm text-gray-400">
            {transcription.words.length} palavras detectadas
          </p>
          <p className="text-sm text-gray-400">
            Duracao: {transcription.duration.toFixed(1)}s
          </p>
        </div>
      </div>

      {/* Success banner */}
      <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4 flex items-center gap-3">
        <FileText className="w-6 h-6 text-green-400" />
        <div>
          <p className="font-medium text-green-400">Transcricao Concluida!</p>
          <p className="text-sm text-gray-400">Audio transcrito com sucesso</p>
        </div>
      </div>

      {/* Transcription display */}
      <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Transcricao</h2>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-400" />
                Copiado!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copiar texto
              </>
            )}
          </button>
        </div>

        <div className="bg-black rounded-xl p-6 max-h-96 overflow-y-auto">
          <p className="leading-relaxed text-lg">
            {transcription.words.map((word, idx) => (
              <span
                key={idx}
                style={{ color: getSpeakerColor(word.speaker_id || 0) }}
              >
                {word.word}{' '}
              </span>
            ))}
          </p>
        </div>
      </div>

      {/* Speaker legend */}
      {speakers.length > 1 && (
        <div className="bg-[#1a1a1a] rounded-2xl p-4 border border-gray-800">
          <p className="text-sm text-gray-400 mb-3">Falantes detectados:</p>
          <div className="flex flex-wrap gap-3">
            {speakers.map((speaker) => (
              <div
                key={speaker.speaker_id}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#252525] rounded-lg"
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: speaker.color }}
                />
                <span className="text-sm">
                  {speaker.name || `Falante ${speaker.speaker_id + 1}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Video Generation Buttons */}
      <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-gray-800">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Film className="w-5 h-5 text-purple-500" />
          Gerar Video Karaoke
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => handleGenerateVideo(false)}
            disabled={generating}
            className="py-4 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {generating && generatingType === 'original' ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Film className="w-5 h-5" />
                Video Original
              </>
            )}
          </button>

          <button
            onClick={() => handleGenerateVideo(true)}
            disabled={generating}
            className="py-4 bg-gradient-to-r from-pink-500 to-red-500 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {generating && generatingType === 'translated' ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Traduzindo e gerando...
              </>
            ) : (
              <>
                <Languages className="w-5 h-5" />
                Video Traduzido (PT)
              </>
            )}
          </button>
        </div>

        <p className="text-sm text-gray-500 mt-3 text-center">
          Fundo preto com letras brancas sincronizadas com o audio
        </p>
      </div>

      {/* Export buttons */}
      <div className="flex gap-4">
        <button
          onClick={handleDownloadTxt}
          className="flex-1 py-3 bg-[#252525] hover:bg-[#303030] rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Download className="w-5 h-5" />
          Baixar TXT
        </button>
        <button
          onClick={handleDownloadSRT}
          className="flex-1 py-3 bg-[#252525] hover:bg-[#303030] rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Download className="w-5 h-5" />
          Baixar SRT
        </button>
      </div>

      {/* New transcription button */}
      <button
        onClick={onBack}
        className="w-full py-4 bg-[#252525] hover:bg-[#303030] rounded-xl font-semibold transition-colors"
      >
        Nova Transcricao
      </button>
    </div>
  )
}

export default TranscriptionResult

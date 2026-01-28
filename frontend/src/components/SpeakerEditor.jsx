import React, { useState } from 'react'
import { Palette, Play, ArrowLeft, Sparkles } from 'lucide-react'

const AVAILABLE_COLORS = [
  '#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3',
  '#DDA0DD', '#F7DC6F', '#87CEEB', '#FFA07A',
  '#98D8C8', '#F06292', '#AED581', '#FFB74D',
]

function SpeakerEditor({ transcription, speakers, onGenerate, onBack }) {
  const [speakerConfigs, setSpeakerConfigs] = useState(
    speakers.map((s) => ({ ...s, name: `Falante ${s.speaker_id + 1}` }))
  )
  const [backgroundColor, setBackgroundColor] = useState('#000000')
  const [highlightColor, setHighlightColor] = useState('#FFFFFF')
  const [showColorPicker, setShowColorPicker] = useState(null)

  const handleColorChange = (speakerId, color) => {
    setSpeakerConfigs(
      speakerConfigs.map((s) =>
        s.speaker_id === speakerId ? { ...s, color } : s
      )
    )
  }

  const handleNameChange = (speakerId, name) => {
    setSpeakerConfigs(
      speakerConfigs.map((s) =>
        s.speaker_id === speakerId ? { ...s, name } : s
      )
    )
  }

  const handleGenerate = () => {
    onGenerate(speakerConfigs, backgroundColor, highlightColor)
  }

  // Group words by speaker for preview
  const wordsBySpeaker = {}
  transcription.words.forEach((word) => {
    const id = word.speaker_id || 0
    if (!wordsBySpeaker[id]) wordsBySpeaker[id] = []
    wordsBySpeaker[id].push(word.word)
  })

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

      {/* Transcription Preview */}
      <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-gray-800">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-5 h-5 text-pink-500" />
          <h2 className="font-semibold">Preview da Transcricao</h2>
        </div>

        <div className="bg-black rounded-xl p-6 max-h-48 overflow-y-auto">
          <p className="leading-relaxed">
            {transcription.words.map((word, idx) => {
              const config = speakerConfigs.find(
                (s) => s.speaker_id === (word.speaker_id || 0)
              )
              return (
                <span
                  key={idx}
                  style={{ color: config?.color || '#ffffff' }}
                  className="transition-colors"
                >
                  {word.word}{' '}
                </span>
              )
            })}
          </p>
        </div>
      </div>

      {/* Speaker Configuration */}
      <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-gray-800">
        <div className="flex items-center gap-3 mb-4">
          <Palette className="w-5 h-5 text-purple-500" />
          <h2 className="font-semibold">Configurar Falantes</h2>
        </div>

        <div className="space-y-4">
          {speakerConfigs.map((speaker) => (
            <div
              key={speaker.speaker_id}
              className="flex items-center gap-4 p-4 bg-[#252525] rounded-xl"
            >
              {/* Color Picker */}
              <div className="relative">
                <button
                  onClick={() =>
                    setShowColorPicker(
                      showColorPicker === speaker.speaker_id
                        ? null
                        : speaker.speaker_id
                    )
                  }
                  className="w-10 h-10 rounded-lg border-2 border-gray-600 transition-transform hover:scale-110"
                  style={{ backgroundColor: speaker.color }}
                />
                {showColorPicker === speaker.speaker_id && (
                  <div className="absolute top-full left-0 mt-2 p-2 bg-[#1a1a1a] rounded-xl border border-gray-700 grid grid-cols-4 gap-2 z-10">
                    {AVAILABLE_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => {
                          handleColorChange(speaker.speaker_id, color)
                          setShowColorPicker(null)
                        }}
                        className="w-8 h-8 rounded-lg border border-gray-600 hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Name Input */}
              <input
                type="text"
                value={speaker.name || ''}
                onChange={(e) =>
                  handleNameChange(speaker.speaker_id, e.target.value)
                }
                className="flex-1 px-4 py-2 bg-[#1a1a1a] rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none"
                placeholder="Nome do falante"
              />

              {/* Word Count */}
              <span className="text-sm text-gray-400">
                {wordsBySpeaker[speaker.speaker_id]?.length || 0} palavras
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Video Settings */}
      <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-gray-800">
        <h2 className="font-semibold mb-4">Configuracoes do Video</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400 block mb-2">
              Cor de Fundo
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer"
              />
              <input
                type="text"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="flex-1 px-3 py-2 bg-[#252525] rounded-lg border border-gray-700 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-400 block mb-2">
              Cor de Destaque
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={highlightColor}
                onChange={(e) => setHighlightColor(e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer"
              />
              <input
                type="text"
                value={highlightColor}
                onChange={(e) => setHighlightColor(e.target.value)}
                className="flex-1 px-3 py-2 bg-[#252525] rounded-lg border border-gray-700 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        className="w-full py-4 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-3"
      >
        <Play className="w-6 h-6" />
        Gerar Video Karaoke
      </button>
    </div>
  )
}

export default SpeakerEditor

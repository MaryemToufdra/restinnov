import { useRef, useState } from 'react'
import type { SignalerProblemeInput } from '../api'

interface SignalerProblemeSectionProps {
  missionMenageId: number
  onSignaler: (missionMenageId: number, input: SignalerProblemeInput) => Promise<void>
}

type RecordingState = 'idle' | 'recording' | 'recorded'

export function SignalerProblemeSection({ missionMenageId, onSignaler }: SignalerProblemeSectionProps) {
  const [expanded, setExpanded] = useState(false)
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  // Recording requires MediaRecorder + getUserMedia, which aren't always
  // available (older browsers, non-HTTPS contexts, denied permissions,
  // headless test environments) -- feature-detect and degrade gracefully
  // instead of letting the mic button crash the page.
  const micSupported =
    typeof window !== 'undefined' &&
    typeof window.MediaRecorder !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia

  const resetForm = () => {
    setPhoto(null)
    setPhotoPreviewUrl(null)
    setDescription('')
    setAudioFile(null)
    setAudioPreviewUrl(null)
    setRecordingState('idle')
    setError(null)
  }

  const handlePhotoChange = (file: File | undefined | null) => {
    if (!file) return
    setPhoto(file)
    setPhotoPreviewUrl(URL.createObjectURL(file))
  }

  const startRecording = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const recorder = new MediaRecorder(stream)
      audioChunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        const file = new File([blob], 'signalement-audio.webm', { type: blob.type })
        setAudioFile(file)
        setAudioPreviewUrl(URL.createObjectURL(file))
        streamRef.current?.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }

      mediaRecorderRef.current = recorder
      recorder.start()
      setRecordingState('recording')
    } catch {
      setError("Impossible d'accéder au micro.")
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setRecordingState('recorded')
  }

  const resetAudio = () => {
    setAudioFile(null)
    setAudioPreviewUrl(null)
    setRecordingState('idle')
  }

  const handleSubmit = async () => {
    setError(null)

    if (!photo && !audioFile && !description.trim()) {
      setError('Ajoutez au moins une photo, un audio ou une description.')
      return
    }

    setSubmitting(true)
    try {
      await onSignaler(missionMenageId, {
        photo,
        audio: audioFile,
        description: description.trim() ? description : null,
      })
      resetForm()
      setExpanded(false)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!expanded) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <button
          type="button"
          onClick={() => {
            setExpanded(true)
            setSent(false)
          }}
          className="w-full rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-base font-medium text-amber-800 hover:bg-amber-100"
        >
          🚧 Signaler un problème
        </button>
        {sent && (
          <p className="mt-2 text-sm font-medium text-emerald-700" data-testid="signalement-confirmation">
            ✓ Signalement envoyé au Manager
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h4 className="text-base font-semibold text-gray-900">Signaler un problème</h4>

      <div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          📷 Prendre une photo
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          capture="environment"
          className="hidden"
          aria-label="Photo du problème"
          onChange={(e) => handlePhotoChange(e.target.files?.[0])}
        />
        {photoPreviewUrl && (
          <img src={photoPreviewUrl} alt="Aperçu de la photo" className="mt-2 h-32 w-32 rounded-md object-cover" />
        )}
      </div>

      <div>
        {!micSupported ? (
          <p className="text-sm text-gray-500">Enregistrement audio non disponible sur cet appareil.</p>
        ) : recordingState === 'idle' ? (
          <button
            type="button"
            onClick={startRecording}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            🎤 Enregistrer un message audio
          </button>
        ) : recordingState === 'recording' ? (
          <button
            type="button"
            onClick={stopRecording}
            className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            ⏹ Arrêter l'enregistrement
          </button>
        ) : (
          <div className="space-y-2">
            {audioPreviewUrl && (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <audio controls src={audioPreviewUrl} className="w-full" />
            )}
            <button
              type="button"
              onClick={resetAudio}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              🔄 Recommencer l'enregistrement
            </button>
          </div>
        )}
      </div>

      <div>
        <label
          htmlFor={`signalement_description_${missionMenageId}`}
          className="block text-sm font-medium text-gray-700"
        >
          Description (optionnel)
        </label>
        <textarea
          id={`signalement_description_${missionMenageId}`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            resetForm()
            setExpanded(false)
          }}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
        >
          {submitting ? 'Envoi...' : 'Envoyer'}
        </button>
      </div>
    </div>
  )
}

import React, { useEffect, useRef, useState } from 'react';

interface InputBoxProps {
  onSend: (message: string, inputMode: InputMode) => void;
  isRunning?: boolean;
  onStop?: () => void;
}

type InputMode = 'type' | 'mic';

const INPUT_MODE_STORAGE_KEY = 'akya-input-mode';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructorLike = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructorLike;
    webkitSpeechRecognition?: SpeechRecognitionConstructorLike;
  }
}

const getSpeechRecognitionConstructor = (): SpeechRecognitionConstructorLike | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
};

const getInitialInputMode = (): InputMode => {
  if (typeof window === 'undefined') {
    return 'type';
  }

  const storedMode = window.localStorage.getItem(INPUT_MODE_STORAGE_KEY);
  if (storedMode === 'mic' && getSpeechRecognitionConstructor()) {
    return 'mic';
  }

  return 'type';
};

const getSpeechRecognitionErrorMessage = (error: string) => {
  switch (error) {
    case 'audio-capture':
      return 'No microphone was found. Connect a mic and try again.';
    case 'network':
      return 'Speech recognition needs a network connection in this browser.';
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone access was blocked. Allow permission and try again.';
    case 'no-speech':
      return 'No speech was detected. Try speaking a little closer to the mic.';
    default:
      return 'Speech recognition stopped unexpectedly. Please try again.';
  }
};

const InputBox: React.FC<InputBoxProps> = ({ onSend, isRunning = false, onStop }) => {
  const [input, setInput] = useState('');
  const [inputMode, setInputMode] = useState<InputMode>(getInitialInputMode);
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const listeningBaseTextRef = useRef('');
  const supportsSpeechRecognition = getSpeechRecognitionConstructor() !== null;

  useEffect(() => {
    return () => {
      const recognition = recognitionRef.current;
      if (!recognition) {
        return;
      }

      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.stop();
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(INPUT_MODE_STORAGE_KEY, inputMode);
  }, [inputMode]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = '0px';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 220)}px`;
  }, [input]);

  useEffect(() => {
    if (inputMode === 'type' && isListening) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setIsListening(false);
    }
  }, [inputMode, isListening]);

  const handleSend = () => {
    const trimmedInput = input.trim();
    if (trimmedInput) {
      if (isListening) {
        recognitionRef.current?.stop();
        recognitionRef.current = null;
        setIsListening(false);
      }

      onSend(trimmedInput, inputMode);
      setInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMicToggle = () => {
    setMicError('');

    if (isListening) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setIsListening(false);
      return;
    }

    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) {
      setMicError('Speech recognition is not supported in this browser.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      listeningBaseTextRef.current = input.trim();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

      recognition.onresult = (event) => {
        const finalSegments: string[] = [];
        const interimSegments: string[] = [];

        for (let index = 0; index < event.results.length; index += 1) {
          const result = event.results[index];
          const transcript = result[0]?.transcript?.trim();
          if (!transcript) {
            continue;
          }

          if (result.isFinal) {
            finalSegments.push(transcript);
          } else {
            interimSegments.push(transcript);
          }
        }

        const nextTranscript = [
          listeningBaseTextRef.current,
          finalSegments.join(' '),
          interimSegments.join(' ')
        ]
          .filter(Boolean)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

        setInput(nextTranscript);
      };

      recognition.onerror = (event) => {
        setMicError(getSpeechRecognitionErrorMessage(event.error));
        recognitionRef.current = null;
        setIsListening(false);
      };

      recognition.onend = () => {
        recognitionRef.current = null;
        setIsListening(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
    } catch {
      setMicError('Unable to start speech recognition. Please try again.');
    }
  };

  const handlePrimaryAction = () => {
    if (isRunning) {
      onStop?.();
      return;
    }

    handleSend();
  };

  const handleInputModeChange = (nextMode: InputMode) => {
    if (nextMode === 'mic' && !supportsSpeechRecognition) {
      setMicError('Speech recognition is not supported in this browser.');
      return;
    }

    setMicError('');
    setInputMode(nextMode);
  };

  const helperText = micError
    || (inputMode === 'mic'
      ? (isListening
        ? 'Listening now. You can stop, review the transcript, and send when ready.'
        : 'Mic mode uses browser speech recognition. Start listening, then send the transcript.')
      : 'Press Enter to send. Shift + Enter adds a new line.');

  return (
    <div className="shrink-0 border-t border-[var(--app-border)] bg-[var(--app-bg)] px-8 py-6">
      <div className="mx-auto max-w-4xl rounded-[28px] border border-[var(--app-border)] bg-[var(--app-panel)] p-4 shadow-[0_24px_60px_rgba(2,6,23,0.28)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-2xl border border-[var(--app-border)] bg-[#0b1220] p-1">
            {(['type', 'mic'] as InputMode[]).map((mode) => {
              const isMicMode = mode === 'mic';
              const isDisabled = isMicMode && !supportsSpeechRecognition;
              const isActive = inputMode === mode;

              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleInputModeChange(mode)}
                  disabled={isDisabled}
                  className={`rounded-xl px-3 py-2 text-sm font-medium capitalize transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${
                    isActive
                      ? 'bg-white/[0.08] text-[var(--app-text)]'
                      : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)]'
                  }`}
                >
                  {mode}
                </button>
              );
            })}
          </div>
          <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--app-text-secondary)]">
            {inputMode === 'mic' ? (isListening ? 'Mic Live' : 'Mic Ready') : 'Typing'}
          </span>
        </div>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={inputMode === 'mic'
            ? 'Your speech transcript will appear here...'
            : 'Ask AKYA to perform a task...'}
          rows={1}
          className="max-h-[220px] min-h-[52px] w-full resize-none overflow-y-auto border-0 bg-transparent px-1 py-1 text-sm leading-7 text-[var(--app-text)] outline-none placeholder:text-[var(--app-text-secondary)]"
        />
        <div className="mt-3 flex items-center justify-between gap-4 border-t border-white/8 pt-4">
          <div className="min-h-5 text-xs text-[var(--app-text-secondary)]">
            {helperText}
          </div>
          <div className="flex items-center gap-2">
            {inputMode === 'mic' ? (
              <button
                type="button"
                onClick={handleMicToggle}
                disabled={!supportsSpeechRecognition || isRunning}
                className={`rounded-2xl border px-4 py-2.5 text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${
                  isListening
                    ? 'border-red-500/20 bg-red-500/10 text-red-200 hover:bg-red-500/15'
                    : 'border-[var(--app-border)] bg-white/[0.03] text-[var(--app-text-secondary)] hover:bg-white/[0.06] hover:text-[var(--app-text)]'
                }`}
                aria-label={isListening ? 'Stop microphone listening' : 'Start microphone listening'}
                title={isListening ? 'Stop microphone' : 'Start microphone'}
              >
                {isListening ? 'Stop Mic' : 'Start Mic'}
              </button>
            ) : null}
            <button
              type="button"
              onClick={handlePrimaryAction}
              disabled={!isRunning && !input.trim()}
              className={`rounded-2xl px-5 py-2.5 text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${
                isRunning
                  ? 'bg-red-500 text-white hover:bg-red-400'
                  : 'bg-[var(--app-accent)] text-white hover:bg-indigo-400'
              }`}
            >
              {isRunning ? 'Stop' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InputBox;

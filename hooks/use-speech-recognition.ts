"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Minimal structural types for the browser-native Web Speech API
 * (SpeechRecognition). These are not yet part of the standard TS DOM lib, so
 * they are declared locally rather than relying on global polyfill types.
 */
type SpeechRecognitionAlternative = {
  transcript: string;
  confidence: number;
};

type SpeechRecognitionResult = {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
};

type SpeechRecognitionResultList = {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
};

type SpeechRecognitionEvent = Event & {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
};

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function getRecognitionConstructor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const api = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return api.SpeechRecognition ?? api.webkitSpeechRecognition;
}

export type SpeechRecognitionStatus =
  | "idle"
  | "listening"
  | "processing"
  | "completed";

export type SpeechRecognitionErrorType =
  | "not-supported"
  | "permission-denied"
  | "no-speech"
  | "network"
  | "aborted"
  | "unavailable";

export type UseSpeechRecognitionResult = {
  /** Whether the browser exposes SpeechRecognition (webkit-prefixed or not). */
  isSupported: boolean;
  /** Current speech input stage. */
  status: SpeechRecognitionStatus;
  /** The combined live/final transcript of the most recent recording turn. */
  transcript: string;
  /** Last error type, cleared on the next `start()`. */
  error: SpeechRecognitionErrorType | null;
  /** Begin listening. No-op while a recording turn is already active. */
  start: () => void;
  /** Stop listening and finalize the transcript. */
  stop: () => void;
  /** Clear the current transcript and error. */
  reset: () => void;
};

/**
 * Reusable browser-native speech-to-text hook built on the Web Speech API.
 *
 * Everything runs entirely in the browser — no backend, no external service,
 * no audio storage. The consumer receives a live `transcript` and a
 * status lifecycle (idle → listening → processing → completed) and is
 * responsible for persisting the final transcript through the application's
 * existing answer-saving flow.
 */
export function useSpeechRecognition(): UseSpeechRecognitionResult {
  const [isSupported] = useState<boolean>(() => Boolean(getRecognitionConstructor()));
  const [status, setStatus] = useState<SpeechRecognitionStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<SpeechRecognitionErrorType | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const statusRef = useRef<SpeechRecognitionStatus>("idle");
  const finalRef = useRef("");
  const failedRef = useRef(false);

  const updateStatus = useCallback((next: SpeechRecognitionStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  // Recognition is created and wired per-turn inside start() so that the event
  // closures always capture fresh state instead of a stale render.
  const start = useCallback(() => {
    if (!isSupported || statusRef.current === "listening") return;

    const Constructor = getRecognitionConstructor();
    if (!Constructor) {
      setError("not-supported");
      return;
    }

    setTranscript("");
    setError(null);
    finalRef.current = "";
    failedRef.current = false;

    const recognition = new Constructor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      failedRef.current = false;
      updateStatus("listening");
    };

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";
      for (let i = 0; i < event.results.length; i += 1) {
        const result = event.results.item(i);
        if (result.isFinal) {
          final += result.item(0).transcript;
        } else {
          interim += result.item(0).transcript;
        }
      }
      finalRef.current = final;
      setTranscript(`${final}${interim}`.trim());
    };

    recognition.onerror = (event) => {
      failedRef.current = true;
      const code = event.error;
      if (code === "not-allowed" || code === "service-not-allowed") {
        setError("permission-denied");
      } else if (code === "no-speech") {
        setError("no-speech");
      } else if (code === "network") {
        setError("network");
      } else if (code === "aborted") {
        setError("aborted");
      } else {
        setError("unavailable");
      }
      updateStatus("idle");
    };

    recognition.onend = () => {
      if (failedRef.current) return;
      // Briefly surface a "processing" stage while the transcript is finalized.
      updateStatus("processing");
      setTranscript(finalRef.current.trim());
      // Allow the consuming UI to observe a stable "completed" stage.
      window.setTimeout(() => {
        if (statusRef.current === "processing") {
          updateStatus("completed");
        }
      }, 250);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      failedRef.current = true;
      setError("unavailable");
      updateStatus("idle");
    }
  }, [isSupported, updateStatus]);

  const stop = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // The recognition may have already ended on its own.
    }
  }, []);

  const reset = useCallback(() => {
    setTranscript("");
    setError(null);
    finalRef.current = "";
    failedRef.current = false;
    updateStatus("idle");
  }, [updateStatus]);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        // ignore cleanup faults
      }
    };
  }, []);

  return {
    isSupported,
    status,
    transcript,
    error,
    start,
    stop,
    reset,
  };
}

export type { SpeechRecognitionEvent };
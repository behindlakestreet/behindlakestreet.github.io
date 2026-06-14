export type LogType = 'trilling' | 'geluid' | 'beide';

export const LOG_TYPES: readonly LogType[] = ['trilling', 'geluid', 'beide'] as const;

export const LOCATIONS: readonly string[] = [
  'Woonkamer',
  'Slaapkamer',
  'Keuken',
  'Badkamer',
  'Hal',
  'Zolder',
  'Kelder',
  'Tuin',
] as const;

export interface VibrationReading {
  /** Peak magnitude of the acceleration vector (m/s²). */
  max: number;
  /** Average magnitude of the acceleration vector (m/s²). */
  avg: number;
  /** Window length over which the reading was taken, in milliseconds. */
  durationMs: number;
  /** Number of samples that contributed to max/avg. */
  sampleCount: number;
}

export interface AudioClip {
  /** MIME type of the recording, e.g. 'audio/webm;codecs=opus'. */
  mimeType: string;
  /** Actual recorded length in milliseconds. */
  durationMs: number;
  /** Sample rate in Hz reported by the recording pipeline. */
  sampleRate: number;
  /** Raw audio bytes. */
  blob: Blob;
}

export interface LogEntry {
  id: string;
  /** ISO 8601 timestamp, UTC, of the event. */
  timestamp: string;
  type: LogType;
  /** 1..10, as captured in the UI. */
  intensity: number;
  /** Duration in minutes, >= 1. */
  durationMinutes: number;
  /** One of the fixed Dutch locations (see LOCATIONS). */
  location: string;
  /** Free text, may be empty. */
  description: string;
  /** Measured peak/average dB reading (optional). */
  soundDb?: number;
  /** Measured vibration reading (optional). */
  vibration?: VibrationReading;
  /** Optional 5-second audio clip (Blob, stored in IndexedDB). */
  audioClip?: AudioClip;
  /** ISO 8601 timestamp, UTC, of when the entry was created. */
  createdAt: string;
}

export type NewLogEntry = Omit<LogEntry, 'id' | 'createdAt'>;

export interface Profile {
  /** Verzoeker (sender of the letter). */
  verzoeker: {
    naam: string;
    adres: string;
    postcode: string;
    plaats: string;
    telefoon: string;
    email: string;
  };
  /** Recipient: gemeente. */
  gemeente: {
    naam: string;
    postbus: string;
    postcode: string;
    plaats: string;
  };
}

export const EMPTY_PROFILE: Profile = {
  verzoeker: {
    naam: '',
    adres: '',
    postcode: '',
    plaats: '',
    telefoon: '',
    email: '',
  },
  gemeente: {
    naam: '',
    postbus: '',
    postcode: '',
    plaats: '',
  },
};

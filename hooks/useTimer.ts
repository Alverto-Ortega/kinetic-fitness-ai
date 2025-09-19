import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * A helper function to encode an AudioBuffer into a WAV file format Blob.
 * This is necessary to create a playable audio file from raw audio data
 * generated in the browser.
 * @param buffer The AudioBuffer to encode.
 * @returns A Blob containing the WAV file data.
 */
const audioBufferToWav = (buffer: AudioBuffer): Blob => {
  const numOfChan = buffer.numberOfChannels,
    length = buffer.length * numOfChan * 2 + 44,
    arrayBuffer = new ArrayBuffer(length),
    view = new DataView(arrayBuffer);
  let pos = 0;

  // Helper functions to write data to the ArrayBuffer.
  const writeString = (s: string) => {
    for (let i = 0; i < s.length; i++) {
      view.setUint8(pos++, s.charCodeAt(i));
    }
  };
  const writeUint16 = (d: number) => {
    view.setUint16(pos, d, true);
    pos += 2;
  };
  const writeUint32 = (d: number) => {
    view.setUint32(pos, d, true);
    pos += 4;
  };

  // Construct the WAV header.
  writeString('RIFF');
  writeUint32(length - 8);
  writeString('WAVE');
  writeString('fmt ');
  writeUint32(16);
  writeUint16(1);
  writeUint16(numOfChan);
  writeUint32(buffer.sampleRate);
  writeUint32(buffer.sampleRate * 2 * numOfChan);
  writeUint16(numOfChan * 2);
  writeUint16(16);
  writeString('data');
  writeUint32(length - pos - 4);

  // Write the PCM audio data.
  const channels = [];
  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }
  let offset = 0;
  while (pos < length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([view], { type: 'audio/wav' });
};

/**
 * Generates a simple beep tone procedurally using the Web Audio API.
 * This avoids needing to host an audio file. The generated audio is returned
 * as a playable HTMLAudioElement.
 * @returns A promise that resolves to an HTMLAudioElement or null if unsupported.
 */
const createBeep = async (): Promise<HTMLAudioElement | null> => {
    // Check for browser compatibility, including vendor prefixes.
    if (typeof window === 'undefined') return null;
    const OfflineAudioContext = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
    if (!OfflineAudioContext) {
        console.warn("Web Audio API's OfflineAudioContext is not supported in this browser.");
        return null;
    }

    try {
        const duration = 0.5;
        const sampleRate = 44100;
        const offlineContext = new OfflineAudioContext(1, sampleRate * duration, sampleRate);
        const oscillator = offlineContext.createOscillator();
        const gainNode = offlineContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(offlineContext.destination);

        // Set beep parameters for a more pleasant, noticeable sound.
        const now = offlineContext.currentTime;
        gainNode.gain.setValueAtTime(0.6, now); // Slightly louder
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        oscillator.frequency.value = 660; // E5, a bit less piercing than A5 (880Hz)
        oscillator.type = 'sine'; // A clean, pure tone.

        oscillator.start(now);
        oscillator.stop(now + duration);

        const renderedBuffer = await offlineContext.startRendering();
        const wavBlob = audioBufferToWav(renderedBuffer);
        const audioUrl = URL.createObjectURL(wavBlob);
        const audio = new Audio(audioUrl);
        // Hint to the browser to load the audio data, which can help with playback reliability.
        audio.preload = 'auto';
        return audio;
    } catch (e) {
        console.error("Failed to create beep sound:", e);
        return null;
    }
};


/**
 * A custom React hook for creating a declarative interval that can be paused.
 * @param callback The function to execute on each interval tick.
 * @param delay The delay in milliseconds. If null, the interval is paused.
 */
function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef<(() => void) | null>(null);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    function tick() {
      if (savedCallback.current) {
        savedCallback.current();
      }
    }
    if (delay !== null) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}

/**
 * A robust timer hook that remains accurate even if the browser tab is backgrounded.
 * It uses timestamps (Date.now()) for calculation instead of relying solely on setInterval.
 * @param initialTime The initial time for the timer in seconds.
 * @param onComplete Optional callback to execute when the timer finishes.
 * @param onWarning Optional callback to execute when the timer is nearing completion (<= 5 seconds).
 * @returns An object with timer state and control functions.
 */
export const useTimer = (initialTime: number, onComplete?: () => void, onWarning?: () => void) => {
  const [time, setTime] = useState(initialTime);
  const [isActive, setIsActive] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const endTimeRef = useRef<number | null>(null);
  const warningTriggeredRef = useRef(false);

  // Effect to generate the beep sound once on mount.
  useEffect(() => {
    let isMounted = true;
    let audioUrlToRevoke: string | null = null;

    const setupAudio = async () => {
        const beepAudio = await createBeep();
        if (isMounted && beepAudio) {
            audioRef.current = beepAudio;
            audioUrlToRevoke = beepAudio.src;
        }
    };
    setupAudio();

    // Cleanup function to revoke the object URL and prevent memory leaks.
    return () => {
        isMounted = false;
        if (audioUrlToRevoke) {
             URL.revokeObjectURL(audioUrlToRevoke);
        }
    };
  }, []);

  // The core timer logic using our custom useInterval hook.
  useInterval(() => {
    if (endTimeRef.current === null) return;

    // Recalculate remaining time based on the target end time.
    // This ensures accuracy even if the interval ticks are delayed by the browser.
    const remaining = Math.round((endTimeRef.current - Date.now()) / 1000);

    // Trigger the warning callback if applicable.
    if (onWarning && remaining <= 5 && remaining > 0 && !warningTriggeredRef.current) {
        onWarning();
        warningTriggeredRef.current = true;
    }

    if (remaining > 0) {
      setTime(remaining);
    } else {
      setTime(0);
      setIsActive(false);
      endTimeRef.current = null;
      warningTriggeredRef.current = false; // Reset for next run.
      // Play a sound when the timer finishes.
      audioRef.current?.play().catch(e => console.error("Audio play failed:", e));
      onComplete?.();
    }
  }, isActive ? 1000 : null); // Interval runs every second only when active.

  const startTimer = useCallback((newTime: number) => {
    setTime(newTime);
    // Set a specific timestamp for when the timer should end.
    endTimeRef.current = Date.now() + newTime * 1000;
    setIsActive(true);
    warningTriggeredRef.current = false;
  }, []);
  
  const stopTimer = useCallback(() => {
    setIsActive(false);
    endTimeRef.current = null;
    warningTriggeredRef.current = false;
  }, []);

  const resetTimer = useCallback((newTime: number) => {
      setIsActive(false);
      endTimeRef.current = null;
      setTime(newTime);
      warningTriggeredRef.current = false;
  }, []);

  return { time, isActive, startTimer, stopTimer, resetTimer };
};
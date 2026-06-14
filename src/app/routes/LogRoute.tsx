import { useState } from 'react';
import { LogForm } from '@/components/LogForm';
import { SensorPanel, type SensorReadings } from '@/components/SensorPanel';

export function LogRoute() {
  const [readings, setReadings] = useState<SensorReadings>({});
  // Bump a counter to force SensorPanel to re-render and reset its state.
  const [resetKey, setResetKey] = useState(0);

  return (
    <section aria-labelledby="log-heading">
      <h2 id="log-heading" className="text-base font-semibold mb-3">
        Nieuwe melding
      </h2>
      <SensorPanel
        key={resetKey}
        onReadingsChange={setReadings}
        onReset={() => {
          setReadings({});
        }}
      />
      <LogForm
        pendingSoundDb={readings.soundDb}
        pendingVibration={readings.vibration}
        pendingAudioClip={readings.audioClip}
        onSensorsReset={() => {
          setReadings({});
          setResetKey((k) => k + 1);
        }}
      />
    </section>
  );
}

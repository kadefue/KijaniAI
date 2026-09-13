import { useEffect, useRef } from 'react';
import * as rrweb from 'rrweb';
import { api } from '../api/client';

export function useTelemetry(activeParcelId?: string) {
  const eventsRef = useRef<any[]>([]);
  const stopRecordRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Start rrweb recording
    try {
      const stopFn = rrweb.record({
        emit(event) {
          eventsRef.current.push(event);
          // Keep sliding window of latest 300 events to manage memory
          if (eventsRef.current.length > 300) {
            eventsRef.current.shift();
          }
        },
        sampling: {
          scroll: 150,
          input: 'last',
        },
      });
      stopRecordRef.current = stopFn;
    } catch (e) {
      console.warn('rrweb listener initialized with fallback');
    }

    // Flush recording on page unload or abandonment
    const handleBeforeUnload = () => {
      if (eventsRef.current.length > 5) {
        api.submitSessionRecording(null, 'browser_closed_abruptly', eventsRef.current).catch(() => {});
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (stopRecordRef.current) {
        stopRecordRef.current();
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const trackAction = (action: string, metadata: any = {}) => {
    api.recordTelemetryEvent(action, { ...metadata, parcel_id: activeParcelId }).catch(() => {});
  };

  const reportAbandonment = (stepName: string) => {
    if (eventsRef.current.length > 0) {
      api.submitSessionRecording(null, stepName, eventsRef.current).catch(() => {});
    }
  };

  return { trackAction, reportAbandonment };
}

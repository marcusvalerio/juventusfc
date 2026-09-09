import { useCallback, useEffect, useRef, useState } from 'react';

export type SensorStatus = 'unsupported' | 'needs-permission' | 'active' | 'denied';

type PermissionCapableOrientation = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};

const DECLINED_KEY = 'jfc.mascot.motion-declined';

const hasOrientationApi = () =>
  typeof window !== 'undefined' && typeof window.DeviceOrientationEvent !== 'undefined';

const needsExplicitPermission = () =>
  hasOrientationApi() &&
  typeof (window.DeviceOrientationEvent as PermissionCapableOrientation).requestPermission ===
    'function';

/**
 * Device tilt on touch hardware.
 *
 * iOS will only hand over the sensor after a user gesture, so nothing is
 * requested on mount: the caller renders a discreet control and the visitor
 * decides. Anything else — no API, no permission, a refusal, a device that
 * never emits a reading — leaves the mascot on its pointer/idle behaviour
 * instead of failing.
 */
export function useDeviceTilt(enabled: boolean, onTilt: (x: number, y: number) => void) {
  const [status, setStatus] = useState<SensorStatus>('unsupported');
  const handler = useRef(onTilt);
  handler.current = onTilt;

  // Whatever angle the phone is held at when the sensor starts becomes neutral,
  // so the mascot is not permanently leaning on a reclined device.
  const baseline = useRef<{ beta: number; gamma: number } | null>(null);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setStatus('unsupported');
      setListening(false);
      return;
    }
    if (!hasOrientationApi()) {
      setStatus('unsupported');
      return;
    }
    if (needsExplicitPermission()) {
      let declined = false;
      try {
        declined = window.sessionStorage.getItem(DECLINED_KEY) === '1';
      } catch {
        declined = false;
      }
      setStatus(declined ? 'denied' : 'needs-permission');
      return;
    }
    setStatus('active');
    setListening(true);
  }, [enabled]);

  useEffect(() => {
    if (!listening) return;

    baseline.current = null;
    const reading = (event: DeviceOrientationEvent) => {
      const { beta, gamma } = event;
      if (beta === null || gamma === null) return;
      baseline.current ??= { beta, gamma };

      let x = (gamma - baseline.current.gamma) / 26;
      let y = (beta - baseline.current.beta) / 26;

      // In landscape the axes are swapped relative to the layout the user sees.
      const angle = window.screen?.orientation?.angle ?? 0;
      if (angle === 90) [x, y] = [y, -x];
      else if (angle === 270 || angle === -90) [x, y] = [-y, x];

      handler.current(x, y);
    };

    const recentre = () => {
      baseline.current = null;
    };

    window.addEventListener('deviceorientation', reading);
    window.screen?.orientation?.addEventListener('change', recentre);
    return () => {
      window.removeEventListener('deviceorientation', reading);
      window.screen?.orientation?.removeEventListener('change', recentre);
    };
  }, [listening]);

  const request = useCallback(async () => {
    const api = window.DeviceOrientationEvent as PermissionCapableOrientation;
    if (typeof api?.requestPermission !== 'function') return;
    try {
      const result = await api.requestPermission();
      if (result === 'granted') {
        setStatus('active');
        setListening(true);
        return;
      }
    } catch {
      // A rejected request is a refusal like any other.
    }
    setStatus('denied');
    try {
      window.sessionStorage.setItem(DECLINED_KEY, '1');
    } catch {
      // Private mode: the control simply reappears next visit.
    }
  }, []);

  return { status, request };
}

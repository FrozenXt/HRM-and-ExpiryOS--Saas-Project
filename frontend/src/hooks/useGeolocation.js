import { useCallback, useEffect, useState } from "react";

const geoError = (message, code) => {
  const err = new Error(message);
  err.isGeo = true;
  err.code = code;
  return err;
};

/**
 * permission: "unknown" | "prompt" | "granted" | "denied" | "unsupported"
 * getPosition(): Promise<{ latitude, longitude, accuracy }>  (asks the browser
 * for permission the first time; rejects with a user-friendly message).
 */
export function useGeolocation() {
  const [permission, setPermission] = useState("unknown");

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setPermission("unsupported");
      return;
    }
    if (!navigator.permissions?.query) return; // older Safari: stays "unknown"

    let status;
    navigator.permissions
      .query({ name: "geolocation" })
      .then((s) => {
        status = s;
        setPermission(s.state);
        s.onchange = () => setPermission(s.state);
      })
      .catch(() => {});

    return () => {
      if (status) status.onchange = null;
    };
  }, []);

  const getPosition = useCallback(
    () =>
      new Promise((resolve, reject) => {
        if (!("geolocation" in navigator)) {
          reject(geoError("This browser does not support location access.", 0));
          return;
        }
        if (!window.isSecureContext) {
          reject(
            geoError(
              "Location only works on a secure (HTTPS) page. Open the app over HTTPS.",
              0,
            ),
          );
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setPermission("granted");
            resolve({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            });
          },
          (err) => {
            if (err.code === 1) {
              setPermission("denied");
              reject(
                geoError(
                  "Location access is blocked. Allow location for this site in your browser settings, then try again.",
                  1,
                ),
              );
            } else if (err.code === 2) {
              reject(
                geoError(
                  "Your location could not be determined. Check that GPS / location services are on.",
                  2,
                ),
              );
            } else {
              reject(
                geoError(
                  "Getting your location timed out. Please try again.",
                  3,
                ),
              );
            }
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
        );
      }),
    [],
  );

  return { permission, getPosition };
}

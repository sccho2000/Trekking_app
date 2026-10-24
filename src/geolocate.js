// 브라우저의 timeout 옵션은 권한 창이 떠 있는 동안 시작되지 않으므로, 바깥에서 한 번 더 시간 제한을 둔다.
export function getPosition(geo = globalThis.navigator?.geolocation, timeoutMs = 8000, graceMs = 2000) {
  return new Promise((resolve) => {
    if (!geo) return resolve(null);
    const giveUp = setTimeout(() => resolve(null), timeoutMs + graceMs);
    const done = (value) => {
      clearTimeout(giveUp);
      resolve(value);
    };
    try {
      geo.getCurrentPosition(
        (p) => done({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => done(null),
        { timeout: timeoutMs, maximumAge: 60000 },
      );
    } catch {
      done(null);
    }
  });
}

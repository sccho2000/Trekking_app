import test from 'node:test';
import assert from 'node:assert/strict';
import { getPosition } from '../src/geolocate.js';

test('권한 창에 응답하지 않아도 timeout 뒤에 null로 끝난다', async () => {
  const geo = { getCurrentPosition() {} };
  assert.equal(await getPosition(geo, 20, 0), null);
});

test('성공하면 {lat,lng}', async () => {
  const geo = { getCurrentPosition: (ok) => ok({ coords: { latitude: 37.5, longitude: 127 } }) };
  assert.deepEqual(await getPosition(geo, 20, 0), { lat: 37.5, lng: 127 });
});

test('거부되면 null, geolocation이 없어도 null', async () => {
  const denied = { getCurrentPosition: (_ok, fail) => fail({ code: 1 }) };
  assert.equal(await getPosition(denied, 20, 0), null);
  assert.equal(await getPosition(undefined, 20, 0), null);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { isMobileUa, openDirections } from '../src/openLinks.js';

const links = { app: 'nmap://route/public?x=1', web: 'https://map.naver.com/p/directions/-/1,2,n/-/transit' };

function env(ua, hidden = false) {
  const timers = [];
  const listeners = {};
  const opened = [];
  return {
    ua, location: { href: '' }, opened, timers, listeners,
    doc: { hidden, addEventListener: (t, fn) => { listeners[t] = fn; } },
    win: {
      setTimeout: (fn) => { timers.push(fn); return timers.length; },
      clearTimeout: (id) => { timers[id - 1] = null; },
      addEventListener: (t, fn) => { listeners[t] = fn; },
      open: (url) => opened.push(url),
    },
  };
}

test('isMobileUa', () => {
  assert.equal(isMobileUa('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'), true);
  assert.equal(isMobileUa('Mozilla/5.0 (Linux; Android 14; SM-S918N)'), true);
  assert.equal(isMobileUa('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120'), false);
});

test('데스크톱은 앱 스킴을 시도하지 않고 웹 길찾기를 새 탭으로 연다', () => {
  const e = env('Mozilla/5.0 (Windows NT 10.0) Chrome/120');
  openDirections(links, e);
  assert.equal(e.location.href, '');
  assert.deepEqual(e.opened, [links.web]);
  assert.equal(e.timers.length, 0);
});

test('모바일은 앱을 먼저 열고, 시간이 지나도 화면이 그대로면 같은 탭에서 웹으로 간다', () => {
  const e = env('Mozilla/5.0 (iPhone)');
  openDirections(links, e);
  assert.equal(e.location.href, links.app);
  assert.equal(e.timers.length, 1);
  e.timers[0]();
  assert.equal(e.location.href, links.web);
  assert.deepEqual(e.opened, []);
});

test('앱으로 넘어가 페이지가 숨겨졌으면(pagehide) 웹으로 가지 않는다', () => {
  const e = env('Mozilla/5.0 (Android)');
  openDirections(links, e);
  e.listeners.pagehide();
  assert.equal(e.timers[0], null);
  assert.equal(e.location.href, links.app);
});

test('타이머 시점에 문서가 숨겨져 있으면 웹으로 가지 않는다', () => {
  const e = env('Mozilla/5.0 (Android)', true);
  openDirections(links, e);
  e.timers[0]();
  assert.equal(e.location.href, links.app);
});

// 비동기 요청이 겹칠 때 가장 마지막에 시작한 요청의 결과만 쓰기 위한 토큰 발급기.
export function createSequencer() {
  let current = 0;
  return {
    next: () => ++current,
    isCurrent: (token) => token === current,
  };
}

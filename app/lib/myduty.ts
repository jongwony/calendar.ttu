// myduty.io 공유 링크 추출 로직.
// 백엔드(api/chalicelib/ttu_gaeng.py)의 MYDUTY_URL_PATTERN과 동일한 형태를 유지해야 한다.
// 구형: https://myduty.io/s/<id>
// 신형: https://link.myduty.io/duty-share/<id>
export const MYDUTY_URL_RE = /https?:\/\/(?:link\.)?myduty\.io\/(?:s|duty-share)\/\d+\b/

// 임의의 텍스트(예: 카카오톡 공유 메시지)에서 첫 myduty 링크를 추출한다.
// 찾지 못하면 null.
export function extractMydutyUrl(text: string): string | null {
  const m = text.match(MYDUTY_URL_RE)
  return m ? m[0] : null
}

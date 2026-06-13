import { describe, it, expect } from 'vitest'
import { extractMydutyUrl } from './myduty'

describe('extractMydutyUrl', () => {
  describe('신형 링크 (link.myduty.io/duty-share)', () => {
    it('단독 신형 URL', () => {
      expect(extractMydutyUrl('https://link.myduty.io/duty-share/4140631767536309'))
        .toBe('https://link.myduty.io/duty-share/4140631767536309')
    })

    it('카카오톡 공유 메시지 통째로 붙여넣기 (앞 텍스트 + 줄바꿈) — 보고된 버그 케이스', () => {
      const pasted = '윤수경쌤의 근무 일정입니다.\n\nhttps://link.myduty.io/duty-share/4140631767536309'
      expect(extractMydutyUrl(pasted)).toBe('https://link.myduty.io/duty-share/4140631767536309')
    })

    it('URL 뒤에 텍스트가 더 붙은 경우', () => {
      expect(extractMydutyUrl('확인하세요 https://link.myduty.io/duty-share/123 감사합니다'))
        .toBe('https://link.myduty.io/duty-share/123')
    })

    it('http (비-https)', () => {
      expect(extractMydutyUrl('http://link.myduty.io/duty-share/999'))
        .toBe('http://link.myduty.io/duty-share/999')
    })
  })

  describe('구형 링크 (myduty.io/s) — 하위호환 유지', () => {
    it('단독 구형 URL', () => {
      expect(extractMydutyUrl('https://myduty.io/s/8708344217409355'))
        .toBe('https://myduty.io/s/8708344217409355')
    })

    it('앞뒤 텍스트와 함께', () => {
      expect(extractMydutyUrl('일정: https://myduty.io/s/8708344217409355 입니다'))
        .toBe('https://myduty.io/s/8708344217409355')
    })
  })

  describe('추출 동작 세부', () => {
    it('여러 링크 중 첫 번째를 반환', () => {
      const text = 'https://myduty.io/s/111 그리고 https://link.myduty.io/duty-share/222'
      expect(extractMydutyUrl(text)).toBe('https://myduty.io/s/111')
    })

    it('앞뒤 공백을 포함하지 않는다', () => {
      expect(extractMydutyUrl('  https://link.myduty.io/duty-share/42  '))
        .toBe('https://link.myduty.io/duty-share/42')
    })
  })

  describe('매치 실패 → null', () => {
    it('링크 없는 평범한 텍스트', () => {
      expect(extractMydutyUrl('윤수경쌤의 근무 일정입니다.')).toBeNull()
    })

    it('빈 문자열', () => {
      expect(extractMydutyUrl('')).toBeNull()
    })

    it('도메인은 맞지만 경로 형식이 다름 (/foo)', () => {
      expect(extractMydutyUrl('https://myduty.io/foo/123')).toBeNull()
    })

    it('숫자 id가 없는 경로', () => {
      expect(extractMydutyUrl('https://link.myduty.io/duty-share/')).toBeNull()
      expect(extractMydutyUrl('https://link.myduty.io/duty-share/abc')).toBeNull()
    })

    it('숫자 뒤에 단어 문자가 붙으면 거부 (백엔드 정규식과 동일 동작 — 잘린 id 추출 방지)', () => {
      // 프론트(\b)·백엔드(\b) 모두 부분 추출 대신 거부해야 한다.
      expect(extractMydutyUrl('https://myduty.io/s/123abc')).toBeNull()
      expect(extractMydutyUrl('https://myduty.io/s/123_abc')).toBeNull()
    })

    it('유사 도메인 (피싱 방지: myduty.io.evil.com)', () => {
      expect(extractMydutyUrl('https://myduty.io.evil.com/s/123')).toBeNull()
    })

    it('잘못된 서브도메인 (link 가 아닌 다른 것)', () => {
      expect(extractMydutyUrl('https://app.myduty.io/s/123')).toBeNull()
    })
  })
})

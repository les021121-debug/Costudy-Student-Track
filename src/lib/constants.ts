export const ATTITUDE_POSITIVE = [
  { key: '집중도_높음',        label: '집중도 높음' },
  { key: '적극적_질문',        label: '적극적으로 질문함' },
  { key: '참여도_높음',        label: '수업 참여도 높음' },
  { key: '끝까지_풀려는_노력', label: '혼자서 끝까지 풀려고 노력함' },
  { key: '모르는부분_표시',    label: '모르는 부분을 스스로 표시하고 확인함' },
  { key: '자신있게_발표',      label: '발표/대답을 자신있게 함' },
  { key: '꼼꼼한_필기',        label: '선생님 설명을 꼼꼼히 필기함' },
  { key: '설명잘들음',         label: '친구 설명을 잘 들음' },
  { key: '컨디션_좋음',        label: '오늘 유독 컨디션이 좋아 보임' },
]

export const ATTITUDE_NEGATIVE = [
  { key: '산만함',             label: '산만함 (자리 이탈, 떠들기 등)' },
  { key: '졸음',               label: '수업 중 졸음' },
  { key: '소극적',             label: '소극적 / 반응 없음' },
  { key: '질문안함',           label: '질문을 전혀 안 함' },
  { key: '이해한척_넘어감',    label: '이해한 척 넘어가는 경향 있음' },
  { key: '멍함',               label: '멍하게 있는 시간이 많음' },
  { key: '딴짓',               label: '설명 중 딴짓' },
  { key: '의욕없음',           label: '의욕이 없어 보임' },
  { key: '컨디션_나쁨',        label: '오늘 유독 컨디션이 안 좋아 보임' },
]

export const HOMEWORK_ITEMS = [
  { key: '완벽제출',           label: '완벽 제출' },
  { key: '미제출',             label: '미제출' },
  { key: '풀이성실',           label: '풀이 과정이 성실함' },
  { key: '풀이부실',           label: '풀이 과정이 부실함' },
  { key: '오답정리_잘됨',      label: '오답 정리 잘 됨' },
  { key: '오답정리_안됨',      label: '오답 정리 안 됨' },
  { key: '급하게한흔적',       label: '학원 오기 직전에 급하게 한 흔적 있음' },
  { key: '모르는문제_표시',    label: '모르는 문제 표시해옴 (적극적)' },
]

export const ATTENDANCE_OPTIONS = ['출석', '결석', '조퇴', '병결', '기타'] as const
export type AttendanceType = typeof ATTENDANCE_OPTIONS[number]

export const SCORE_LABELS: Record<number, string> = {
  1: '매우 부족',
  2: '부족',
  3: '보통',
  4: '좋음',
  5: '매우 좋음',
}

export const m7BuildKo = {
  'm7Build.film.description': '현재 주간 효과: 필름 스터디의 준비도 +3.',
  'm7Build.repetition.description':
    '현재 주간 효과: 같은 훈련의 두 번째 선택부터 XP ×1.25, 몸 상태 비용 ×1.10. 회복·자습에는 적용되지 않습니다.',
  'm7Build.body.description': '현재 주간 효과: 훈련 몸 상태 비용 ×0.90, 주간 자동 회복 +2.',
  'm7Build.mindset.description':
    '현재 주간 효과: 몸 상태가 60 이하일 때 회복을 선택하면 자신감 +2를 추가로 얻습니다.',
  'm7Build.role.description':
    '현재 주간 효과: 서로 다른 주간 선택을 두 가지 이상 계획하면 각 훈련의 연습 평가 기여도 +2.',
  'm7Build.campus.description':
    '현재 주간 효과: 자습 학점 +0.10, 긍정적인 주간 관계 변화 ×1.20. 갈등은 증폭하지 않습니다.',
  'm7Build.nil.description':
    '현재 주간 효과: NIL 제안 수락의 긍정적인 수치 보상 ×1.10. 물품 수량·의무 비용·불이행 결과는 그대로입니다.',
} as const;
export const m7BuildEn = {
  'm7Build.film.description': 'Current weekly effect: Film Study adds 3 more Preparation.',
  'm7Build.repetition.description':
    'Current weekly effect: from the second repeat of a training focus, XP ×1.25 and Body cost ×1.10. Does not apply to Recovery or Study Hall.',
  'm7Build.body.description':
    'Current weekly effect: training Body cost ×0.90 and weekly passive recovery +2.',
  'm7Build.mindset.description':
    'Current weekly effect: choosing Recovery at Body 60 or lower adds 2 more Confidence.',
  'm7Build.role.description':
    'Current weekly effect: plan at least two distinct focuses to add 2 practice-impact points to each training focus.',
  'm7Build.campus.description':
    'Current weekly effect: Study Hall GPA +0.10 and positive weekly relationship gains ×1.20. Conflict is not amplified.',
  'm7Build.nil.description':
    'Current weekly effect: positive numeric NIL acceptance rewards ×1.10. Item quantities, obligation costs, and default consequences are unchanged.',
} as const satisfies Record<keyof typeof m7BuildKo, string>;

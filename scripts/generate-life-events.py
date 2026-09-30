"""Generates the Career VNext campus-life event pack (M8): 16 position-neutral weekly events.

Writes packages/game-content/src/content/life-events.ts and packages/game-content/src/locales/m8-life.ts.
Run from the repository root; output is committed. Choice labels follow v2.evt.<camelEventId>.<suffix>.
"""
import json
import os

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))


def fx(b=0, p=0, c=0, t=0, g=0, br=0, clue=0, dsf=0, exp=0):
    return {'bodyDelta': b, 'preparationDelta': p, 'confidenceDelta': c, 'coachTrustDelta': t,
            'gpaMilliDelta': g, 'brandDelta': br,
            'gameModifiers': {'clueBonus': clue, 'decisionScoreFlat': dsf, 'exposureReductionPermille': exp}}


# (slug, requirements, [(suffix, effects, en, ko)], en name, ko name, en description, ko description)
EVENTS = [
    ('midterm_crunch', {}, [
        ('commit', fx(b=-2, p=-4, g=300), 'Pull the late nights and study', '밤새워 공부한다'),
        ('protect', fx(b=3, p=3, g=-200), 'Trust what you know and rest', '아는 만큼 믿고 쉰다'),
     ], 'Midterm Crunch', '중간고사 주간', 'Three exams land in the same week as a road trip.',
     '원정 경기가 있는 주에 시험이 세 개나 몰렸다.'),
    ('family_visit', {}, [
        ('commit', fx(c=5, p=-2), 'Spend the evening with family', '저녁을 가족과 보낸다'),
        ('protect', fx(p=3, c=-1), 'Keep it short and stay on schedule', '짧게 만나고 일정을 지킨다'),
     ], 'Family in Town', '가족 방문', 'Your family drives in for the weekend.',
     '가족이 주말을 맞아 차를 몰고 찾아왔다.'),
    ('roommate_trouble', {}, [
        ('commit', fx(b=-2, c=2, t=1), 'Talk it out tonight', '오늘 밤 이야기로 푼다'),
        ('protect', fx(b=2, c=-2), 'Sleep at a teammate’s place', '동료 방에서 잔다'),
     ], 'Roommate Trouble', '룸메이트 문제', 'Your roommate’s schedule is wrecking your sleep.',
     '룸메이트의 생활 패턴 때문에 잠을 설치고 있다.'),
    ('rival_week_media', {'minConfidence': 30}, [
        ('commit', fx(c=4, br=6, p=-2), 'Give them a quote', '한마디 던져 준다'),
        ('protect', fx(p=2, c=1), 'Keep it boring', '무난하게 넘긴다'),
     ], 'Rivalry Week Microphones', '라이벌 주간 인터뷰', 'Every reporter on campus wants a rivalry quote.',
     '캠퍼스의 모든 기자가 라이벌전 한마디를 원한다.'),
    ('extra_film_offer', {'minCoachTrust': 30}, [
        ('commit', fx(b=-2, p=6, t=2, clue=1), 'Sit in on the staff film session', '스태프 필름 세션에 참석한다'),
        ('protect', fx(b=2, p=1), 'Watch the cut-up on your own', '편집본을 혼자 본다'),
     ], 'Staff Film Invite', '스태프 필름 초대', 'A coordinator invites you into a staff film session.',
     '코디네이터가 스태프 필름 세션에 초대했다.'),
    ('cold_going_around', {}, [
        ('commit', fx(b=-4, p=3, t=1), 'Push through practice', '참고 훈련한다'),
        ('protect', fx(b=4, p=-2), 'Rest and hydrate', '쉬면서 수분을 챙긴다'),
     ], 'A Cold Going Around', '감기가 돈다', 'Half the locker room is sniffling.',
     '라커룸의 절반이 코를 훌쩍이고 있다.'),
    ('community_reading', {}, [
        ('commit', fx(b=-1, p=-2, c=3, br=4), 'Read to the second graders', '초등학생들에게 책을 읽어 준다'),
        ('protect', fx(p=2), 'Pass this time', '이번엔 넘긴다'),
     ], 'Library Reading Hour', '도서관 낭독 시간', 'The athletic department asks you to read at a local school.',
     '체육부가 지역 학교에서 책을 읽어 달라고 부탁한다.'),
    ('weight_room_record', {'minBody': 55}, [
        ('commit', fx(b=-5, c=4, t=2), 'Go for the record', '기록에 도전한다'),
        ('protect', fx(b=1, p=1), 'Stick to the program', '프로그램대로 한다'),
     ], 'Weight Room Record', '웨이트룸 기록', 'The strength coach says a room record is within reach.',
     '스트렝스 코치가 룸 기록이 코앞이라고 말한다.'),
    ('tutor_praise', {}, [
        ('commit', fx(p=-1, g=200, c=2), 'Add a second tutor session', '튜터 세션을 한 번 더 잡는다'),
        ('protect', fx(p=2, g=50), 'Keep your usual hour', '평소 시간만 지킨다'),
     ], 'Tutor’s Note', '튜터의 메모', 'Your tutor says one more push could lift your grade.',
     '튜터가 한 번만 더 밀어붙이면 성적이 오를 거라고 한다.'),
    ('homesick_night', {'maxConfidence': 60}, [
        ('commit', fx(c=4, p=-1), 'Call home and talk it through', '집에 전화해 털어놓는다'),
        ('protect', fx(p=2, c=-1), 'Bury it in the playbook', '플레이북에 파묻힌다'),
     ], 'Homesick Night', '향수병', 'A quiet night leaves you missing home.',
     '조용한 밤, 집이 그리워진다.'),
    ('walk_on_mentor', {'minCoachTrust': 40}, [
        ('commit', fx(p=-2, c=3, t=3), 'Take the walk-on under your wing', '워크온 선수를 챙겨 준다'),
        ('protect', fx(p=2), 'Focus on your own reps', '내 반복에 집중한다'),
     ], 'Walk-On Mentor', '워크온 멘토', 'A walk-on at your position keeps asking you questions.',
     '같은 포지션의 워크온 선수가 계속 질문을 한다.'),
    ('bye_week_trip', {}, [
        ('commit', fx(b=5, c=2, p=-3), 'Take the weekend away', '주말 여행을 간다'),
        ('protect', fx(p=3, b=1), 'Stay and get ahead on film', '남아서 필름을 미리 본다'),
     ], 'Weekend Off', '짧은 휴식', 'The staff gives the team a rare free weekend.',
     '스태프가 드물게 자유 주말을 줬다.'),
    ('fan_mail', {'minConfidence': 25}, [
        ('commit', fx(c=3, br=3, p=-1), 'Answer every letter', '편지에 모두 답장한다'),
        ('protect', fx(p=1), 'Save it for the offseason', '오프시즌으로 미룬다'),
     ], 'Fan Mail', '팬레터', 'A stack of letters from young fans arrives at the facility.',
     '어린 팬들의 편지가 시설로 한 무더기 도착했다.'),
    ('sleep_study', {}, [
        ('commit', fx(b=4, p=1, c=-1), 'Join the sleep study and log nine hours', '수면 연구에 참여해 9시간을 잔다'),
        ('protect', fx(p=2), 'Keep your routine', '원래 루틴을 지킨다'),
     ], 'Sleep Study', '수면 연구', 'Sports science wants volunteers to track sleep this week.',
     '스포츠 과학팀이 이번 주 수면을 기록할 지원자를 찾는다.'),
    ('position_swap_drill', {'minPreparation': 30}, [
        ('commit', fx(b=-3, p=4, dsf=2), 'Take reps on the other side of the ball', '반대편 포지션 반복을 받는다'),
        ('protect', fx(b=1, p=1), 'Stay in your lane', '내 자리를 지킨다'),
     ], 'Other Side of the Ball', '반대편에서 본 풋볼', 'The staff runs a drill where you see your position from the other side.',
     '스태프가 반대편에서 내 포지션을 보는 훈련을 연다.'),
    ('pregame_nerves', {'maxConfidence': 55}, [
        ('commit', fx(c=5, p=-1), 'Talk to the team psychologist', '팀 심리 상담사와 이야기한다'),
        ('protect', fx(p=2, c=1), 'Stick to your pregame ritual', '경기 전 루틴을 지킨다'),
     ], 'Pregame Nerves', '경기 전 긴장', 'The big game has you awake at 3 a.m.',
     '큰 경기를 앞두고 새벽 3시에 깨어 있다.'),
]


# M9 packs (campus, locker room, media, body, family, program): 120 more events.
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from life_events_m9_a import EVENTS_A  # noqa: E402
from life_events_m9_b import EVENTS_B  # noqa: E402

EVENTS = EVENTS + EVENTS_A + EVENTS_B


def camel(value):
    head, *rest = value.split('_')
    return head + ''.join(part[:1].upper() + part[1:] for part in rest)


en, ko, events = {}, {}, []
for slug, req, choices, en_name, ko_name, en_desc, ko_desc in EVENTS:
    base = f'm8Life.event.{camel(slug)}'
    en[f'{base}.name'], ko[f'{base}.name'] = en_name, ko_name
    en[f'{base}.description'], ko[f'{base}.description'] = en_desc, ko_desc
    entries = []
    for suffix, effects, en_label, ko_label in choices:
        key = f'v2.evt.{camel("life_" + slug)}.{suffix}'
        en[key], ko[key] = en_label, ko_label
        entries.append({'id': f'event_choice_life_{slug}_{suffix}', 'effects': effects})
    events.append({'id': f'event_life_{slug}', 'weight': 100, 'cooldownWeeks': 6, 'requirements': req,
                   'choices': entries, 'nameKey': f'{base}.name', 'descriptionKey': f'{base}.description'})

assert len(events) == 136 and set(en) == set(ko)
assert len({event['id'] for event in events}) == 136


def ts(value):
    return json.dumps(value, ensure_ascii=False, indent=2)


with open('packages/game-content/src/content/life-events.ts', 'w', encoding='utf-8', newline='\n') as handle:
    handle.write(f"""// Generated by scripts/generate-life-events.py; edit the table there, not this file.
import type {{ WeeklyEventDefinitionV2 }} from '@project-saturday/game-core';

export const lifeEventContent = {ts(events)} as const;

/** Mechanics-only projection for the career core. */
export const lifeEventMechanics = lifeEventContent.map((entry) =>
  Object.fromEntries(
    Object.entries(entry).filter(([field]) => field !== 'nameKey' && field !== 'descriptionKey'),
  ),
) as unknown as readonly WeeklyEventDefinitionV2[];
""")
with open('packages/game-content/src/locales/m8-life.ts', 'w', encoding='utf-8', newline='\n') as handle:
    handle.write(f"""// Generated by scripts/generate-life-events.py; edit the table there, not this file.
export const enUSLifeMessages = {ts(dict(sorted(en.items())))} as const;

export const koKRLifeMessages = {ts(dict(sorted(ko.items())))} as const satisfies Record<
  keyof typeof enUSLifeMessages,
  string
>;
""")
print('generated', len(events), 'life events,', len(en), 'messages')

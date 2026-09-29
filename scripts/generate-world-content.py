"""Generates the M8 conference world content: 32 new programs, eight conferences and paired copy.

Writes packages/game-content/src/content/world-vnext-programs.ts and
packages/game-content/src/locales/m8-world.ts. Run from the repository root; output is committed.
Programs are original fictional composites (see docs/product-specs/PROGRAM_WORLD.md).
"""
import json
import os

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

# Existing M7 groups become the first four conferences; four new conferences follow.
CONFERENCES = [
    ('world_group_foundry', 'foundry', 'Foundry Conference', '파운드리 콘퍼런스', 'Foundry', '파운드리',
     'Old industrial towns where football is a trade learned early.',
     '풋볼을 일찍부터 기술처럼 배우는 오래된 공업 도시들의 리그.'),
    ('world_group_horizon', 'horizon', 'Horizon Conference', '호라이즌 콘퍼런스', 'Horizon', '호라이즌',
     'Western programs built on speed, space and new ideas.',
     '스피드와 공간, 새로운 아이디어로 성장한 서부 프로그램들.'),
    ('world_group_lakes', 'lakes', 'Lakes Conference', '레이크스 콘퍼런스', 'Lakes', '레이크스',
     'Northern giants with huge stadiums and long memories.',
     '거대한 경기장과 긴 기억을 지닌 북부의 강호들.'),
    ('world_group_summit', 'summit', 'Summit Conference', '서밋 콘퍼런스', 'Summit', '서밋',
     'Coastal and river schools where every Saturday is a tradition.',
     '토요일마다 전통이 이어지는 해안과 강변의 학교들.'),
    ('world_conference_delta', 'delta', 'Delta Conference', '델타 콘퍼런스', 'Delta', '델타',
     'Humid night games, loud stands and defenses that hit hard.',
     '후텁지근한 야간 경기, 시끄러운 관중석, 거칠게 부딪치는 수비.'),
    ('world_conference_frontier', 'frontier', 'Frontier Conference', '프런티어 콘퍼런스', 'Frontier', '프런티어',
     'Plains and mountain programs that win in the trenches.',
     '평원과 산악 지대의 프로그램들. 승부는 라인에서 난다.'),
    ('world_conference_tidemark', 'tidemark', 'Tidemark Conference', '타이드마크 콘퍼런스', 'Tidemark', '타이드마크',
     'Historic eastern campuses with academics and old rivalries.',
     '학업과 오래된 라이벌 관계를 지닌 동부의 유서 깊은 캠퍼스들.'),
    ('world_conference_sundown', 'sundown', 'Sundown Conference', '선다운 콘퍼런스', 'Sundown', '선다운',
     'Desert and coast schools with wide-open offenses.',
     '활짝 열린 공격을 펼치는 사막과 해안의 학교들.'),
]

# (slug, monogram, primary, secondary, en name, en short, en description, ko name, ko short, ko description)
PROGRAMS = {
    'world_conference_delta': [
        ('cypress_bend', 'CB', '#1e5631', '#e9d8a6', 'Cypress Bend University', 'Cypress Bend',
         'A night-game defense factory deep in the bayou country.', '사이프러스 벤드 대학교', '사이프러스 벤드',
         '늪지대 깊숙한 곳의 야간 경기 수비 공장.'),
        ('saltmarsh_state', 'SM', '#0a9396', '#f4a261', 'Saltmarsh State', 'Saltmarsh',
         'A coastal state school that recruits the fastest kids in the region.', '솔트마시 주립대', '솔트마시',
         '지역에서 가장 빠른 선수들을 데려오는 해안 주립대.'),
        ('bellwater', 'BW', '#6a040f', '#ffba08', 'Bellwater University', 'Bellwater',
         'Old money, a brick stadium and fans who expect titles.', '벨워터 대학교', '벨워터',
         '오래된 부와 벽돌 경기장, 우승을 당연히 여기는 팬들.'),
        ('red_clay_college', 'RC', '#9b2226', '#e9ecef', 'Red Clay College', 'Red Clay',
         'A small campus that develops linemen into pros.', '레드 클레이 칼리지', '레드 클레이',
         '라인맨을 프로로 키워 내는 작은 캠퍼스.'),
        ('lowcountry_tech', 'LT', '#335c67', '#fff3b0', 'Lowcountry Tech', 'Lowcountry',
         'An engineering school with a patient, clever offense.', '로컨트리 공과대', '로컨트리',
         '인내심 있고 영리한 공격을 펼치는 공대.'),
        ('pinehaven', 'PH', '#2b9348', '#1b263b', 'Pinehaven University', 'Pinehaven',
         'A quiet college town that turns up on rivalry weekend.', '파인헤이븐 대학교', '파인헤이븐',
         '평소엔 조용하지만 라이벌전 주말엔 들끓는 대학 도시.'),
        ('sugarmill_state', 'SS', '#bb3e03', '#fefae0', 'Sugarmill State', 'Sugarmill',
         'A blue-collar program that runs the ball and dares you to stop it.', '슈가밀 주립대', '슈가밀',
         '공을 계속 달리게 하고 막아 보라고 도발하는 블루칼라 프로그램.'),
        ('bayou_crest', 'BC', '#5a189a', '#ffd60a', 'Bayou Crest University', 'Bayou Crest',
         'Purple-and-gold pageantry and a stadium that shakes after dark.', '바이유 크레스트 대학교', '바이유 크레스트',
         '화려한 응원과 해가 지면 흔들리는 경기장.'),
    ],
    'world_conference_frontier': [
        ('windrow_state', 'WS', '#7f5539', '#ede0d4', 'Windrow State', 'Windrow',
         'A farm-country state school built on toughness.', '윈드로 주립대', '윈드로',
         '강인함 위에 세워진 농촌 지역 주립대.'),
        ('badlands_college', 'BL', '#a44a3f', '#f2cc8f', 'Badlands College', 'Badlands',
         'Rugged, remote and very hard to beat at home.', '배드랜즈 칼리지', '배드랜즈',
         '거칠고 외진 곳, 홈에서는 좀처럼 지지 않는다.'),
        ('silverpine', 'SP', '#415a77', '#e0e1dd', 'Silverpine University', 'Silverpine',
         'A mountain campus with a thin-air home advantage.', '실버파인 대학교', '실버파인',
         '희박한 공기가 홈 이점이 되는 산악 캠퍼스.'),
        ('thunder_basin_state', 'TB', '#283618', '#dda15e', 'Thunder Basin State', 'Thunder Basin',
         'Physical defense and long, grinding drives.', '선더 베이슨 주립대', '선더 베이슨',
         '몸으로 부딪치는 수비와 길고 끈질긴 드라이브.'),
        ('cedar_mesa', 'CM', '#99582a', '#264653', 'Cedar Mesa University', 'Cedar Mesa',
         'An option-heavy offense that frustrates everyone.', '시더 메사 대학교', '시더 메사',
         '모두를 골치 아프게 하는 옵션 중심 공격.'),
        ('ironhorse_tech', 'IH', '#343a40', '#f77f00', 'Ironhorse Tech', 'Ironhorse',
         'A railroad-town tech school with a famous weight room.', '아이언호스 공과대', '아이언호스',
         '유명한 웨이트룸을 가진 철도 도시의 공대.'),
        ('stonefield', 'SF', '#6c757d', '#ffc300', 'Stonefield University', 'Stonefield',
         'A steady program that never beats itself.', '스톤필드 대학교', '스톤필드',
         '스스로 무너지는 법이 없는 꾸준한 프로그램.'),
        ('bison_ridge', 'BR', '#582f0e', '#b6ad90', 'Bison Ridge College', 'Bison Ridge',
         'A small school that plays much bigger than its size.', '바이슨 리지 칼리지', '바이슨 리지',
         '규모보다 훨씬 크게 싸우는 작은 학교.'),
    ],
    'world_conference_tidemark': [
        ('harborline', 'HL', '#003049', '#fcbf49', 'Harborline University', 'Harborline',
         'A big-city private school with pro connections.', '하버라인 대학교', '하버라인',
         '프로 인맥이 두터운 대도시 사립대.'),
        ('old_colony', 'OC', '#540b0e', '#e09f3e', 'Old Colony College', 'Old Colony',
         'One of the oldest programs in the country, and proud of it.', '올드 콜로니 칼리지', '올드 콜로니',
         '국내에서 가장 오래된 프로그램 중 하나, 그리고 그 사실이 자랑이다.'),
        ('bayshore_state', 'BS', '#0077b6', '#ffb4a2', 'Bayshore State', 'Bayshore',
         'A commuter school that is quietly building a winner.', '베이쇼어 주립대', '베이쇼어',
         '조용히 강팀을 만들어 가는 통학형 주립대.'),
        ('lighthouse_point', 'LP', '#d62828', '#eae2b7', 'Lighthouse Point University', 'Lighthouse Point',
         'A seaside campus known for its passing game.', '라이트하우스 포인트 대학교', '라이트하우스 포인트',
         '패스 게임으로 유명한 바닷가 캠퍼스.'),
        ('brickyard_institute', 'BI', '#8d0801', '#bfc0c0', 'Brickyard Institute', 'Brickyard',
         'An academic elite where football is serious but not everything.', '브릭야드 인스티튜트', '브릭야드',
         '풋볼은 진지하지만 전부는 아닌 명문 학교.'),
        ('seaboard_technical', 'ST', '#1d3557', '#a8dadc', 'Seaboard Technical', 'Seaboard',
         'A tech school that wins with film study and discipline.', '시보드 테크니컬', '시보드',
         '필름 분석과 규율로 이기는 공대.'),
        ('kings_ferry', 'KF', '#3c096c', '#ff9e00', 'Kings Ferry University', 'Kings Ferry',
         'A river-town rival that circles one game every year.', '킹스 페리 대학교', '킹스 페리',
         '매년 단 한 경기에 동그라미를 치는 강변 도시의 라이벌.'),
        ('elm_hollow', 'EH', '#386641', '#f2e8cf', 'Elm Hollow College', 'Elm Hollow',
         'A small liberal-arts college with a stubborn defense.', '엘름 할로우 칼리지', '엘름 할로우',
         '고집스러운 수비를 가진 작은 인문대학.'),
    ],
    'world_conference_sundown': [
        ('canyon_ridge', 'CR', '#9c6644', '#1b263b', 'Canyon Ridge University', 'Canyon Ridge',
         'A desert power with a deep-shot offense.', '캐니언 리지 대학교', '캐니언 리지',
         '롱패스 공격을 앞세운 사막의 강호.'),
        ('mirage_state', 'MS', '#e76f51', '#2a9d8f', 'Mirage State', 'Mirage',
         'Flashy uniforms, fast receivers and big crowds.', '미라지 주립대', '미라지',
         '화려한 유니폼, 빠른 리시버, 많은 관중.'),
        ('saguaro_valley', 'SV', '#606c38', '#fefae0', 'Saguaro Valley University', 'Saguaro Valley',
         'A growing program with money to spend and something to prove.', '사와로 밸리 대학교', '사와로 밸리',
         '쓸 돈이 있고 증명할 것도 있는 성장 중인 프로그램.'),
        ('surfside_polytechnic', 'SX', '#00b4d8', '#03045e', 'Surfside Polytechnic', 'Surfside',
         'A beach campus that loves tempo and trick plays.', '서프사이드 공과대', '서프사이드',
         '빠른 템포와 트릭 플레이를 사랑하는 해변 캠퍼스.'),
        ('goldvein', 'GV', '#b08968', '#212529', 'Goldvein University', 'Goldvein',
         'An old mining-town school with a famous rivalry.', '골드베인 대학교', '골드베인',
         '유명한 라이벌전을 가진 옛 광산 도시의 학교.'),
        ('redrock_state', 'RS', '#ae2012', '#ee9b00', 'Redrock State', 'Redrock',
         'Hot afternoons and a defense built to wear you down.', '레드록 주립대', '레드록',
         '뜨거운 오후, 상대를 지치게 만드는 수비.'),
        ('vista_del_mar', 'VM', '#118ab2', '#ffd166', 'Vista del Mar University', 'Vista del Mar',
         'An academic coastal school that develops quarterbacks.', '비스타 델 마르 대학교', '비스타 델 마르',
         '쿼터백을 길러 내는 학구적인 해안 학교.'),
        ('sunfire_college', 'SC', '#f48c06', '#370617', 'Sunfire College', 'Sunfire',
         'A small college with a loud band and no fear.', '선파이어 칼리지', '선파이어',
         '요란한 밴드와 두려움 없는 작은 대학.'),
    ],
}


def camel(value):
    head, *rest = value.split('_')
    return head + ''.join(part[:1].upper() + part[1:] for part in rest)


en, ko = {}, {}
conferences = []
for cid, key, en_name, ko_name, en_short, ko_short, en_desc, ko_desc in CONFERENCES:
    base = f'm8World.conferences.{key}'
    en[f'{base}.name'], ko[f'{base}.name'] = en_name, ko_name
    en[f'{base}.shortName'], ko[f'{base}.shortName'] = en_short, ko_short
    en[f'{base}.description'], ko[f'{base}.description'] = en_desc, ko_desc
    conferences.append({'id': cid, 'nameKey': f'{base}.name', 'shortNameKey': f'{base}.shortName',
                        'descriptionKey': f'{base}.description'})

programs = []
for conference_id, rows in PROGRAMS.items():
    assert len(rows) == 8, conference_id
    for slug, monogram, primary, secondary, en_name, en_short, en_desc, ko_name, ko_short, ko_desc in rows:
        base = f'm8World.programs.{camel(slug)}'
        en[f'{base}.name'], ko[f'{base}.name'] = en_name, ko_name
        en[f'{base}.shortName'], ko[f'{base}.shortName'] = en_short, ko_short
        en[f'{base}.description'], ko[f'{base}.description'] = en_desc, ko_desc
        programs.append({'id': f'program_{slug}', 'conferenceId': conference_id, 'monogram': monogram,
                         'primary': primary, 'secondary': secondary, 'nameKey': f'{base}.name',
                         'shortNameKey': f'{base}.shortName', 'descriptionKey': f'{base}.description'})

ids = [entry['id'] for entry in programs]
assert len(ids) == 32 and len(set(ids)) == 32
assert set(en) == set(ko)


def ts(value):
    return json.dumps(value, ensure_ascii=False, indent=2)


content = f"""// Generated by scripts/generate-world-content.py; edit the table there, not this file.
export const conferenceIdentitiesVNext = {ts(conferences)} as const;

export const addedProgramsVNext = {ts(programs)} as const;
"""
with open('packages/game-content/src/content/world-vnext-programs.ts', 'w', encoding='utf-8', newline='\n') as handle:
    handle.write(content)

locale = f"""// Generated by scripts/generate-world-content.py; edit the table there, not this file.
export const enUSWorldMessages = {ts(dict(sorted(en.items())))} as const;

export const koKRWorldMessages = {ts(dict(sorted(ko.items())))} as const satisfies Record<
  keyof typeof enUSWorldMessages,
  string
>;
"""
with open('packages/game-content/src/locales/m8-world.ts', 'w', encoding='utf-8', newline='\n') as handle:
    handle.write(locale)
print('generated', len(programs), 'programs,', len(conferences), 'conferences,', len(en), 'messages')

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

# M9: four more programs per conference (8 conferences of 12). Same row shape as PROGRAMS.
PROGRAMS_96 = {
    'world_group_foundry': [
        ('forge_hollow', 'FH', '#5c3d2e', '#e0a458', 'Forge Hollow University', 'Forge Hollow',
         'A river-valley school that still rings the old foundry bell after wins.', '포지 할로우 대학교', '포지 할로우',
         '승리하면 아직도 옛 주물 공장의 종을 울리는 강 계곡의 학교.'),
        ('millbrook_state', 'MB', '#264653', '#e9c46a', 'Millbrook State', 'Millbrook',
         'Patient, physical and proud of its walk-on tradition.', '밀브룩 주립대', '밀브룩',
         '인내심 있고 거칠며 워크온 전통을 자랑스러워한다.'),
        ('anvil_point', 'AP', '#3a3a3a', '#d00000', 'Anvil Point College', 'Anvil Point',
         'A small engineering college with an ironclad defense.', '앤빌 포인트 칼리지', '앤빌 포인트',
         '철벽 수비를 가진 작은 공학 대학.'),
        ('riveton_college', 'RV', '#1b4965', '#fca311', 'Riveton College', 'Riveton',
         'A shipyard-town program that plays every snap like overtime.', '리베턴 칼리지', '리베턴',
         '모든 스냅을 연장전처럼 뛰는 조선소 도시의 프로그램.'),
    ],
    'world_group_horizon': [
        ('pinecrest_tech', 'PC', '#2d6a4f', '#b7e4c7', 'Pinecrest Tech', 'Pinecrest',
         'A mountain tech school that loves tempo and trick plays.', '파인크레스트 공과대', '파인크레스트',
         '빠른 템포와 트릭 플레이를 좋아하는 산악 공대.'),
        ('sierra_vale', 'SV', '#6d6875', '#ffcdb2', 'Sierra Vale University', 'Sierra Vale',
         'Foothill campus, big skies and a deep passing game.', '시에라 베일 대학교', '시에라 베일',
         '산기슭 캠퍼스, 넓은 하늘, 롱패스 공격.'),
        ('mesa_alta', 'MA', '#bc6c25', '#283618', 'Mesa Alta State', 'Mesa Alta',
         'A high-desert state school built on speed.', '메사 알타 주립대', '메사 알타',
         '스피드 위에 세워진 고원 사막의 주립대.'),
        ('driftwood', 'DW', '#8d99ae', '#2b2d42', 'Driftwood University', 'Driftwood',
         'A coastal program rebuilding around young talent.', '드리프트우드 대학교', '드리프트우드',
         '어린 재능을 중심으로 재건 중인 해안 프로그램.'),
    ],
    'world_group_lakes': [
        ('ice_harbor', 'IH', '#468faf', '#f1faee', 'Ice Harbor University', 'Ice Harbor',
         'Snow games are home games here.', '아이스 하버 대학교', '아이스 하버',
         '여기서는 눈 오는 날의 경기가 곧 홈 경기다.'),
        ('north_shore_state', 'NS', '#023e8a', '#ffd166', 'North Shore State', 'North Shore',
         'A lakeside state school with a loud student section.', '노스 쇼어 주립대', '노스 쇼어',
         '시끄러운 학생석을 가진 호숫가 주립대.'),
        ('birchwood', 'BW', '#7f5539', '#f5ebe0', 'Birchwood College', 'Birchwood',
         'A liberal-arts college that recruits smart, versatile players.', '버치우드 칼리지', '버치우드',
         '영리하고 다재다능한 선수를 모으는 인문대학.'),
        ('lakehaven', 'LH', '#0096c7', '#023047', 'Lakehaven University', 'Lakehaven',
         'An old rival of every lake school, and happy about it.', '레이크헤이븐 대학교', '레이크헤이븐',
         '모든 호숫가 학교의 오랜 라이벌이며, 그걸 즐긴다.'),
    ],
    'world_group_summit': [
        ('riverbend_state', 'RB', '#386641', '#a7c957', 'Riverbend State', 'Riverbend',
         'A river-town program that runs the ball in every weather.', '리버벤드 주립대', '리버벤드',
         '어떤 날씨에도 공을 달리게 하는 강변 도시의 프로그램.'),
        ('harbor_heights', 'HH', '#14213d', '#e5e5e5', 'Harbor Heights University', 'Harbor Heights',
         'A hilltop campus overlooking the port, known for its defense.', '하버 하이츠 대학교', '하버 하이츠',
         '항구가 내려다보이는 언덕 위 캠퍼스, 수비로 유명하다.'),
        ('stillwater_college', 'SC', '#6c757d', '#ffb703', 'Stillwater College', 'Stillwater',
         'A quiet college that develops linemen patiently.', '스틸워터 칼리지', '스틸워터',
         '라인맨을 차분히 키워 내는 조용한 대학.'),
        ('willow_creek', 'WC', '#606c38', '#fefae0', 'Willow Creek University', 'Willow Creek',
         'A small program with a fearless kicking game.', '윌로 크리크 대학교', '윌로 크리크',
         '두려움 없는 킥 게임을 가진 작은 프로그램.'),
    ],
    'world_conference_delta': [
        ('marshgate', 'MG', '#335c67', '#e09f3e', 'Marshgate University', 'Marshgate',
         'Night games under the moss-draped oaks.', '마시게이트 대학교', '마시게이트',
         '이끼 드리운 참나무 아래의 야간 경기.'),
        ('live_oak_state', 'LO', '#2b9348', '#eeef20', 'Live Oak State', 'Live Oak',
         'A state school with deep roots and deeper traditions.', '라이브 오크 주립대', '라이브 오크',
         '깊은 뿌리와 더 깊은 전통을 가진 주립대.'),
        ('crescent_bay', 'CY', '#9a031e', '#fb8b24', 'Crescent Bay University', 'Crescent Bay',
         'A port-city school with a brass band that never stops.', '크레센트 베이 대학교', '크레센트 베이',
         '쉬지 않는 브라스 밴드를 가진 항구 도시의 학교.'),
        ('magnolia_bend', 'MN', '#f4acb7', '#3c1642', 'Magnolia Bend College', 'Magnolia Bend',
         'Small, loud and dangerous in November.', '매그놀리아 벤드 칼리지', '매그놀리아 벤드',
         '작고 시끄러우며 11월에 위험한 팀.'),
    ],
    'world_conference_frontier': [
        ('prairie_rose', 'PR', '#9d4edd', '#e0aaff', 'Prairie Rose University', 'Prairie Rose',
         'A farm-country university with a stubborn defense.', '프레리 로즈 대학교', '프레리 로즈',
         '고집스러운 수비를 가진 농촌 지역의 대학교.'),
        ('wolf_creek_state', 'WF', '#495057', '#adb5bd', 'Wolf Creek State', 'Wolf Creek',
         'A windswept campus where the ground game rules.', '울프 크리크 주립대', '울프 크리크',
         '바람 부는 캠퍼스, 러싱 게임이 지배한다.'),
        ('high_line_tech', 'HL', '#003049', '#f77f00', 'High Line Tech', 'High Line',
         'A railroad-built tech school with a spread offense.', '하이 라인 공과대', '하이 라인',
         '스프레드 공격을 쓰는 철도 도시의 공대.'),
        ('dry_gulch', 'DG', '#a68a64', '#582f0e', 'Dry Gulch College', 'Dry Gulch',
         'A tiny college that has upset giants before.', '드라이 걸치 칼리지', '드라이 걸치',
         '이미 거인들을 쓰러뜨린 적 있는 아주 작은 대학.'),
    ],
    'world_conference_tidemark': [
        ('lamplight_college', 'LL', '#ffba08', '#3f37c9', 'Lamplight College', 'Lamplight',
         'An academic college where the library closes after the stadium.', '램프라이트 칼리지', '램프라이트',
         '경기장보다 도서관이 늦게 문을 닫는 학구적인 대학.'),
        ('tidewell_state', 'TW', '#0077b6', '#90e0ef', 'Tidewell State', 'Tidewell',
         'A commuter state school with a rising defense.', '타이드웰 주립대', '타이드웰',
         '떠오르는 수비를 가진 통학형 주립대.'),
        ('foghorn_institute', 'FI', '#5a189a', '#c77dff', 'Foghorn Institute', 'Foghorn',
         'A maritime institute that plays in the fog every October.', '포그혼 인스티튜트', '포그혼',
         '10월마다 안개 속에서 경기하는 해양 학교.'),
        ('brambleton', 'BT', '#6a040f', '#f8f9fa', 'Brambleton University', 'Brambleton',
         'A historic campus with a bitter cross-town rival.', '브램블턴 대학교', '브램블턴',
         '지독한 지역 라이벌을 가진 유서 깊은 캠퍼스.'),
    ],
    'world_conference_sundown': [
        ('sunstone_state', 'SS', '#f3722c', '#277da1', 'Sunstone State', 'Sunstone',
         'A fast-growing desert school that throws on every down.', '선스톤 주립대', '선스톤',
         '모든 다운에서 패스를 던지는 급성장 중인 사막 학교.'),
        ('palo_seco', 'PS', '#90be6d', '#43aa8b', 'Palo Seco University', 'Palo Seco',
         'A mission-town university with a patient defense.', '팔로 세코 대학교', '팔로 세코',
         '인내심 있는 수비를 가진 미션 도시의 대학교.'),
        ('desert_wind', 'DE', '#e9c46a', '#264653', 'Desert Wind College', 'Desert Wind',
         'Hot afternoons and a relentless pass rush.', '데저트 윈드 칼리지', '데저트 윈드',
         '뜨거운 오후와 쉴 새 없는 패스 러시.'),
        ('coral_bay', 'CR', '#ff006e', '#3a86ff', 'Coral Bay University', 'Coral Bay',
         'A beach campus with a flashy offense and loud fans.', '코럴 베이 대학교', '코럴 베이',
         '화려한 공격과 시끄러운 팬을 가진 해변 캠퍼스.'),
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

programs96 = []
for conference_id, rows in PROGRAMS_96.items():
    assert len(rows) == 4, conference_id
    for slug, monogram, primary, secondary, en_name, en_short, en_desc, ko_name, ko_short, ko_desc in rows:
        base = f'm9World.programs.{camel(slug)}'
        en[f'{base}.name'], ko[f'{base}.name'] = en_name, ko_name
        en[f'{base}.shortName'], ko[f'{base}.shortName'] = en_short, ko_short
        en[f'{base}.description'], ko[f'{base}.description'] = en_desc, ko_desc
        programs96.append({'id': f'program_{slug}', 'conferenceId': conference_id, 'monogram': monogram,
                           'primary': primary, 'secondary': secondary, 'nameKey': f'{base}.name',
                           'shortNameKey': f'{base}.shortName', 'descriptionKey': f'{base}.description'})

ids = [entry['id'] for entry in programs]
assert len(ids) == 32 and len(set(ids)) == 32
ids96 = [entry['id'] for entry in programs96]
assert len(ids96) == 32 and len(set(ids + ids96)) == 64
assert set(en) == set(ko)


def ts(value):
    return json.dumps(value, ensure_ascii=False, indent=2)


content = f"""// Generated by scripts/generate-world-content.py; edit the table there, not this file.
export const conferenceIdentitiesVNext = {ts(conferences)} as const;

export const addedProgramsVNext = {ts(programs)} as const;

/** M9: four more programs per conference (8 conferences of 12). */
export const addedPrograms96VNext = {ts(programs96)} as const;
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

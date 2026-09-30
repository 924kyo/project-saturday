"""Generates program culture: mascot, tradition and atmosphere for all 96 programs.

Outputs:
  packages/game-content/src/content/program-culture.generated.ts
  packages/game-content/src/locales/m12-programs.ts

Mascots are original; each maps to one of 24 emblem types so a small art set (tinted in each
program's colors) covers the whole world. Well-known real mascot names are avoided on purpose.
"""
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

EMBLEMS = [
    'bird_raptor', 'bird_owl', 'bird_sea', 'phoenix', 'wolf', 'fox', 'bear', 'big_cat', 'bison',
    'stallion', 'ram', 'stag', 'boar', 'serpent', 'reptile', 'scorpion', 'sea_creature', 'mariner',
    'smith', 'miner', 'knight', 'storm', 'lantern', 'grove',
]

# program id suffix: (mascot en, mascot ko, emblem, tradition id)
MASCOTS = {
    'ember_peak_polytechnic': ('Firebirds', '파이어버즈', 'phoenix', 'torch'),
    'capital_commonwealth': ('Sentinels', '센티넬스', 'knight', 'hymn'),
    'cascade_tech': ('Kingfishers', '킹피셔스', 'bird_sea', 'sunrise'),
    'gulf_meridian': ('Tarpons', '타폰스', 'sea_creature', 'horn'),
    'high_desert_state': ('Coyotes', '코요테스', 'fox', 'sand'),
    'ironwood': ('Timber Bears', '팀버 베어스', 'bear', 'stone'),
    'lakefront_union': ('Voyageurs', '보야저스', 'mariner', 'march'),
    'northstar_college': ('Owls', '아울스', 'bird_owl', 'library'),
    'prairie_forge': ('Hammers', '해머스', 'smith', 'bell'),
    'redwood_bay': ('Redtails', '레드테일스', 'bird_raptor', 'flag'),
    'solis_coast': ('Sunrays', '선레이즈', 'phoenix', 'lights'),
    'crown_sound': ('Monarchs', '모나크스', 'knight', 'homecoming'),
    'amber_coast': ('Sandpipers', '샌드파이퍼스', 'bird_sea', 'tide'),
    'ashgrove_state': ('Gray Foxes', '그레이 폭시스', 'fox', 'sunrise'),
    'blue_ridge_institute': ('Ridgebacks', '리지백스', 'wolf', 'helmet'),
    'copperfield': ('Copperheads', '코퍼헤즈', 'serpent', 'goalpost'),
    'delta_vale': ('Herons', '헤런스', 'bird_sea', 'march'),
    'eastern_pines': ('Pine Martens', '파인 마튼스', 'fox', 'hymn'),
    'fairwind': ('Windhawks', '윈드호크스', 'bird_raptor', 'flag'),
    'frostline_state': ('Snow Owls', '스노 아울스', 'bird_owl', 'snow'),
    'granite_harbor': ('Stevedores', '스티브도어스', 'mariner', 'horn'),
    'juniper_plains': ('Pronghorns', '프롱혼스', 'stag', 'sand'),
    'kingsport_technical': ('Machinists', '머시니스츠', 'smith', 'helmet'),
    'lantern_city': ('Lamplighters', '램프라이터스', 'lantern', 'lanterns'),
    'marshland_a_and_m': ('Cottonmouths', '코튼마우스', 'serpent', 'silent'),
    'oak_river': ('Stags', '스태그스', 'stag', 'homecoming'),
    'palisade': ('Sentries', '센트리스', 'knight', 'silent'),
    'quartz_hill': ('Prospectors', '프로스펙터스', 'miner', 'stone'),
    'rivergate': ('River Hawks', '리버 호크스', 'bird_raptor', 'march'),
    'sagebrush_university': ('Sidewinders', '사이드와인더스', 'serpent', 'sunrise'),
    'tidewater_polytechnic': ('Navigators', '내비게이터스', 'mariner', 'tide'),
    'western_orchard': ('Harvesters', '하비스터스', 'grove', 'goalpost'),
    'cypress_bend': ('Caimans', '카이먼스', 'reptile', 'night'),
    'saltmarsh_state': ('Marsh Hawks', '마시 호크스', 'bird_raptor', 'drum'),
    'bellwater': ('Barons', '배런스', 'knight', 'hymn'),
    'red_clay_college': ('Mules', '뮬스', 'stallion', 'helmet'),
    'lowcountry_tech': ('Gearheads', '기어헤즈', 'smith', 'library'),
    'pinehaven': ('Bobcats', '밥캣츠', 'big_cat', 'rally'),
    'sugarmill_state': ('Millers', '밀러스', 'smith', 'march'),
    'bayou_crest': ('Night Owls', '나이트 아울스', 'bird_owl', 'night'),
    'windrow_state': ('Haymakers', '헤이메이커스', 'grove', 'sunrise'),
    'badlands_college': ('Bighorns', '빅혼스', 'ram', 'sand'),
    'silverpine': ('Lynx', '링크스', 'big_cat', 'snow'),
    'thunder_basin_state': ('Thunderheads', '선더헤즈', 'storm', 'drum'),
    'cedar_mesa': ('Mesa Hawks', '메사 호크스', 'bird_raptor', 'torch'),
    'ironhorse_tech': ('Ironhorses', '아이언호시스', 'stallion', 'bell'),
    'stonefield': ('Masons', '메이슨스', 'smith', 'stone'),
    'bison_ridge': ('Ridge Bison', '리지 바이슨', 'bison', 'goalpost'),
    'harborline': ('Harbormasters', '하버마스터스', 'mariner', 'lights'),
    'old_colony': ('Founders', '파운더스', 'knight', 'hymn'),
    'bayshore_state': ('Sand Crabs', '샌드 크랩스', 'sea_creature', 'drum'),
    'lighthouse_point': ('Keepers', '키퍼스', 'lantern', 'lanterns'),
    'brickyard_institute': ('Scholars', '스칼러스', 'bird_owl', 'library'),
    'seaboard_technical': ('Semaphores', '세마포어스', 'lantern', 'flag'),
    'kings_ferry': ('Pilots', '파일럿츠', 'mariner', 'rivalry'),
    'elm_hollow': ('Hedgehogs', '헤지호그스', 'fox', 'silent'),
    'canyon_ridge': ('Condors', '콘도르스', 'bird_raptor', 'sand'),
    'mirage_state': ('Dust Devils', '더스트 데블스', 'storm', 'lights'),
    'saguaro_valley': ('Gila Monsters', '힐라 몬스터스', 'reptile', 'rally'),
    'surfside_polytechnic': ('Breakers', '브레이커스', 'storm', 'tide'),
    'goldvein': ('Sourdoughs', '사워도스', 'miner', 'rivalry'),
    'redrock_state': ('Scorpions', '스콜피언스', 'scorpion', 'sunrise'),
    'vista_del_mar': ('Sea Lions', '시 라이언스', 'sea_creature', 'library'),
    'sunfire_college': ('Solar Flares', '솔라 플레어스', 'phoenix', 'band'),
    'forge_hollow': ('Bellforgers', '벨포저스', 'smith', 'bell'),
    'millbrook_state': ('Grindstones', '그라인드스톤스', 'smith', 'walkon'),
    'anvil_point': ('Anvils', '앤빌스', 'smith', 'stone'),
    'riveton_college': ('Riveters', '리베터스', 'smith', 'horn'),
    'pinecrest_tech': ('Nighthawks', '나이트호크스', 'bird_raptor', 'drum'),
    'sierra_vale': ('Mountain Lions', '마운틴 라이언스', 'big_cat', 'flag'),
    'mesa_alta': ('Antelope', '앤털로프', 'stag', 'sunrise'),
    'driftwood': ('Drifters', '드리프터스', 'mariner', 'homecoming'),
    'ice_harbor': ('Icebreakers', '아이스브레이커스', 'mariner', 'snow'),
    'north_shore_state': ('Lakewolves', '레이크울브스', 'wolf', 'band'),
    'birchwood': ('Loons', '룬스', 'bird_sea', 'library'),
    'lakehaven': ('Sturgeon', '스터전', 'sea_creature', 'rivalry'),
    'riverbend_state': ('River Otters', '리버 오터스', 'fox', 'march'),
    'harbor_heights': ('Sea Wolves', '시 울브스', 'wolf', 'horn'),
    'stillwater_college': ('Snapping Turtles', '스내핑 터틀스', 'reptile', 'walkon'),
    'willow_creek': ('Creek Foxes', '크리크 폭시스', 'fox', 'goalpost'),
    'marshgate': ('Marsh Owls', '마시 아울스', 'bird_owl', 'night'),
    'live_oak_state': ('Live Oaks', '라이브 오크스', 'grove', 'homecoming'),
    'crescent_bay': ('Tide Riders', '타이드 라이더스', 'mariner', 'band'),
    'magnolia_bend': ('Firebrands', '파이어브랜즈', 'phoenix', 'night'),
    'prairie_rose': ('Thornbacks', '손백스', 'boar', 'silent'),
    'wolf_creek_state': ('Gray Wolves', '그레이 울브스', 'wolf', 'march'),
    'high_line_tech': ('Locomotives', '로코모티브스', 'stallion', 'bell'),
    'dry_gulch': ('Tumbleweeds', '텀블위즈', 'storm', 'walkon'),
    'lamplight_college': ('Lanterns', '랜턴스', 'lantern', 'library'),
    'tidewell_state': ('Stingrays', '스팅레이스', 'sea_creature', 'drum'),
    'foghorn_institute': ('Fog Hounds', '포그 하운즈', 'wolf', 'horn'),
    'brambleton': ('Thornhawks', '손호크스', 'bird_raptor', 'rivalry'),
    'sunstone_state': ('Sunfalcons', '선팰컨스', 'bird_raptor', 'lights'),
    'palo_seco': ('Peccaries', '페커리스', 'boar', 'hymn'),
    'desert_wind': ('Siroccos', '시로코스', 'storm', 'sand'),
    'coral_bay': ('Barracudas', '바라쿠다스', 'sea_creature', 'band'),
}

TRADITIONS = {
    'bell': ('The team rings the old bell after every home win.', '홈에서 이기면 오래된 종을 울린다.'),
    'night': ('Home games kick off under the lights, never before dark.', '홈경기는 해가 진 뒤 조명 아래에서만 시작한다.'),
    'walkon': ('Every season a walk-on is named captain for the opener.', '매 시즌 개막전 주장은 워크온 선수가 맡는다.'),
    'band': ('The band plays until the last fan leaves the stadium.', '마지막 팬이 떠날 때까지 밴드가 연주를 멈추지 않는다.'),
    'rivalry': ('The rivalry winner keeps a hand-painted trophy for a year.', '라이벌전 승자는 손으로 칠한 트로피를 1년 동안 보관한다.'),
    'silent': ('The student section falls silent before a big stop, then erupts at the snap.', '큰 수비 다운 직전 학생석이 침묵하다가 스냅과 함께 폭발한다.'),
    'lanterns': ('The crowd raises lanterns when the fourth quarter starts.', '4쿼터가 시작되면 관중이 일제히 랜턴을 든다.'),
    'march': ('The team walks through campus to the stadium two hours before kickoff.', '킥오프 두 시간 전 선수단이 캠퍼스를 걸어 경기장으로 간다.'),
    'stone': ('Players touch the foundation stone on the way out of the tunnel.', '선수들은 터널을 나서며 경기장 초석을 손으로 짚는다.'),
    'horn': ('A ship’s horn sounds after every touchdown.', '터치다운마다 뱃고동이 울린다.'),
    'snow': ('Students who shovel the stands get in free.', '관중석 눈을 치운 학생은 무료로 입장한다.'),
    'homecoming': ('Alumni line the tunnel on homecoming weekend.', '홈커밍 주말에는 동문들이 터널 양옆에 늘어선다.'),
    'helmet': ('Freshmen earn their helmet stripe at the first practice in pads.', '신입생은 첫 패드 훈련에서 헬멧 줄무늬를 받는다.'),
    'flag': ('A student runs the school flag across the field after every score.', '득점할 때마다 학생 한 명이 교기를 들고 경기장을 가로지른다.'),
    'drum': ('The drumline leads the team off the bus.', '드럼라인이 버스에서 내리는 선수단을 이끈다.'),
    'goalpost': ('Seniors sign the goalpost pad before their last home game.', '4학년은 마지막 홈경기 전 골포스트 패드에 서명한다.'),
    'sunrise': ('Summer practice starts at sunrise on the practice hill.', '여름 훈련은 연습장 언덕에서 해 뜰 때 시작한다.'),
    'lights': ('The stadium lights flash the school colors after a win.', '이기면 경기장 조명이 학교 색으로 깜빡인다.'),
    'library': ('The library stays open until the team bus returns.', '선수단 버스가 돌아올 때까지 도서관 불이 켜져 있다.'),
    'torch': ('The mascot carries a torch out of the tunnel ahead of the team.', '마스코트가 횃불을 들고 선수단보다 먼저 터널을 나선다.'),
    'hymn': ('Win or lose, the whole stadium sings the alma mater.', '승패와 상관없이 경기장 전체가 교가를 부른다.'),
    'sand': ('Players carry a jar of home sand to every road game.', '원정 경기마다 선수들이 홈구장 흙 한 병을 가져간다.'),
    'rally': ('A night rally on the quad opens rivalry week.', '라이벌 주간은 중앙 광장의 밤 응원 집회로 시작한다.'),
    'tide': ('Kickoff is set by the tide chart for the pregame boat parade.', '경기 전 보트 퍼레이드에 맞춰 킥오프 시간을 물때표로 정한다.'),
}

ATMOSPHERES = {
    'loud': ('Loud crowd', '뜨거운 관중'),
    'academic': ('Academic', '학구적'),
    'smalltown': ('Small town', '작은 마을'),
    'bigcity': ('Big city', '대도시'),
    'coastal': ('Coastal', '해안'),
    'mountain': ('Mountain', '산악'),
    'desert': ('Desert', '사막'),
    'bayou': ('Bayou', '늪지대'),
    'plains': ('Plains', '평원'),
    'lakes': ('Lake country', '호수 지대'),
    'cold': ('Cold weather', '추운 날씨'),
    'historic': ('Historic', '유서 깊은'),
    'rising': ('Rising', '상승세'),
    'bluecollar': ('Blue-collar', '노동자 정신'),
    'flashy': ('Flashy', '화려한'),
    'defense': ('Defense first', '수비 우선'),
    'tech': ('Engineering school', '공과대'),
    'river': ('River town', '강변 도시'),
    'night': ('Night games', '야간 경기'),
    'underdog': ('Underdog', '언더독'),
    'power': ('National power', '전국 강호'),
}

# (atmosphere, words in the id or the English description), first matches win, at most three.
RULES = [
    ('power', ['national power', 'traditional power', 'contend every season', 'titles', 'desert power']),
    ('underdog', ['upset', 'bigger than', 'overlooked', 'tiny']),
    ('rising', ['rising', 'growing', 'rebuilding', 'building', 'ambitious', 'something to prove']),
    ('tech', ['tech', 'polytechnic', 'institute', 'technical', 'engineering']),
    ('academic', ['academic', 'liberal-arts', 'library']),
    ('loud', ['loud', 'crowd', 'fans', 'band', 'student section', 'shakes', 'pageantry']),
    ('night', ['night']),
    ('defense', ['defense', 'defensive', 'pass rush']),
    ('flashy', ['flashy', 'tempo', 'trick', 'inventive', 'downfield', 'deep-shot', 'deep passing']),
    ('bluecollar', ['blue-collar', 'toughness', 'physical', 'hard practices', 'railroad', 'foundry', 'mining', 'shipyard', 'workshop', 'grinding', 'walk-on']),
    ('historic', ['oldest', 'old money', 'historic', 'deep roots', 'traditions', 'old rival']),
    ('bigcity', ['metropolitan', 'big-city', 'urban', 'major market', 'port-city', 'commuter', 'capital']),
    ('smalltown', ['small', 'quiet', 'compact', 'college town', 'remote']),
    ('coastal', ['coast', 'bay', 'harbor', 'shore', 'sea', 'surf', 'tide', 'coral', 'lighthouse', 'port', 'beach', 'atlantic', 'gulf', 'maritime', 'fog']),
    ('mountain', ['mountain', 'peak', 'ridge', 'sierra', 'high-country', 'thin-air', 'foothill', 'silverpine']),
    ('desert', ['desert', 'mesa', 'canyon', 'sage', 'saguaro', 'dry', 'redrock', 'mirage', 'sun', 'hot afternoons']),
    ('bayou', ['bayou', 'marsh', 'cypress', 'lowcountry', 'lowland', 'magnolia', 'moss']),
    ('plains', ['prairie', 'plains', 'heartland', 'farm', 'badlands', 'bison', 'windswept', 'inland']),
    ('lakes', ['lake', 'great lakes']),
    ('cold', ['frost', 'snow', 'ice', 'northern', 'north']),
    ('river', ['river']),
]


def camel(suffix: str) -> str:
    head, *rest = suffix.split('_')
    return head + ''.join(part.capitalize() for part in rest)


def main() -> None:
    # Program names and descriptions come from the built content package (run its build first).
    probe = (
        "import { programIdentitiesVNext } from './dist/content/index.js';"
        "import { enUSMessages } from './dist/index.js';"
        "console.log(JSON.stringify(programIdentitiesVNext.map((p) =>"
        " [p.id, enUSMessages[p.nameKey], enUSMessages[p.descriptionKey]])));"
    )
    result = subprocess.run(['node', '--input-type=module', '-e', probe], check=True,
                            capture_output=True, text=True, encoding='utf-8',
                            cwd=ROOT / 'packages/game-content')
    programs = [tuple(row) for row in json.loads(result.stdout)]
    assert len(programs) == 96, len(programs)
    rows, messages = [], {}
    used_mascots = set()
    for pid, en, description in programs:
        suffix = pid[len('program_'):]
        mascot_en, mascot_ko, emblem, tradition = MASCOTS[suffix]
        assert emblem in EMBLEMS, emblem
        assert tradition in TRADITIONS, tradition
        assert mascot_en not in used_mascots, mascot_en
        used_mascots.add(mascot_en)
        text = f'{suffix.replace("_", " ")} {en} {description}'.lower()
        tags = []
        for tag, words in RULES:
            if len(tags) == 3:
                break
            if any(re.search(r'\b' + re.escape(word), text) for word in words):
                tags.append(tag)
        if not tags:
            tags.append('smalltown')
        key = camel(suffix)
        messages[f'v2.program.{key}.mascot'] = (mascot_en, mascot_ko)
        rows.append({'programId': pid, 'mascotKey': f'v2.program.{key}.mascot', 'emblem': emblem,
                     'tradition': tradition, 'atmospheres': tags})
    for tradition, pair in TRADITIONS.items():
        messages[f'v2.tradition.{tradition}'] = pair
    for tag, pair in ATMOSPHERES.items():
        messages[f'v2.atmosphere.{tag}'] = pair
    used = {tag for row in rows for tag in row['atmospheres']}
    content = ROOT / 'packages/game-content/src/content/program-culture.generated.ts'
    content.write_text(
        '// Generated by scripts/generate-program-culture.py. Edit the generator, not this file.\n'
        "import type { ProgramCultureRow } from './program-culture.js';\n\n"
        f'export const PROGRAM_EMBLEMS = {json.dumps(EMBLEMS)} as const;\n\n'
        f'export const PROGRAM_CULTURE_ROWS: readonly ProgramCultureRow[] = {json.dumps(rows, ensure_ascii=False, indent=2)};\n',
        encoding='utf-8', newline='\n')
    pairs = ',\n'.join(f'  {json.dumps(k)}: [{json.dumps(v[0], ensure_ascii=False)}, {json.dumps(v[1], ensure_ascii=False)}]'
                       for k, v in messages.items())
    locale = ROOT / 'packages/game-content/src/locales/m12-programs.ts'
    locale.write_text(
        '// Generated by scripts/generate-program-culture.py. Edit the generator, not this file.\n'
        '/** Program culture: mascots, traditions and atmosphere tags. */\n'
        'type Pair = readonly [en: string, ko: string];\n\n'
        f'const rows = {{\n{pairs},\n}} as const satisfies Record<string, Pair>;\n\n'
        'function messages(index: 0 | 1) {\n'
        '  return Object.fromEntries(Object.entries(rows).map(([key, pair]) => [key, pair[index]])) as {\n'
        '    readonly [K in keyof typeof rows]: string;\n  };\n}\n\n'
        'export const enUSM12ProgramMessages = messages(0);\n'
        'export const koKRM12ProgramMessages = messages(1);\n',
        encoding='utf-8', newline='\n')
    print(len(rows), 'programs;', len(messages), 'paired strings;', len(used), 'atmospheres used')
    for row in rows[:6] + rows[-4:]:
        print(row['programId'], row['atmospheres'])


if __name__ == '__main__':
    main()

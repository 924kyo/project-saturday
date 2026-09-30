"""M11 snap looks: one authoring table for the hidden looks behind every Saturday decision.

Writes packages/game-content/src/content/snap-looks.ts (definitions) and
packages/game-content/src/locales/m11-looks.ts (paired en-US/ko-KR copy), so the two locales
cannot drift. Run from the repository root: python scripts/generate-snap-looks.py

Per decision family:
- two base looks are the shipped patterns (their names, tells and fits);
- one new look makes the family's third technique the winning read;
- two disguises share a base look's alignment and first tell, but their later tells (and the
  movements those tells expose on the board) point to a different winning read.
Korean register: -다 for tells (narration), noun phrases for names.
"""

import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def camel(*parts):
    words = []
    for part in parts:
        words += [w for w in re.split(r'[^a-zA-Z0-9]+', part) if w]
    return words[0].lower() + ''.join(w[:1].upper() + w[1:] for w in words[1:])


def M(actor, to, reveal):
    return {'actor': actor, 'to': to, 'reveal': reveal}


# Position → (decision id prefix, pattern id prefix, family id prefix)
PREFIX = {
    'position_qb': ('key_snap_decision_qb_', 'key_snap_pattern_qb_', 'key_snap_family_qb_'),
    'position_rb': ('key_snap_decision_rb_', 'key_snap_pattern_rb_', 'key_snap_family_rb_'),
    'position_wr': ('key_snap_decision_', 'key_snap_pattern_', 'key_snap_family_'),
    'position_cb': ('key_snap_decision_cb_', 'key_snap_pattern_cb_', 'key_snap_family_cb_'),
    'position_lb': ('key_snap_decision_lb_', 'key_snap_pattern_lb_', 'key_snap_family_lb_'),
    'position_edge': ('key_snap_decision_edge_', 'key_snap_pattern_edge_', 'key_snap_family_edge_'),
}

# Each family: position, family slug, (name en, ko) or None to reuse the shipped family name,
# prompt (en, ko), base looks, the new look, and two disguises.
# base: (pattern slug, stance, moves, wr_tells or None)
# new: (slug, (name en, ko), [3 tells], {decision slug: fit}, stance, moves)
# disguise: (slug, of base index, (name en, ko), [tell2, tell3], fits_from, moves)
#   fits_from: 'base0' | 'base1' | 'new'
FAMILIES = [
    # ---------------- QB ----------------
    dict(pos='position_qb', fam='pre_snap', name=('Pre-snap read', '스냅 전 판단'),
         prompt=('Read the shell and the pressure before the ball is snapped.',
                 '스냅 전에 수비 셸과 압박을 읽는다.'),
         base=[
             ('split_safety_alert', {'shell': 'two_high', 'nickel': 'inside', 'backers': 'normal'},
              [M('nickel', 'drop_hook', 2), M('fs', 'drop_deep', 3)], None),
             ('pressure_surface', {'shell': 'one_high', 'backers': 'shallow', 'nickel': 'walked_up'},
              [M('will', 'blitz_edge', 1), M('dt1', 'rush_inside', 2), M('nickel', 'blitz_edge', 3)], None),
         ],
         new=('mugged', ('Mugged A gaps', 'A갭 머그'),
              [('Two linebackers stand in the A gaps.', '라인배커 둘이 A갭에 서 있다.'),
               ('The line keeps shifting its weight before the snap.', '라인이 스냅 전 계속 무게를 옮긴다.'),
               ('The safeties sit at eight yards, ready to spin.', '세이프티들이 8야드에서 회전할 준비를 한다.')],
              {'confirm_shell': 44, 'redirect_protection': 66, 'vary_cadence': 92},
              {'shell': 'two_high', 'backers': 'mugged'},
              [M('mike', 'blitz_a', 2), M('will', 'drop_hook', 3), M('fs', 'rotate_middle', 3)]),
         disguises=[
             ('late_rotation', 0, ('Late rotation blitz', '늦은 회전 블리츠'),
              [('The nickel shifts his weight onto his outside foot.', '니켈이 바깥발에 체중을 싣는다.'),
               ('A safety creeps toward the box at the last second.', '세이프티 하나가 마지막 순간 박스로 다가온다.')],
              'base1', [M('ss', 'rotate_down', 2), M('nickel', 'blitz_edge', 2), M('will', 'blitz_edge', 3)]),
             ('simulated', 1, ('Simulated pressure', '위장 압박'),
              [('The creeping linebacker watches the back, not the ball.', '전진한 라인배커가 공이 아니라 백을 본다.'),
               ('The deep safety widens to split the field.', '깊은 세이프티가 필드를 나누려고 넓어진다.')],
              'new', [M('will', 'drop_hook', 2), M('fs', 'rotate_middle', 3), M('dt1', 'stall', 3)]),
         ]),
    dict(pos='position_qb', fam='pocket', name=('Pocket movement', '포켓 움직임'),
         prompt=('The rush is coming. Find a place to throw from.', '러시가 온다. 던질 자리를 찾는다.'),
         base=[
             ('edge_escape', {'edge': 'wide', 'front': 'even'},
              [M('de_top', 'rush_outside', 1), M('dt1', 'rush_inside', 2)], None),
             ('interior_squeeze', {'edge': 'tight', 'front': 'even'},
              [M('de_top', 'rush_outside', 1), M('dt1', 'rush_inside', 2), M('dt2', 'rush_inside', 3)], None),
         ],
         new=('twist', ('Tackle-end twist', '태클-엔드 트위스트'),
              [('The end and tackle line up shoulder to shoulder.', '엔드와 태클이 어깨를 맞대고 선다.'),
               ('The tackle crashes hard across the guard.', '태클이 가드 앞을 강하게 가로지른다.'),
               ('The end loops late behind him.', '엔드가 그 뒤로 늦게 돌아 들어온다.')],
              {'climb_pocket': 58, 'reset_platform': 92, 'escape_edge': 46},
              {'edge': 'tight', 'front': 'loaded'},
              [M('dt1', 'crash', 2), M('de_top', 'loop', 3)]),
         disguises=[
             ('wide_rush', 0, ('Wide rush, soft middle', '넓은 러시, 빈 중앙'),
              [('Both edges keep running upfield past you.', '양쪽 에지가 당신을 지나 위로 계속 달린다.'),
               ('The middle of the line gets pushed back.', '라인 중앙이 뒤로 밀려난다.')],
              'base1', [M('de_top', 'rush_outside', 1), M('de_bot', 'rush_outside', 2), M('dt1', 'stall', 3)]),
             ('late_stunt', 1, ('Late stunt', '늦은 스턴트'),
              [('The nose stops his charge and slides sideways.', '노즈가 돌진을 멈추고 옆으로 미끄러진다.'),
               ('A looper appears from the edge.', '에지에서 돌아 들어오는 러셔가 보인다.')],
              'new', [M('dt1', 'crash', 2), M('de_top', 'loop', 3)]),
         ]),
    dict(pos='position_qb', fam='scramble', name=('Scramble decision', '스크램블 판단'),
         prompt=("You're out of the pocket. Choose how far to take it.", '포켓을 벗어났다. 어디까지 달릴지 정한다.'),
         base=[
             ('late_spy', {'backers': 'shallow', 'shell': 'two_high'},
              [M('mike', 'spy', 1), M('cb_top', 'drop_deep', 2)], None),
             ('open_lane', {'backers': 'deep', 'shell': 'two_high'},
              [M('mike', 'drop_deep', 1), M('dt1', 'rush_outside', 2)], None),
         ],
         new=('closing', ('Closing pursuit', '조여 오는 추격'),
              [('Two defenders break on you from both sides.', '수비 둘이 양쪽에서 당신에게 달려든다.'),
               ('The marker is still three yards away.', '목표 지점이 아직 3야드 남았다.'),
               ('A safety is already coming downhill.', '세이프티가 이미 내려오고 있다.')],
              {'slide_early': 93, 'reach_marker': 44, 'extend_boundary': 55},
              {'backers': 'shallow', 'shell': 'one_high'},
              [M('mike', 'close', 1), M('will', 'close', 2), M('ss', 'rotate_down', 2)]),
         disguises=[
             ('spy_steps_up', 0, ('Spy takes the sideline', '사이드라인을 막는 스파이'),
              [('The spy steps up to take away the sideline.', '스파이가 사이드라인 쪽을 막으러 올라온다.'),
               ('The middle opens once he commits.', '그가 결정하자 가운데가 열린다.')],
              'base1', [M('mike', 'close', 2), M('cb_top', 'close', 3)]),
             ('corner_peels', 1, ('Corner peels off', '떨어져 나오는 코너'),
              [('A corner leaves his man and comes at you.', '코너가 맡은 선수를 버리고 당신에게 온다.'),
               ('The safety has a downhill angle.', '세이프티가 내려오는 좋은 각도를 잡았다.')],
              'new', [M('cb_top', 'close', 2), M('ss', 'rotate_down', 3)]),
         ]),
    dict(pos='position_qb', fam='throw', name=('Where to throw', '패스 선택'),
         prompt=('The protection holds. Pick the window.', '보호가 버틴다. 던질 창을 고른다.'),
         base=[
             ('boundary_match', {'corner': 'off', 'leverage': 'outside', 'shell': 'two_high'},
              [M('wr1', 'route_corner', 0), M('cb_top', 'bail', 1), M('fs', 'drop_deep', 2)], None),
             ('layered_window', {'corner': 'off', 'shell': 'two_high', 'backers': 'shallow'},
              [M('slot', 'route_dig', 0), M('will', 'drop_hook', 1), M('fs', 'drop_deep', 2)], None),
         ],
         new=('cloud_flat', ('Cloud flat', '클라우드 플랫'),
              [('The corner squats short on your side.', '당신 쪽 코너가 짧게 자리 잡는다.'),
               ('A safety sinks over the top of the sideline.', '세이프티가 사이드라인 위쪽으로 내려앉는다.'),
               ('The back is alone in the flat.', '백이 플랫에 혼자 있다.')],
              {'take_checkdown': 92, 'attack_layered_window': 58, 'challenge_boundary': 40},
              {'corner': 'squat', 'shell': 'two_high'},
              [M('rb', 'route_flat', 0), M('ss', 'drop_deep', 2), M('cb_top', 'sink_flat', 3)]),
         disguises=[
             ('corner_bail', 0, ('Corner bail', '물러서는 코너'),
              [('The corner bails at the snap.', '코너가 스냅과 함께 물러선다.'),
               ('The hook defender vacates the middle.', '훅 수비가 가운데를 비운다.')],
              'base1', [M('cb_top', 'bail', 2), M('will', 'drop_flat', 3)]),
             ('safeties_drive', 1, ('Safeties drive down', '내려오는 세이프티'),
              [('Both safeties drive down on the intermediate routes.', '두 세이프티가 중간 루트로 내려온다.'),
               ('Nobody picks up the back.', '아무도 백을 맡지 않는다.')],
              'new', [M('fs', 'rotate_down', 2), M('ss', 'rotate_down', 3)]),
         ]),
    # ---------------- RB ----------------
    dict(pos='position_rb', fam='contact', name=('Contact', '접촉 순간'),
         prompt=('A defender is squaring you up. Choose how to take the hit.', '수비가 정면으로 온다. 충돌 방식을 고른다.'),
         base=[
             ('open_field_angle', {'backers': 'normal', 'shell': 'one_high'},
              [M('mike', 'close', 1), M('fs', 'pursue', 2)], None),
             ('square_contact', {'backers': 'shallow', 'shell': 'two_high'},
              [M('mike', 'close', 1), M('will', 'close', 3)], None),
         ],
         new=('gang_tackle', ('Gang tackle', '집단 태클'),
              [('Three defenders converge at once.', '수비 셋이 동시에 모여든다.'),
               ('One of them is reaching for the ball.', '그중 한 명이 공을 노린다.'),
               ('Your team is protecting a late lead.', '팀이 막판 리드를 지키고 있다.')],
              {'finish_forward': 64, 'make_miss': 42, 'cover_ball': 92},
              {'backers': 'shallow', 'front': 'loaded'},
              [M('mike', 'close', 1), M('will', 'close', 2), M('ss', 'close', 3)]),
         disguises=[
             ('under_control', 0, ('Under control', '자세를 잡은 수비'),
              [('The defender breaks down under control.', '수비가 자세를 낮추고 통제한다.'),
               ('There is no room to the sideline.', '사이드라인 쪽 공간이 없다.')],
              'base1', [M('mike', 'close', 2), M('cb_top', 'close', 3)]),
             ('hands_first', 1, ('Hands first', '손부터 오는 수비'),
              [('A second defender comes in high, hands first.', '두 번째 수비가 손을 먼저 뻗으며 높게 들어온다.'),
               ('The first tackler grabs your arm.', '첫 태클러가 당신의 팔을 잡는다.')],
              'new', [M('will', 'close', 2), M('ss', 'close', 3)]),
         ]),
    dict(pos='position_rb', fam='protection', name=('Pass protection', '패스 보호'),
         prompt=('The quarterback drops back. Find your rusher.', '쿼터백이 드롭한다. 막을 러셔를 찾는다.'),
         base=[
             ('delayed_edge', {'edge': 'wide', 'backers': 'normal'},
              [M('de_top', 'stall', 1), M('sam', 'blitz_edge', 2)], None),
             ('inside_pressure', {'backers': 'mugged'},
              [M('mike', 'blitz_a', 1), M('c', 'slide_away', 2)], None),
         ],
         new=('drop_eight', ('Drop eight', '드롭 에잇'),
              [('The linebackers bail at the snap.', '라인배커들이 스냅과 함께 물러난다.'),
               ('Only four rush.', '네 명만 러시한다.'),
               ('The flat is empty.', '플랫이 비어 있다.')],
              {'scan_inside': 50, 'square_anchor': 62, 'release_late': 92},
              {'backers': 'shallow', 'shell': 'two_high'},
              [M('mike', 'drop_hook', 1), M('will', 'drop_flat', 2), M('sam', 'drop_hook', 3)]),
         disguises=[
             ('edge_dart', 0, ('Edge fake, inside dart', '바깥 속임, 안쪽 돌파'),
              [('The linebacker shows edge, then darts inside.', '라인배커가 바깥을 보이다가 안쪽으로 파고든다.'),
               ('The center slides away from him.', '센터가 그 반대로 슬라이드한다.')],
              'base1', [M('will', 'blitz_a', 2), M('c', 'slide_away', 3)]),
             ('mug_drop', 1, ('Mug and drop', '머그 후 드롭'),
              [('The A-gap linebacker drops out at the snap.', 'A갭 라인배커가 스냅과 함께 빠진다.'),
               ('Your line picks up all four rushers.', '라인이 러셔 넷을 모두 잡는다.')],
              'new', [M('mike', 'drop_hook', 2), M('will', 'drop_flat', 3)]),
         ]),
    dict(pos='position_rb', fam='receiving', name=('Check-down catch', '체크다운 캐치'),
         prompt=('The ball is coming to you in the flat. Choose your finish.', '플랫에서 공이 온다. 마무리를 고른다.'),
         base=[
             ('flat_space', {'backers': 'deep', 'corner': 'off'},
              [M('will', 'drop_hook', 1), M('cb_top', 'bail', 2)], None),
             ('option_window', {'backers': 'normal', 'corner': 'off'},
              [M('will', 'drop_flat', 1), M('de_top', 'rush_outside', 2)], None),
         ],
         new=('sideline_squeeze', ('Sideline squeeze', '사이드라인 압박'),
              [('The corner sinks under your route.', '코너가 당신 루트 아래로 내려앉는다.'),
               ('Pursuit comes from inside out.', '추격이 안에서 바깥으로 온다.'),
               ('The sideline is two yards away.', '사이드라인이 2야드 앞이다.')],
              {'settle_checkdown': 66, 'turn_upfield': 44, 'secure_boundary': 92},
              {'corner': 'squat', 'backers': 'normal'},
              [M('cb_top', 'sink_flat', 1), M('will', 'pursue', 2)]),
         disguises=[
             ('flat_race', 0, ('Linebacker races to the flat', '플랫으로 달려오는 라인배커'),
              [('A linebacker races to the flat.', '라인배커가 플랫으로 달려온다.'),
               ('The quarterback needs a short, sure gain.', '쿼터백에게 짧고 확실한 전진이 필요하다.')],
              'base1', [M('will', 'drop_flat', 2), M('mike', 'pursue', 3)]),
             ('boundary_help', 1, ('Sideline help comes down', '내려오는 사이드라인 지원'),
              [('The hook defender drives on you.', '훅 수비가 당신에게 달려든다.'),
               ('Help on the sideline runs downhill.', '사이드라인 쪽 지원 수비가 내려온다.')],
              'new', [M('will', 'close', 2), M('ss', 'rotate_down', 3)]),
         ]),
    dict(pos='position_rb', fam='track', name=('Run track', '러닝 경로'),
         prompt=('The handoff is yours. Pick the lane.', '핸드오프를 받았다. 달릴 길을 고른다.'),
         base=[
             ('backside_fold', {'front': 'even', 'backers': 'normal'},
              [M('mike', 'pursue', 1), M('ss', 'rotate_down', 2), M('de_top', 'rush_outside', 3)], None),
             ('flowing_front', {'front': 'even', 'backers': 'shallow'},
              [M('will', 'pursue', 1), M('sam', 'pursue', 2)], None),
         ],
         new=('crashing_end', ('Crashing end', '크래시 엔드'),
              [('The end crashes inside at the snap.', '엔드가 스냅과 함께 안으로 파고든다.'),
               ('The corner is blocked out.', '코너가 바깥으로 밀려난다.'),
               ('Open grass waits outside the tight end.', '타이트엔드 바깥에 빈 공간이 있다.')],
              {'press_landmark': 60, 'cut_back': 46, 'bounce_edge': 92},
              {'front': 'loaded', 'formation': 'tight'},
              [M('de_top', 'crash', 1), M('cb_top', 'bail', 2)]),
         disguises=[
             ('backside_home', 0, ('Backside stays home', '뒷면이 지키는 수비'),
              [('The backside linebacker stays home.', '뒷면 라인배커가 자리를 지킨다.'),
               ('The front holds its gaps.', '프런트가 갭을 지킨다.')],
              'base1', [M('sam', 'stall', 2), M('mike', 'stall', 3)]),
             ('overflow', 1, ('Front overflows', '넘쳐 흐르는 프런트'),
              [('The whole front overflows inside.', '프런트 전체가 안쪽으로 몰린다.'),
               ('The edge crashes down.', '에지가 안으로 무너진다.')],
              'new', [M('will', 'pursue', 2), M('de_top', 'crash', 3)]),
         ]),
    # ---------------- WR ----------------
    dict(pos='position_wr', fam='release', name=None,
         prompt=('The corner is waiting at the line. Win your release.', '코너가 라인에서 기다린다. 릴리스를 이긴다.'),
         base=[
             ('boundary_jam', {'corner': 'press', 'leverage': 'outside', 'shell': 'one_high', 'split': 'wide'},
              [M('cb_top', 'press_jam', 1), M('fs', 'rotate_middle', 2)],
              [('The corner presses on your outside shoulder.', '코너가 당신 바깥 어깨에 붙어 프레스한다.'),
               ('He reaches with both hands.', '그가 양손을 뻗는다.'),
               ('No safety help over the top.', '머리 위 세이프티 도움이 없다.')]),
             ('reduced_split', {'corner': 'off', 'leverage': 'inside', 'shell': 'two_high', 'split': 'reduced'},
              [M('cb_top', 'drop_hook', 2), M('ss', 'drop_deep', 3)],
              [('You are aligned tight to the formation.', '당신은 포메이션에 가깝게 정렬했다.'),
               ('The corner sits inside with zone eyes.', '코너가 안쪽에서 존 시선으로 기다린다.'),
               ('Two safeties split the field.', '두 세이프티가 필드를 나눈다.')]),
         ],
         new=('off_cushion', ('Off cushion', '오프 쿠션'),
              [('The corner lines up eight yards off.', '코너가 8야드 떨어져 선다.'),
               ('His hips open to the sideline early.', '그의 골반이 일찍 사이드라인 쪽으로 열린다.'),
               ('The safety leans to the other side.', '세이프티가 반대쪽으로 기운다.')],
              {'speed_release': 92, 'hand_clear': 44, 'patient_feint': 64},
              {'corner': 'off', 'leverage': 'outside', 'shell': 'one_high', 'split': 'wide'},
              [M('cb_top', 'bail', 2), M('fs', 'rotate_middle', 3)]),
         disguises=[
             ('jumpy_press', 0, ('Jumpy press', '성급한 프레스'),
              [('His feet are narrow; he will jump the first move.', '발이 좁다. 첫 동작에 뛰어들 것이다.'),
               ('Safety help rolls to your side.', '세이프티 도움이 당신 쪽으로 온다.')],
              'base1', [M('cb_top', 'press_jam', 2), M('ss', 'rotate_down', 3)]),
             ('inside_hips', 1, ('Inside-hip corner', '안쪽 골반의 코너'),
              [('The corner opens his hips inside at the snap.', '코너가 스냅과 함께 골반을 안쪽으로 연다.'),
               ('Nobody sits over the top.', '머리 위에 아무도 없다.')],
              'new', [M('cb_top', 'drop_hook', 2), M('fs', 'rotate_middle', 3)]),
         ]),
    dict(pos='position_wr', fam='route', name=None,
         prompt=("You're into your stem. Choose how to break.", '스템에 들어섰다. 꺾는 방법을 고른다.'),
         base=[
             ('nickel_crossface', {'corner': 'off', 'leverage': 'inside', 'nickel': 'apex', 'shell': 'one_high'},
              [M('cb_top', 'close', 2), M('fs', 'rotate_middle', 3)],
              [('The defender plays off with inside leverage.', '수비가 안쪽 레버리지로 떨어져 있다.'),
               ('His eyes stay on you, not the quarterback.', '그의 시선이 쿼터백이 아니라 당신에게 있다.'),
               ('The middle of the field is open.', '필드 가운데가 비어 있다.')]),
             ('two_high_void', {'shell': 'two_high', 'corner': 'off', 'leverage': 'outside'},
              [M('will', 'drop_hook', 2), M('fs', 'drop_deep', 3)],
              [('Two safeties sit deep.', '두 세이프티가 깊게 있다.'),
               ('The corner plays outside leverage.', '코너가 바깥 레버리지를 잡는다.'),
               ('A void opens between the hook and the safety.', '훅 수비와 세이프티 사이에 빈 공간이 생긴다.')]),
         ],
         new=('trail', ('Trail technique', '트레일 기술'),
              [('The corner trails from behind your hip.', '코너가 당신 골반 뒤에서 따라온다.'),
               ('The deep safety is shaded away.', '깊은 세이프티가 반대쪽에 치우쳐 있다.'),
               ('Open field waits over the top.', '머리 위가 넓게 비어 있다.')],
              {'cross_face': 60, 'stack_defender': 92, 'settle_window': 48},
              {'corner': 'press', 'leverage': 'inside', 'shell': 'one_high'},
              [M('cb_top', 'press_jam', 1), M('fs', 'rotate_middle', 2)]),
         disguises=[
             ('nickel_sinks', 0, ('Nickel sinks', '내려앉는 니켈'),
              [('He drops under your break.', '그가 당신이 꺾는 지점 아래로 내려간다.'),
               ('A void opens behind him.', '그 뒤로 빈 공간이 생긴다.')],
              'base1', [M('cb_top', 'drop_hook', 2), M('fs', 'drop_deep', 3)]),
             ('safety_drives', 1, ('Safety drives down', '내려오는 세이프티'),
              [('A safety drives downhill at the snap.', '세이프티가 스냅과 함께 내려온다.'),
               ('Nobody is deep on your side.', '당신 쪽 깊은 곳에 아무도 없다.')],
              'new', [M('ss', 'rotate_down', 2), M('fs', 'rotate_middle', 3)]),
         ]),
    dict(pos='position_wr', fam='catch', name=None,
         prompt=('The ball is in the air. Choose how to finish.', '공이 떠 있다. 캐치 마무리를 고른다.'),
         base=[
             ('boundary_window', {'corner': 'off', 'leverage': 'outside', 'shell': 'two_high'},
              [M('cb_top', 'close', 2)],
              [('The corner trails you to the sideline.', '코너가 사이드라인까지 따라온다.'),
               ('He is playing your eyes, not the ball.', '그는 공이 아니라 당신 눈을 본다.'),
               ('The throw drops over your outside shoulder.', '패스가 바깥 어깨 너머로 떨어진다.')]),
             ('seam_collision', {'shell': 'one_high', 'leverage': 'head_up', 'backers': 'normal'},
              [M('fs', 'close', 2), M('mike', 'drop_hook', 3)],
              [('A single safety sits in the middle.', '세이프티 한 명이 가운데 있다.'),
               ('The linebacker is underneath you.', '라인배커가 당신 아래에 있다.'),
               ('The ball is thrown high up the seam.', '공이 심 위로 높게 온다.')]),
         ],
         new=('crowded', ('Crowded catch point', '붐비는 캐치 지점'),
              [('A defender closes from your blind side.', '수비가 보이지 않는 쪽에서 좁혀 온다.'),
               ('The safety is arriving at the catch.', '세이프티가 캐치 순간에 도착한다.'),
               ('The ball is thrown into traffic.', '공이 수비 사이로 던져진다.')],
              {'secure_frame': 92, 'attack_high_point': 42, 'late_hands': 64},
              {'shell': 'robber', 'leverage': 'inside'},
              [M('ss', 'close', 1), M('cb_top', 'close', 2)]),
         disguises=[
             ('trailing_corner', 0, ('Trailing corner', '한발 늦은 코너'),
              [('The corner is a full step behind.', '코너가 한 발 뒤처져 있다.'),
               ('The throw is up high.', '패스가 높다.')],
              'base1', [M('cb_top', 'pursue', 2)]),
             ('seam_collapse', 1, ('Seam collapse', '무너지는 심'),
              [('Two defenders collapse on the seam.', '두 수비가 심으로 모여든다.'),
               ('Contact will come before the ball.', '공보다 접촉이 먼저 온다.')],
              'new', [M('fs', 'close', 2), M('mike', 'close', 3)]),
         ]),
    dict(pos='position_wr', fam='yac', name=None,
         prompt=('You made the catch. Pick your first move.', '캐치했다. 첫 움직임을 고른다.'),
         base=[
             ('closing_safety', {'shell': 'two_high', 'leverage': 'head_up'},
              [M('ss', 'close', 1), M('fs', 'close', 2)],
              [('Two safeties sit deep over you.', '두 세이프티가 당신 위 깊은 곳에 있다.'),
               ('One is already driving on the catch.', '한 명이 이미 캐치 지점으로 달려온다.'),
               ('There is no lane to split them.', '둘 사이로 빠질 길이 없다.')]),
             ('pursuit_angle', {'corner': 'off', 'leverage': 'inside'},
              [M('cb_top', 'pursue', 1), M('will', 'pursue', 2)],
              [('The pursuit is flying to the sideline.', '추격이 사이드라인 쪽으로 몰려간다.'),
               ('The corner overruns outside.', '코너가 바깥으로 지나쳐 간다.'),
               ('The inside lane is open.', '안쪽 길이 열려 있다.')]),
         ],
         new=('open_alley', ('Open alley', '열린 골목'),
              [('The nearest defender is still backpedaling.', '가장 가까운 수비가 아직 뒤로 물러나고 있다.'),
               ('The pursuit is flat and late.', '추격이 평평하고 늦다.'),
               ('Open grass waits straight ahead.', '정면에 빈 공간이 있다.')],
              {'protect_ball': 50, 'cutback_lane': 62, 'burst_upfield': 92},
              {'shell': 'one_high', 'corner': 'off'},
              [M('cb_top', 'bail', 1), M('will', 'pursue', 2)]),
         disguises=[
             ('safety_overruns', 0, ('Safety overruns', '지나쳐 가는 세이프티'),
              [('The safety overruns to the outside.', '세이프티가 바깥으로 지나쳐 간다.'),
               ('A cutback lane opens inside.', '안쪽으로 컷백 길이 열린다.')],
              'base1', [M('ss', 'pursue', 2)]),
             ('pursuit_inside', 1, ('Pursuit flows inside', '안쪽으로 몰리는 추격'),
              [('The pursuit flows too far inside.', '추격이 안쪽으로 너무 몰린다.'),
               ('Nothing stands between you and the safety.', '당신과 세이프티 사이에 아무도 없다.')],
              'new', [M('will', 'pursue', 2), M('mike', 'pursue', 3)]),
         ]),
    # ---------------- CB ----------------
    dict(pos='position_cb', fam='leverage', name=('Leverage at the line', '라인 레버리지'),
         prompt=('Your receiver is set. Choose your leverage.', '리시버가 섰다. 레버리지를 고른다.'),
         base=[
             ('split_release', {'split': 'wide', 'formation': 'spread', 'shell': 'two_high'},
              [M('wr1', 'route_in', 2)], None),
             ('vertical_stem', {'split': 'wide', 'formation': 'spread', 'back': 'pistol', 'shell': 'one_high'},
              [M('wr1', 'route_vertical', 1), M('fs', 'rotate_middle', 2)], None),
         ],
         new=('reduced_option', ('Reduced split option', '좁은 스플릿 옵션'),
              [('Your receiver aligns tight in a reduced split.', '리시버가 좁은 스플릿으로 붙어 선다.'),
               ("The quarterback's eyes go inside.", '쿼터백의 시선이 안쪽으로 간다.'),
               ('There is no safety help inside.', '안쪽 세이프티 도움이 없다.')],
              {'press_jam': 62, 'shade_inside': 92, 'bail_depth': 48},
              {'split': 'reduced', 'formation': 'tight', 'shell': 'one_high'},
              [M('wr1', 'route_in', 2)]),
         disguises=[
             ('square_then_go', 0, ('Square step, then vertical', '정면 스텝 뒤 수직'),
              [('He explodes vertically after the first step.', '첫 스텝 뒤 수직으로 폭발한다.'),
               ('The safety is late to help.', '세이프티 도움이 늦다.')],
              'base1', [M('wr1', 'route_vertical', 2)]),
             ('throttle_stem', 1, ('Throttle-down stem', '감속 스템'),
              [('He throttles down at eight yards.', '8야드에서 속도를 줄인다.'),
               ('The quarterback takes a quick drop.', '쿼터백이 짧게 드롭한다.')],
              'new', [M('wr1', 'route_curl', 2)]),
         ]),
    dict(pos='position_cb', fam='coverage', name=('Coverage call', '커버리지 대응'),
         prompt=('Routes are developing. Pick your coverage answer.', '루트가 전개된다. 커버리지 대응을 고른다.'),
         base=[
             ('crossing_exchange', {'formation': 'trips', 'back': 'offset'},
              [M('wr1', 'route_in', 1), M('slot', 'route_cross', 2)], None),
             ('zone_flood', {'formation': 'spread', 'back': 'offset'},
              [M('rb', 'route_flat', 1), M('wr1', 'route_corner', 2)], None),
         ],
         new=('isolation', ('Isolation', '아이솔레이션'),
              [('Your receiver is alone on your side.', '당신 쪽에 리시버가 혼자다.'),
               ('The formation is heavy away from you.', '포메이션이 반대쪽으로 쏠려 있다.'),
               ('He gives a hard inside release.', '그가 강하게 안쪽으로 릴리스한다.')],
              {'mirror_release': 92, 'undercut_break': 60, 'handoff_zone': 44},
              {'formation': 'tight', 'split': 'wide'},
              [M('wr1', 'route_vertical', 2)]),
         disguises=[
             ('sit_route', 0, ('Sit route', '멈춰 서는 루트'),
              [('The inside receiver stops and sits.', '안쪽 리시버가 멈춰 앉는다.'),
               ("The quarterback's shoulders open to you.", '쿼터백의 어깨가 당신 쪽으로 열린다.')],
              'base1', [M('slot', 'route_curl', 2)]),
             ('decoy_flat', 1, ('Decoy flat', '미끼 플랫'),
              [('Your receiver runs straight past the flat.', '리시버가 플랫을 지나 곧장 달린다.'),
               ('Your inside help is taken by the slot.', '안쪽 도움 수비가 슬롯에게 묶인다.')],
              'new', [M('wr1', 'route_vertical', 2), M('slot', 'route_cross', 3)]),
         ]),
    dict(pos='position_cb', fam='ball', name=('Ball in the air', '공중의 공'),
         prompt=('The throw is coming your way. Choose how to play it.', '패스가 당신 쪽으로 온다. 대응을 고른다.'),
         base=[
             ('high_point', {'formation': 'spread'},
              [M('wr1', 'route_vertical', 1)], None),
             ('late_window', {'formation': 'spread', 'back': 'pistol'},
              [M('wr1', 'route_out', 1), M('qb', 'rollout_top', 2)], None),
         ],
         new=('back_shoulder', ('Back-shoulder throw', '백숄더 패스'),
              [('The receiver stops short and turns back.', '리시버가 짧게 멈춰 돌아선다.'),
               ('The throw is placed away from you.', '패스가 당신 반대쪽에 놓인다.'),
               ('You are a step behind.', '당신이 한 발 늦다.')],
              {'play_ball': 42, 'play_hands': 64, 'close_catch': 92},
              {'formation': 'spread', 'split': 'wide'},
              [M('wr1', 'route_curl', 1)]),
         disguises=[
             ('late_hands', 0, ('Late hands', '늦게 올라오는 손'),
              [('His hands come up late.', '그의 손이 늦게 올라온다.'),
               ('You cannot see the ball over his shoulder.', '그의 어깨 너머로 공이 보이지 않는다.')],
              'base1', [M('wr1', 'route_vertical', 1), M('wr1', 'stall', 2)]),
             ('outside_shoulder', 1, ('Outside-shoulder throw', '바깥 어깨 패스'),
              [('The throw is on his outside shoulder.', '패스가 그의 바깥 어깨로 온다.'),
               ('You have no angle on the ball.', '공을 향한 각도가 없다.')],
              'new', [M('wr1', 'route_out', 2)]),
         ]),
    dict(pos='position_cb', fam='tackle', name=('Open-field tackle', '오픈필드 태클'),
         prompt=('The catch is made in front of you. Finish the play.', '앞에서 캐치가 이뤄졌다. 플레이를 끝낸다.'),
         base=[
             ('boundary_finish', {'formation': 'spread', 'split': 'wide'},
              [M('wr1', 'route_out', 1), M('fs', 'pursue', 2)], None),
             ('open_field_catch', {'formation': 'spread', 'split': 'reduced'},
              [M('wr1', 'route_in', 1)], None),
         ],
         new=('loose_carrier', ('Loose ball carrier', '느슨한 볼 캐리어'),
              [('He carries the ball away from his body.', '그가 공을 몸에서 떨어뜨려 든다.'),
               ('A teammate already has him wrapped.', '동료가 이미 그를 감쌌다.'),
               ('The game is on the line.', '경기가 걸린 순간이다.')],
              {'breakdown_tackle': 68, 'drive_boundary': 50, 'attack_strip': 90},
              {'formation': 'trips'},
              [M('wr1', 'route_in', 1), M('nickel', 'close', 2)]),
         disguises=[
             ('cutback', 0, ('Cutback inside', '안쪽 컷백'),
              [('He cuts back inside.', '그가 안쪽으로 컷백한다.'),
               ('No teammate is near.', '근처에 동료가 없다.')],
              'base1', [M('wr1', 'route_in', 2)]),
             ('high_hit', 1, ('High hit, loose ball', '높은 태클, 흔들리는 공'),
              [('Your teammate hits him high.', '동료가 그를 높게 친다.'),
               ('The ball swings loose in one hand.', '공이 한 손에서 흔들린다.')],
              'new', [M('nickel', 'close', 2)]),
         ]),
    # ---------------- LB ----------------
    dict(pos='position_lb', fam='key', name=('Key read', '키 읽기'),
         prompt=('Read your key at the snap.', '스냅 순간 키를 읽는다.'),
         base=[
             ('guard_pull', {'formation': 'tight', 'back': 'offset'},
              [M('rg', 'pull_top', 1), M('rb', 'counter', 2), M('te', 'down_block', 3)], None),
             ('play_action_read', {'formation': 'spread', 'back': 'offset'},
              [M('qb', 'fake', 1), M('slot', 'route_vertical', 3)], None),
         ],
         new=('quick_dive', ('Quick dive', '퀵 다이브'),
              [('The guard fires straight out at you.', '가드가 곧장 당신에게 튀어나온다.'),
               ('The back is only two yards deep.', '백이 2야드 깊이에 있다.'),
               ('It is short yardage on the chains.', '짧은 거리가 남았다.')],
              {'trust_guard': 64, 'trigger_downhill': 92, 'read_backfield': 42},
              {'formation': 'tight', 'back': 'pistol'},
              [M('rg', 'fire', 1), M('rb', 'dive', 2)]),
         disguises=[
             ('pull_action', 0, ('Pull-action fake', '풀 액션 페이크'),
              [('The quarterback keeps the ball on the fake.', '쿼터백이 페이크 후 공을 지킨다.'),
               ('A receiver sneaks behind you.', '리시버가 당신 뒤로 몰래 빠진다.')],
              'base1', [M('rg', 'pull_top', 1), M('qb', 'fake', 2), M('te', 'route_cross', 3)]),
             ('downhill_handoff', 1, ('Downhill handoff', '직진 핸드오프'),
              [('The back takes the handoff straight ahead.', '백이 핸드오프를 받고 곧장 달린다.'),
               ('Nobody releases downfield.', '아무도 다운필드로 빠지지 않는다.')],
              'new', [M('rb', 'dive', 2), M('rg', 'fire', 3)]),
         ]),
    dict(pos='position_lb', fam='fit', name=('Run fit', '런 핏'),
         prompt=("It's a run. Fit your gap.", '런이다. 갭을 맞춘다.'),
         base=[
             ('counter_trey', {'formation': 'tight', 'back': 'offset'},
              [M('lg', 'pull_top', 1), M('lt', 'pull_top', 2), M('rb', 'counter', 2)], None),
             ('inside_zone', {'formation': 'spread', 'back': 'pistol'},
              [M('c', 'fire', 1), M('rb', 'dive', 2), M('lt', 'reach_top', 3)], None),
         ],
         new=('outside_stretch', ('Outside stretch', '아웃사이드 스트레치'),
              [('The line reaches toward the sideline.', '라인이 사이드라인 쪽으로 리치한다.'),
               ('The back aims wide at the numbers.', '백이 넘버 쪽을 넓게 겨눈다.'),
               ('The edge is being hooked.', '에지가 훅 블록에 걸린다.')],
              {'fill_gap': 60, 'scrape_over': 92, 'spill_outside': 44},
              {'formation': 'tight', 'back': 'offset'},
              [M('rt', 'reach_top', 1), M('rb', 'stretch', 2), M('te', 'reach_top', 3)]),
         disguises=[
             ('single_puller', 0, ('Single puller', '한 명만 풀'),
              [('Only the guard pulls; the tackle blocks down.', '가드만 풀하고 태클은 다운 블록한다.'),
               ('The back cuts straight up the middle.', '백이 곧장 가운데로 파고든다.')],
              'base1', [M('lg', 'pull_top', 1), M('rb', 'dive', 2)]),
             ('zone_bounce', 1, ('Zone bounce', '존 바운스'),
              [('The back bounces his path outside.', '백이 경로를 바깥으로 튼다.'),
               ('The edge gets sealed.', '에지가 봉쇄된다.')],
              'new', [M('rb', 'stretch', 2), M('te', 'reach_top', 3)]),
         ]),
    dict(pos='position_lb', fam='drop', name=('Pass drop', '패스 드롭'),
         prompt=("It's a pass. Choose your drop.", '패스다. 드롭을 고른다.'),
         base=[
             ('back_wheel', {'formation': 'spread', 'back': 'wide'},
              [M('slot', 'route_in', 1), M('rb', 'wheel', 2)], None),
             ('dig_under', {'formation': 'spread', 'back': 'offset'},
              [M('wr1', 'route_dig', 1), M('rb', 'stall', 3)], None),
         ],
         new=('curl_flat', ('Curl-flat', '컬-플랫'),
              [('Two receivers stack to your side.', '리시버 둘이 당신 쪽에 겹쳐 선다.'),
               ('The outside one runs a curl.', '바깥 리시버가 컬을 뛴다.'),
               ("The quarterback's eyes stay on the curl.", '쿼터백의 시선이 컬에 머문다.')],
              {'match_back': 42, 'hook_curl_depth': 92, 'rob_crosser': 64},
              {'formation': 'trips', 'back': 'offset'},
              [M('slot', 'route_flat', 1), M('wr1', 'route_curl', 2)]),
         disguises=[
             ('back_stays', 0, ('Back stays in', '남아서 막는 백'),
              [('The back stays in to block after all.', '백이 결국 남아서 블록한다.'),
               ('A crosser comes under your drop.', '크로서가 당신 드롭 아래로 온다.')],
              'base1', [M('rb', 'stall', 2), M('slot', 'route_cross', 3)]),
             ('dig_to_curl', 1, ('Dig turns to curl', '컬로 바뀌는 딕'),
              [('The dig turns into a curl.', '딕이 컬로 바뀐다.'),
               ('Nobody crosses the middle.', '가운데를 가로지르는 선수가 없다.')],
              'new', [M('wr1', 'route_curl', 2)]),
         ]),
    dict(pos='position_lb', fam='blitz', name=('Blitz timing', '블리츠 타이밍'),
         prompt=('You have a blitz call. Choose your path.', '블리츠 콜이다. 경로를 고른다.'),
         base=[
             ('empty_protection', {'formation': 'empty', 'back': 'none'},
              [M('c', 'slide_away', 2)], None),
             ('slide_protection', {'formation': 'tight', 'back': 'offset'},
              [M('c', 'slide_top', 1), M('rb', 'stall', 2), M('te', 'route_flat', 3)], None),
         ],
         new=('back_release', ('Back release', '백 릴리스'),
              [('The back sets, then leaks out.', '백이 블록 자세를 잡았다가 빠져나간다.'),
               ('The quarterback looks to the flat.', '쿼터백이 플랫을 본다.'),
               ('Your blitz lane is covered.', '당신의 블리츠 길이 막혀 있다.')],
              {'a_gap_mug': 44, 'delay_blitz': 62, 'peel_with_back': 92},
              {'formation': 'spread', 'back': 'offset'},
              [M('rb', 'leak', 1), M('c', 'slide_top', 2)]),
         disguises=[
             ('center_turns', 0, ('Center turns to you', '당신을 보는 센터'),
              [('The center turns to face you.', '센터가 당신 쪽으로 돌아선다.'),
               ('A guard slides into your gap.', '가드가 당신 갭으로 미끄러진다.')],
              'base1', [M('c', 'slide_top', 2), M('rg', 'slide_top', 3)]),
             ('check_release', 1, ('Check-release', '체크 릴리스'),
              [('The back checks, then releases.', '백이 확인한 뒤 빠져나간다.'),
               ('The quarterback pumps to the flat.', '쿼터백이 플랫으로 펌프한다.')],
              'new', [M('rb', 'leak', 2)]),
         ]),
    # ---------------- EDGE ----------------
    dict(pos='position_edge', fam='rush', name=('Pass rush', '패스 러시'),
         prompt=("It's a pass set. Pick your rush move.", '패스 세트다. 러시 기술을 고른다.'),
         base=[
             ('quick_game', {'formation': 'tight', 'back': 'pistol'},
              [M('lt', 'set_short', 1), M('slot', 'route_flat', 3)], None),
             ('seven_step_drop', {'formation': 'spread', 'back': 'offset'},
              [M('lt', 'set_deep', 1), M('qb', 'set_deep', 2)], None),
         ],
         new=('mobile_qb', ('Mobile quarterback', '기동형 쿼터백'),
              [('The quarterback is a runner.', '쿼터백이 뛰는 선수다.'),
               ('The receivers clear out your side.', '리시버들이 당신 쪽을 비운다.'),
               ('The line slides away from you.', '라인이 당신 반대로 슬라이드한다.')],
              {'long_arm': 62, 'contain_rush': 92, 'speed_dip': 44},
              {'formation': 'spread', 'back': 'offset'},
              [M('c', 'slide_away', 2), M('qb', 'rollout_top', 3)]),
         disguises=[
             ('deep_after_all', 0, ('Deep set after all', '결국 깊은 세트'),
              [('The tackle kicks deep after all.', '태클이 결국 깊게 킥슬라이드한다.'),
               ('The quarterback takes a long drop.', '쿼터백이 길게 드롭한다.')],
              'base1', [M('lt', 'set_deep', 2), M('qb', 'set_deep', 3)]),
             ('rollout', 1, ('Rollout to you', '당신 쪽 롤아웃'),
              [('The quarterback rolls toward your side.', '쿼터백이 당신 쪽으로 롤아웃한다.'),
               ('The back leaks out behind you.', '백이 당신 뒤로 빠져나간다.')],
              'new', [M('qb', 'rollout_top', 2), M('rb', 'leak', 3)]),
         ]),
    dict(pos='position_edge', fam='contain', name=('Edge contain', '에지 컨테인'),
         prompt=('The play is coming your way. Hold the edge right.', '플레이가 당신 쪽으로 온다. 에지를 지킨다.'),
         base=[
             ('bootleg', {'formation': 'tight', 'back': 'offset'},
              [M('rb', 'dive', 1), M('qb', 'rollout_top', 2), M('te', 'route_cross', 3)], None),
             ('outside_zone', {'formation': 'tight', 'back': 'pistol'},
              [M('lt', 'reach_top', 1), M('te', 'reach_top', 2), M('rb', 'stretch', 2)], None),
         ],
         new=('down_block', ('Down block', '다운 블록'),
              [('The tight end blocks down on the tackle.', '타이트엔드가 태클에게 다운 블록한다.'),
               ('A guard pulls toward you.', '가드가 당신 쪽으로 풀한다.'),
               ('The back follows the puller.', '백이 풀하는 선수를 따라온다.')],
              {'set_hard_edge': 64, 'squeeze_down': 92, 'chase_flat': 44},
              {'formation': 'tight', 'back': 'offset'},
              [M('te', 'down_block', 1), M('lg', 'pull_top', 2), M('rb', 'counter', 3)]),
         disguises=[
             ('naked_boot', 0, ('Naked boot', '네이키드 부트'),
              [('The quarterback keeps it and sprints to the flat.', '쿼터백이 공을 지키고 플랫으로 달린다.'),
               ('The tight end runs to the flat behind you.', '타이트엔드가 당신 뒤 플랫으로 달린다.')],
              {'chase_flat': 92, 'set_hard_edge': 66, 'squeeze_down': 42},
              [M('qb', 'rollout_top', 2), M('te', 'route_flat', 3)]),
             ('zone_to_down', 1, ('Zone, then down block', '존에서 다운 블록'),
              [('The tight end blocks down instead.', '타이트엔드가 대신 다운 블록한다.'),
               ('A guard pulls into the hole.', '가드가 구멍으로 풀한다.')],
              'new', [M('te', 'down_block', 2), M('lg', 'pull_top', 3)]),
         ]),
    dict(pos='position_edge', fam='option', name=('Option read', '옵션 읽기'),
         prompt=("You're the read man. Choose who you take.", '당신이 리드 대상이다. 누구를 맡을지 고른다.'),
         base=[
             ('rpo_bubble', {'formation': 'trips', 'back': 'offset'},
              [M('slot', 'route_flat', 1), M('qb', 'fake', 2)], None),
             ('zone_read', {'formation': 'spread', 'back': 'pistol'},
              [M('rb', 'dive', 1), M('qb', 'fake', 2)], None),
         ],
         new=('give_read', ('Give read', '기브 리드'),
              [('The quarterback is no runner.', '쿼터백은 뛰는 선수가 아니다.'),
               ('The back has a clear dive path.', '백에게 다이브 길이 뚜렷하다.'),
               ('Your inside linebacker is blitzing away.', '안쪽 라인배커가 반대로 블리츠한다.')],
              {'take_quarterback': 44, 'take_dive': 92, 'slow_play': 62},
              {'formation': 'spread', 'back': 'offset'},
              [M('rb', 'dive', 1), M('mike', 'blitz_a', 2)]),
         disguises=[
             ('decoy_bubble', 0, ('Decoy bubble', '미끼 버블'),
              [('The bubble is a decoy; the quarterback watches you.', '버블은 미끼다. 쿼터백이 당신을 본다.'),
               ('The back meshes away from you.', '백이 당신 반대쪽으로 메시한다.')],
              'base1', [M('qb', 'fake', 2), M('rb', 'dive', 3)]),
             ('handoff_feet', 1, ('Handoff feet', '건네줄 발'),
              [("The quarterback's feet are set to hand off.", '쿼터백의 발이 핸드오프 자세다.'),
               ('The mesh comes toward you.', '메시가 당신 쪽으로 온다.')],
              'new', [M('rb', 'dive', 2)]),
         ]),
    dict(pos='position_edge', fam='finish', name=('Finish the play', '플레이 마무리'),
         prompt=("You're through. Choose how to finish.", '뚫었다. 마무리를 고른다.'),
         base=[
             ('escaping_quarterback', {'formation': 'spread', 'back': 'offset'},
              [M('qb', 'scramble', 1), M('dt1', 'close', 3)], None),
             ('screen_look', {'formation': 'spread', 'back': 'offset'},
              [M('lt', 'screen_release', 1), M('rb', 'leak', 2)], None),
         ],
         new=('clean_shot', ('Clean shot', '깨끗한 기회'),
              [('The quarterback is stuck in the pocket.', '쿼터백이 포켓에 갇혔다.'),
               ('He holds the ball in both hands.', '그가 공을 두 손으로 쥐고 있다.'),
               ('Teammates close from the other side.', '동료들이 반대쪽에서 좁혀 온다.')],
              {'strip_swipe': 64, 'wrap_sack': 92, 'get_hands_up': 42},
              {'formation': 'spread', 'back': 'none'},
              [M('dt1', 'close', 2), M('de_bot', 'close', 3)]),
         disguises=[
             ('sets_to_throw', 0, ('Sets to throw', '던질 자세'),
              [('He sets his feet to throw.', '그가 던지려고 발을 고정한다.'),
               ('A receiver sits right behind you.', '리시버가 바로 뒤에 앉아 있다.')],
              'base1', [M('rb', 'leak', 2)]),
             ('ball_pulled_down', 1, ('Ball pulled down', '내려놓는 공'),
              [('The quarterback pulls the ball down.', '쿼터백이 공을 내린다.'),
               ('No linemen release.', '라인맨이 아무도 빠지지 않는다.')],
              'new', [M('qb', 'stall', 2)]),
         ]),
]

WEIGHTS = {'base': 3, 'new': 3, 'disguise': 2}
SHORT = {'position_qb': 'qb', 'position_rb': 'rb', 'position_wr': 'wr', 'position_cb': 'cb',
         'position_lb': 'lb', 'position_edge': 'edge'}


def build():
    rows = []
    copy = {}
    families = {}
    for fam in FAMILIES:
        pos = fam['pos']
        dec_p, pat_p, fam_p = PREFIX[pos]
        family_id = fam_p + fam['fam']
        fam_key = camel(SHORT[pos], fam['fam'])
        name_key = f'v2.lookFamily.{fam_key}.name'
        if fam['name'] is None:
            name_key = f"gameContent.families.{fam['fam']}.name"
        else:
            copy[name_key] = fam['name']
        prompt_key = f'v2.lookFamily.{fam_key}.prompt'
        copy[prompt_key] = fam['prompt']
        families[family_id] = {'nameKey': name_key, 'promptKey': prompt_key}
        base_ids = []
        for slug, stance, moves, wr_tells in fam['base']:
            look_id = f'look_{SHORT[pos]}_{slug}'
            base_ids.append(look_id)
            row = {'kind': 'base', 'id': look_id, 'positionId': pos, 'familyId': family_id,
                   'patternId': pat_p + slug, 'weight': WEIGHTS['base'], 'stance': stance,
                   'moves': moves}
            if wr_tells is not None:
                keys = []
                for index, pair in enumerate(wr_tells):
                    key = f'v2.look.{camel(SHORT[pos], slug)}.tell{index + 1}'
                    copy[key] = pair
                    keys.append(key)
                row['tellKeys'] = keys
            rows.append(row)
        slug, name, tells, fits, stance, moves = fam['new']
        new_id = f'look_{SHORT[pos]}_{slug}'
        look_key = camel(SHORT[pos], slug)
        copy[f'v2.look.{look_key}.name'] = name
        for index, pair in enumerate(tells):
            copy[f'v2.look.{look_key}.tell{index + 1}'] = pair
        rows.append({'kind': 'new', 'id': new_id, 'positionId': pos, 'familyId': family_id,
                     'nameKey': f'v2.look.{look_key}.name',
                     'tellKeys': [f'v2.look.{look_key}.tell{i}' for i in (1, 2, 3)],
                     'fits': [{'decisionId': dec_p + d, 'fit': f} for d, f in fits.items()],
                     'weight': WEIGHTS['new'], 'stance': stance, 'moves': moves})
        for slug, of, name, tells, fits_from, moves in fam['disguises']:
            look_id = f'look_{SHORT[pos]}_{slug}'
            look_key = camel(SHORT[pos], slug)
            copy[f'v2.look.{look_key}.name'] = name
            for index, pair in enumerate(tells):
                copy[f'v2.look.{look_key}.tell{index + 2}'] = pair
            row = {'kind': 'disguise', 'id': look_id, 'positionId': pos, 'familyId': family_id,
                   'of': base_ids[of], 'nameKey': f'v2.look.{look_key}.name',
                   'laterTellKeys': [f'v2.look.{look_key}.tell{i}' for i in (2, 3)],
                   'weight': WEIGHTS['disguise'], 'moves': moves}
            if isinstance(fits_from, dict):
                row['fits'] = [{'decisionId': dec_p + d, 'fit': f} for d, f in fits_from.items()]
            else:
                row['fitsFrom'] = base_ids[1] if fits_from == 'base1' else (
                    base_ids[0] if fits_from == 'base0' else new_id)
            rows.append(row)
    return rows, copy, families


def ts_literal(value, indent=0):
    return json.dumps(value, ensure_ascii=False, indent=2).replace('\n', '\n' + ' ' * indent)


def main():
    rows, copy, families = build()
    for key in copy:
        assert re.fullmatch(r'[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)+', key), key
    content = (
        "// Generated by scripts/generate-snap-looks.py. Edit the generator, not this file.\n"
        "import type { SnapLookRowVNext } from './snap-look-rows.js';\n\n"
        f"export const SNAP_LOOK_FAMILIES = {ts_literal(families)} as const;\n\n"
        f"export const SNAP_LOOK_ROWS: readonly SnapLookRowVNext[] = {ts_literal(rows)};\n"
    )
    open(os.path.join(ROOT, 'packages/game-content/src/content/snap-looks.generated.ts'), 'w',
         encoding='utf-8', newline='\n').write(content)
    pairs = '\n'.join(
        f"  {json.dumps(key)}: [{json.dumps(en, ensure_ascii=False)}, {json.dumps(ko, ensure_ascii=False)}],"
        for key, (en, ko) in copy.items())
    locale = (
        "// Generated by scripts/generate-snap-looks.py. Edit the generator, not this file.\n"
        "/** M11 snap looks: family prompts, look names and tells. */\n"
        "type Pair = readonly [en: string, ko: string];\n\n"
        f"const rows = {{\n{pairs}\n}} as const satisfies Record<string, Pair>;\n\n"
        "function messages(index: 0 | 1) {\n"
        "  return Object.fromEntries(Object.entries(rows).map(([key, pair]) => [key, pair[index]])) as {\n"
        "    readonly [K in keyof typeof rows]: string;\n"
        "  };\n"
        "}\n\n"
        "export const enUSM11LookMessages = messages(0);\n"
        "export const koKRM11LookMessages = messages(1);\n"
    )
    open(os.path.join(ROOT, 'packages/game-content/src/locales/m11-looks.ts'), 'w',
         encoding='utf-8', newline='\n').write(locale)
    print(f'{len(rows)} looks, {len(copy)} paired strings, {len(families)} families')


if __name__ == '__main__':
    main()

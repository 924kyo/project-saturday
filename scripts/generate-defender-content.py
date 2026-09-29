"""Generates packages/game-content/src/content/defenders.ts and locales/m8-defenders.ts.

Single authoring source for LB/EDGE game content: decisions, patterns, clues, skills, events and
their paired ko-KR/en-US copy. Run from the repo root; output is committed.
"""
import json, os, re
os.chdir('C:/project-saturday')

def camel(s):
    parts = s.split('_')
    return parts[0] + ''.join(p[:1].upper() + p[1:] for p in parts[1:])

# ---------------------------------------------------------------------------------------------
# Decisions: (slug, family, style, impact, bigPlay, risk, exposure, en name, ko name, en desc, ko desc)
LB = {
 'code': 'lb',
 'families': ['key_snap_family_lb_key','key_snap_family_lb_fit','key_snap_family_lb_drop','key_snap_family_lb_blitz'],
 'decisions': [
  ('trust_guard','key','BALANCED',60,0,0,1,'Trust the Guard','가드를 믿는다','Read the guard: pull means follow, high hat means drop.','가드를 읽는다. 풀이면 따라가고, 일어서면 물러선다.'),
  ('trigger_downhill','key','AGGRESSIVE',120,60,120,2,'Trigger Downhill','곧장 트리거','Attack the line on the first run flash.','첫 런 신호에 곧장 라인으로 달려든다.'),
  ('read_backfield','key','SAFE',-20,-40,-90,0,'Read the Backfield','백필드를 읽는다','Stay patient and read the back through the mesh.','서두르지 않고 메시를 지나는 백을 끝까지 읽는다.'),
  ('fill_gap','fit','BALANCED',70,20,0,2,'Fill Your Gap','내 갭을 메운다','Fit your gap square and make the back choose.','자기 갭에 정면으로 서서 백이 선택하게 만든다.'),
  ('spill_outside','fit','SAFE',10,-30,-100,1,'Spill It Wide','밖으로 흘린다','Wrong-arm the block and force the run to the sideline.','블록을 반대 팔로 받아 런을 사이드라인으로 흘린다.'),
  ('scrape_over','fit','AGGRESSIVE',110,80,110,2,'Scrape Over the Top','위로 돌아 친다','Beat the climbing guard over the top to the cut.','올라오는 가드를 위로 돌아 컷 지점을 먼저 친다.'),
  ('hook_curl_depth','drop','SAFE',0,-50,-100,0,'Get to Hook Depth','훅 깊이로','Drop to hook-curl depth and wall the crosser.','훅 컬 깊이까지 물러나 크로서를 막아선다.'),
  ('match_back','drop','BALANCED',60,20,0,1,'Match the Back','백을 매치','Carry the running back when he releases.','백이 빠져나오면 끝까지 따라간다.'),
  ('rob_crosser','drop','AGGRESSIVE',100,110,120,1,'Rob the Crosser','크로서를 노린다','Sit under the dig and jump the throw.','딕 루트 아래에 앉아 패스를 가로챈다.'),
  ('a_gap_mug','blitz','AGGRESSIVE',110,100,130,3,'Mug the A Gap','A갭 머그','Walk up and shoot the A gap at the snap.','앞으로 나와 스냅과 동시에 A갭으로 파고든다.'),
  ('delay_blitz','blitz','BALANCED',70,60,40,2,'Delay Blitz','딜레이 블리츠','Show coverage, then come late through the open lane.','커버리지인 척하다 늦게 빈 레인으로 들어간다.'),
  ('peel_with_back','blitz','SAFE',10,-40,-100,1,'Peel With the Back','백 따라 빠진다','Abort the rush when the back releases.','백이 빠져나오면 러시를 멈추고 따라간다.'),
 ],
 # (slug, family, playType, impactResult, bigPlayResult, involve, impact, big, risk, yards, td, attrs, fits(slug:fit...), clues [(en,ko)x3], name, desc)
 'patterns': [
  ('guard_pull','key','RUN','STOP','LOSS',850,420,140,320,6,40,[('attribute_lb_run_recognition',600),('attribute_lb_tackling',400)],
    {'trust_guard':90,'trigger_downhill':70,'read_backfield':48},
    [('The guard pulls hard across the formation.','가드가 포메이션을 가로질러 강하게 풀한다.'),('The back takes a counter step first.','백이 먼저 카운터 스텝을 밟는다.'),('The tight end blocks down on the end.','타이트엔드가 엔드를 안쪽으로 막는다.')],
    ('Guard Pull','가드 풀'),('A pulling guard shows you where the run is going.','풀하는 가드가 런의 방향을 알려 준다.')),
  ('play_action_read','key','PASS','PASS_DEFENDED','INTERCEPTION',700,380,110,360,9,70,[('attribute_lb_zone_coverage',550),('attribute_football_iq',450)],
    {'read_backfield':92,'trust_guard':68,'trigger_downhill':40},
    [('The guard shows a high hat instead of firing out.','가드가 치고 나오지 않고 일어선다.'),('The quarterback\u2019s fake is slow and exaggerated.','쿼터백의 페이크가 느리고 과장되어 있다.'),('The slot receiver releases vertically.','슬롯 리시버가 수직으로 뛰어나간다.')],
    ('Play-Action Read','플레이액션 읽기'),('Run action up front; the real threat is behind you.','앞에서는 런처럼 보이지만 진짜 위협은 뒤쪽이다.')),
  ('inside_zone','fit','RUN','STOP','LOSS',900,450,120,300,5,30,[('attribute_lb_block_shed',550),('attribute_lb_tackling',450)],
    {'fill_gap':90,'scrape_over':70,'spill_outside':50},
    [('The line steps in unison to the play side.','라인이 한꺼번에 플레이 사이드로 스텝을 밟는다.'),('The center climbs straight at you.','센터가 곧장 당신에게 올라온다.'),('The back presses the A gap.','백이 A갭을 압박한다.')],
    ('Inside Zone','인사이드 존'),('Everyone steps together; the back reads for a crease.','모두 함께 움직이고 백은 틈을 찾는다.')),
  ('counter_trey','fit','RUN','STOP','FORCED_FUMBLE',850,400,100,340,7,50,[('attribute_lb_run_recognition',500),('attribute_lb_block_shed',500)],
    {'spill_outside':90,'fill_gap':66,'scrape_over':44},
    [('The backside guard and tackle both pull.','백사이드 가드와 태클이 모두 풀한다.'),('The back jab-steps away from the play.','백이 플레이 반대쪽으로 잽 스텝을 한다.'),('A kick-out block is coming for the end.','엔드를 밀어낼 킥아웃 블록이 온다.')],
    ('Counter Trey','카운터 트레이'),('Misdirection with pulling linemen building a wall.','풀하는 라인맨들이 벽을 쌓는 역방향 플레이.')),
  ('dig_under','drop','PASS','PASS_DEFENDED','INTERCEPTION',750,380,120,360,11,70,[('attribute_lb_zone_coverage',650),('attribute_football_iq',350)],
    {'rob_crosser':90,'hook_curl_depth':72,'match_back':46},
    [('The outside receiver pushes vertical then breaks in.','바깥 리시버가 수직으로 밀다가 안쪽으로 꺾는다.'),('The quarterback\u2019s eyes go to the middle.','쿼터백의 시선이 가운데로 향한다.'),('The back stays in to protect.','백이 남아서 보호한다.')],
    ('Dig Under','딕 언더'),('A dig breaks into your zone at twelve yards.','12야드 지점에서 딕 루트가 당신의 존으로 꺾여 들어온다.')),
  ('back_wheel','drop','PASS','PASS_DEFENDED','INTERCEPTION',700,360,90,380,13,90,[('attribute_lb_man_match',650),('attribute_speed',350)],
    {'match_back':92,'hook_curl_depth':62,'rob_crosser':40},
    [('The back aligns wide of the tackle.','백이 태클 바깥쪽에 정렬한다.'),('The slot runs a short in-cut.','슬롯이 짧은 인컷을 뛴다.'),('The back releases to the flat then turns upfield.','백이 플랫으로 빠졌다가 위로 방향을 튼다.')],
    ('Back Wheel','백 휠'),('The back flares, then wheels up the sideline.','백이 옆으로 빠졌다가 사이드라인을 따라 올라간다.')),
  ('empty_protection','blitz','PASS','PRESSURE','SACK',850,420,160,340,8,60,[('attribute_lb_blitz_timing',650),('attribute_burst',350)],
    {'a_gap_mug':90,'delay_blitz':72,'peel_with_back':44},
    [('Five receivers spread; no back in the backfield.','리시버 다섯 명이 벌어지고 백필드가 비어 있다.'),('The center sets to the other side.','센터가 반대쪽으로 세팅한다.'),('The quarterback calls a quick cadence.','쿼터백이 빠른 카운트를 부른다.')],
    ('Empty Protection','엠티 프로텍션'),('Five out, five blocking: someone is unaccounted for.','다섯 명이 나가고 다섯 명이 막는다. 누군가는 비어 있다.')),
  ('slide_protection','blitz','PASS','PRESSURE','SACK',800,380,130,360,8,60,[('attribute_lb_blitz_timing',550),('attribute_football_iq',450)],
    {'delay_blitz':90,'peel_with_back':68,'a_gap_mug':46},
    [('The line slides toward your side.','라인이 당신 쪽으로 슬라이드한다.'),('The back sets to pick up the edge.','백이 엣지를 막으려고 자리를 잡는다.'),('The tight end releases immediately.','타이트엔드가 곧바로 빠져나간다.')],
    ('Slide Protection','슬라이드 프로텍션'),('The protection slides your way; timing beats the count.','프로텍션이 당신 쪽으로 밀려온다. 타이밍이 숫자를 이긴다.')),
 ],
}

EDGE = {
 'code': 'edge',
 'families': ['key_snap_family_edge_rush','key_snap_family_edge_contain','key_snap_family_edge_option','key_snap_family_edge_finish'],
 'decisions': [
  ('speed_dip','rush','AGGRESSIVE',110,90,110,2,'Speed Dip','스피드 딥','Win the corner with speed and dip under the hands.','속도로 코너를 따내고 손 아래로 몸을 숙여 파고든다.'),
  ('long_arm','rush','BALANCED',70,50,20,2,'Long Arm','롱 암','Lock out the tackle and drive him into the pocket.','팔을 쭉 뻗어 태클을 잠그고 포켓으로 밀어붙인다.'),
  ('contain_rush','rush','SAFE',0,-30,-100,1,'Contain Rush','컨테인 러시','Rush under control and keep the quarterback inside.','통제된 러시로 쿼터백을 안쪽에 가둔다.'),
  ('set_hard_edge','contain','SAFE',30,-30,-110,2,'Set a Hard Edge','단단한 엣지','Keep your outside arm free and force it back inside.','바깥 팔을 자유롭게 두고 런을 안으로 몰아넣는다.'),
  ('squeeze_down','contain','BALANCED',70,40,10,2,'Squeeze Down','안으로 좁힌다','Close the gap inside and trust the linebacker outside.','안쪽 갭을 좁히고 바깥은 라인배커를 믿는다.'),
  ('chase_flat','contain','AGGRESSIVE',110,80,130,1,'Chase Flat','플랫 추격','Take the flat angle and run the ball down from behind.','평평한 각도로 공을 뒤에서 쫓아 잡는다.'),
  ('take_dive','option','BALANCED',70,50,30,2,'Take the Dive','다이브를 맡는다','Crash on the dive back and force the pull.','다이브 백에 들이닥쳐 쿼터백이 공을 빼게 만든다.'),
  ('take_quarterback','option','SAFE',30,0,-90,1,'Take the Quarterback','쿼터백을 맡는다','Sit on the edge and own the quarterback keep.','엣지에 머물며 쿼터백 킵을 책임진다.'),
  ('slow_play','option','AGGRESSIVE',100,90,120,1,'Slow Play','슬로우 플레이','Shuffle and bait the read, then attack late.','옆걸음으로 판단을 유도한 뒤 늦게 공격한다.'),
  ('wrap_sack','finish','SAFE',40,20,-100,1,'Wrap Him Up','감싸서 끝낸다','Wrap the quarterback and finish the sack.','쿼터백을 감싸 확실하게 색을 끝낸다.'),
  ('strip_swipe','finish','AGGRESSIVE',60,130,120,1,'Strip Swipe','스트립 스와이프','Chop at the ball instead of the body.','몸 대신 공을 내리쳐 떨어뜨린다.'),
  ('get_hands_up','finish','BALANCED',60,40,0,0,'Get Hands Up','손을 든다','Get into the throwing lane and bat the ball.','패스 길로 들어가 공을 쳐낸다.'),
 ],
 'patterns': [
  ('seven_step_drop','rush','PASS','PRESSURE','SACK',900,430,170,330,9,60,[('attribute_edge_speed_rush',600),('attribute_edge_get_off',400)],
    {'speed_dip':90,'long_arm':72,'contain_rush':44},
    [('The tackle kick-slides deep and fast.','태클이 깊고 빠르게 킥슬라이드한다.'),('The quarterback takes a deep drop.','쿼터백이 깊게 드롭백한다.'),('No chip help from the back.','백의 칩 블록 지원이 없다.')],
    ('Seven-Step Drop','세븐 스텝 드롭'),('A long drop: time to win the edge.','긴 드롭백. 엣지를 이길 시간이 있다.')),
  ('quick_game','rush','PASS','PRESSURE','SACK',850,380,90,300,6,40,[('attribute_edge_power_rush',550),('attribute_edge_get_off',450)],
    {'long_arm':90,'contain_rush':70,'speed_dip':46},
    [('The receivers are tight to the formation.','리시버들이 포메이션에 바짝 붙어 있다.'),('The quarterback is in a short set.','쿼터백이 짧은 세트를 잡는다.'),('The tackle sets aggressively at the line.','태클이 라인에서 공격적으로 맞선다.')],
    ('Quick Game','퀵 게임'),('Three-step throws: collapse the pocket, don\u2019t chase.','3스텝 패스. 쫓지 말고 포켓을 무너뜨린다.')),
  ('outside_zone','contain','RUN','STOP','LOSS',900,420,130,320,7,40,[('attribute_edge_edge_setting',600),('attribute_edge_tackling',400)],
    {'set_hard_edge':90,'squeeze_down':68,'chase_flat':46},
    [('The line reaches toward your side.','라인이 당신 쪽으로 리치 블록을 한다.'),('The tight end tries to hook you.','타이트엔드가 당신을 훅하려 한다.'),('The back aims wide at the numbers.','백이 넘버 쪽으로 넓게 조준한다.')],
    ('Outside Zone','아웃사이드 존'),('The whole run is built to get outside of you.','이 런 전체가 당신 바깥으로 돌아가도록 설계되어 있다.')),
  ('bootleg','contain','PASS','PRESSURE','SACK',800,400,120,360,10,60,[('attribute_edge_edge_setting',500),('attribute_football_iq',500)],
    {'chase_flat':66,'set_hard_edge':90,'squeeze_down':44},
    [('The run fake goes away from you.','런 페이크가 당신 반대쪽으로 간다.'),('No one blocks you.','아무도 당신을 막지 않는다.'),('The tight end drags across the field.','타이트엔드가 필드를 가로질러 끌고 간다.')],
    ('Bootleg','부트레그'),('The fake goes away; the quarterback comes back to you.','페이크는 반대로 가고 쿼터백은 당신 쪽으로 돌아온다.')),
  ('zone_read','option','RUN','STOP','LOSS',900,410,120,340,8,50,[('attribute_football_iq',500),('attribute_edge_edge_setting',500)],
    {'slow_play':90,'take_quarterback':70,'take_dive':46},
    [('You are left unblocked on purpose.','당신만 일부러 비워 두었다.'),('The quarterback\u2019s eyes are on you.','쿼터백의 시선이 당신에게 있다.'),('The back meshes toward the other side.','백이 반대쪽으로 메시한다.')],
    ('Zone Read','존 리드'),('The quarterback reads you: whatever you take, he takes the other.','쿼터백이 당신을 읽는다. 당신이 무엇을 택하든 그는 반대를 택한다.')),
  ('rpo_bubble','option','PASS','PASS_DEFENDED','INTERCEPTION',750,360,80,340,9,60,[('attribute_football_iq',550),('attribute_speed',450)],
    {'take_quarterback':90,'take_dive':66,'slow_play':44},
    [('A bubble screen sets up to your side.','당신 쪽에 버블 스크린이 세팅된다.'),('The quarterback holds the ball in the mesh.','쿼터백이 메시에서 공을 쥐고 있다.'),('Two receivers stack outside.','리시버 두 명이 바깥에 겹쳐 선다.')],
    ('RPO Bubble','RPO 버블'),('Run, keep or throw: three answers off your read.','런, 킵, 패스. 당신의 선택에 따라 답이 셋이다.')),
  ('escaping_quarterback','finish','PASS','PRESSURE','FORCED_FUMBLE',850,420,150,340,8,60,[('attribute_edge_tackling',550),('attribute_edge_counter_move',450)],
    {'strip_swipe':88,'wrap_sack':80,'get_hands_up':44},
    [('The quarterback tucks the ball and spins away.','쿼터백이 공을 품고 돌아 빠져나간다.'),('The ball is held loose in one hand.','공을 한 손으로 느슨하게 쥐고 있다.'),('Help is closing from the inside.','안쪽에서 동료가 좁혀 오고 있다.')],
    ('Escaping Quarterback','빠져나가는 쿼터백'),('You beat the tackle, but the quarterback is slippery.','태클은 이겼지만 쿼터백이 미끄럽게 빠진다.')),
  ('screen_look','finish','PASS','PASS_DEFENDED','INTERCEPTION',750,350,90,380,11,80,[('attribute_football_iq',600),('attribute_edge_edge_setting',400)],
    {'get_hands_up':90,'wrap_sack':62,'strip_swipe':42},
    [('The tackle lets you go too easily.','태클이 너무 쉽게 당신을 보내 준다.'),('Linemen release downfield.','라인맨들이 다운필드로 빠져나간다.'),('The back sneaks out behind you.','백이 당신 뒤로 몰래 빠져나간다.')],
    ('Screen Look','스크린 룩'),('The rush lane opens too easily: a screen is coming.','러시 레인이 너무 쉽게 열린다. 스크린이 온다.')),
 ],
}

# Skills: (slug, family, grade, effects[(type, value, familySlug|None)], en name, ko name, en desc, ko desc)
WEIGHT = {'c': 100, 'b': 70, 'a': 40, 's': 15}
LB['skills'] = [
 ('key_reader_c','game_day','c',[('defender_information_clue_bonus',1,'key')],'Key Reader','키 리더','Reveal one more clue when reading the key.','신호를 읽을 때 단서를 하나 더 확인합니다.'),
 ('gap_sound_c','role_coach','c',[('defender_decision_score_flat',4,'fit')],'Gap Sound','갭 사운드','A sharper fit on every run into your gap.','갭으로 오는 모든 런에서 더 정확하게 피트합니다.'),
 ('downhill_thumper_b','game_day','b',[('defender_impact_delta_permille',80,'fit'),('defender_risk_delta_permille',40,'fit')],'Downhill Thumper','다운힐 썸퍼','Make more plays in the run fit, at more risk if you miss.','런 피트에서 더 자주 플레이를 만들지만 놓치면 위험이 커집니다.'),
 ('zone_eyes_b','development','b',[('defender_impact_delta_permille',60,'drop')],'Zone Eyes','존 아이즈','Break on more throws in coverage.','커버리지에서 더 많은 패스에 반응합니다.'),
 ('ball_hawk_a','game_day','a',[('defender_big_play_delta_permille',90,'drop'),('defender_risk_delta_permille',50,'drop')],'Ball Hawk Backer','볼호크 백커','Turn more breakups into interceptions, and bite more often.','패스 차단을 인터셉션으로 더 자주 바꾸지만 속는 일도 늘어납니다.'),
 ('green_dot_a','role_coach','a',[('defender_decision_score_flat',3,None),('defender_grade_bonus',3,None)],'Green Dot','그린 닷','Wear the radio: sharper decisions and a better grade.','무전기를 찬다. 판단이 날카로워지고 평가가 오릅니다.'),
 ('pressure_timing_b','game_day','b',[('defender_big_play_delta_permille',80,'blitz')],'Pressure Timing','압박 타이밍','Finish more blitzes as sacks.','블리츠를 더 자주 색으로 마무리합니다.'),
 ('sure_tackle_c','body','c',[('defender_risk_delta_permille',-60,None)],'Sure Tackle','확실한 태클','Allow fewer big gains when a play gets past you.','플레이가 빠져나가도 큰 전진을 덜 허용합니다.'),
 ('iron_frame_b','body','b',[('defender_body_cost_reduction',2,None)],'Iron Frame','강철 체격','Saturdays cost less Body.','토요일 경기의 체력 소모가 줄어듭니다.'),
 ('next_down_c','mindset','c',[('defender_confidence_loss_reduction',2,None)],'Next Down','다음 다운','A rough game costs less confidence.','부진한 경기에서도 자신감을 덜 잃습니다.'),
 ('film_junkie_a','development','a',[('defender_xp_multiplier_permille',200,None)],'Film Junkie','필름 중독','Earn more growth from every Saturday.','매 토요일 경기에서 더 많이 성장합니다.'),
 ('captain_voice_s','life','s',[('defender_event_choice_unlock',1,None),('defender_event_positive_multiplier_permille',250,None)],'Captain\u2019s Voice','주장의 목소리','Unlock leadership answers in weekly events and gain more from them.','주간 이벤트에서 리더십 선택지가 열리고 효과도 커집니다.'),
]
EDGE['skills'] = [
 ('first_step_c','game_day','c',[('defender_impact_delta_permille',60,'rush')],'First Step','첫 스텝','Win more rushes off the snap.','스냅 순간 더 많은 러시를 이깁니다.'),
 ('long_levers_b','development','b',[('defender_impact_delta_permille',50,'finish'),('defender_big_play_delta_permille',40,'finish')],'Long Levers','긴 팔','Finish more plays at the quarterback.','쿼터백 앞에서 더 많은 플레이를 마무리합니다.'),
 ('bend_a','game_day','a',[('defender_big_play_delta_permille',100,'rush'),('defender_risk_delta_permille',40,'rush')],'Bend','벤드','Turn more wins into sacks, and overrun more often.','더 많은 승리를 색으로 바꾸지만 지나치는 일도 늘어납니다.'),
 ('disciplined_edge_c','role_coach','c',[('defender_risk_delta_permille',-70,'contain')],'Disciplined Edge','규율 있는 엣지','Let fewer runs escape outside of you.','당신 바깥으로 빠지는 런을 줄입니다.'),
 ('option_eyes_b','role_coach','b',[('defender_information_clue_bonus',1,'option')],'Option Eyes','옵션 아이즈','Reveal one more clue on option plays.','옵션 플레이에서 단서를 하나 더 확인합니다.'),
 ('strip_artist_a','game_day','a',[('defender_big_play_delta_permille',90,'finish'),('defender_risk_delta_permille',40,'finish')],'Strip Artist','스트립 아티스트','Force more fumbles at the finish, and miss more tackles.','마무리에서 더 많은 펌블을 유도하지만 태클 실패도 늘어납니다.'),
 ('motor_c','body','c',[('defender_body_cost_reduction',2,None)],'Motor','모터','Saturdays cost less Body.','토요일 경기의 체력 소모가 줄어듭니다.'),
 ('heavy_hands_b','development','b',[('defender_decision_score_flat',4,'rush')],'Heavy Hands','묵직한 손','Sharper hand fighting on every rush.','모든 러시에서 핸드 파이팅이 날카로워집니다.'),
 ('short_memory_c','mindset','c',[('defender_confidence_loss_reduction',2,None)],'Short Memory','짧은 기억','A rough game costs less confidence.','부진한 경기에서도 자신감을 덜 잃습니다.'),
 ('tape_study_b','development','b',[('defender_xp_multiplier_permille',150,None)],'Tape Study','테이프 연구','Earn more growth from every Saturday.','매 토요일 경기에서 더 많이 성장합니다.'),
 ('rush_plan_s','game_day','s',[('defender_decision_score_flat',3,None),('defender_grade_bonus',4,None)],'Rush Plan','러시 플랜','A plan for every tackle: sharper decisions and a better grade.','모든 태클에 대한 계획. 판단이 날카로워지고 평가가 오릅니다.'),
 ('locker_room_b','life','b',[('defender_event_choice_unlock',1,None),('defender_event_positive_multiplier_permille',150,None)],'Locker Room Glue','라커룸의 접착제','Unlock team-first answers in weekly events and gain more from them.','주간 이벤트에서 팀 우선 선택지가 열리고 효과도 커집니다.'),
]

# Events: (slug, requirements{}, choices[(suffix, effects(b,p,c,t,g,br,mods), en label, ko label)], en name, ko name, en desc, ko desc)
def fx(b, p, c, t, g=0, br=0, clue=0, dsf=0, exp=0):
    return {'bodyDelta': b, 'preparationDelta': p, 'confidenceDelta': c, 'coachTrustDelta': t,
            'gpaMilliDelta': g, 'brandDelta': br,
            'gameModifiers': {'clueBonus': clue, 'decisionScoreFlat': dsf, 'exposureReductionPermille': exp}}

LB['events'] = [
 ('install_meeting',{}, [('commit',fx(-3,8,0,3,clue=1),'Stay for the full install','설치 미팅에 끝까지 남는다'),('protect',fx(4,-2,1,-1),'Skim the call sheet and rest','콜 시트만 훑고 쉰다')],
  'Defensive Install','수비 설치 미팅','A new pressure package goes in this week.','이번 주 새 압박 패키지가 들어간다.'),
 ('scout_team_look',{}, [('commit',fx(-6,6,2,4),'Take every scout-team rep','스카우트 팀 반복을 전부 받는다'),('protect',fx(4,-2,-1,0),'Rotate out and save your legs','교대하며 다리를 아낀다'),('connect',fx(-3,5,3,4),'Coach up the scout offense','스카우트 공격진을 가르친다')],
  'Scout-Team Look','스카우트 팀 룩','The scout offense is running this week\u2019s opponent perfectly.','스카우트 공격진이 이번 상대를 완벽하게 재현하고 있다.'),
 ('green_dot_call',{'minCoachTrust':35}, [('commit',fx(-2,6,4,5),'Take the radio and run the defense','무전기를 받아 수비를 지휘한다'),('protect',fx(1,0,-2,-1),'Let the senior keep it','4학년에게 맡긴다')],
  'Green Dot','그린 닷','The coordinator offers you the radio helmet for a series.','코디네이터가 한 시리즈 동안 무전 헬멧을 맡기겠다고 한다.'),
 ('sore_shoulder',{'maxBody':60}, [('commit',fx(10,-4,0,-1),'Rest the shoulder','어깨를 쉬게 한다'),('protect',fx(-6,5,1,3),'Tape it and hit anyway','테이핑하고 그래도 부딪친다')],
  'Sore Shoulder','뻐근한 어깨','Every tackle this week has cost a little more.','이번 주 태클마다 조금씩 더 아팠다.'),
 ('tackling_circuit',{}, [('commit',fx(-7,5,2,4,exp=60),'Finish the full circuit','서킷을 끝까지 마친다'),('protect',fx(5,-3,0,-2),'Cut it short','일찍 마친다')],
  'Tackling Circuit','태클 서킷','The staff adds a live tackling period.','스태프가 실전 태클 시간을 추가했다.'),
 ('tutor_overlap',{}, [('commit',fx(2,-4,0,-1,350),'Keep the tutor session','튜터 세션을 지킨다'),('protect',fx(-3,5,1,2,-150),'Skip it for film','필름 공부를 택한다')],
  'Tutor Overlap','튜터 일정 충돌','A tutor session lands on top of an extra film period.','튜터 세션이 추가 필름 시간과 겹쳤다.'),
 ('campus_interview',{}, [('commit',fx(-2,-3,4,0,br=8),'Do the interview','인터뷰에 응한다'),('protect',fx(3,2,-1,0,br=-3),'Politely decline','정중히 거절한다')],
  'Campus Interview','캠퍼스 인터뷰','The student paper wants a feature on the defense.','학생 신문이 수비진 특집을 원한다.'),
 ('film_cutup',{'minPreparation':30}, [('commit',fx(-2,7,1,3,clue=1),'Build your own cut-up','직접 컷업을 만든다'),('protect',fx(3,-3,0,-1),'Rely on the staff tape','스태프 영상에 맡긴다')],
  'Opponent Cut-Up','상대 분석 영상','You notice a tell in the opponent\u2019s guards.','상대 가드들의 습관을 발견했다.'),
 ('room_rotation',{'maxCoachTrust':65}, [('commit',fx(-3,4,2,4),'Compete for the rotation','로테이션 자리를 두고 경쟁한다'),('protect',fx(2,-2,-1,-2),'Accept your slot','지금 자리를 받아들인다'),('connect',fx(-2,5,4,5),'Study the checks together','체크 콜을 함께 공부한다')],
  'Room Rotation','룸 로테이션','The staff is shuffling the linebacker rotation.','스태프가 라인배커 로테이션을 바꾸고 있다.'),
 ('weather_practice',{}, [('commit',fx(-5,4,2,2),'Practice through the storm','폭풍 속에서 훈련한다'),('protect',fx(5,-2,-1,-1),'Move inside for a walk-through','실내 워크스루로 옮긴다')],
  'Storm Practice','폭풍 속 훈련','A storm rolls in during Wednesday practice.','수요일 훈련 중 폭풍이 몰려왔다.'),
 ('captain_checkin',{'minConfidence':35}, [('commit',fx(-4,4,5,4),'Speak up in the linebacker room','라인배커 룸에서 목소리를 낸다'),('protect',fx(2,-1,-2,-1),'Let the captain lead','주장에게 맡긴다'),('connect',fx(-3,5,6,5),'Run a players-only meeting','선수들끼리 미팅을 연다')],
  'Captain Check-In','주장의 요청','A captain asks you to set the tone for the defense.','주장이 수비의 분위기를 잡아 달라고 한다.'),
 ('youth_camp',{}, [('commit',fx(-4,-3,5,1,-100,9),'Coach at the youth camp','유소년 캠프에서 가르친다'),('protect',fx(4,2,-1,0,100,-3),'Stay on your schedule','내 일정을 지킨다')],
  'Youth Camp','유소년 캠프','A local youth camp asks for a guest coach.','지역 유소년 캠프가 초청 코치를 부탁한다.'),
]
EDGE['events'] = [
 ('rush_plan_meeting',{}, [('commit',fx(-3,8,0,3,clue=1),'Build a plan for every tackle','모든 태클에 대한 플랜을 세운다'),('protect',fx(4,-2,1,-1),'Trust your go-to move','주무기를 믿는다')],
  'Rush Plan Meeting','러시 플랜 미팅','The defensive line coach wants a plan for each tackle you will face.','수비 라인 코치가 상대 태클마다 계획을 원한다.'),
 ('one_on_one_period',{}, [('commit',fx(-7,5,5,4),'Take every one-on-one rep','1대1 반복을 모두 받는다'),('protect',fx(4,-2,-1,0),'Rotate and stay fresh','교대하며 체력을 지킨다'),('connect',fx(-3,5,4,4),'Trade tips with the tackle','태클과 요령을 주고받는다')],
  'One-on-One Period','1대1 시간','The staff stages one-on-ones against the starting tackle.','스태프가 주전 태클과의 1대1을 준비했다.'),
 ('hand_fighting_clinic',{'minPreparation':30}, [('commit',fx(-4,6,2,3,dsf=3),'Drill counters after practice','훈련 후 카운터를 반복한다'),('protect',fx(3,-3,0,-1),'Skip the extra work','추가 훈련은 건너뛴다')],
  'Hand-Fighting Clinic','핸드 파이팅 클리닉','A former pro offers a hand-fighting session.','전직 프로가 핸드 파이팅 강습을 제안한다.'),
 ('sore_knee',{'maxBody':60}, [('commit',fx(10,-4,0,-1),'Rest the knee','무릎을 쉬게 한다'),('protect',fx(-6,5,1,3),'Brace it and rush anyway','보호대를 차고 그래도 달린다')],
  'Sore Knee','뻐근한 무릎','Your knee has been barking since Saturday.','토요일 이후 무릎이 계속 신경 쓰인다.'),
 ('conditioning_test',{}, [('commit',fx(-8,4,3,4),'Push through the whole test','테스트를 끝까지 버틴다'),('protect',fx(5,-2,-1,-2),'Pace yourself','페이스를 조절한다')],
  'Conditioning Test','체력 테스트','The staff adds a gassers test after practice.','스태프가 훈련 후 개서 테스트를 추가했다.'),
 ('tutor_overlap',{}, [('commit',fx(2,-4,0,-1,350),'Keep the tutor session','튜터 세션을 지킨다'),('protect',fx(-3,5,1,2,-150),'Skip it for film','필름 공부를 택한다')],
  'Tutor Overlap','튜터 일정 충돌','A tutor session lands on top of a pass-rush meeting.','튜터 세션이 패스 러시 미팅과 겹쳤다.'),
 ('local_radio',{}, [('commit',fx(-2,-3,4,0,br=8),'Go on the show','방송에 나간다'),('protect',fx(3,2,-1,0,br=-3),'Pass on it','사양한다')],
  'Local Radio','지역 라디오','A local sports show wants the defense\u2019s sack leader.','지역 스포츠 방송이 수비진의 색 리더를 원한다.'),
 ('tape_on_tackle',{'minPreparation':30}, [('commit',fx(-2,7,1,3,clue=1),'Break down his sets','그의 세트를 분석한다'),('protect',fx(3,-3,0,-1),'Rely on the scouting report','스카우팅 리포트에 맡긴다')],
  'Tape on the Tackle','태클 분석','The opposing tackle tips his sets on long downs.','상대 태클이 롱 다운에서 세트 습관을 드러낸다.'),
 ('d_line_rotation',{'maxCoachTrust':65}, [('commit',fx(-3,4,2,4),'Compete for the rotation','로테이션 자리를 두고 경쟁한다'),('protect',fx(2,-2,-1,-2),'Accept your slot','지금 자리를 받아들인다'),('connect',fx(-2,5,4,5),'Work stunts with the tackles','태클들과 스턴트를 맞춘다')],
  'Line Rotation','라인 로테이션','The staff is reshuffling the edge rotation.','스태프가 엣지 로테이션을 다시 짜고 있다.'),
 ('weather_practice',{}, [('commit',fx(-5,4,2,2),'Practice through the storm','폭풍 속에서 훈련한다'),('protect',fx(5,-2,-1,-1),'Move inside for a walk-through','실내 워크스루로 옮긴다')],
  'Storm Practice','폭풍 속 훈련','A storm rolls in during Wednesday practice.','수요일 훈련 중 폭풍이 몰려왔다.'),
 ('captain_checkin',{'minConfidence':35}, [('commit',fx(-4,4,5,4),'Speak up in the line room','라인 룸에서 목소리를 낸다'),('protect',fx(2,-1,-2,-1),'Let the captain lead','주장에게 맡긴다'),('connect',fx(-3,5,6,5),'Run a players-only meeting','선수들끼리 미팅을 연다')],
  'Captain Check-In','주장의 요청','A captain asks you to set the tone up front.','주장이 앞선의 분위기를 잡아 달라고 한다.'),
 ('youth_camp',{}, [('commit',fx(-4,-3,5,1,-100,9),'Coach at the youth camp','유소년 캠프에서 가르친다'),('protect',fx(4,2,-1,0,100,-3),'Stay on your schedule','내 일정을 지킨다')],
  'Youth Camp','유소년 캠프','A local youth camp asks for a guest coach.','지역 유소년 캠프가 초청 코치를 부탁한다.'),
]

SKILL_FAMILY = {'development':'skill_family_development','role_coach':'skill_family_role_coach','game_day':'skill_family_game_day','body':'skill_family_body','mindset':'skill_family_mindset','life':'skill_family_life'}

def build(pos, data):
    code = data['code']
    fam = {f.split('_')[-1]: f for f in data['families']}
    en, ko = {}, {}
    def msg(key, e, k):
        en[key] = e; ko[key] = k
    decisions = []
    for slug, f, style, imp, big, risk, exp, ne, nk, de, dk in data['decisions']:
        did = f'key_snap_decision_{code}_{slug}'
        base = f'm8Def.{code}.decision.{camel(slug)}'
        msg(base + '.name', ne, nk); msg(base + '.description', de, dk)
        decisions.append({'id': did, 'familyId': fam[f], 'style': style, 'impactModifierPermille': imp,
                          'bigPlayModifierPermille': big, 'riskModifierPermille': risk, 'bodyExposure': exp,
                          'nameKey': base + '.name', 'descriptionKey': base + '.description'})
    patterns, clues = [], []
    for (slug, f, ptype, impact_res, big_res, involve, impact, bigp, risk, yards, td, attrs, fits, cluetext, name, desc) in data['patterns']:
        pid = f'key_snap_pattern_{code}_{slug}'
        base = f'm8Def.{code}.pattern.{camel(slug)}'
        msg(base + '.name', name[0], name[1]); msg(base + '.description', desc[0], desc[1])
        clue_ids = []
        for index, (ce, ck) in enumerate(cluetext):
            cid = f'game_clue_{code}_{slug}_{["one","two","three"][index]}'
            ckey = f'm8Def.{code}.clue.{camel(slug)}{["One","Two","Three"][index]}'
            msg(ckey + '.name', ce, ck); msg(ckey + '.description', ce, ck)
            clues.append({'id': cid, 'nameKey': ckey + '.name', 'descriptionKey': ckey + '.description'})
            clue_ids.append(cid)
        patterns.append({'id': pid, 'familyId': fam[f], 'playType': ptype, 'clueIds': clue_ids,
            'decisionFits': [{'decisionId': f'key_snap_decision_{code}_{d}', 'fit': v} for d, v in fits.items()],
            'attributeWeights': [{'attributeId': a, 'weightPermille': w} for a, w in attrs],
            'involvePermille': involve, 'baseImpactPermille': impact, 'baseBigPlayPermille': bigp,
            'baseRiskPermille': risk, 'impactResult': impact_res, 'bigPlayResult': big_res,
            'baseYardsAllowed': yards, 'touchdownRiskPermille': td,
            'nameKey': base + '.name', 'descriptionKey': base + '.description'})
    skills = []
    for slug, family, grade, effects, ne, nk, de, dk in data['skills']:
        sid = f'skill_{code}_{slug}'
        base = f'm8Def.{code}.skill.{camel(slug)}'
        msg(base + '.name', ne, nk); msg(base + '.description', de, dk)
        eff = []
        for t, v, f in effects:
            e = {'type': t, 'value': v}
            if f is not None: e['familyId'] = fam[f]
            eff.append(e)
        skills.append({'id': sid, 'familyId': SKILL_FAMILY[family], 'gradeId': f'skill_grade_{grade}',
                       'positionId': pos, 'effects': eff, 'baseOfferWeight': WEIGHT[grade],
                       'nameKey': base + '.name', 'descriptionKey': base + '.description'})
    events = []
    for slug, req, choices, ne, nk, de, dk in data['events']:
        eid = f'event_{code}_{slug}'
        base = f'm8Def.{code}.event.{camel(slug)}'
        msg(base + '.name', ne, nk); msg(base + '.description', de, dk)
        ch = []
        for suffix, effects, le, lk in choices:
            cid = f'event_choice_{code}_{slug}_{suffix}'
            # VNext per-choice labels follow the shared v2.evt.<camelEventId>.<suffix> convention.
            msg(f'v2.evt.{camel(code + "_" + slug)}.{suffix}', le, lk)
            c = {'id': cid, 'effects': effects}
            if suffix == 'connect': c['requiresUnlockLevel'] = 1
            ch.append(c)
        events.append({'id': eid, 'positionId': pos, 'weight': 100, 'cooldownWeeks': 3,
                       'requirements': req, 'choices': ch,
                       'nameKey': base + '.name', 'descriptionKey': base + '.description'})
    return {'decisions': decisions, 'patterns': patterns, 'clues': clues, 'skills': skills, 'events': events}, en, ko

lb, en1, ko1 = build('position_lb', LB)
edge, en2, ko2 = build('position_edge', EDGE)
en = {**en1, **en2}; ko = {**ko1, **ko2}
assert set(en) == set(ko)
for key in en:
    assert re.match(r'^[a-z][a-zA-Z0-9]*(?:\.[a-z][a-zA-Z0-9]*)+$', key), key

def ts(value):
    return json.dumps(value, ensure_ascii=False, indent=2)

content = f"""// Generated from the M8 defender authoring table; edit the table, not this file.
import type {{ DefenderCatalogVNext }} from '@project-saturday/game-core';

type Localized = {{ readonly nameKey: string; readonly descriptionKey: string }};
type WithCopy<T> = T & Localized;

export interface DefenderContent {{
  readonly decisions: readonly WithCopy<DefenderCatalogVNext['decisions'][number]>[];
  readonly patterns: readonly WithCopy<DefenderCatalogVNext['patterns'][number]>[];
  readonly clues: readonly WithCopy<{{ readonly id: string }}>[];
  readonly skills: readonly WithCopy<DefenderCatalogVNext['skills'][number]>[];
  readonly events: readonly WithCopy<DefenderCatalogVNext['events'][number]>[];
}}

export const lbContent = {ts(lb)} as unknown as DefenderContent;

export const edgeContent = {ts(edge)} as unknown as DefenderContent;

/** Mechanics-only catalogs for the career core (copy keys stay on the content above). */
export function defenderCatalog(content: DefenderContent): DefenderCatalogVNext {{
  const strip = <T extends Localized>(entry: T) =>
    Object.fromEntries(
      Object.entries(entry).filter(([field]) => field !== 'nameKey' && field !== 'descriptionKey'),
    );
  return {{
    patterns: content.patterns.map(strip) as unknown as DefenderCatalogVNext['patterns'],
    decisions: content.decisions.map(strip) as unknown as DefenderCatalogVNext['decisions'],
    skills: content.skills.map(strip) as unknown as DefenderCatalogVNext['skills'],
    events: content.events.map(strip) as unknown as DefenderCatalogVNext['events'],
  }};
}}
"""
open('packages/game-content/src/content/defenders.ts', 'w', encoding='utf-8', newline='\n').write(content)

loc = f"""// Generated from the M8 defender authoring table; edit the table, not this file.
export const enUSDefenderMessages = {ts(dict(sorted(en.items())))} as const;

export const koKRDefenderMessages = {ts(dict(sorted(ko.items())))} as const satisfies Record<
  keyof typeof enUSDefenderMessages,
  string
>;
"""
open('packages/game-content/src/locales/m8-defenders.ts', 'w', encoding='utf-8', newline='\n').write(loc)
print('generated', len(en), 'messages per locale;',
      len(lb['decisions']), len(lb['patterns']), len(lb['skills']), len(lb['events']))

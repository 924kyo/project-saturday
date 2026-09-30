"""M9 campus-life event packs, part B: body and recovery, family and home, program and coaching.

Same row shape as part A. Imported by scripts/generate-life-events.py.
"""
from life_events_m9_a import fx

BODY = [
    ('ice_bath_challenge', {}, [
        ('commit', fx(b=5, c=1), 'Take the full ice bath', '얼음 목욕을 끝까지 한다'),
        ('protect', fx(b=2), 'Stick to a short soak', '짧게만 담근다'),
     ], 'Ice Bath', '얼음 목욕', 'The trainers dare the room to a full ten-minute ice bath.',
     '트레이너들이 10분 얼음 목욕에 도전해 보라고 한다.'),
    ('nutrition_plan', {}, [
        ('commit', fx(b=4, p=1, c=-1), 'Follow the dietitian’s plan', '영양사의 식단을 따른다'),
        ('protect', fx(c=2), 'Keep eating what you like', '먹고 싶은 걸 먹는다'),
     ], 'Nutrition Plan', '식단 관리', 'The team dietitian builds you a strict plan for the month.',
     '팀 영양사가 한 달짜리 엄격한 식단을 짜 줬다.'),
    ('hamstring_tightness', {'maxBody': 75}, [
        ('commit', fx(b=6, p=-2), 'Sit out the conditioning', '컨디셔닝을 빠진다'),
        ('protect', fx(b=-4, t=2), 'Push through it', '참고 한다'),
     ], 'Tight Hamstring', '뭉친 햄스트링', 'Your hamstring grabs during sprints.',
     '스프린트 중 햄스트링이 당긴다.'),
    ('yoga_session', {}, [
        ('commit', fx(b=4, c=2, p=-1), 'Join the team yoga class', '팀 요가 수업에 참여한다'),
        ('protect', fx(p=1), 'Lift instead', '대신 웨이트를 한다'),
     ], 'Team Yoga', '팀 요가', 'A visiting instructor runs a yoga session for the team.',
     '초빙 강사가 팀 요가 수업을 연다.'),
    ('sleep_debt', {'maxBody': 60}, [
        ('commit', fx(b=6, p=-2), 'Go to bed at nine all week', '일주일 내내 9시에 잔다'),
        ('protect', fx(p=2, b=-1), 'Keep the late film nights', '늦은 필름 공부를 계속한다'),
     ], 'Sleep Debt', '수면 부족', 'Your sleep tracker shows five hours a night for two weeks.',
     '수면 기록기가 2주째 하루 5시간이라고 보여 준다.'),
    ('turf_toe', {'maxBody': 70}, [
        ('commit', fx(b=5, c=-1), 'Wear the stiff insert', '딱딱한 깔창을 착용한다'),
        ('protect', fx(b=-3, c=1), 'Play in your normal cleats', '평소 축구화를 신는다'),
     ], 'Sore Toe', '발가락 통증', 'Your big toe has been sore since the last game.',
     '지난 경기 이후 엄지발가락이 아프다.'),
    ('extra_conditioning', {'minBody': 60}, [
        ('commit', fx(b=-6, c=3, t=2), 'Run the extra hills', '추가 언덕 달리기를 한다'),
        ('protect', fx(b=2), 'Save your legs', '다리를 아낀다'),
     ], 'Hill Sprints', '언덕 달리기', 'The strength coach offers optional hill sprints at dawn.',
     '스트렝스 코치가 새벽 언덕 달리기를 자율로 연다.'),
    ('massage_therapist', {}, [
        ('commit', fx(b=5, p=-1), 'Book a session', '예약한다'),
        ('protect', fx(p=1), 'Foam roll at home', '집에서 폼롤러를 쓴다'),
     ], 'Massage Therapist', '마사지 치료사', 'The department added a massage therapist this month.',
     '체육부가 이번 달 마사지 치료사를 들였다.'),
    ('weight_cut_talk', {}, [
        ('commit', fx(b=-2, p=2), 'Drop a few pounds for speed', '스피드를 위해 몇 파운드 뺀다'),
        ('protect', fx(b=2), 'Stay at your playing weight', '현재 체중을 유지한다'),
     ], 'Playing Weight', '경기 체중', 'A coach thinks you would be quicker a little lighter.',
     '한 코치가 조금 가벼워지면 더 빨라질 거라고 한다.'),
    ('heat_wave', {}, [
        ('commit', fx(b=-4, c=2, t=1), 'Practice in full pads', '풀 패드로 훈련한다'),
        ('protect', fx(b=2, t=-1), 'Ask for the shells-only period', '가벼운 장비로 하자고 한다'),
     ], 'Heat Wave', '폭염', 'It is over 35 degrees for Tuesday practice.',
     '화요일 훈련 날 기온이 35도를 넘는다.'),
    ('flu_shot_day', {}, [
        ('commit', fx(b=-1, p=0), 'Get the shot', '독감 주사를 맞는다'),
        ('protect', fx(p=1), 'Skip it', '건너뛴다'),
     ], 'Flu Shot Day', '독감 예방 접종', 'The training room is giving flu shots before the cold months.',
     '추워지기 전 트레이닝룸이 독감 주사를 놓는다.'),
    ('mobility_work', {}, [
        ('commit', fx(b=3, p=1), 'Add mobility before practice', '훈련 전 가동성 운동을 추가한다'),
        ('protect', fx(p=1), 'Keep the old routine', '원래 루틴을 지킨다'),
     ], 'Mobility Work', '가동성 운동', 'The trainer shows you a new hip mobility routine.',
     '트레이너가 새 고관절 가동성 루틴을 보여 준다.'),
    ('concussion_protocol_teammate', {}, [
        ('commit', fx(c=-1, t=2), 'Report the teammate’s symptoms', '동료의 증상을 알린다'),
        ('protect', fx(c=1, t=-2), 'Keep quiet', '말하지 않는다'),
     ], 'Something Is Wrong', '뭔가 이상하다', 'A teammate seems dizzy after a hit but wants to keep playing.',
     '한 동료가 충돌 후 어지러워 보이지만 계속 뛰고 싶어 한다.'),
    ('cold_tub_line', {}, [
        ('commit', fx(b=3, c=1), 'Wait your turn for the tubs', '차례를 기다려 냉탕에 들어간다'),
        ('protect', fx(p=1, b=1), 'Head home and stretch', '집에 가서 스트레칭한다'),
     ], 'Recovery Line', '회복 대기줄', 'The line for the cold tubs wraps around the training room.',
     '냉탕 대기줄이 트레이닝룸을 한 바퀴 돈다.'),
    ('supplement_offer', {}, [
        ('commit', fx(t=2, c=-1), 'Ask the trainer first', '먼저 트레이너에게 물어본다'),
        ('protect', fx(t=-3, b=1), 'Try it without asking', '묻지 않고 먹어 본다'),
     ], 'Supplement Offer', '보충제 권유', 'Someone at the gym offers you a powder that is “totally legal”.',
     '체육관에서 누군가 “완전 합법”이라며 보충제를 권한다.'),
    ('eye_exam', {}, [
        ('commit', fx(p=2, b=0), 'Get the new contacts', '새 렌즈를 맞춘다'),
        ('protect', fx(p=0, c=1), 'Your eyes are fine', '눈은 괜찮다고 넘긴다'),
     ], 'Eye Exam', '시력 검사', 'The team physical finds your vision has slipped a little.',
     '팀 신체검사에서 시력이 조금 떨어진 것으로 나왔다.'),
    ('long_bus_ride', {}, [
        ('commit', fx(b=2, p=1), 'Stretch at every stop', '정차할 때마다 스트레칭한다'),
        ('protect', fx(c=1), 'Sleep the whole way', '내내 잔다'),
     ], 'Long Bus Ride', '긴 버스 이동', 'The road trip is a nine-hour bus ride.',
     '원정길은 9시간짜리 버스 이동이다.'),
    ('back_spasm', {'maxBody': 70}, [
        ('commit', fx(b=5, p=-2), 'See the trainer every day', '매일 트레이너를 찾는다'),
        ('protect', fx(b=-2, c=1), 'Heat pad and hope', '찜질하며 버틴다'),
     ], 'Back Spasm', '허리 경련', 'Your lower back locks up while tying your cleats.',
     '축구화 끈을 묶다가 허리가 굳었다.'),
    ('hydration_test', {}, [
        ('commit', fx(b=3), 'Carry the jug everywhere', '물통을 늘 들고 다닌다'),
        ('protect', fx(c=1), 'Drink when thirsty', '목마를 때 마신다'),
     ], 'Hydration Test', '수분 검사', 'Your hydration test came back low twice in a row.',
     '수분 검사가 두 번 연속 낮게 나왔다.'),
    ('rest_day_temptation', {'minBody': 70}, [
        ('commit', fx(b=-2, p=3), 'Sneak in extra work', '몰래 추가 훈련을 한다'),
        ('protect', fx(b=3, t=1), 'Actually rest on the rest day', '휴식일엔 정말로 쉰다'),
     ], 'Rest Day', '휴식일', 'You feel great on the mandatory rest day.',
     '의무 휴식일인데 몸 상태가 좋다.'),
]

FAMILY = [
    ('sibling_game', {}, [
        ('commit', fx(c=4, b=-2, p=-1), 'Drive to your sibling’s game', '동생 경기를 보러 간다'),
        ('protect', fx(p=2), 'Watch the stream later', '나중에 중계를 본다'),
     ], 'Sibling’s Big Game', '동생의 큰 경기', 'Your younger sibling plays in a state semifinal on your off day.',
     '휴일에 동생이 주 준결승을 치른다.'),
    ('parent_health_scare', {}, [
        ('commit', fx(c=-2, p=-3, t=1), 'Fly home for two days', '이틀간 집에 다녀온다'),
        ('protect', fx(c=-3, p=1), 'Call every night instead', '대신 매일 밤 전화한다'),
     ], 'News From Home', '집에서 온 소식', 'A parent is in the hospital for tests.',
     '부모님이 검사로 입원하셨다.'),
    ('family_money', {}, [
        ('commit', fx(c=-1, br=1), 'Send part of your stipend home', '생활비 일부를 집에 보낸다'),
        ('protect', fx(c=1), 'Keep it for yourself', '내가 쓴다'),
     ], 'Money at Home', '집안 형편', 'Things are tight at home this month.',
     '이번 달 집안 형편이 빠듯하다.'),
    ('grandparent_visit', {}, [
        ('commit', fx(c=4, p=-1), 'Give them the stadium tour', '경기장 투어를 시켜 드린다'),
        ('protect', fx(c=1, p=1), 'Meet them for dinner only', '저녁만 함께한다'),
     ], 'Grandparents Visit', '조부모님의 방문', 'Your grandparents see you play in person for the first time.',
     '조부모님이 처음으로 직접 경기를 보러 오신다.'),
    ('hometown_coach_call', {}, [
        ('commit', fx(c=3, p=1), 'Talk through the season with him', '시즌에 대해 이야기를 나눈다'),
        ('protect', fx(p=1), 'Keep it short', '짧게 통화한다'),
     ], 'Old Coach Calls', '옛 코치의 전화', 'Your high school coach calls to check in.',
     '고등학교 코치가 안부 전화를 했다.'),
    ('family_expectations', {}, [
        ('commit', fx(c=-2, p=3), 'Promise to start by next year', '내년엔 주전이 되겠다고 약속한다'),
        ('protect', fx(c=2), 'Tell them you are enjoying it', '즐기고 있다고 말한다'),
     ], 'Expectations', '가족의 기대', 'Family keeps asking when you will start.',
     '가족이 언제 주전이 되느냐고 계속 묻는다.'),
    ('holiday_trip', {}, [
        ('commit', fx(c=4, b=2, p=-3), 'Go home for the holiday', '명절에 집에 간다'),
        ('protect', fx(p=2), 'Stay for practice', '훈련을 위해 남는다'),
     ], 'Holiday Weekend', '연휴 주말', 'A holiday weekend falls during a bye week.',
     '연휴 주말이 경기 없는 주와 겹쳤다.'),
    ('childhood_friend', {}, [
        ('commit', fx(c=3, b=-1), 'Show your friend around campus', '친구에게 캠퍼스를 구경시켜 준다'),
        ('protect', fx(p=1), 'Meet after the season', '시즌 후에 만난다'),
     ], 'Old Friend', '어릴 적 친구', 'A childhood friend is visiting town.',
     '어릴 적 친구가 동네에 온다.'),
    ('family_group_chat', {}, [
        ('commit', fx(c=2), 'Send them practice updates', '훈련 소식을 전한다'),
        ('protect', fx(p=1), 'Reply on Sundays', '일요일에만 답한다'),
     ], 'Family Chat', '가족 단톡방', 'The family chat wants daily updates.',
     '가족 단톡방이 매일 소식을 원한다.'),
    ('parent_in_stands', {}, [
        ('commit', fx(c=4), 'Find them in the crowd before kickoff', '킥오프 전 관중석에서 찾아본다'),
        ('protect', fx(p=1), 'Keep your pregame focus', '경기 전 집중을 유지한다'),
     ], 'In the Stands', '관중석의 가족', 'A parent is making their first road trip to see you.',
     '부모님이 처음으로 원정 경기를 보러 오신다.'),
    ('home_town_honor', {'minConfidence': 30}, [
        ('commit', fx(br=4, c=3, p=-2), 'Attend the ceremony', '기념식에 참석한다'),
        ('protect', fx(p=2), 'Send a video instead', '대신 영상을 보낸다'),
     ], 'Hometown Honor', '고향의 영예', 'Your high school wants to retire your jersey.',
     '모교가 당신의 등번호를 영구 결번하고 싶어 한다.'),
    ('cousin_recruit', {}, [
        ('commit', fx(c=2, t=1, p=-1), 'Host the recruit visit', '리크루트 방문을 안내한다'),
        ('protect', fx(p=1), 'Let the staff host', '스태프에게 맡긴다'),
     ], 'Cousin’s Visit', '사촌의 방문', 'Your cousin is a recruit and wants to visit your program.',
     '리크루트인 사촌이 당신의 학교를 방문하고 싶어 한다.'),
    ('letters_from_home', {}, [
        ('commit', fx(c=3), 'Read them before the game', '경기 전에 읽는다'),
        ('protect', fx(c=1, p=1), 'Save them for after', '경기 후로 미룬다'),
     ], 'Letters From Home', '집에서 온 편지', 'A package of handwritten letters arrives from home.',
     '집에서 손편지 꾸러미가 도착했다.'),
    ('family_business', {}, [
        ('commit', fx(b=-2, c=2), 'Help out on the off day', '휴일에 일을 돕는다'),
        ('protect', fx(b=2), 'Rest this week', '이번 주는 쉰다'),
     ], 'Family Shop', '가족 가게', 'The family shop needs help during a busy weekend.',
     '바쁜 주말, 가족 가게에 일손이 필요하다.'),
    ('mentor_from_home', {}, [
        ('commit', fx(c=3, p=1), 'Take his advice on routines', '루틴에 대한 조언을 따른다'),
        ('protect', fx(c=1), 'Thank him and keep your way', '고마워하고 내 방식대로 한다'),
     ], 'Neighbor’s Advice', '이웃의 조언', 'A neighbor who played long ago sends a long message.',
     '오래전에 선수였던 이웃이 긴 메시지를 보냈다.'),
    ('sibling_struggling', {}, [
        ('commit', fx(c=-1, p=-2, g=0, t=0), 'Call every day this week', '이번 주 매일 전화한다'),
        ('protect', fx(p=1), 'Send one long message', '긴 메시지를 한 번 보낸다'),
     ], 'Hard Week at Home', '집의 힘든 한 주', 'A sibling is going through a rough patch.',
     '형제가 힘든 시기를 보내고 있다.'),
    ('birthday_on_gameday', {}, [
        ('commit', fx(c=4, p=-1), 'Celebrate with the team', '팀과 함께 축하한다'),
        ('protect', fx(p=1), 'Save it for Sunday', '일요일로 미룬다'),
     ], 'Game-Day Birthday', '경기 날 생일', 'Your birthday falls on game day.',
     '생일이 경기 날과 겹쳤다.'),
    ('family_recipe', {}, [
        ('commit', fx(b=2, c=2), 'Cook the family recipe for teammates', '가족 요리를 동료들에게 해 준다'),
        ('protect', fx(p=1), 'Eat at the dining hall', '식당에서 먹는다'),
     ], 'Taste of Home', '고향의 맛', 'Homesick teammates are craving a home-cooked meal.',
     '향수병 걸린 동료들이 집밥을 그리워한다.'),
    ('parent_advice_coach', {}, [
        ('commit', fx(t=-2, c=1), 'Let your parent call the coach', '부모님이 코치에게 전화하게 둔다'),
        ('protect', fx(t=1), 'Ask them to let you handle it', '직접 해결하겠다고 말한다'),
     ], 'A Call to the Coach', '코치에게 거는 전화', 'A parent wants to call the coach about your playing time.',
     '부모님이 출전 시간 문제로 코치에게 전화하고 싶어 한다.'),
    ('photo_album', {}, [
        ('commit', fx(c=3), 'Look through the old photos', '옛 사진을 넘겨 본다'),
        ('protect', fx(p=1), 'Save it for the offseason', '오프시즌으로 미룬다'),
     ], 'Old Photos', '옛 사진', 'Family sends a photo album from your first youth season.',
     '가족이 첫 유소년 시즌 사진첩을 보냈다.'),
]

PROGRAM = [
    ('coordinator_interview', {}, [
        ('commit', fx(t=-1, c=-1, p=1), 'Ask him about the rumors', '소문에 대해 직접 묻는다'),
        ('protect', fx(p=1), 'Focus on this week', '이번 주에 집중한다'),
     ], 'Coach on the Move', '떠날지 모르는 코치', 'Your coordinator is rumored to be interviewing elsewhere.',
     '코디네이터가 다른 학교 면접을 본다는 소문이 돈다.'),
    ('new_playbook_wrinkle', {'minPreparation': 30}, [
        ('commit', fx(p=4, b=-1, clue=1), 'Learn the new package tonight', '새 패키지를 오늘 밤 익힌다'),
        ('protect', fx(b=1), 'Learn it in walkthrough', '워크스루에서 익힌다'),
     ], 'New Wrinkle', '새 전술', 'The staff installs a new package on Wednesday.',
     '스태프가 수요일에 새 패키지를 넣었다.'),
    ('depth_chart_meeting', {}, [
        ('commit', fx(t=3, c=-1), 'Ask what you need to improve', '무엇을 고쳐야 하는지 묻는다'),
        ('protect', fx(c=1), 'Wait for the next update', '다음 발표를 기다린다'),
     ], 'Depth Chart Talk', '뎁스 차트 면담', 'Your position coach offers a one-on-one about the depth chart.',
     '포지션 코치가 뎁스 차트에 대해 1대1 면담을 제안한다.'),
    ('scout_team_honor', {}, [
        ('commit', fx(c=3, t=2), 'Accept it proudly', '자랑스럽게 받는다'),
        ('protect', fx(c=1), 'Shrug it off', '대수롭지 않게 넘긴다'),
     ], 'Scout Team Player of the Week', '스카우트 팀 주간 선수', 'You are named scout team player of the week.',
     '스카우트 팀 주간 선수로 뽑혔다.'),
    ('booster_dinner', {'minConfidence': 30}, [
        ('commit', fx(br=3, c=1, p=-2), 'Attend the booster dinner', '후원자 만찬에 참석한다'),
        ('protect', fx(p=2), 'Stay for film', '필름 공부를 위해 남는다'),
     ], 'Booster Dinner', '후원자 만찬', 'Program donors want players at their annual dinner.',
     '프로그램 후원자들이 연례 만찬에 선수들을 초대한다.'),
    ('practice_tempo_change', {}, [
        ('commit', fx(b=-3, p=3, t=1), 'Embrace the faster tempo', '빨라진 템포를 받아들인다'),
        ('protect', fx(b=1, t=-1), 'Question it with the captains', '주장들과 문제를 제기한다'),
     ], 'Faster Tempo', '빨라진 템포', 'The staff speeds up practice to prepare for a hurry-up offense.',
     '스태프가 빠른 공격에 대비해 훈련 템포를 올렸다.'),
    ('coach_birthday', {}, [
        ('commit', fx(t=2, c=2), 'Organize the team card', '팀 카드를 준비한다'),
        ('protect', fx(p=1), 'Sign when it comes around', '돌아오면 서명만 한다'),
     ], 'Coach’s Birthday', '코치의 생일', 'Your position coach turns fifty this week.',
     '포지션 코치가 이번 주 쉰 살이 된다.'),
    ('recruiting_weekend', {}, [
        ('commit', fx(c=2, t=2, b=-1), 'Host a recruit', '리크루트를 맡는다'),
        ('protect', fx(p=1), 'Keep your weekend', '주말을 지킨다'),
     ], 'Recruiting Weekend', '리크루팅 주말', 'Top recruits visit campus this weekend.',
     '이번 주말 최상위 리크루트들이 캠퍼스를 방문한다.'),
    ('new_facility', {}, [
        ('commit', fx(c=3, br=2), 'Cut the ribbon with the team', '팀과 개관식에 참석한다'),
        ('protect', fx(p=1), 'Train in the old weight room', '예전 웨이트룸에서 훈련한다'),
     ], 'New Facility', '새 시설', 'The program opens a new training center.',
     '프로그램이 새 훈련 센터를 연다.'),
    ('assistant_coach_challenge', {}, [
        ('commit', fx(b=-2, p=2, t=2), 'Accept the extra drill', '추가 드릴을 받아들인다'),
        ('protect', fx(b=1), 'Stick to the plan', '계획대로 한다'),
     ], 'Coach’s Challenge', '코치의 도전', 'An assistant bets you cannot finish his drill without a mistake.',
     '한 어시스턴트 코치가 실수 없이 드릴을 끝낼 수 없을 거라며 내기를 건다.'),
    ('bowl_ticket_duty', {}, [
        ('commit', fx(br=2, c=1, p=-1), 'Sign autographs at the ticket booth', '매표소에서 사인한다'),
        ('protect', fx(p=1), 'Skip the promotion', '홍보 행사를 건너뛴다'),
     ], 'Ticket Promotion', '티켓 홍보', 'The marketing office wants players at a ticket promotion.',
     '마케팅 부서가 티켓 홍보 행사에 선수를 원한다.'),
    ('rules_clinic', {}, [
        ('commit', fx(p=3, t=1), 'Study the new rule changes', '새 규칙 변경을 공부한다'),
        ('protect', fx(c=1), 'Trust the officials', '심판을 믿는다'),
     ], 'Rules Clinic', '규칙 설명회', 'Officials visit to explain this year’s rule changes.',
     '심판진이 올해 규칙 변경을 설명하러 왔다.'),
    ('practice_squad_speech', {'minCoachTrust': 35}, [
        ('commit', fx(t=2, c=3), 'Speak to the reserves', '백업 선수들에게 말한다'),
        ('protect', fx(p=1), 'Let the captains talk', '주장들이 말하게 한다'),
     ], 'Reserve Rally', '백업 선수 격려', 'The coach asks you to fire up the reserves before a tough week.',
     '감독이 힘든 주를 앞두고 백업 선수들을 북돋아 달라고 한다.'),
    ('opponent_tendency', {'minPreparation': 35}, [
        ('commit', fx(p=3, clue=1, b=-1), 'Chart their tendencies yourself', '상대 성향을 직접 정리한다'),
        ('protect', fx(p=1), 'Use the staff report', '스태프 보고서를 쓴다'),
     ], 'Opponent Tendency', '상대의 습관', 'This week’s opponent repeats a formation tell.',
     '이번 주 상대가 포메이션 습관을 반복한다.'),
    ('coach_family_visit', {}, [
        ('commit', fx(t=2, c=2), 'Accept the dinner invitation', '저녁 초대를 받아들인다'),
        ('protect', fx(p=1), 'Politely decline', '정중히 사양한다'),
     ], 'Dinner at Coach’s House', '코치 댁 저녁', 'Your position coach invites the room to dinner at his house.',
     '포지션 코치가 룸 전체를 집으로 저녁 초대했다.'),
    ('uniform_reveal', {}, [
        ('commit', fx(br=3, c=2), 'Model the new uniforms', '새 유니폼 모델을 한다'),
        ('protect', fx(p=1), 'Let someone else do it', '다른 사람에게 맡긴다'),
     ], 'Uniform Reveal', '유니폼 공개', 'The program is revealing alternate uniforms.',
     '프로그램이 대체 유니폼을 공개한다.'),
    ('scheme_confusion', {}, [
        ('commit', fx(p=3, t=1, c=-1), 'Ask the question in the meeting', '미팅에서 질문한다'),
        ('protect', fx(c=1, p=-1), 'Figure it out yourself', '혼자 알아낸다'),
     ], 'Lost in the Scheme', '헷갈리는 전술', 'You are not sure about an assignment in the new call.',
     '새 콜에서 맡은 역할이 확실하지 않다.'),
    ('practice_mvp', {}, [
        ('commit', fx(c=4, t=1), 'Wear the practice MVP jersey', '연습 MVP 조끼를 입는다'),
        ('protect', fx(p=1), 'Pass it to a teammate', '동료에게 넘긴다'),
     ], 'Practice MVP', '연습 MVP', 'The staff names you Tuesday’s practice MVP.',
     '스태프가 당신을 화요일 연습 MVP로 뽑았다.'),
    ('coach_criticism', {}, [
        ('commit', fx(p=3, c=-2, t=2), 'Watch the tape with him', '코치와 영상을 본다'),
        ('protect', fx(c=1, t=-1), 'Shake it off', '털어 버린다'),
     ], 'Hard Coaching', '혹독한 지도', 'Your position coach tears apart your last game in front of the room.',
     '포지션 코치가 모두 앞에서 지난 경기를 혹독하게 지적했다.'),
    ('walkthrough_detail', {'minPreparation': 30}, [
        ('commit', fx(p=3, dsf=1), 'Stay after the walkthrough', '워크스루 후 남는다'),
        ('protect', fx(b=1), 'Head to the hotel', '호텔로 간다'),
     ], 'Friday Walkthrough', '금요일 워크스루', 'The Friday walkthrough reveals a detail most players miss.',
     '금요일 워크스루에서 대부분 놓치는 디테일이 보인다.'),
]

EVENTS_B = BODY + FAMILY + PROGRAM

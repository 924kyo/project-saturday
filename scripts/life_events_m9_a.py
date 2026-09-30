"""M9 campus-life event packs, part A: campus and academics, locker room, media and brand.

Rows: (slug, requirements, [(suffix, effects, en, ko)], en name, ko name, en description, ko description).
Imported by scripts/generate-life-events.py. Effects are small, real tradeoffs; nothing adds ratings.
"""


def fx(b=0, p=0, c=0, t=0, g=0, br=0, clue=0, dsf=0, exp=0):
    return {'bodyDelta': b, 'preparationDelta': p, 'confidenceDelta': c, 'coachTrustDelta': t,
            'gpaMilliDelta': g, 'brandDelta': br,
            'gameModifiers': {'clueBonus': clue, 'decisionScoreFlat': dsf, 'exposureReductionPermille': exp}}


CAMPUS = [
    ('group_project', {}, [
        ('commit', fx(p=-2, g=150, t=1), 'Carry the group project', '조별 과제를 책임진다'),
        ('protect', fx(p=2, g=-50), 'Do your part and no more', '내 몫만 한다'),
     ], 'Group Project', '조별 과제', 'Your group project partners have gone quiet two days before the deadline.',
     '마감 이틀 전, 조원들이 연락이 없다.'),
    ('professor_office_hours', {}, [
        ('commit', fx(p=-1, g=200, c=1), 'Go to office hours after practice', '연습 후 교수 면담에 간다'),
        ('protect', fx(b=2, g=-50), 'Skip it and rest', '건너뛰고 쉰다'),
     ], 'Office Hours', '교수 면담', 'Your professor says your last paper was close to an A.',
     '교수님이 지난 리포트가 A에 가까웠다고 한다.'),
    ('library_all_nighter', {'maxBody': 70}, [
        ('commit', fx(b=-5, g=250), 'Pull the all-nighter', '밤을 새운다'),
        ('protect', fx(b=2, g=50, p=1), 'Sleep and study at dawn', '자고 새벽에 공부한다'),
     ], 'Library All-Nighter', '도서관 밤샘', 'A final paper and a film session both land on Thursday.',
     '기말 리포트와 필름 세션이 모두 목요일에 몰렸다.'),
    ('major_choice', {}, [
        ('commit', fx(c=3, g=100, p=-1), 'Declare the major you love', '좋아하는 전공을 고른다'),
        ('protect', fx(p=2, g=0), 'Pick the lighter schedule', '수업 부담이 적은 전공을 고른다'),
     ], 'Choosing a Major', '전공 선택', 'Your advisor needs a decision on your major this week.',
     '지도 교수가 이번 주 안에 전공을 정하라고 한다.'),
    ('study_abroad_talk', {}, [
        ('commit', fx(c=2, p=-1), 'Go to the info session', '설명회에 간다'),
        ('protect', fx(p=1), 'Football comes first', '풋볼이 먼저다'),
     ], 'Summer Program', '여름 프로그램', 'A professor suggests a short summer program abroad.',
     '교수님이 짧은 해외 여름 프로그램을 권한다.'),
    ('tutor_cancels', {}, [
        ('commit', fx(b=-1, p=-2, g=100), 'Teach yourself from the notes', '노트로 혼자 공부한다'),
        ('protect', fx(g=-100, p=1), 'Wait for next week', '다음 주를 기다린다'),
     ], 'Tutor Cancels', '튜터 취소', 'Your tutor is sick the week before an exam.',
     '시험 전 주에 튜터가 아프다.'),
    ('presentation_day', {'maxConfidence': 70}, [
        ('commit', fx(c=4, p=-1, g=100), 'Rehearse until it is smooth', '매끄러워질 때까지 연습한다'),
        ('protect', fx(c=-2, p=1), 'Wing it', '즉흥으로 한다'),
     ], 'Presentation Day', '발표하는 날', 'You present to a lecture hall of two hundred students.',
     '200명이 앉은 강의실에서 발표를 한다.'),
    ('campus_job', {}, [
        ('commit', fx(b=-2, c=2, p=-2), 'Keep the shifts at the campus store', '교내 매장 근무를 계속한다'),
        ('protect', fx(p=2, c=-1), 'Quit to focus on football', '풋볼에 집중하려 그만둔다'),
     ], 'Campus Job', '교내 아르바이트', 'Your part-time shifts now overlap with extra film.',
     '아르바이트 시간이 추가 필름 시간과 겹친다.'),
    ('honor_code_seminar', {}, [
        ('commit', fx(t=2, p=-1), 'Lead the team discussion', '팀 토론을 이끈다'),
        ('protect', fx(p=1), 'Sit in the back', '뒷자리에 앉는다'),
     ], 'Integrity Seminar', '청렴 세미나', 'The department runs a required seminar on academic integrity.',
     '체육부가 학업 윤리 필수 세미나를 연다.'),
    ('lab_partner', {}, [
        ('commit', fx(g=150, c=2, p=-1), 'Stay late in the lab', '실험실에 늦게까지 남는다'),
        ('protect', fx(p=1, g=0), 'Split the work evenly', '일을 똑같이 나눈다'),
     ], 'Lab Partner', '실험 파트너', 'Your lab partner is a quiet engineering student who never misses.',
     '실험 파트너는 결석 한 번 없는 조용한 공대생이다.'),
    ('dean_list_letter', {'minPreparation': 40}, [
        ('commit', fx(c=4, br=2), 'Frame the letter', '편지를 액자에 넣는다'),
        ('protect', fx(p=1), 'Put it in a drawer and move on', '서랍에 넣고 넘어간다'),
     ], 'Dean’s Letter', '학장의 편지', 'A letter from the dean praises your balance of classes and football.',
     '학장이 수업과 풋볼의 균형을 칭찬하는 편지를 보냈다.'),
    ('exam_during_trip', {}, [
        ('commit', fx(b=-2, g=150, p=-1), 'Take the exam in the hotel', '호텔에서 시험을 본다'),
        ('protect', fx(g=-50, p=2), 'Reschedule for next week', '다음 주로 미룬다'),
     ], 'Road-Trip Exam', '원정길 시험', 'A proctored exam falls on the day of a road trip.',
     '감독 시험이 원정 출발일과 겹쳤다.'),
    ('writing_center', {}, [
        ('commit', fx(g=120, p=-1), 'Book two sessions', '두 번 예약한다'),
        ('protect', fx(p=1), 'Trust your first draft', '초안을 믿는다'),
     ], 'Writing Center', '글쓰기 센터', 'Your essay grades are slipping; the writing center has openings.',
     '에세이 점수가 떨어지고 있다. 글쓰기 센터에 자리가 있다.'),
    ('class_debate', {'minConfidence': 40}, [
        ('commit', fx(c=3, g=80), 'Speak up in the debate', '토론에서 발언한다'),
        ('protect', fx(p=1), 'Take notes and listen', '들으며 메모한다'),
     ], 'Class Debate', '수업 토론', 'Your seminar debates whether college athletes should be paid.',
     '세미나에서 대학 선수에게 보수를 줘야 하는지 토론한다.'),
    ('missed_assignment', {}, [
        ('commit', fx(p=-2, g=100, t=1), 'Email the professor and make it up', '교수에게 메일을 보내 만회한다'),
        ('protect', fx(g=-150), 'Take the zero', '0점을 받아들인다'),
     ], 'Missed Assignment', '놓친 과제', 'You forgot an assignment during a busy game week.',
     '바쁜 경기 주간에 과제를 깜빡했다.'),
    ('campus_concert', {}, [
        ('commit', fx(c=3, b=-2, br=2), 'Go with the team', '팀과 함께 간다'),
        ('protect', fx(b=2, p=1), 'Stay in and stretch', '방에서 스트레칭한다'),
     ], 'Campus Concert', '캠퍼스 콘서트', 'A big band plays the quad on Thursday night.',
     '목요일 밤 광장에서 유명 밴드 공연이 열린다.'),
    ('scholarship_essay', {}, [
        ('commit', fx(p=-2, g=100, c=2), 'Write it this week', '이번 주에 쓴다'),
        ('protect', fx(p=1), 'Let the deadline pass', '마감을 넘긴다'),
     ], 'Scholarship Essay', '장학금 에세이', 'An academic scholarship wants a personal essay by Friday.',
     '학업 장학금이 금요일까지 자기소개 에세이를 원한다.'),
    ('research_credit', {'minPreparation': 35}, [
        ('commit', fx(g=150, p=-2, c=1), 'Join the sports-science study', '스포츠 과학 연구에 참여한다'),
        ('protect', fx(p=1), 'Pass this semester', '이번 학기는 넘긴다'),
     ], 'Research Credit', '연구 학점', 'A sports-science lab offers course credit for helping with a study.',
     '스포츠 과학 연구실이 연구 보조에 학점을 준다.'),
    ('advisor_warning', {}, [
        ('commit', fx(p=-3, g=200), 'Add study hall hours', '스터디 홀 시간을 늘린다'),
        ('protect', fx(g=-50, c=1), 'Promise to do better', '더 잘하겠다고 약속만 한다'),
     ], 'Advisor’s Warning', '지도 교수의 경고', 'Your academic advisor says one more low grade could be trouble.',
     '지도 교수가 성적이 한 번만 더 떨어지면 문제라고 한다.'),
    ('language_class', {}, [
        ('commit', fx(g=100, c=2), 'Practice with a teammate who speaks it', '그 언어를 하는 동료와 연습한다'),
        ('protect', fx(p=1), 'Cram before the quiz', '퀴즈 전에 몰아서 한다'),
     ], 'Language Class', '외국어 수업', 'Your language class has an oral quiz every Friday.',
     '외국어 수업은 금요일마다 말하기 퀴즈가 있다.'),
]

LOCKER_ROOM = [
    ('team_dinner', {}, [
        ('commit', fx(c=3, t=1, b=-1), 'Host the position group dinner', '포지션 그룹 저녁을 연다'),
        ('protect', fx(b=1, p=1), 'Eat early and rest', '일찍 먹고 쉰다'),
     ], 'Team Dinner', '팀 저녁', 'The position group wants a dinner before the big road game.',
     '포지션 그룹이 큰 원정 경기 전 저녁 모임을 원한다.'),
    ('hazing_line', {}, [
        ('commit', fx(t=3, c=2, br=1), 'Tell the captains it stops here', '주장들에게 여기서 멈추자고 한다'),
        ('protect', fx(c=-2), 'Stay out of it', '끼어들지 않는다'),
     ], 'Where the Line Is', '선을 넘는 장난', 'An upperclassmen tradition is getting mean toward the freshmen.',
     '상급생의 전통이 신입생들에게 점점 짓궂어진다.'),
    ('film_room_argument', {}, [
        ('commit', fx(p=2, t=1, c=-1), 'Argue your read with the tape', '영상을 근거로 내 판단을 주장한다'),
        ('protect', fx(c=1), 'Let it go', '넘어간다'),
     ], 'Film Room Argument', '필름실 논쟁', 'A teammate blames you for a busted play in front of the room.',
     '동료가 모두 앞에서 망친 플레이를 당신 탓으로 돌린다.'),
    ('new_teammate', {}, [
        ('commit', fx(c=2, t=1, p=-1), 'Show the transfer around', '전학 온 동료를 안내한다'),
        ('protect', fx(p=1), 'Let the coaches handle it', '코치진에게 맡긴다'),
     ], 'New Teammate', '새 동료', 'A transfer joins your position room midseason.',
     '시즌 도중 전학생이 포지션 룸에 합류했다.'),
    ('prank_war', {}, [
        ('commit', fx(c=4, b=-1, t=-1), 'Strike back', '반격한다'),
        ('protect', fx(p=1, t=1), 'Call a truce', '휴전을 제안한다'),
     ], 'Prank War', '장난 전쟁', 'The offense and defense are in a full prank war.',
     '공격진과 수비진이 본격적인 장난 전쟁 중이다.'),
    ('injured_teammate', {}, [
        ('commit', fx(c=2, t=1, p=-1), 'Visit him after surgery', '수술 후 병문안을 간다'),
        ('protect', fx(p=1), 'Send a message', '메시지를 보낸다'),
     ], 'Injured Teammate', '다친 동료', 'A close teammate is out for the season after knee surgery.',
     '가까운 동료가 무릎 수술로 시즌 아웃됐다.'),
    ('senior_speech', {'minConfidence': 35}, [
        ('commit', fx(c=4, t=2), 'Speak at senior night', '시니어 나이트에서 연설한다'),
        ('protect', fx(p=1), 'Let a senior speak', '4학년에게 맡긴다'),
     ], 'Senior Night Speech', '시니어 나이트 연설', 'The team asks you to say a few words for the seniors.',
     '팀이 4학년들을 위해 몇 마디 해 달라고 한다.'),
    ('music_in_the_room', {}, [
        ('commit', fx(c=3, b=0), 'Take over the aux cord', '음악 선곡을 맡는다'),
        ('protect', fx(p=1), 'Keep your headphones on', '헤드폰을 쓴다'),
     ], 'Locker Room Playlist', '라커룸 플레이리스트', 'Nobody agrees on the pregame playlist.',
     '경기 전 플레이리스트에 아무도 합의하지 못한다.'),
    ('rookie_questions', {}, [
        ('commit', fx(p=-1, t=2, c=2), 'Answer every question', '모든 질문에 답해 준다'),
        ('protect', fx(p=1), 'Point him to the playbook', '플레이북을 보라고 한다'),
     ], 'Rookie Questions', '신입생의 질문', 'A freshman follows you around with questions about everything.',
     '신입생이 모든 걸 물으며 따라다닌다.'),
    ('curfew_check', {}, [
        ('commit', fx(t=2, b=2, c=-1), 'Be in the room early', '일찍 방에 들어간다'),
        ('protect', fx(c=2, t=-2), 'Stretch the curfew a little', '통금을 조금 넘긴다'),
     ], 'Curfew Check', '통금 점검', 'The staff is checking rooms on the road trip.',
     '원정길에 스태프가 방을 점검한다.'),
    ('position_group_chat', {}, [
        ('commit', fx(c=2, p=1), 'Share your cut-up in the chat', '편집 영상을 단톡방에 올린다'),
        ('protect', fx(p=1), 'Mute the chat for the week', '이번 주는 단톡방을 끈다'),
     ], 'Group Chat', '포지션 단톡방', 'The position group chat never sleeps.',
     '포지션 단톡방은 잠들지 않는다.'),
    ('leadership_council', {'minCoachTrust': 40}, [
        ('commit', fx(t=3, c=2, p=-2), 'Join the leadership council', '리더십 위원회에 들어간다'),
        ('protect', fx(p=1), 'Focus on your own game', '내 경기에 집중한다'),
     ], 'Leadership Council', '리더십 위원회', 'The coaches invite you onto the player leadership council.',
     '코치진이 선수 리더십 위원회에 초대했다.'),
    ('bus_seat', {}, [
        ('commit', fx(c=2, t=1), 'Sit with the walk-ons', '워크온 선수들과 앉는다'),
        ('protect', fx(p=1), 'Take your usual seat', '늘 앉던 자리에 앉는다'),
     ], 'Bus Seat', '버스 자리', 'The seating on the team bus has quietly become a hierarchy.',
     '팀 버스 좌석이 어느새 서열처럼 굳어졌다.'),
    ('rival_teammate', {}, [
        ('commit', fx(p=2, c=2, b=-2), 'Out-work him in practice', '연습에서 더 열심히 한다'),
        ('protect', fx(c=1, t=1), 'Keep it friendly', '우호적으로 지낸다'),
     ], 'Competition in the Room', '룸 안의 경쟁', 'The player behind you on the depth chart is closing the gap.',
     '뎁스 차트 바로 뒤의 선수가 격차를 좁히고 있다.'),
    ('team_service_day', {}, [
        ('commit', fx(b=-2, c=3, br=3), 'Build houses with the team', '팀과 집짓기 봉사를 한다'),
        ('protect', fx(p=2), 'Use the day for film', '그날을 필름 공부에 쓴다'),
     ], 'Service Day', '봉사의 날', 'The team spends an off day on a community build.',
     '팀이 휴일을 지역 집짓기 봉사에 쓴다.'),
    ('celebration_rule', {}, [
        ('commit', fx(c=3, t=-2), 'Keep your celebration', '세리머니를 계속한다'),
        ('protect', fx(t=2, c=-1), 'Tone it down', '자제한다'),
     ], 'Celebration Talk', '세리머니 문제', 'The head coach wants fewer celebrations after big plays.',
     '감독이 큰 플레이 후 세리머니를 줄이라고 한다.'),
    ('quiet_teammate', {}, [
        ('commit', fx(c=2, t=1), 'Invite him to lunch', '점심을 같이 하자고 한다'),
        ('protect', fx(p=1), 'Give him space', '혼자 있게 둔다'),
     ], 'The Quiet One', '말수 적은 동료', 'A teammate has barely spoken since a tough loss.',
     '힘든 패배 이후 한 동료가 거의 말을 하지 않는다.'),
    ('snack_budget', {}, [
        ('commit', fx(b=2, c=1), 'Organize a shared grocery run', '장보기를 함께 조직한다'),
        ('protect', fx(p=1), 'Eat at the training table', '트레이닝 식당에서 해결한다'),
     ], 'Grocery Run', '장보기', 'Half the room is living on cereal before payday.',
     '월급날 전, 룸의 절반이 시리얼로 버티고 있다.'),
    ('video_game_night', {}, [
        ('commit', fx(c=3, b=-1), 'Host the tournament', '토너먼트를 연다'),
        ('protect', fx(b=2, p=1), 'Go to bed', '잠자리에 든다'),
     ], 'Game Night', '게임의 밤', 'The dorm wants a football video game tournament.',
     '기숙사에서 풋볼 비디오 게임 대회를 열자고 한다.'),
    ('captain_vote', {'minCoachTrust': 45}, [
        ('commit', fx(c=4, t=2, p=-1), 'Accept the nomination', '후보 지명을 받아들인다'),
        ('protect', fx(p=1), 'Decline and vote for a senior', '사양하고 4학년에게 투표한다'),
     ], 'Captain Vote', '주장 투표', 'Teammates nominate you for captain.',
     '동료들이 당신을 주장 후보로 추천했다.'),
]

MEDIA = [
    ('podcast_invite', {'minConfidence': 30}, [
        ('commit', fx(br=5, c=2, p=-2), 'Go on the student podcast', '학생 팟캐스트에 출연한다'),
        ('protect', fx(p=1), 'Politely pass', '정중히 사양한다'),
     ], 'Podcast Invite', '팟캐스트 초대', 'The biggest student podcast wants a football guest.',
     '가장 큰 학생 팟캐스트가 풋볼 선수 게스트를 원한다.'),
    ('viral_clip', {}, [
        ('commit', fx(br=6, c=3, t=-1), 'Lean into it online', '온라인에서 적극적으로 반응한다'),
        ('protect', fx(p=1, t=1), 'Stay offline this week', '이번 주는 오프라인으로 지낸다'),
     ], 'Viral Clip', '화제의 영상', 'A clip of your practice catch is everywhere online.',
     '연습 중 잡은 공 영상이 온라인에 퍼졌다.'),
    ('critical_column', {}, [
        ('commit', fx(c=-1, p=3), 'Pin it in your locker', '사물함에 붙여 둔다'),
        ('protect', fx(c=1), 'Do not read the paper', '신문을 읽지 않는다'),
     ], 'Critical Column', '비판 칼럼', 'A local columnist says you are not ready for big games.',
     '지역 칼럼니스트가 당신은 큰 경기에 준비가 안 됐다고 썼다.'),
    ('photo_shoot', {'minConfidence': 30}, [
        ('commit', fx(br=4, b=-1, p=-1), 'Do the media-day photos', '미디어데이 촬영을 한다'),
        ('protect', fx(p=1), 'Keep it to the basics', '기본만 한다'),
     ], 'Media Day', '미디어데이', 'The athletic department wants new photos for the season.',
     '체육부가 새 시즌 사진을 찍고 싶어 한다.'),
    ('rival_trash_talk', {}, [
        ('commit', fx(br=4, c=3, t=-2), 'Answer him back online', '온라인에서 맞받아친다'),
        ('protect', fx(t=2, p=1), 'Let the game answer', '경기로 답한다'),
     ], 'Trash Talk', '도발', 'A rival player called you out in a post.',
     '라이벌 선수가 게시글에서 당신을 저격했다.'),
    ('radio_callin', {}, [
        ('commit', fx(br=3, c=2), 'Take calls on the radio show', '라디오 청취자 전화를 받는다'),
        ('protect', fx(p=1), 'Leave it to the coach', '코치에게 맡긴다'),
     ], 'Call-In Show', '청취자 전화 쇼', 'The coach’s radio show wants a player guest.',
     '감독의 라디오 쇼가 선수 게스트를 원한다.'),
    ('hometown_paper', {}, [
        ('commit', fx(c=3, br=2), 'Give the hometown paper an interview', '고향 신문과 인터뷰한다'),
        ('protect', fx(p=1), 'Send a short quote', '짧은 코멘트만 보낸다'),
     ], 'Hometown Paper', '고향 신문', 'Your hometown paper wants a feature on your season.',
     '고향 신문이 당신의 시즌을 특집으로 다루고 싶어 한다.'),
    ('fan_confrontation', {}, [
        ('commit', fx(c=-2, t=2), 'Walk away calmly', '침착하게 자리를 뜬다'),
        ('protect', fx(c=1, br=-3, t=-2), 'Say what you think', '생각을 말한다'),
     ], 'Angry Fan', '화난 팬', 'A fan confronts you outside the stadium after a loss.',
     '패배 후 경기장 밖에서 한 팬이 당신에게 따진다.'),
    ('documentary_crew', {'minConfidence': 35}, [
        ('commit', fx(br=6, p=-2, c=1), 'Let the cameras follow you', '카메라가 따라다니게 한다'),
        ('protect', fx(p=2), 'Keep practice closed', '연습은 비공개로 한다'),
     ], 'Documentary Crew', '다큐멘터리 팀', 'A streaming documentary is following the team this week.',
     '스트리밍 다큐멘터리 팀이 이번 주 팀을 따라다닌다.'),
    ('press_conference', {}, [
        ('commit', fx(c=2, t=1, br=2), 'Answer every question', '모든 질문에 답한다'),
        ('protect', fx(p=1), 'Keep answers short', '짧게 답한다'),
     ], 'Press Conference', '기자회견', 'You are the player at this week’s press conference.',
     '이번 주 기자회견에 나설 선수가 당신이다.'),
    ('social_media_break', {}, [
        ('commit', fx(c=3, p=2, br=-2), 'Delete the apps for a month', '한 달간 앱을 지운다'),
        ('protect', fx(br=1), 'Keep posting', '계속 올린다'),
     ], 'Social Media Break', '소셜 미디어 휴식', 'The comments after last week are getting to you.',
     '지난주 이후 댓글들이 신경 쓰인다.'),
    ('mascot_video', {}, [
        ('commit', fx(br=4, c=2), 'Film the skit with the mascot', '마스코트와 콩트를 찍는다'),
        ('protect', fx(p=1), 'Skip it', '건너뛴다'),
     ], 'Mascot Video', '마스코트 영상', 'The marketing team wants you in a funny mascot video.',
     '마케팅팀이 마스코트와의 재미있는 영상에 출연해 달라고 한다.'),
    ('sports_talk_rumor', {}, [
        ('commit', fx(t=2, c=-1), 'Deny it to the coaches directly', '코치진에게 직접 부인한다'),
        ('protect', fx(c=1), 'Ignore the rumor', '소문을 무시한다'),
     ], 'Transfer Rumor', '이적 소문', 'A sports talk show says you might transfer.',
     '스포츠 토크쇼가 당신이 이적할 수도 있다고 말한다.'),
    ('kids_camp_video', {}, [
        ('commit', fx(br=3, c=2, p=-1), 'Record a message for the kids', '아이들에게 영상 메시지를 녹화한다'),
        ('protect', fx(p=1), 'Send an autographed photo', '사인 사진을 보낸다'),
     ], 'Message for a Camp', '캠프 응원 영상', 'A youth camp asks for a short video message.',
     '유소년 캠프가 짧은 영상 메시지를 부탁한다.'),
    ('beat_writer_trust', {}, [
        ('commit', fx(br=3, t=-1), 'Talk off the record', '비공식으로 이야기한다'),
        ('protect', fx(t=1), 'Keep it on the record', '공식적으로만 말한다'),
     ], 'Beat Writer', '담당 기자', 'The team’s beat writer wants a real conversation.',
     '팀 담당 기자가 진솔한 대화를 원한다.'),
    ('gameday_show', {'minConfidence': 40}, [
        ('commit', fx(br=6, c=3, b=-1), 'Appear on the pregame show', '경기 전 쇼에 출연한다'),
        ('protect', fx(p=2), 'Stay in the hotel', '호텔에 머문다'),
     ], 'Pregame TV', '경기 전 방송', 'A national pregame show is on campus this weekend.',
     '전국 경기 전 방송이 이번 주말 캠퍼스를 찾았다.'),
    ('meme_page', {}, [
        ('commit', fx(c=2, br=2), 'Laugh along', '함께 웃는다'),
        ('protect', fx(c=-1, p=1), 'Ask them to take it down', '내려 달라고 한다'),
     ], 'Meme Page', '밈 페이지', 'A campus meme page made you its star this week.',
     '캠퍼스 밈 페이지가 이번 주 당신을 주인공으로 삼았다.'),
    ('award_watchlist', {}, [
        ('commit', fx(c=3, br=3, p=-1), 'Post about the watch list', '후보 명단 소식을 올린다'),
        ('protect', fx(p=2), 'Say nothing and work', '말없이 훈련한다'),
     ], 'Watch List', '후보 명단', 'Your name appears on a preseason award watch list.',
     '시즌 전 수상 후보 명단에 당신의 이름이 올랐다.'),
    ('student_section_chant', {}, [
        ('commit', fx(c=4, br=2), 'Wave to the student section', '학생석에 손을 흔든다'),
        ('protect', fx(p=1), 'Stay locked in', '집중을 유지한다'),
     ], 'Your Chant', '응원 구호', 'The student section invented a chant with your name.',
     '학생석이 당신 이름으로 응원 구호를 만들었다.'),
    ('interview_mistake', {}, [
        ('commit', fx(t=2, c=-1, br=-1), 'Apologize to the team', '팀에 사과한다'),
        ('protect', fx(br=-3, c=1), 'Let it blow over', '잠잠해지길 기다린다'),
     ], 'Misquoted', '잘못된 인용', 'A quote of yours about the offense came out wrong.',
     '공격진에 대한 당신의 발언이 잘못 전해졌다.'),
]

EVENTS_A = CAMPUS + LOCKER_ROOM + MEDIA

-- =============================================
-- 코스터디 수학학원 학생관리 앱 DB 스키마
-- =============================================

-- 선생님 프로필 (auth.users 확장)
CREATE TABLE teachers (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 반 테이블
CREATE TABLE classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,           -- 예: "중3 화목반"
  subject TEXT NOT NULL,        -- 예: "수학"
  schedule TEXT,                -- 예: "화, 목 오후 5시"
  textbook TEXT,                -- 교재명
  current_progress TEXT,        -- 현재 진도
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 학생 테이블
CREATE TABLE students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_phone TEXT,            -- 학부모 연락처
  notes TEXT,                   -- 학생 기본 메모
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 학생-반 매핑 (다대다: 학생이 여러 반 수강 가능)
CREATE TABLE student_classes (
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (student_id, class_id)
);

-- 수업 일지 (반 단위, 날짜별)
CREATE TABLE lessons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  lesson_date DATE NOT NULL,
  memo TEXT,                    -- 수업 전체 메모
  test_total INTEGER,           -- 일일테스트 총 문항 (없으면 NULL)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, lesson_date)
);

-- 학생별 수업 기록
CREATE TABLE student_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,

  -- 출결
  attendance TEXT CHECK (attendance IN ('출석', '결석', '조퇴', '병결', '기타')) DEFAULT '출석',

  -- 수업 태도 (긍정 체크박스 - 배열로 저장)
  attitude_positive TEXT[] DEFAULT '{}',
  -- 항목: 집중도_높음, 적극적_질문, 참여도_높음, 끝까지_풀려는_노력,
  --       모르는부분_스스로표시, 자신있게_발표, 꼼꼼한_필기, 설명잘들음, 컨디션_좋음

  -- 수업 태도 (부정 체크박스)
  attitude_negative TEXT[] DEFAULT '{}',
  -- 항목: 산만함, 졸음, 소극적, 질문안함, 이해한척_넘어감,
  --       멍함, 딴짓, 의욕없음, 컨디션_나쁨

  -- 수업 전반 점수 (1~5)
  attitude_score INTEGER CHECK (attitude_score BETWEEN 1 AND 5),

  -- 과제 수행 체크박스
  homework TEXT[] DEFAULT '{}',
  -- 항목: 완벽제출, 미제출, 풀이성실, 풀이부실, 오답정리_잘됨,
  --       오답정리_안됨, 급하게한흔적, 모르는문제_표시해옴

  -- 일일테스트 맞은 개수
  test_correct INTEGER,

  -- 특이사항
  special_note TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lesson_id, student_id)
);

-- 학부모 소통 기록
CREATE TABLE parent_communications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL,       -- 예: "2025-01"
  generated_message TEXT,         -- 자동생성 문구
  sent_at TIMESTAMPTZ,            -- 발송 날짜
  parent_feedback TEXT,           -- 학부모 피드백/요청사항
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- RLS (Row Level Security) 설정
-- =============================================

ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_communications ENABLE ROW LEVEL SECURITY;

-- 선생님은 자기 데이터만 접근 가능
CREATE POLICY "teachers_own" ON teachers FOR ALL USING (auth.uid() = id);
CREATE POLICY "classes_own" ON classes FOR ALL USING (auth.uid() = teacher_id);
CREATE POLICY "students_own" ON students FOR ALL USING (auth.uid() = teacher_id);

CREATE POLICY "student_classes_own" ON student_classes FOR ALL
  USING (EXISTS (SELECT 1 FROM students WHERE id = student_id AND teacher_id = auth.uid()));

CREATE POLICY "lessons_own" ON lessons FOR ALL
  USING (EXISTS (SELECT 1 FROM classes WHERE id = class_id AND teacher_id = auth.uid()));

CREATE POLICY "student_records_own" ON student_records FOR ALL
  USING (EXISTS (
    SELECT 1 FROM lessons l
    JOIN classes c ON c.id = l.class_id
    WHERE l.id = lesson_id AND c.teacher_id = auth.uid()
  ));

CREATE POLICY "parent_comm_own" ON parent_communications FOR ALL
  USING (EXISTS (SELECT 1 FROM students WHERE id = student_id AND teacher_id = auth.uid()));

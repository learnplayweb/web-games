// v0.3.0
// Spelling Game - 마당 11~15 주제 추가 및 신규 주제 추가 매뉴얼 작성
//
// [주제(마당) 추가 매뉴얼]
// 1. 문제 파일 생성
//    - 경로: games/spelling/data/problems/NN-주제id.js (NN = 마당 순서, 두 자리 번호)
//    - export 2개 필수: <ID>_PROBLEMS, <ID>_GUIDE (ID = 주제id를 대문자+언더바로 변환)
//      예) 'chae-che' -> CHAE_CHE_PROBLEMS, CHAE_CHE_GUIDE
// 2. 이 파일(topics.js)에서 2곳만 수정
//    - (a) 상단 import 문 1줄 추가
//    - (b) TOPICS 배열 맨 끝에 { id, label, problems, guide } 1개 추가
//      · id: 문제 파일명에서 번호 접두사를 뺀 값 (예: '06-chae-che.js' -> 'chae-che')
//      · label: 선택 화면 카드에 표시될 주제명 ("마당N."은 자동 부여되므로 label엔 넣지 않음)
// 3. 자동 반영 (수정 불필요)
//    - stages.js : TOPICS 순서대로 level 자동 부여
//    - select.js : 카드 자동 생성, "마당N" 번호/별점 표시
//    - script.js : 문제은행/학습 가이드 매핑 자동 생성
//
// [달인 마당]
// - 별도 작업 없음. TOPICS가 5개 채워질 때마다 stages.js가 달인 마당 1개를 자동 삽입 (1~5, 6~10, 11~15 ...)
// - 카드 이름 "달인 마당. N~M", 출제 범위(해당 5개 주제), 최근 별점 저장(level별)도 자동 처리
// - 5개가 안 찬 마지막 묶음은 달인 마당이 아직 생기지 않음 (5개가 찰 때 생성)
//
// [주의]
// - 배열 순서 = 마당 순서. 가급적 맨 끝에만 추가할 것
//   · 중간 삽입/삭제 시 이후 달인 마당의 level이 밀려, level 키로 저장된 달인 마당 최근 별점이 어긋남
//   · 일반 마당 최고 별점은 id 키라 영향 없음

import { DOE_DWAE_PROBLEMS, DOE_DWAE_GUIDE } from './problems/01-doe-dwae.js';
import { AN_ANH_PROBLEMS, AN_ANH_GUIDE } from './problems/02-an-anh.js';
import { GAJ_GAT_GASS_PROBLEMS, GAJ_GAT_GASS_GUIDE } from './problems/03-gaj-gat-gass.js';
import { DEON_DEUN_PROBLEMS, DEON_DEUN_GUIDE } from './problems/04-deon-deun.js';
import { DAE_DE_PROBLEMS, DAE_DE_GUIDE } from './problems/05-dae-de.js';
import { CHAE_CHE_PROBLEMS, CHAE_CHE_GUIDE } from './problems/06-chae-che.js';
import { MATCHU_MACHI_PROBLEMS, MATCHU_MACHI_GUIDE } from './problems/07-matchu-machi.js';
import { DAERO_DERO_PROBLEMS, DAERO_DERO_GUIDE } from './problems/08-daero-dero.js';
import { MAE_ME_PROBLEMS, MAE_ME_GUIDE } from './problems/09-mae-me.js';
import { BUD_BUS_PROBLEMS, BUD_BUS_GUIDE } from './problems/10-bud-bus.js';
import { BUCHI_BUTI_PROBLEMS, BUCHI_BUTI_GUIDE } from './problems/11-buchi-buti.js';
import { TTEI_TTI_PROBLEMS, TTEI_TTI_GUIDE } from './problems/12-ttei-tti.js';
import { BUSU_BUSI_PROBLEMS, BUSU_BUSI_GUIDE } from './problems/13-busu-busi.js';
import { CM01_PROBLEMS, CM01_GUIDE } from './problems/14-day-col-lock.js';
import { JOT_JJOT_PROBLEMS, JOT_JJOT_GUIDE } from './problems/15-jot-jjot.js';

export const TOPICS = [
  { id: 'doe-dwae',      label: '되 / 돼',         problems: DOE_DWAE_PROBLEMS,      guide: DOE_DWAE_GUIDE },
  { id: 'an-anh',        label: '안 / 않',         problems: AN_ANH_PROBLEMS,        guide: AN_ANH_GUIDE },
  { id: 'gaj-gat-gass',  label: '갔 / 갖 / 같',    problems: GAJ_GAT_GASS_PROBLEMS,  guide: GAJ_GAT_GASS_GUIDE },
  { id: 'deon-deun',     label: '던 / 든',         problems: DEON_DEUN_PROBLEMS,     guide: DEON_DEUN_GUIDE },
  { id: 'dae-de',        label: '대 / 데',         problems: DAE_DE_PROBLEMS,        guide: DAE_DE_GUIDE },
  { id: 'chae-che',      label: '채 / 체',         problems: CHAE_CHE_PROBLEMS,      guide: CHAE_CHE_GUIDE },
  { id: 'matchu-machi',  label: '맞추다 / 맞히다',  problems: MATCHU_MACHI_PROBLEMS,  guide: MATCHU_MACHI_GUIDE },
  { id: 'daero-dero',    label: '대로 / 데로',      problems: DAERO_DERO_PROBLEMS,    guide: DAERO_DERO_GUIDE },
  { id: 'mae-me',        label: '매다 / 메다',      problems: MAE_ME_PROBLEMS,        guide: MAE_ME_GUIDE },
  { id: 'bud-bus',       label: '붇다 / 붓다',      problems: BUD_BUS_PROBLEMS,       guide: BUD_BUS_GUIDE },
  { id: 'buchi-buti',    label: '부치다 / 붙이다',  problems: BUCHI_BUTI_PROBLEMS,    guide: BUCHI_BUTI_GUIDE },
  { id: 'ttei-tti',      label: '띄다 / 띠다',      problems: TTEI_TTI_PROBLEMS,      guide: TTEI_TTI_GUIDE },

  ];

// { id: 'busu-busi',     label: '부수다 / 부시다',  problems: BUSU_BUSI_PROBLEMS,     guide: BUSU_BUSI_GUIDE },
//  { id: 'day-col-lock',  label: '며칠 / 색 / 잠그다', problems: CM01_PROBLEMS,        guide: CM01_GUIDE }, // common-mistakes 틀리기 쉬운 말
 // { id: 'jot-jjot',      label: '좇다 / 쫓다',      problems: JOT_JJOT_PROBLEMS,      guide: JOT_JJOT_GUIDE },
// v0.1.0
// Spelling Game - 주제(마당) 중앙 목록
// - 새 주제를 추가할 때 손댈 곳을 이 파일 하나로 모으기 위한 매니페스트.
//   할 일은 딱 2가지: (1) 문제은행 파일 import 한 줄, (2) 아래 TOPICS 배열에 항목 하나 추가.
// - stages.js/select.js/script.js는 전부 이 배열을 기준으로 동작하므로, 그 세 파일은 더 이상 손댈 필요 없음.
//   (단, import 자체는 ES 모듈 특성상 정적으로 적어야 해서 완전히 자동화할 수는 없음)
// - 배열 순서 = 마당 순서. "마당N" 번호와 문제 파일 번호(01, 02…)도 이 순서를 그대로 따라가면 된다.

import { DOE_DWAE_PROBLEMS, DOE_DWAE_GUIDE } from './problems/01-doe-dwae.js';
import { AN_ANH_PROBLEMS, AN_ANH_GUIDE } from './problems/02-an-anh.js';
import { GAJ_GAT_GASS_PROBLEMS, GAJ_GAT_GASS_GUIDE } from './problems/03-gaj-gat-gass.js';
import { DEON_DEUN_PROBLEMS, DEON_DEUN_GUIDE } from './problems/04-deon-deun.js';
import { DAE_DE_PROBLEMS, DAE_DE_GUIDE } from './problems/05-dae-de.js';

export const TOPICS = [
  { id: 'doe-dwae',      label: '되 / 돼',       problems: DOE_DWAE_PROBLEMS,      guide: DOE_DWAE_GUIDE },
  { id: 'an-anh',        label: '안 / 않',       problems: AN_ANH_PROBLEMS,        guide: AN_ANH_GUIDE },
  { id: 'gaj-gat-gass',  label: '갔 / 갖 / 같',  problems: GAJ_GAT_GASS_PROBLEMS,  guide: GAJ_GAT_GASS_GUIDE },
  { id: 'deon-deun',     label: '던 / 든',       problems: DEON_DEUN_PROBLEMS,     guide: DEON_DEUN_GUIDE },
  { id: 'dae-de',        label: '대 / 데',       problems: DAE_DE_PROBLEMS,        guide: DAE_DE_GUIDE },
];
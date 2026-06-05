# Plan — GitHub 코드 링크 추가 (ants-camp · da2joburureung)

> **상태:** 계획서 (코드 미적용).
> **목표:**
> 1. ants-camp / 다2조부르릉의 **각 파트(Contribution · Troubleshooting)에 "상세 코드 보기" GitHub 링크**를 단다 — 해당 레포의 해당 코드 파일 페이지로.
> 2. **index 및 각 프로젝트 페이지 최상단에 GitHub 레포 홈 링크**를 단다.
> **대상 파일:** `index.html` · `ants-camp.html` · `da2joburureung.html`

---

## 1. 사전 조사 결과 (검증 완료)

### 1-1. 레포 · 브랜치

| 레포 | 기본 브랜치 | 홈 URL |
|---|---|---|
| `danbeekimm/ants-camp` | `dev` | https://github.com/danbeekimm/ants-camp |
| `danbeekimm/da2joburureung` | `develop` | https://github.com/danbeekimm/da2joburureung |

**URL 규칙** (기본 브랜치 기준 — 라인 앵커는 코드 변경 시 어긋나므로 **파일 단위 링크만** 사용):

```
파일:      https://github.com/danbeekimm/<repo>/blob/<branch>/<path>
디렉터리:  https://github.com/danbeekimm/<repo>/tree/<branch>/<path>
```

> 참고: 영구 보존이 필요하면 커밋 SHA 고정 링크(`/blob/<sha>/...`)도 가능하나,
> 포트폴리오는 "최신 코드"를 보여주는 게 목적이므로 기본 브랜치 링크를 권장.
> 단, **브랜치에서 파일을 이동/삭제하면 링크가 깨지므로** 적용 후 링크 일괄 검증 필요(§6).

### 1-2. 포트폴리오 각 파트 ↔ 실제 코드 파일 매핑

아래 경로는 전부 **레포를 clone해 파일 존재 + 핵심 코드(메서드/설정) 포함 여부까지 확인**한 것.

#### ants-camp (`blob/dev/` 생략 표기, 공통 prefix `apps/...`)

| 파트 | 파일 (레포 내 경로) | 페이지 서술과의 대응 (확인된 근거) |
|---|---|---|
| **C#1 LLM-as-a-Judge** | `apps/assistant-service/src/main/java/io/antcamp/assistantservice/application/service/EvalProcessor.java` | `judgeAndSave()` + self-preference skip (L80–81 확인) |
| | `.../application/service/PairwiseProcessor.java` | A/B 위치 교차 비교 |
| | `.../application/service/RetrievalReranker.java` | 검색 컷오프 (topK×3 · 유사도 0.3 · score-gap) |
| **C#2 AIOps HITL** | `apps/notification-service/src/main/java/io/antcamp/notificationservice/application/service/NotificationApplicationService.java` | `executeAndNotifyAsync()` · dedup→RCA→HITL 파이프라인 (grep 확인) |
| | `.../infrastructure/client/slack/SlackBlockBuilder.java` | Block Kit 복구 버튼 4종 |
| | `.../infrastructure/client/llm/ClaudeApiClient.java` | Claude RCA 호출 |
| | `.../infrastructure/client/redis/RedisDeduplicationAdapter.java` | SET NX dedup |
| **C#3 Defense-in-depth** | `.../infrastructure/security/filter/SlackSignatureVerificationFilter.java` | HMAC-SHA256 + `MessageDigest.isEqual` (grep 확인) |
| | `.../infrastructure/client/llm/PromptUtil.java` | PII 마스킹 — `[REDACTED]` (grep 확인) |
| | `.../infrastructure/config/NotificationProperties.java` | `infrastructureJobs` 화이트리스트 (grep 확인) |
| **C#4 관측 스택** | `monitoring/prometheus/alert-rules.yaml` | alert 룰 7종 `for:` 차등 |
| | `monitoring/alertmanager/alertmanager.yaml` | `match_re` fallback (L8 확인) |
| | `monitoring/promtail/promtail.yaml` | `docker_sd_configs` |
| | `monitoring/` (tree 링크) | 스택 전체 구성 |
| **C#5 의미 캐시** | `apps/assistant-service/.../infrastructure/persistence/adapter/ResponseCacheAdapter.java` | `p_response_cache` 코사인 조회/적재 (L32·52 확인) |
| | `.../application/service/RagApplicationService.java` | 첫 턴 캐시 조회 → 미스 시 풀 RAG 흐름 |
| **TS#1 트랜잭션 분리** | `.../application/service/RagApplicationService.java` | T1 → LLM(무 트랜잭션) → T2 |
| **TS#2 Reconciler** | `.../infrastructure/scheduler/DocumentReconciler.java` | 60s 주기 · 최대 3회 · PERMANENT 격리 |
| **TS#3 seq 비관적 락** | `.../infrastructure/persistence/jpa/JpaChatMessageRepository.java` | `findMaxSeqForUpdate` + `@Lock(PESSIMISTIC_WRITE)` (L20–22 확인) |

#### da2joburureung (`blob/develop/` 생략 표기)

| 파트 | 파일 (레포 내 경로) | 페이지 서술과의 대응 (확인된 근거) |
|---|---|---|
| **C#1 Outbox** | `company-service/src/main/java/com/da2jobu/application/service/CompanyService.java` | `deleteCompany()` 트랜잭션 내 Outbox 원자 저장 (L107 확인) |
| | `company-service/.../infrastructure/messaging/outbox/OutboxEventScheduler.java` | 10s 폴링 PENDING→발행 |
| | `company-service/.../infrastructure/messaging/outbox/OutboxEvent.java` | PENDING/PUBLISHED 모델 |
| | `company-service/src/test/java/com/da2jobu/infrastructure/messaging/outbox/OutboxEventSchedulerTest.java` | "단일 이벤트 실패가 나머지 발행을 막지 않음" 단위 테스트 |
| **C#2 Circuit Breaker** | `company-service/.../infrastructure/client/HubClientImpl.java` | `@CircuitBreaker` + `hubServiceFallback` (L23–24 확인) |
| | `company-service/.../infrastructure/config/ResilienceConfig.java` | `onStateTransition`·`onCallNotPermitted`·`onSlowCallRateExceeded` 로깅 (확인) |
| | `company-service/src/main/resources/application-docker.yml` | CB 설정값 (failure-rate 50 · OPEN 10s · slow-call 3s — L41–45 확인) |
| **C#3 VRPTW** | `delivery-service/.../infrastructure/routing/OrToolsRouteOptimizationService.java` | `RoutingIndexManager`·솔버 구성 (확인) |
| | `delivery-service/.../application/deliveryManager/service/CompanyDeliveryAssignmentService.java` | 시간창 완화 재시도 (L93–103 확인) |
| | `delivery-service/.../application/deliveryManager/scheduler/CompanyDeliveryAssignmentScheduler.java` | `@Scheduled(cron="0 0 6 * * *")` + 3회 재시도 (L26·49 확인) |
| | `delivery-service/.../application/deliveryManager/service/HubDeliveryAssignmentService.java` | 허브 트랙 라운드로빈 |
| **C#4 비관적 락** | `delivery-service/.../infrastructure/persistence/JpaDeliveryManagerRepository.java` | `@Lock(PESSIMISTIC_WRITE)` + `lock.timeout=3000` (L28–38 확인) |
| **TS#1 infeasible** | `CompanyDeliveryAssignmentService.java` + `CompanyDeliveryAssignmentScheduler.java` | C#3과 동일 파일 재사용 |
| **TS#2 연쇄 전파** | `HubClientImpl.java` + `ResilienceConfig.java` | C#2와 동일 파일 재사용 |
| **TS#3 seq 동시성** | `JpaDeliveryManagerRepository.java` | C#4와 동일 파일 재사용 |

> `delivery-service/...` 공통 prefix: `delivery-service/src/main/java/com/da2jobu/deliveryservice/`
> `company-service/...` 공통 prefix: `company-service/src/main/java/com/da2jobu/`

### 1-3. 제약 사항 (조사에서 발견)

1. **index.html 프로젝트 카드가 통째로 `<a>`** (`<a class="project-card" href="...">`)
   → 카드 안에 레포 링크를 넣으면 **중첩 앵커(invalid HTML)**. 브라우저가 DOM을 강제로 쪼개 레이아웃이 깨질 수 있음 → §2-1의 구조 변경 필요.
2. **ants-camp.html에는 back-link가 없음** (da2joburureung·career에는 있음)
   → 최상단 바를 추가하는 김에 `← 포트폴리오 메인으로`도 함께 넣어 3페이지 일관성 확보 (선택이지만 권장).
3. **build-pdf.js는 외부 `https:` 링크를 보존** (`stripDeadLinks()`가 http(s)/mailto/tel/#만 유지)
   → GitHub 링크는 PDF에서도 클릭 가능하게 살아남음. 별도 처리 불필요.
   단, 칩이 많아지면 PDF 지면을 차지하므로 인쇄 시 보기 좋은지 §6에서 확인.

---

## 2. 변경 설계

### 2-1. index.html — 프로젝트 카드에 레포 칩

**구조 변경** (다2조부·ants-camp 카드 2개만, career 카드는 그대로):

```html
<!-- BEFORE -->
<a class="project-card" href="da2joburureung.html"> ... </a>

<!-- AFTER : div + 스트레치드 링크 + z-index 분리 -->
<div class="project-card">
  <a class="card-link" href="da2joburureung.html" aria-label="다2조부르릉 상세 보기"></a>
  ... (기존 내용 그대로) ...
  <div class="project-cta">
    <div class="project-role">담당: <strong>...</strong></div>
    <div class="cta-actions">
      <a class="repo-chip" href="https://github.com/danbeekimm/da2joburureung"
         target="_blank" rel="noopener">{octocat SVG} da2joburureung</a>
      <div class="read-more">상세 보기</div>
    </div>
  </div>
</div>
```

**추가 CSS** (`.project-card:hover .read-more::after` 룰 뒤에):

```css
/* 카드 전체 클릭 영역(스트레치드 링크) + GitHub 레포 칩 */
.card-link { position: absolute; inset: 0; z-index: 1; border-radius: 12px; }
.cta-actions { display: flex; align-items: center; gap: 14px; }
.repo-chip {
  position: relative; z-index: 2;
  display: inline-flex; align-items: center; gap: 6px;
  font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 600;
  color: var(--ink-soft); text-decoration: none;
  padding: 4px 12px; border: 1px solid var(--rule); border-radius: 14px;
  background: var(--card); transition: all 0.2s;
}
.repo-chip:hover { color: var(--accent); border-color: var(--accent); background: var(--accent-faded); }
.repo-chip svg { width: 13px; height: 13px; flex: none; }
```

- `.project-card`는 이미 `position: relative; overflow: hidden`이라 스트레치드 링크가 그대로 동작.
- hover 효과(`:hover::before`, read-more 화살표)는 div에서도 동일하게 유지됨.
- 칩은 `z-index: 2`라 카드 링크 위에서 독립 클릭 가능 (가운데 클릭·새 탭도 정상).

### 2-2. ants-camp.html / da2joburureung.html — 최상단 레포 홈 링크

**최상단 바** (wrap 첫 요소):

```html
<div class="top-bar">
  <a class="back-link" href="index.html">← 포트폴리오 메인으로</a>
  <a class="repo-link" href="https://github.com/danbeekimm/ants-camp" target="_blank" rel="noopener">
    {octocat SVG} danbeekimm/ants-camp
  </a>
</div>
```

- **da2joburureung.html**: 기존 `<a class="back-link">`를 `.top-bar`로 감싸고 우측에 repo-link 추가.
  (back-link의 `margin-bottom: 24px`는 top-bar로 이동)
- **ants-camp.html**: back-link CSS가 없으므로 da2joburureung 것을 복사해 함께 추가 (§1-3-2).

**추가 CSS** (양 페이지 공통):

```css
.top-bar { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 32px; }
.top-bar .back-link { margin-bottom: 0; }
.repo-link {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 600;
  color: var(--ink-soft); text-decoration: none;
  padding: 7px 16px; border: 1px solid var(--rule); border-radius: 20px;
  background: var(--card); transition: all 0.2s;
}
.repo-link:hover { color: var(--accent); border-color: var(--accent); background: var(--accent-faded); }
.repo-link svg { width: 15px; height: 15px; flex: none; }
@media (max-width: 720px) { .top-bar { flex-direction: column; align-items: flex-start; gap: 10px; } }
```

### 2-3. 파트별 "상세 코드 보기" 칩 — 공통 컴포넌트

**마크업** — 각 `.contrib-body` 맨 끝(R 단락 뒤)에 1블록:

```html
<div class="code-links">
  <span class="code-links-label">CODE</span>
  <a class="code-link" href="https://github.com/danbeekimm/ants-camp/blob/dev/apps/.../EvalProcessor.java"
     target="_blank" rel="noopener">{octocat SVG} EvalProcessor.java<span class="hint">· Judge 채점·bias skip</span></a>
  ...
</div>
```

**Troubleshooting 카드** — `.trouble-body` 뒤, 카드 안에 footer로:

```html
<div class="trouble-footer">
  <div class="code-links"> ... </div>
</div>
```

**추가 CSS** (양 페이지 공통):

```css
/* 상세 코드 GitHub 링크 칩 */
.code-links {
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
  margin-top: 16px; padding-top: 14px; border-top: 1px dashed var(--rule);
}
.code-links-label {
  font-family: 'JetBrains Mono', monospace; font-size: 10.5px; font-weight: 600;
  letter-spacing: 0.1em; color: var(--muted);
}
a.code-link {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 500;
  color: var(--accent); background: var(--accent-faded);
  border: 1px solid var(--rule); border-radius: 13px;
  padding: 3px 11px; text-decoration: none;
  transition: border-color 0.15s, background 0.15s;
}
a.code-link:hover { border-color: var(--accent); background: var(--accent-soft); }
a.code-link svg { width: 12px; height: 12px; flex: none; opacity: 0.75; }
a.code-link .hint { color: var(--muted); font-weight: 400; margin-left: 2px; }
.trouble-footer { padding: 12px 22px 14px; border-top: 1px solid var(--rule-soft); }
.trouble-footer .code-links { margin-top: 0; padding-top: 0; border-top: none; }
```

**octocat SVG** (공용, `fill="currentColor"`로 칩 색상 상속):

```html
<svg viewBox="0 0 16 16" aria-hidden="true" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>
```

---

## 3. ants-camp.html — 칩 배치 상세

| 위치 (섹션) | 칩 구성 (`파일명 · hint`) |
|---|---|
| 06 · C#1 contrib-body 끝 | `EvalProcessor.java · Judge 채점·bias skip` / `PairwiseProcessor.java · A/B 위치 교차` / `RetrievalReranker.java · 검색 컷오프` |
| 07 · C#2 contrib-body 끝 | `NotificationApplicationService.java · dedup→RCA→HITL` / `SlackBlockBuilder.java · 복구 버튼 4종` / `ClaudeApiClient.java · LLM RCA` / `RedisDeduplicationAdapter.java · SET NX dedup` |
| 08 · C#3 contrib-body 끝 | `SlackSignatureVerificationFilter.java · HMAC·replay·timing` / `PromptUtil.java · PII 마스킹` / `NotificationProperties.java · 인프라 화이트리스트` |
| 09 · C#4 contrib-body 끝 | `alert-rules.yaml · 룰 7종 for: 차등` / `alertmanager.yaml · match_re fallback` / `promtail.yaml · docker_sd` / `monitoring/ · 스택 전체` (tree 링크) |
| 10 · C#5 contrib-body 끝 | `ResponseCacheAdapter.java · 의미 캐시 조회/적재` / `RagApplicationService.java · 첫 턴 캐시 흐름` |
| 11 · TS#1 trouble-footer | `RagApplicationService.java · T1→LLM(무TX)→T2` |
| 11 · TS#2 trouble-footer | `DocumentReconciler.java · 60s 보정·3회·PERMANENT` |
| 11 · TS#3 trouble-footer | `JpaChatMessageRepository.java · findMaxSeqForUpdate` |

## 4. da2joburureung.html — 칩 배치 상세

| 위치 (섹션) | 칩 구성 |
|---|---|
| 05 · C#1 contrib-body 끝 | `CompanyService.java · deleteCompany 원자 저장` / `OutboxEventScheduler.java · 10s 폴링 발행` / `OutboxEvent.java · 상태 모델` / `OutboxEventSchedulerTest.java · 단위 테스트` |
| 06 · C#2 contrib-body 끝 | `HubClientImpl.java · CB+fallback` / `ResilienceConfig.java · 상태전이 로깅` / `application-docker.yml · CB 설정값` |
| 07 · C#3 contrib-body 끝 | `OrToolsRouteOptimizationService.java · 솔버 구성` / `CompanyDeliveryAssignmentService.java · 시간창 완화` / `CompanyDeliveryAssignmentScheduler.java · 06:00 cron+재시도` / `HubDeliveryAssignmentService.java · 라운드로빈` |
| 08 · C#4 contrib-body 끝 | `JpaDeliveryManagerRepository.java · @Lock+timeout 3000` |
| 09 · TS#1 trouble-footer | `CompanyDeliveryAssignmentService.java` / `CompanyDeliveryAssignmentScheduler.java` |
| 09 · TS#2 trouble-footer | `HubClientImpl.java` / `ResilienceConfig.java` |
| 09 · TS#3 trouble-footer | `JpaDeliveryManagerRepository.java` |

---

## 5. 작업 순서

1. **index.html** — `.card-link`/`.repo-chip` CSS 추가 → 카드 2개 구조 변경(§2-1) + 칩 삽입
2. **da2joburureung.html** — `.top-bar`/`.repo-link`/`.code-links` CSS 추가 → 최상단 바 구성 → §4 칩 삽입 (URL prefix: `blob/develop/`)
3. **ants-camp.html** — back-link CSS 포함 동일 CSS 추가 → 최상단 바 신설 → §3 칩 삽입 (URL prefix: `blob/dev/`)

## 6. 검증 체크리스트

- [ ] 전체 GitHub 링크 일괄 검증 — HTML에서 `href`를 추출해 `curl -s -o /dev/null -w "%{http_code}"`로 전부 200 확인
- [ ] index 카드: 카드 빈 영역 클릭 → 상세 페이지 / 칩 클릭 → GitHub 새 탭 (이벤트 간섭 없음, 가운데 클릭 포함)
- [ ] 중첩 앵커 없음 — `<a>` 안에 `<a>`가 없는지 확인
- [ ] 모바일(≤720px): top-bar 줄바꿈, 칩 wrap 동작
- [ ] `node build-pdf.js` — PDF에서 칩이 페이지를 깨지 않는지, GitHub 링크가 클릭 가능한지
- [ ] 칩 hint 문구가 본문 서술과 일치하는지 (예: 페이지의 `EvalProcessor.judgeAndSave()` 스니펫 ↔ 칩)

## 7. 미결 사항 (구현 전 결정 필요)

1. **링크 고정 방식** — 기본 브랜치(`dev`/`develop`) vs 커밋 SHA 고정. 권장: 기본 브랜치 (§1-1 참고).
2. **index 칩 텍스트** — 레포명(`da2joburureung`) vs `GitHub` 고정 문구. 권장: 레포명.
3. **ants-camp.html back-link 추가 여부** — 일관성 위해 추가 권장 (요청 범위 밖이라 확인 필요).
4. **career.html** — 실무 경력이라 공개 레포 없음 → 링크 대상 아님 (확인만).

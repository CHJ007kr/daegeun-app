/* =========================================================
   달력 상태
========================================================= */

let calendarDate = new Date();
let selectedDate = null;

let workCalendarDate = new Date();
let workSelectedDateValue = null;



/* =========================================================
   정상 교대 패턴

   주주 → 휴휴 → 야야 → 휴휴
========================================================= */

const shiftPattern = [
  "주",
  "주",
  "휴",
  "휴",
  "야",
  "야",
  "휴",
  "휴"
];



/* =========================================================
   실제 교대달력 기준일

   2026년 12월 2일
========================================================= */

const baseDate = new Date(
  2026,
  11,
  2
);



/* =========================================================
   조별 패턴 위치
========================================================= */

const shiftOffsets = {
  "1조": 0,
  "2조": 6,
  "3조": 4,
  "4조": 2
};



/* =========================================================
   정기보수 / 맞교대 등 특수 근무 변경

   나중에 Firebase로 관리 예정
========================================================= */

const shiftOverrides = {};



/* =========================================================
   휴가 종류별 대근 규칙
========================================================= */

const leaveRules = {

  "연차": {
    requiredHours: 12,
    availableClaimHours: [12, 8, 4]
  },

  "전반차": {
    requiredHours: 4,
    availableClaimHours: [4]
  },

  "후반차": {
    requiredHours: 4,
    availableClaimHours: [4]
  },

  "전반반차": {
    requiredHours: 2,
    availableClaimHours: [2]
  },

  "후반반차": {
    requiredHours: 2,
    availableClaimHours: [2]
  }

};



/* =========================================================
   날짜를 YYYY-MM-DD로 변환
========================================================= */

function dateKey(date) {

  const year =
    date.getFullYear();


  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    );


  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );


  return (
    year +
    "-" +
    month +
    "-" +
    day
  );

}



/* =========================================================
   교대조 변경 이력
========================================================= */

function getShiftChanges() {

  return JSON.parse(

    localStorage.getItem(
      "shiftChanges"
    )

    ||

    "[]"

  );

}



function saveShiftChanges(changes) {

  localStorage.setItem(

    "shiftChanges",

    JSON.stringify(
      changes
    )

  );

}



/* =========================================================
   특정 날짜의 실제 교대조 계산
========================================================= */

function getShiftForDate(date) {

  const baseShift =
    localStorage.getItem(
      "userShift"
    )

    ||

    "1조";


  const key =
    dateKey(
      date
    );


  const changes =
    getShiftChanges()
      .slice()
      .sort(

        function(a, b) {

          return (
            a.effectiveDate
              .localeCompare(
                b.effectiveDate
              )
          );

        }

      );


  let result =
    baseShift;


  changes.forEach(

    function(change) {

      if (
        change.effectiveDate
        <=
        key
      ) {

        result =
          change.shift;

      }

    }

  );


  return result;

}



/* =========================================================
   교대조 변경 등록
========================================================= */

function addShiftChange() {

  const newShift =
    document
      .getElementById(
        "changeShift"
      )
      .value;


  const effectiveDate =
    document
      .getElementById(
        "changeShiftDate"
      )
      .value;


  if (
    !newShift ||
    !effectiveDate
  ) {

    alert(
      "변경 후 교대조와 적용 시작일을 모두 선택해주세요."
    );

    return;

  }


  let changes =
    getShiftChanges();


  /*
    같은 날짜의 변경기록이 있으면
    새 값으로 교체
  */

  changes =
    changes.filter(

      function(item) {

        return (
          item.effectiveDate
          !==
          effectiveDate
        );

      }

    );


  changes.push({

    id:
      Date.now(),

    effectiveDate:
      effectiveDate,

    shift:
      newShift

  });


  changes.sort(

    function(a, b) {

      return (
        a.effectiveDate
          .localeCompare(
            b.effectiveDate
          )
      );

    }

  );


  saveShiftChanges(
    changes
  );


  document
    .getElementById(
      "changeShift"
    )
    .value =
      "";


  document
    .getElementById(
      "changeShiftDate"
    )
    .value =
      "";


  renderShiftHistory();

  refreshDateSensitiveUI();


  alert(

    effectiveDate +
    "부터 " +
    newShift +
    " 근무로 변경됩니다."

  );

}



/* =========================================================
   교대조 변경 삭제
========================================================= */

function deleteShiftChange(id) {

  let changes =
    getShiftChanges();


  changes =
    changes.filter(

      function(item) {

        return (
          item.id !== id
        );

      }

    );


  saveShiftChanges(
    changes
  );


  renderShiftHistory();

  refreshDateSensitiveUI();

}



/* =========================================================
   교대조 변경 이력 화면 표시
========================================================= */

function renderShiftHistory() {

  const container =
    document
      .getElementById(
        "shiftHistoryList"
      );


  if (!container) {
    return;
  }


  const changes =
    getShiftChanges()
      .slice()
      .sort(

        function(a, b) {

          return (
            a.effectiveDate
              .localeCompare(
                b.effectiveDate
              )
          );

        }

      );


  if (
    changes.length === 0
  ) {

    container.innerHTML = `

      <div class="shift-history-empty">
        등록된 교대조 변경 이력이 없습니다.
      </div>

    `;


    return;

  }


  container.innerHTML =

    changes.map(

      function(change) {

        return `

          <div class="shift-history-row">

            <span>

              ${change.effectiveDate}부터

              <strong>
                ${change.shift}
              </strong>

            </span>


            <button
              class="history-delete"
              onclick="deleteShiftChange(${change.id})"
            >
              삭제
            </button>

          </div>

        `;

      }

    ).join("");

}



/* =========================================================
   실제 근무 계산
========================================================= */

function getWorkType(date) {

  const shift =
    getShiftForDate(
      date
    );


  const key =
    dateKey(
      date
    );


  /*
    특수 근무표가 있으면
    정상 패턴보다 우선 적용
  */

  if (

    shiftOverrides[shift]

    &&

    shiftOverrides[shift][key]

  ) {

    return (
      shiftOverrides[shift][key]
    );

  }


  const targetUTC =
    Date.UTC(

      date.getFullYear(),

      date.getMonth(),

      date.getDate()

    );


  const baseUTC =
    Date.UTC(

      baseDate.getFullYear(),

      baseDate.getMonth(),

      baseDate.getDate()

    );


  const oneDay =
    1000 *
    60 *
    60 *
    24;


  const days =
    Math.round(

      (
        targetUTC -
        baseUTC
      )

      /

      oneDay

    );


  const offset =
    shiftOffsets[shift]

    ||

    0;


  let index =

    (
      days +
      offset
    )

    %

    shiftPattern.length;


  if (
    index < 0
  ) {

    index +=
      shiftPattern.length;

  }


  return (
    shiftPattern[index]
  );

}



/* =========================================================
   근무명 변환
========================================================= */

function workText(type) {

  if (
    type === "주"
  ) {

    return "주간";

  }


  if (
    type === "야"
  ) {

    return "야간";

  }


  return "휴무";

}



/* =========================================================
   화면 이동
========================================================= */

function hideAllScreens() {

  const ids = [
    "homeScreen",
    "settingsScreen",
    "leaveScreen",
    "daegunRequestScreen",
    "workCalendarScreen"
  ];


  ids.forEach(

    function(id) {

      const screen =
        document
          .getElementById(
            id
          );


      if (
        screen
      ) {

        screen
          .classList
          .add(
            "hidden"
          );

      }

    }

  );

}



function goHome() {

  hideAllScreens();


  const home =
    document
      .getElementById(
        "homeScreen"
      );


  if (
    home
  ) {

    home
      .classList
      .remove(
        "hidden"
      );

  }

}



/* =========================================================
   개인 설정
========================================================= */

function openSettings() {

  hideAllScreens();


  document
    .getElementById(
      "settingsScreen"
    )
    .classList
    .remove(
      "hidden"
    );


  loadSettings();

  renderShiftHistory();

}



/* =========================================================
   개인 설정 저장
========================================================= */

function saveSettings() {

  const name =
    document
      .getElementById(
        "name"
      )
      .value
      .trim();


  const displayedShift =
    document
      .getElementById(
        "shift"
      )
      .value;


  const area =
    document
      .getElementById(
        "area"
      )
      .value;


  const role =
    document
      .getElementById(
        "role"
      )
      .value;


  if (
    !name ||
    !displayedShift ||
    !area ||
    !role
  ) {

    alert(
      "모든 항목을 입력해주세요."
    );

    return;

  }


  localStorage.setItem(
    "userName",
    name
  );


  /*
    최초 기준 교대조는
    처음 한 번만 저장한다.

    이후 교대조 변경은
    변경 이력으로 관리한다.
  */

  if (
    !localStorage.getItem(
      "userShift"
    )
  ) {

    localStorage.setItem(
      "userShift",
      displayedShift
    );

  }


  localStorage.setItem(
    "userArea",
    area
  );


  localStorage.setItem(
    "userRole",
    role
  );


  const message =
    document
      .getElementById(
        "savedMessage"
      );


  if (
    message
  ) {

    message.style.display =
      "block";


    setTimeout(

      function() {

        message.style.display =
          "none";

      },

      2000

    );

  }

}



/* =========================================================
   개인 설정 불러오기
========================================================= */

function loadSettings() {

  document
    .getElementById(
      "name"
    )
    .value =

      localStorage.getItem(
        "userName"
      )

      ||

      "";


  const savedBaseShift =
    localStorage.getItem(
      "userShift"
    );


  if (
    savedBaseShift
  ) {

    document
      .getElementById(
        "shift"
      )
      .value =

        getShiftForDate(
          new Date()
        );

  }

  else {

    document
      .getElementById(
        "shift"
      )
      .value =
        "";

  }


  document
    .getElementById(
      "area"
    )
    .value =

      localStorage.getItem(
        "userArea"
      )

      ||

      "";


  document
    .getElementById(
      "role"
    )
    .value =

      localStorage.getItem(
        "userRole"
      )

      ||

      "";

}



/* =========================================================
   설정 완료 여부
========================================================= */

function settingsReady() {

  return (

    localStorage.getItem(
      "userName"
    )

    &&

    localStorage.getItem(
      "userShift"
    )

    &&

    localStorage.getItem(
      "userArea"
    )

    &&

    localStorage.getItem(
      "userRole"
    )

  );

}



/* =========================================================
   사용자 상단 요약
========================================================= */

function getUserSummary() {

  const name =
    localStorage.getItem(
      "userName"
    );


  const area =
    localStorage.getItem(
      "userArea"
    );


  const role =
    localStorage.getItem(
      "userRole"
    );


  const todayShift =
    getShiftForDate(
      new Date()
    );


  return `

    <strong>
      ${name}
    </strong>

    <br>

    현재 ${todayShift}
    ·
    ${area}
    ·
    ${role}

  `;

}



/* =========================================================
   일정 데이터
========================================================= */

function getEvents() {

  return JSON.parse(

    localStorage.getItem(
      "calendarEvents"
    )

    ||

    "[]"

  );

}



function saveEvents(events) {

  localStorage.setItem(

    "calendarEvents",

    JSON.stringify(
      events
    )

  );

}



function getEventsForDate(date) {

  const key =
    dateKey(
      date
    );


  return getEvents().filter(

    function(item) {

      return (
        item.date === key
      );

    }

  );

}



/* =========================================================
   휴가 이벤트 정규화

   예전에 저장된 데이터에도
   대근시간 규칙을 자동 적용
========================================================= */

function normalizeLeaveEvent(event) {

  if (
    event.type !==
    "휴가"
  ) {

    return event;

  }


  const rule =
    leaveRules[
      event.title
    ];


  if (
    !event.requiredHours
  ) {

    event.requiredHours =
      rule
        ?
        rule.requiredHours
        :
        0;

  }


  if (
    !Array.isArray(
      event.availableClaimHours
    )
  ) {

    event.availableClaimHours =
      rule
        ?
        rule.availableClaimHours
        :
        [];

  }


  if (
    !Array.isArray(
      event.claims
    )
  ) {

    event.claims =
      [];

  }


  event.claimedHours =
    event.claims.reduce(

      function(
        sum,
        claim
      ) {

        return (
          sum +
          Number(
            claim.hours
          )
        );

      },

      0

    );


  event.remainingHours =
    Math.max(

      event.requiredHours
      -
      event.claimedHours,

      0

    );


  event.status =

    event.remainingHours === 0

    ?

    "완료"

    :

    "모집중";


  return event;

}



/* =========================================================
   휴가 등록 화면
========================================================= */

function openLeave() {

  if (
    !settingsReady()
  ) {

    alert(
      "먼저 개인 설정을 완료해주세요."
    );


    openSettings();

    return;

  }


  hideAllScreens();


  document
    .getElementById(
      "leaveScreen"
    )
    .classList
    .remove(
      "hidden"
    );


  document
    .getElementById(
      "userSummary"
    )
    .innerHTML =
      getUserSummary();


  renderLeaveCalendar();

}



/* =========================================================
   휴가 달력 월 변경
========================================================= */

function changeMonth(value) {

  calendarDate =
    new Date(

      calendarDate.getFullYear(),

      calendarDate.getMonth()
      +
      value,

      1

    );


  selectedDate =
    null;


  resetLeaveSelectedInfo();

  renderLeaveCalendar();

}



/* =========================================================
   휴가 달력 선택정보 초기화
========================================================= */

function resetLeaveSelectedInfo() {

  document
    .getElementById(
      "selectedDateText"
    )
    .textContent =
      "날짜를 선택하세요.";


  document
    .getElementById(
      "selectedShiftText"
    )
    .textContent =
      "달력에서 날짜를 눌러주세요.";


  document
    .getElementById(
      "selectedShiftInfo"
    )
    .textContent =
      "";


  document
    .getElementById(
      "selectedEvents"
    )
    .innerHTML =
      "";

}



/* =========================================================
   휴가 달력 렌더링
========================================================= */

function renderLeaveCalendar() {

  renderCalendar(

    calendarDate,

    "calendarTitle",

    "calendarGrid",

    selectedDate,

    function(date) {

      selectedDate =
        date;


      updateLeaveSelected();


      renderLeaveCalendar();

    }

  );

}



/* =========================================================
   휴가 달력 선택 날짜
========================================================= */

function updateLeaveSelected() {

  if (
    !selectedDate
  ) {

    return;

  }


  const work =
    getWorkType(
      selectedDate
    );


  const shift =
    getShiftForDate(
      selectedDate
    );


  document
    .getElementById(
      "selectedDateText"
    )
    .textContent =

      selectedDate.getFullYear()

      +
      "년 "

      +
      (
        selectedDate.getMonth()
        +
        1
      )

      +
      "월 "

      +
      selectedDate.getDate()

      +
      "일";


  document
    .getElementById(
      "selectedShiftText"
    )
    .textContent =

      "기본 근무 : "

      +

      workText(
        work
      );


  document
    .getElementById(
      "selectedShiftInfo"
    )
    .textContent =

      "적용 교대조 : "

      +

      shift;


  renderSelectedEvents(

    selectedDate,

    "selectedEvents"

  );

}



/* =========================================================
   휴가 저장
========================================================= */

function saveLeave() {

  if (
    !selectedDate
  ) {

    alert(
      "휴가 날짜를 선택해주세요."
    );


    return;

  }


  const checked =
    document.querySelector(

      'input[name="leaveType"]:checked'

    );


  if (
    !checked
  ) {

    alert(
      "휴가 종류를 선택해주세요."
    );


    return;

  }


  const leaveType =
    checked.value;


  const rule =
    leaveRules[
      leaveType
    ];


  if (
    !rule
  ) {

    alert(
      "휴가 종류 설정을 확인해주세요."
    );


    return;

  }


  const events =
    getEvents();


  events.push({

    id:
      Date.now(),

    date:
      dateKey(
        selectedDate
      ),

    type:
      "휴가",

    title:
      leaveType,

    /*
      필요한 전체 대근시간
    */

    requiredHours:
      rule.requiredHours,

    /*
      대근자가 선택할 수 있는 시간
    */

    availableClaimHours:
      rule.availableClaimHours,

    /*
      대근자 목록
    */

    claims:
      [],

    claimedHours:
      0,

    remainingHours:
      rule.requiredHours,

    status:
      "모집중",

    name:
      localStorage.getItem(
        "userName"
      ),

    shift:
      getShiftForDate(
        selectedDate
      ),

    area:
      localStorage.getItem(
        "userArea"
      ),

    role:
      localStorage.getItem(
        "userRole"
      )

  });


  saveEvents(
    events
  );


  const message =
    document
      .getElementById(
        "leaveSavedMessage"
      );


  if (
    message
  ) {

    message.textContent =

      dateKey(
        selectedDate
      )

      +
      " / "

      +
      leaveType

      +
      " / 대근 "

      +
      rule.requiredHours

      +
      "시간 필요";


    message.style.display =
      "block";


    setTimeout(

      function() {

        message.style.display =
          "none";

      },

      2500

    );

  }


  /*
    선택된 라디오 초기화
  */

  checked.checked =
    false;


  updateLeaveSelected();

  renderLeaveCalendar();

}



/* =========================================================
   대근 요청 화면
========================================================= */

function openDaegunRequests() {

  if (
    !settingsReady()
  ) {

    alert(
      "먼저 개인 설정을 완료해주세요."
    );


    openSettings();

    return;

  }


  hideAllScreens();


  const screen =
    document
      .getElementById(
        "daegunRequestScreen"
      );


  if (
    !screen
  ) {

    alert(
      "대근 요청 화면이 index.html에 아직 추가되지 않았습니다."
    );

    goHome();

    return;

  }


  screen
    .classList
    .remove(
      "hidden"
    );


  const summary =
    document
      .getElementById(
        "daegunUserSummary"
      );


  if (
    summary
  ) {

    summary.innerHTML =
      getUserSummary();

  }


  renderDaegunRequests();

}



/* =========================================================
   대근 요청 목록
========================================================= */

function renderDaegunRequests() {

  const container =
    document
      .getElementById(
        "daegunRequestList"
      );


  if (
    !container
  ) {

    return;

  }


  let events =
    getEvents();


  let requests =
    events

      .filter(

        function(event) {

          return (
            event.type ===
            "휴가"
          );

        }

      )

      .map(

        function(event) {

          return (
            normalizeLeaveEvent(
              event
            )
          );

        }

      )

      .sort(

        function(a, b) {

          return (
            a.date
              .localeCompare(
                b.date
              )
          );

        }

      );


  if (
    requests.length === 0
  ) {

    container.innerHTML = `

      <div class="no-request">
        현재 등록된 대근 요청이 없습니다.
      </div>

    `;


    return;

  }


  const currentName =
    localStorage.getItem(
      "userName"
    );


  container.innerHTML =

    requests.map(

      function(request) {

        const isMyLeave =
          request.name ===
          currentName;


        const myClaim =
          request.claims.find(

            function(claim) {

              return (
                claim.name ===
                currentName
              );

            }

          );


        /*
          남은 시간보다 큰 선택지는 제외
        */

        const availableButtons =
          request
            .availableClaimHours
            .filter(

              function(hours) {

                return (
                  hours <=
                  request.remainingHours
                );

              }

            );


        let claimListHTML =
          "";


        if (
          request.claims.length > 0
        ) {

          claimListHTML = `

            <div class="claim-list">

              <strong>
                현재 대근자
              </strong>

              ${request.claims.map(

                function(claim) {

                  return `

                    <div class="claim-row">

                      <span>
                        ${claim.name}
                      </span>

                      <span>
                        ${claim.hours}시간
                      </span>

                    </div>

                  `;

                }

              ).join("")}

            </div>

          `;

        }


        let actionHTML =
          "";


        /*
          내가 올린 휴가는
          내가 잡을 수 없음
        */

        if (
          isMyLeave
        ) {

          if (
            request.status ===
            "완료"
          ) {

            actionHTML = `

              <div class="request-complete">
                대근 모집 완료
              </div>

            `;

          }

          else {

            actionHTML = `

              <div class="notice">
                내가 등록한 휴가입니다.
              </div>

            `;

          }

        }


        else if (
          request.status ===
          "완료"
        ) {

          actionHTML = `

            <div class="request-complete">
              대근 모집 완료
            </div>

          `;

        }


        else if (
          myClaim
        ) {

          actionHTML = `

            <div class="request-complete">

              내가 ${myClaim.hours}시간 대근 예정

            </div>


            <button
              class="cancel-claim-button"
              onclick="cancelDaegunClaim(${request.id})"
            >

              내 대근 취소

            </button>

          `;

        }


        else if (
          availableButtons.length === 0
        ) {

          actionHTML = `

            <div class="request-complete">
              선택 가능한 남은 시간이 없습니다.
            </div>

          `;

        }


        else {

          actionHTML = `

            <div class="claim-buttons">

              ${availableButtons.map(

                function(hours) {

                  return `

                    <button
                      class="claim-button"
                      onclick="claimDaegun(${request.id}, ${hours})"
                    >

                      ${hours}시간

                    </button>

                  `;

                }

              ).join("")}

            </div>

          `;

        }


        return `

          <div
            class="
              request-card
              ${
                request.status ===
                "완료"

                ?

                "complete"

                :

                ""
              }
            "
          >

            <div class="request-date">

              ${formatRequestDate(
                request.date
              )}

            </div>


            <div class="request-person">

              ${request.name}

            </div>


            <div class="request-info">

              ${request.shift}
              ·
              ${request.area}
              ·
              ${request.role}

              <br>

              휴가 :
              ${request.title}

            </div>


            <div class="request-hours">

              필요 :
              <strong>
                ${request.requiredHours}시간
              </strong>

              <br>

              잡힌 시간 :
              ${request.claimedHours}시간

              <br>

              남은 시간 :
              <strong>
                ${request.remainingHours}시간
              </strong>

              ${claimListHTML}

            </div>


            ${actionHTML}

          </div>

        `;

      }

    ).join("");


  /*
    예전 휴가 데이터도
    새 구조로 보정해서 다시 저장
  */

  const normalizedEvents =
    events.map(

      function(event) {

        if (
          event.type ===
          "휴가"
        ) {

          return (
            normalizeLeaveEvent(
              event
            )
          );

        }


        return event;

      }

    );


  saveEvents(
    normalizedEvents
  );

}



/* =========================================================
   대근 요청 날짜 표시
========================================================= */

function formatRequestDate(
  dateString
) {

  const parts =
    dateString.split(
      "-"
    );


  return (

    Number(
      parts[0]
    )

    +
    "년 "

    +

    Number(
      parts[1]
    )

    +
    "월 "

    +

    Number(
      parts[2]
    )

    +
    "일"

  );

}



/* =========================================================
   대근 잡기
========================================================= */

function claimDaegun(
  requestId,
  hours
) {

  const currentName =
    localStorage.getItem(
      "userName"
    );


  let events =
    getEvents();


  const index =
    events.findIndex(

      function(event) {

        return (
          event.id ===
          requestId
        );

      }

    );


  if (
    index === -1
  ) {

    return;

  }


  let request =
    normalizeLeaveEvent(
      events[index]
    );


  /*
    본인 휴가는 본인이 잡지 못함
  */

  if (
    request.name ===
    currentName
  ) {

    alert(
      "본인이 등록한 휴가는 직접 대근할 수 없습니다."
    );


    return;

  }


  /*
    동일한 사람이 같은 요청을
    두 번 잡지 못하도록 처리
  */

  const alreadyClaimed =
    request.claims.some(

      function(claim) {

        return (
          claim.name ===
          currentName
        );

      }

    );


  if (
    alreadyClaimed
  ) {

    alert(
      "이미 이 대근을 신청했습니다."
    );


    return;

  }


  if (
    hours >
    request.remainingHours
  ) {

    alert(
      "남은 대근시간보다 많이 신청할 수 없습니다."
    );


    return;

  }


  /*
    해당 요청에서 허용되는 시간인지 확인
  */

  if (
    !request.availableClaimHours.includes(
      hours
    )
  ) {

    alert(
      "선택할 수 없는 대근시간입니다."
    );


    return;

  }


  request.claims.push({

    id:
      Date.now(),

    name:
      currentName,

    hours:
      Number(
        hours
      )

  });


  request =
    normalizeLeaveEvent(
      request
    );


  events[index] =
    request;


  saveEvents(
    events
  );


  renderDaegunRequests();


  /*
    달력도 즉시 갱신
  */

  if (
    selectedDate
  ) {

    updateLeaveSelected();

    renderLeaveCalendar();

  }


  if (
    workSelectedDateValue
  ) {

    updateWorkSelected();

    renderWorkCalendar();

  }


  alert(

    hours +
    "시간 대근으로 등록되었습니다."

  );

}



/* =========================================================
   내가 잡은 대근 취소
========================================================= */

function cancelDaegunClaim(
  requestId
) {

  const currentName =
    localStorage.getItem(
      "userName"
    );


  let events =
    getEvents();


  const index =
    events.findIndex(

      function(event) {

        return (
          event.id ===
          requestId
        );

      }

    );


  if (
    index === -1
  ) {

    return;

  }


  let request =
    normalizeLeaveEvent(
      events[index]
    );


  request.claims =
    request.claims.filter(

      function(claim) {

        return (
          claim.name !==
          currentName
        );

      }

    );


  request =
    normalizeLeaveEvent(
      request
    );


  events[index] =
    request;


  saveEvents(
    events
  );


  renderDaegunRequests();


  if (
    selectedDate
  ) {

    updateLeaveSelected();

    renderLeaveCalendar();

  }


  if (
    workSelectedDateValue
  ) {

    updateWorkSelected();

    renderWorkCalendar();

  }

}



/* =========================================================
   근무 달력 열기
========================================================= */

function openWorkCalendar() {

  if (
    !settingsReady()
  ) {

    alert(
      "먼저 개인 설정을 완료해주세요."
    );


    openSettings();

    return;

  }


  hideAllScreens();


  document
    .getElementById(
      "workCalendarScreen"
    )
    .classList
    .remove(
      "hidden"
    );


  document
    .getElementById(
      "workUserSummary"
    )
    .innerHTML =
      getUserSummary();


  renderWorkCalendar();

}



/* =========================================================
   근무 달력 월 변경
========================================================= */

function changeWorkMonth(value) {

  workCalendarDate =
    new Date(

      workCalendarDate.getFullYear(),

      workCalendarDate.getMonth()
      +
      value,

      1

    );


  workSelectedDateValue =
    null;


  resetWorkSelectedInfo();

  renderWorkCalendar();

}



/* =========================================================
   근무 달력 선택정보 초기화
========================================================= */

function resetWorkSelectedInfo() {

  document
    .getElementById(
      "workSelectedDate"
    )
    .textContent =
      "날짜를 선택하세요.";


  document
    .getElementById(
      "workSelectedShift"
    )
    .textContent =
      "달력에서 날짜를 눌러주세요.";


  document
    .getElementById(
      "workSelectedShiftInfo"
    )
    .textContent =
      "";


  document
    .getElementById(
      "workSelectedEvents"
    )
    .innerHTML =
      "";

}



/* =========================================================
   근무 달력 렌더링
========================================================= */

function renderWorkCalendar() {

  renderCalendar(

    workCalendarDate,

    "workCalendarTitle",

    "workCalendarGrid",

    workSelectedDateValue,

    function(date) {

      workSelectedDateValue =
        date;


      updateWorkSelected();


      renderWorkCalendar();

    }

  );

}



/* =========================================================
   근무 달력 선택 날짜
========================================================= */

function updateWorkSelected() {

  if (
    !workSelectedDateValue
  ) {

    return;

  }


  const work =
    getWorkType(
      workSelectedDateValue
    );


  const shift =
    getShiftForDate(
      workSelectedDateValue
    );


  document
    .getElementById(
      "workSelectedDate"
    )
    .textContent =

      workSelectedDateValue
        .getFullYear()

      +
      "년 "

      +
      (
        workSelectedDateValue
          .getMonth()
        +
        1
      )

      +
      "월 "

      +
      workSelectedDateValue
        .getDate()

      +
      "일";


  document
    .getElementById(
      "workSelectedShift"
    )
    .textContent =

      "기본 근무 : "

      +

      workText(
        work
      );


  document
    .getElementById(
      "workSelectedShiftInfo"
    )
    .textContent =

      "적용 교대조 : "

      +

      shift;


  renderSelectedEvents(

    workSelectedDateValue,

    "workSelectedEvents"

  );

}



/* =========================================================
   테스트용 대근 / 교육 일정
========================================================= */

function saveExtraEvent() {

  if (
    !workSelectedDateValue
  ) {

    alert(
      "날짜를 먼저 선택해주세요."
    );


    return;

  }


  const type =
    document
      .getElementById(
        "extraEventType"
      )
      .value;


  const hours =
    Number(

      document
        .getElementById(
          "extraEventHours"
        )
        .value

    );


  if (
    !hours ||
    hours <= 0
  ) {

    alert(
      "시간을 올바르게 입력해주세요."
    );


    return;

  }


  const events =
    getEvents();


  events.push({

    id:
      Date.now(),

    date:
      dateKey(
        workSelectedDateValue
      ),

    type:
      type,

    title:
      type
      +
      " "
      +
      hours
      +
      "h",

    hours:
      hours,

    shift:
      getShiftForDate(
        workSelectedDateValue
      ),

    name:
      localStorage.getItem(
        "userName"
      )

  });


  saveEvents(
    events
  );


  renderWorkCalendar();

  updateWorkSelected();


  alert(

    type +
    " 일정이 등록되었습니다."

  );

}



/* =========================================================
   공통 달력
========================================================= */

function renderCalendar(

  currentDate,

  titleId,

  gridId,

  selected,

  clickHandler

) {

  const year =
    currentDate.getFullYear();


  const month =
    currentDate.getMonth();


  document
    .getElementById(
      titleId
    )
    .textContent =

      year
      +
      "년 "
      +
      (
        month + 1
      )
      +
      "월";


  const firstDay =
    new Date(

      year,

      month,

      1

    ).getDay();


  const lastDate =
    new Date(

      year,

      month + 1,

      0

    ).getDate();


  const grid =
    document
      .getElementById(
        gridId
      );


  grid.innerHTML =
    "";


  for (
    let i = 0;
    i < firstDay;
    i++
  ) {

    const empty =
      document
        .createElement(
          "div"
        );


    empty.className =
      "calendar-day empty";


    grid.appendChild(
      empty
    );

  }


  for (
    let day = 1;
    day <= lastDate;
    day++
  ) {

    const date =
      new Date(

        year,

        month,

        day

      );


    const work =
      getWorkType(
        date
      );


    const cell =
      document
        .createElement(
          "div"
        );


    cell.className =
      "calendar-day";


    if (

      selected

      &&

      selected.getFullYear()
      ===
      year

      &&

      selected.getMonth()
      ===
      month

      &&

      selected.getDate()
      ===
      day

    ) {

      cell
        .classList
        .add(
          "selected"
        );

    }


    let shiftClass =
      "shift-off";


    if (
      work === "주"
    ) {

      shiftClass =
        "shift-day";

    }

    else if (
      work === "야"
    ) {

      shiftClass =
        "shift-night";

    }


    let html = `

      <div class="day-number">
        ${day}
      </div>

      <span class="shift-label ${shiftClass}">
        ${work}
      </span>

    `;


    const events =
      getEventsForDate(
        date
      );


    events.forEach(

      function(event) {

        let eventClass =
          "event-leave";


        if (
          event.type ===
          "대근"
        ) {

          eventClass =
            "event-daegun";

        }


        if (
          event.type ===
          "교육"
        ) {

          eventClass =
            "event-education";

        }


        html += `

          <span class="event-badge ${eventClass}">
            ${event.title}
          </span>

        `;

      }

    );


    cell.innerHTML =
      html;


    cell.onclick =

      function() {

        clickHandler(
          date
        );

      };


    grid.appendChild(
      cell
    );

  }

}



/* =========================================================
   선택된 날짜 일정 상세

   휴가자의 경우
   대근자의 시간은 숨기고 이름만 표시
========================================================= */

function renderSelectedEvents(

  date,

  elementId

) {

  const area =
    document
      .getElementById(
        elementId
      );


  const events =
    getEventsForDate(
      date
    );


  if (
    events.length === 0
  ) {

    area.innerHTML = `

      <div style="color:#888;">
        등록된 일정 없음
      </div>

    `;


    return;

  }


  area.innerHTML =

    events.map(

      function(event) {

        /*
          휴가
        */

        if (
          event.type ===
          "휴가"
        ) {

          const request =
            normalizeLeaveEvent(
              event
            );


          const names =
            request.claims.map(

              function(claim) {

                return (
                  claim.name
                );

              }

            );


          const uniqueNames =
            [...new Set(
              names
            )];


          const daegunText =

            uniqueNames.length > 0

            ?

            "대근자 : "
            +
            uniqueNames.join(
              ", "
            )

            :

            "대근자 : 아직 없음";


          return `

            <div class="event-row">

              <span>

                <strong>
                  ${request.title}
                </strong>

                <br>

                <span
                  style="
                    color:#666;
                    font-size:12px;
                  "
                >
                  ${daegunText}
                </span>

              </span>


              <button
                class="delete-button"
                onclick="deleteEvent(${request.id})"
              >
                삭제
              </button>

            </div>

          `;

        }


        /*
          교육 / 테스트 대근 등
        */

        return `

          <div class="event-row">

            <span>
              ${event.title}
            </span>


            <button
              class="delete-button"
              onclick="deleteEvent(${event.id})"
            >
              삭제
            </button>

          </div>

        `;

      }

    ).join("");

}



/* =========================================================
   일정 삭제
========================================================= */

function deleteEvent(id) {

  let events =
    getEvents();


  events =
    events.filter(

      function(item) {

        return (
          item.id !== id
        );

      }

    );


  saveEvents(
    events
  );


  if (
    selectedDate
  ) {

    updateLeaveSelected();

    renderLeaveCalendar();

  }


  if (
    workSelectedDateValue
  ) {

    updateWorkSelected();

    renderWorkCalendar();

  }


  const requestScreen =
    document
      .getElementById(
        "daegunRequestScreen"
      );


  if (
    requestScreen &&
    !requestScreen
      .classList
      .contains(
        "hidden"
      )
  ) {

    renderDaegunRequests();

  }

}



/* =========================================================
   실제 날짜 관련 화면 갱신

   교대조 변경 적용일이나
   자정이 지났을 때 사용
========================================================= */

function refreshDateSensitiveUI() {

  const settingsScreen =
    document
      .getElementById(
        "settingsScreen"
      );


  if (

    settingsScreen

    &&

    !settingsScreen
      .classList
      .contains(
        "hidden"
      )

  ) {

    loadSettings();

    renderShiftHistory();

  }


  if (
    settingsReady()
  ) {

    const summary =
      getUserSummary();


    const userSummary =
      document
        .getElementById(
          "userSummary"
        );


    if (
      userSummary
    ) {

      userSummary.innerHTML =
        summary;

    }


    const workUserSummary =
      document
        .getElementById(
          "workUserSummary"
        );


    if (
      workUserSummary
    ) {

      workUserSummary.innerHTML =
        summary;

    }


    const daegunUserSummary =
      document
        .getElementById(
          "daegunUserSummary"
        );


    if (
      daegunUserSummary
    ) {

      daegunUserSummary.innerHTML =
        summary;

    }

  }


  const leaveScreen =
    document
      .getElementById(
        "leaveScreen"
      );


  if (

    leaveScreen

    &&

    !leaveScreen
      .classList
      .contains(
        "hidden"
      )

  ) {

    renderLeaveCalendar();

  }


  const workScreen =
    document
      .getElementById(
        "workCalendarScreen"
      );


  if (

    workScreen

    &&

    !workScreen
      .classList
      .contains(
        "hidden"
      )

  ) {

    renderWorkCalendar();

  }


  const requestScreen =
    document
      .getElementById(
        "daegunRequestScreen"
      );


  if (

    requestScreen

    &&

    !requestScreen
      .classList
      .contains(
        "hidden"
      )

  ) {

    renderDaegunRequests();

  }

}



/* =========================================================
   자정 자동 갱신
========================================================= */

function scheduleMidnightRefresh() {

  const now =
    new Date();


  const nextMidnight =
    new Date(

      now.getFullYear(),

      now.getMonth(),

      now.getDate() + 1,

      0,

      0,

      1

    );


  const delay =
    nextMidnight.getTime()
    -
    now.getTime();


  setTimeout(

    function() {

      refreshDateSensitiveUI();


      scheduleMidnightRefresh();

    },

    delay

  );

}



/* =========================================================
   앱이 다시 활성화됐을 때 갱신
========================================================= */

document.addEventListener(

  "visibilitychange",

  function() {

    if (

      document.visibilityState
      ===
      "visible"

    ) {

      refreshDateSensitiveUI();

    }

  }

);



window.addEventListener(

  "focus",

  function() {

    refreshDateSensitiveUI();

  }

);



/* =========================================================
   자정 자동 갱신 시작
========================================================= */

scheduleMidnightRefresh();
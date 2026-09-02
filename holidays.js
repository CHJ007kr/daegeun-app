/* =========================================================
   대한민국 공휴일 (2026 ~ 2050)

   - 음력 기준일은 한국천문연구원 음양력 자료와 대조한
     양력 날짜를 정적 원본으로 관리한다.
   - 대체공휴일은 2026년 5월 시행 규정을 기준으로 계산한다.
   - 선거일과 임시공휴일은 미래 날짜가 확정되지 않으므로
     임의로 생성하지 않는다. 확정되면 아래
     additionalKoreanHolidays에 한 줄을 추가한다.
========================================================= */

const koreanHolidays = {};


const koreanLunarHolidayDates = {
  2026: { seollal: "2026-02-17", buddha: "2026-05-24", chuseok: "2026-09-25" },
  2027: { seollal: "2027-02-07", buddha: "2027-05-13", chuseok: "2027-09-15" },
  2028: { seollal: "2028-01-27", buddha: "2028-05-02", chuseok: "2028-10-03" },
  2029: { seollal: "2029-02-13", buddha: "2029-05-20", chuseok: "2029-09-22" },
  2030: { seollal: "2030-02-03", buddha: "2030-05-09", chuseok: "2030-09-12" },
  2031: { seollal: "2031-01-23", buddha: "2031-05-28", chuseok: "2031-10-01" },
  2032: { seollal: "2032-02-11", buddha: "2032-05-16", chuseok: "2032-09-19" },
  2033: { seollal: "2033-01-31", buddha: "2033-05-06", chuseok: "2033-09-08" },
  2034: { seollal: "2034-02-19", buddha: "2034-05-25", chuseok: "2034-09-27" },
  2035: { seollal: "2035-02-08", buddha: "2035-05-15", chuseok: "2035-09-16" },
  2036: { seollal: "2036-01-28", buddha: "2036-05-03", chuseok: "2036-10-04" },
  2037: { seollal: "2037-02-15", buddha: "2037-05-22", chuseok: "2037-09-24" },
  2038: { seollal: "2038-02-04", buddha: "2038-05-11", chuseok: "2038-09-13" },
  2039: { seollal: "2039-01-24", buddha: "2039-04-30", chuseok: "2039-10-02" },
  2040: { seollal: "2040-02-12", buddha: "2040-05-18", chuseok: "2040-09-21" },
  2041: { seollal: "2041-02-01", buddha: "2041-05-07", chuseok: "2041-09-10" },
  2042: { seollal: "2042-01-22", buddha: "2042-05-26", chuseok: "2042-09-28" },
  2043: { seollal: "2043-02-10", buddha: "2043-05-16", chuseok: "2043-09-17" },
  2044: { seollal: "2044-01-30", buddha: "2044-05-05", chuseok: "2044-10-05" },
  2045: { seollal: "2045-02-17", buddha: "2045-05-24", chuseok: "2045-09-25" },
  2046: { seollal: "2046-02-06", buddha: "2046-05-13", chuseok: "2046-09-15" },
  2047: { seollal: "2047-01-26", buddha: "2047-05-02", chuseok: "2047-10-04" },
  2048: { seollal: "2048-02-14", buddha: "2048-05-20", chuseok: "2048-09-22" },
  2049: { seollal: "2049-02-02", buddha: "2049-05-09", chuseok: "2049-09-11" },
  2050: { seollal: "2050-01-23", buddha: "2050-05-28", chuseok: "2050-09-30" }
};


const additionalKoreanHolidays = {
  // 예: "2051-00-00": { name: "임시공휴일", type: "holiday" }
};


const baseHolidayNames = {};
const substituteCandidates = [];


function holidayDateFromKey(key) {
  const parts = key.split("-");

  return new Date(
    Number(parts[0]),
    Number(parts[1]) - 1,
    Number(parts[2])
  );
}


function holidayDateKey(date) {
  return (
    date.getFullYear()
    + "-"
    + String(date.getMonth() + 1).padStart(2, "0")
    + "-"
    + String(date.getDate()).padStart(2, "0")
  );
}


function addHolidayDays(key, amount) {
  const date = holidayDateFromKey(key);
  date.setDate(date.getDate() + amount);
  return holidayDateKey(date);
}


function mergeHoliday(key, name, type) {
  const current = koreanHolidays[key];

  if (!current) {
    koreanHolidays[key] = { name: name, type: type };
    return;
  }

  const names = current.name.split(" · ");

  if (!names.includes(name)) {
    current.name += " · " + name;
  }

  if (type === "substitute") {
    current.type = "substitute";
  }
}


function addBaseHoliday(key, name) {
  if (!baseHolidayNames[key]) {
    baseHolidayNames[key] = [];
  }

  baseHolidayNames[key].push(name);
  mergeHoliday(key, name, "holiday");
}


function addIndividualHoliday(key, name, substituteRule) {
  addBaseHoliday(key, name);

  if (substituteRule) {
    substituteCandidates.push({
      dates: [key],
      after: key,
      name: name + " 대체공휴일",
      rule: substituteRule
    });
  }
}


function addHolidayGroup(dates, names, substituteName) {
  dates.forEach(function(key, index) {
    addBaseHoliday(key, names[index]);
  });

  substituteCandidates.push({
    dates: dates,
    after: dates[dates.length - 1],
    name: substituteName,
    rule: "sunday"
  });
}


Object.keys(koreanLunarHolidayDates).forEach(function(yearText) {
  const year = Number(yearText);
  const lunar = koreanLunarHolidayDates[year];

  addIndividualHoliday(year + "-01-01", "신정", null);
  addIndividualHoliday(year + "-03-01", "삼일절", "weekend");
  addIndividualHoliday(year + "-05-01", "노동절", "weekend");
  addIndividualHoliday(year + "-05-05", "어린이날", "weekend");
  addIndividualHoliday(year + "-06-06", "현충일", null);
  addIndividualHoliday(year + "-07-17", "제헌절", "weekend");
  addIndividualHoliday(year + "-08-15", "광복절", "weekend");
  addIndividualHoliday(year + "-10-03", "개천절", "weekend");
  addIndividualHoliday(year + "-10-09", "한글날", "weekend");
  addIndividualHoliday(year + "-12-25", "크리스마스", "weekend");

  addHolidayGroup(
    [
      addHolidayDays(lunar.seollal, -1),
      lunar.seollal,
      addHolidayDays(lunar.seollal, 1)
    ],
    ["설날 연휴", "설날", "설날 연휴"],
    "설날 대체공휴일"
  );

  addIndividualHoliday(
    lunar.buddha,
    "부처님오신날",
    "weekend"
  );

  addHolidayGroup(
    [
      addHolidayDays(lunar.chuseok, -1),
      lunar.chuseok,
      addHolidayDays(lunar.chuseok, 1)
    ],
    ["추석 연휴", "추석", "추석 연휴"],
    "추석 대체공휴일"
  );
});


function hasWeekdayHolidayCollision(key) {
  const day = holidayDateFromKey(key).getDay();

  return (
    day !== 0
    && day !== 6
    && baseHolidayNames[key]
    && baseHolidayNames[key].length > 1
  );
}


/*
  현행 대체공휴일 규칙
  - 국경일, 부처님오신날, 노동절, 어린이날, 기독탄신일:
    토요일ㆍ일요일 또는 다른 공휴일과 겹치면 적용
  - 설날ㆍ추석 연휴: 일요일 또는 다른 공휴일과 겹치면 적용
  - 신정ㆍ현충일: 현재 대체공휴일 대상이 아니므로 후보를 만들지 않음
*/

function needsSubstitute(candidate) {
  const hasCollision = candidate.dates.some(
    hasWeekdayHolidayCollision
  );

  if (candidate.rule === "sunday") {
    return hasCollision || candidate.dates.some(function(key) {
      return holidayDateFromKey(key).getDay() === 0;
    });
  }

  return hasCollision || candidate.dates.some(function(key) {
    const day = holidayDateFromKey(key).getDay();
    return day === 0 || day === 6;
  });
}


function findSubstituteDate(afterKey) {
  let date = holidayDateFromKey(afterKey);

  do {
    date.setDate(date.getDate() + 1);
  } while (
    date.getDay() === 0
    || date.getDay() === 6
    || baseHolidayNames[holidayDateKey(date)]
  );

  return holidayDateKey(date);
}


substituteCandidates.forEach(function(candidate) {
  if (!needsSubstitute(candidate)) {
    return;
  }

  mergeHoliday(
    findSubstituteDate(candidate.after),
    candidate.name,
    "substitute"
  );
});


Object.keys(additionalKoreanHolidays).forEach(function(key) {
  const holiday = additionalKoreanHolidays[key];
  mergeHoliday(key, holiday.name, holiday.type);
});


function getHoliday(date) {
  const key = typeof date === "string"
    ? date
    : holidayDateKey(date);

  return koreanHolidays[key] || null;
}


function isHoliday(date) {
  return Boolean(getHoliday(date));
}

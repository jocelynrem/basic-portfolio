(function (scope) {
  'use strict';

  const dayInMs = 86_400_000;
  const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const dayNumber = date => Date.parse(`${date}T00:00:00Z`) / dayInMs;
  const isoDate = day => new Date(day * dayInMs).toISOString().slice(0, 10);
  const weekday = day => new Date(day * dayInMs).getUTCDay();
  const mondayOf = day => day - (weekday(day) + 6) % 7;
  const datesBetween = (first, last) => Array.from({ length: Math.max(0, last - first + 1) }, (_, i) => first + i);

  function readCalendar(data) {
    const first = dayNumber(data.first);
    const last = dayNumber(data.last);
    const closed = new Map(Object.entries(data.closed).map(([date, reason]) => [dayNumber(date), reason]));
    const early = new Set(data.earlyRelease.map(dayNumber));
    const teaching = datesBetween(first, last).filter(day => weekday(day) > 0 && weekday(day) < 6 && !closed.has(day));
    const weekStarts = [...new Set(teaching.map(mondayOf))];
    const quarterEnds = data.quarterEnds.map(dayNumber);
    const quarters = quarterEnds.map((end, index) => {
      const start = index ? quarterEnds[index - 1] + 1 : first;
      const days = teaching.filter(day => day >= start && day <= end);
      return { start, end, days };
    });
    return { ...data, first, last, closed, early, teaching, weekStarts, quarters };
  }

  function dayOfMonth(month, date) {
    const index = monthNames.indexOf(month.slice(0, 3).toLowerCase());
    const year = index >= 7 ? 2026 : 2027;
    const value = new Date(Date.UTC(year, index, date));
    return value.getUTCMonth() === index ? value.getTime() / dayInMs : NaN;
  }

  function printedDates(text) {
    let month;
    let approximate = false;
    const spans = [];
    for (const chunk of text.replace(/\([^)]*\)/g, '').split(/[&/]/)) {
      const terms = [...chunk.matchAll(/(?:([a-z]{3,9})\.?\s*)?(\d{1,2})/gi)];
      if (!terms.length) return null;
      const bounds = terms.map(([, namedMonth, number]) => {
        if (namedMonth) month = namedMonth;
        return month ? dayOfMonth(month, Number(number)) : NaN;
      });
      if (bounds.some(day => !Number.isFinite(day))) return null;
      const start = bounds[0];
      const incomplete = bounds.length === 1 && /[-–—]\s*$/.test(chunk);
      const end = incomplete ? mondayOf(start) + 4 : bounds.at(-1);
      if (start > end || end - start > 24) return null;
      approximate ||= incomplete;
      spans.push({ start, end });
    }
    return { spans, basis: approximate ? 'estimate' : 'guide' };
  }

  function weekNumbers(text) {
    if (!/^weeks?\s+\d/i.test(text)) return [];
    return [...text.matchAll(/(\d+)\s*(?:[-–—]\s*(\d+))?/g)].flatMap(([, from, to]) =>
      datesBetween(Number(from), Number(to ?? from)));
  }

  function datePlacement(entry, calendar) {
    const window = entry.window || '';
    if (entry.subject === 'Math') {
      const printed = printedDates(window);
      if (printed) return printed;
    }
    if (/throughout the year/i.test(window)) return { basis: 'year', spans: [] };

    const weeks = weekNumbers(window);
    if (weeks.length) {
      const yearNumbered = entry.subject === 'ELA';
      const spans = weeks.flatMap(week => {
        const quarter = entry.quarter || (yearNumbered ? Math.ceil(week / 9) : null);
        const term = calendar.quarters[quarter - 1];
        if (!term) return [];
        const firstWeek = !yearNumbered ? 1 : entry.grade === '3' && quarter === 4 ? 29 : 1 + (quarter - 1) * 9;
        const startIndex = (week - firstWeek) * 5;
        if (startIndex < 0 || startIndex >= term.days.length) return [];
        const days = term.days.slice(startIndex, startIndex + 5);
        return [{ start: days[0], end: days.at(-1) }];
      });
      if (spans.length) return { spans, basis: 'estimate' };
    }
    if (entry.quarter && calendar.quarters[entry.quarter - 1]) {
      const { start, end } = calendar.quarters[entry.quarter - 1];
      return { basis: 'quarter', spans: [{ start, end }] };
    }
    return { basis: 'unit', spans: [] };
  }

  function timelineDay(date, calendar) {
    const selected = dayNumber(date);
    if (!Number.isFinite(selected) || selected < calendar.first || selected > calendar.last) return null;
    const start = mondayOf(selected);
    const days = datesBetween(start, start + 4);
    const isTeaching = calendar.teaching.includes(selected);
    return {
      selected, start, end: start + 4, days, isTeaching,
      targets: isTeaching ? [selected] : days.filter(day => calendar.teaching.includes(day)),
      reason: calendar.closed.get(selected) || (isTeaching ? '' : 'No school for students'),
      quarter: calendar.quarters.findIndex(q => selected >= q.start && selected <= q.end) + 1
    };
  }

  function mergeSpans(spans, calendar) {
    const merged = [];
    for (const { start, end } of spans.slice().sort((a, b) => a.start - b.start)) {
      const previous = merged.at(-1);
      if (previous && !calendar.teaching.some(day => day > previous.end && day < start)) {
        previous.end = Math.max(previous.end, end);
      } else {
        merged.push({ start, end });
      }
    }
    return merged;
  }

  const api = { datePlacement, dayNumber, isoDate, mergeSpans, readCalendar, timelineDay };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else scope.mcsCalendar = api;
})(typeof window === 'undefined' ? globalThis : window);

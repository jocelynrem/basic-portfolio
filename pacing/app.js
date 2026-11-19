(function () {
  'use strict';

  const { createIndex, gradeLabels, normalizeCode, search, searchTerms } = window.crosswalk;
  const { datePlacement, dayNumber, isoDate, mergeSpans, readCalendar, timelineDay } = window.mcsCalendar;
  const isPacing = document.body.classList.contains('pacing-page');
  const { records: mappings, links } = window.standardsData ?? { records: [], links: [] };
  const connectionsById = new Map(mappings.map(({ id, connections }) => [id, connections]));
  // The page has the standard titles and connections even when the detail file fails to load.
  const records = (window.cstaCatalog ?? mappings).map(record => ({
    ...record, connections: connectionsById.get(record.id) || []
  }));
  const standardIds = new Set(records.map(record => record.id));
  const districtSources = window.districtData.sources.filter(source => source.subject !== 'Math' || source.program === 'Eureka Math');
  const activeSourceIds = new Set(districtSources.map(source => source.id));
  const district = {
    sources: districtSources,
    entries: window.districtData.entries.filter(entry => activeSourceIds.has(entry.sourceId)),
    curriculum: window.districtData.curriculum.filter(entry => activeSourceIds.has(entry.sourceId))
  };
  const calendar = readCalendar(window.timelineData.calendar);
  const index = createIndex(records, district, { wording: window.timelineData.wording, calendar, datePlacement });
  const grades = ['K', '1', '2', '3', '4', '5'];
  const districtSubjects = ['Math', 'ELA', 'Science', 'Social studies'];
  const subjectLabel = subject => subject === 'ELA' ? 'English language arts' : subject;
  const schoolGradeLabel = grade => grade === 'K' ? 'Kindergarten' : gradeLabels[grade];
  const guides = [...district.sources];
  for (const grade of grades) {
    const url = window.timelineData.sciencePages[grade];
    if (url && !guides.some(guide => guide.grade === grade && guide.subject === 'Science')) {
      guides.push({
        grade, subject: 'Science', url,
        title: `${schoolGradeLabel(grade)} Science Pacing Guide`,
        note: 'Sign in with an MCS account to open the pacing guide from this page.'
      });
    }
  }
  const subjects = [...new Set(index.records.flatMap(record => record.connections.map(c => c.filterSubject)))].sort();
  const concepts = [...new Set(records.map(record => record.concept))];
  const perPage = 24;
  const byId = id => document.getElementById(id);
  const controls = Object.fromEntries(['grade', 'concept', 'subject', 'timing', 'search'].map(id => [id, byId(id)]));
  const siteSearchInput = byId('site-search-query');
  const nav = [...document.querySelectorAll('[data-view]')];
  const dateInput = byId('timeline-date');
  const gradeInput = byId('timeline-grade');
  const viewControl = byId('timeline-mode');
  const quarterInput = byId('timeline-quarter');
  const todayButton = byId('week-today');
  const schoolDate = new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/New_York'
  });
  const shortDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const fullDate = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
  const shortDay = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' });
  const basisLabels = { guide: 'Guide dates', estimate: 'Calendar estimate', quarter: 'Listed for the quarter', year: 'Throughout the year', unit: 'Unit sequence' };
  let limit = perPage;
  let linkedStandard = '';
  let chosenQuarter;
  let activeView;
  let timelineSearchItems;

  const standardHref = id => `#standards/${encodeURIComponent(id)}`;

  function make(tag, cls, text) {
    const element = document.createElement(tag);
    if (cls) element.className = cls;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function link(url, text) {
    const anchor = make('a', '', text);
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    return anchor;
  }

  function cstaStandardLink(id, text) {
    const query = new URLSearchParams({ q: id, ec: '1' });
    const reference = link(`https://csteachers.org/pk12standards/view/?${query}`, text);
    reference.setAttribute('aria-label', `${text} for ${id}`);
    return reference;
  }

  function options(select, all, values) {
    if (all) select.add(new Option(all, ''));
    for (const [value, label] of values) select.add(new Option(label, value));
  }

  const pairs = values => values.map(value => [value, value]);
  const schoolGrades = grades.map(grade => [grade, schoolGradeLabel(grade)]);
  const searchSubjects = [...districtSubjects, 'Dance', 'Music', 'Visual arts', 'Health and PE'];
  if (isPacing) {
    options(byId('search-grade'), 'All grades', schoolGrades);
    options(byId('search-subject'), 'All subjects', searchSubjects.map(subject => [subject, subjectLabel(subject)]));
  } else {
    options(controls.grade, 'All grades', grades.map(grade => [grade, gradeLabels[grade]]));
    options(controls.concept, 'All concepts', pairs(concepts));
    options(controls.subject, 'All subjects', pairs(subjects));
    options(controls.timing, 'Any timing', [
      ['verified', 'Has district timing'], ['1', 'Quarter 1'], ['2', 'Quarter 2'],
      ['3', 'Quarter 3'], ['4', 'Quarter 4'], ['no-quarter', 'No quarter listed']
    ]);
  }
  options(byId('source-grade'), 'All grades', schoolGrades);
  options(byId('source-subject'), 'All subjects', districtSubjects.map(subject => [subject, subjectLabel(subject)]));
  options(gradeInput, '', schoolGrades);
  options(quarterInput, '', calendar.quarters.map((_, index) => [String(index + 1), `Quarter ${index + 1}`]));
  const compactTimeline = window.matchMedia('(max-width: 480px)');
  function labelTimelineGrade() {
    gradeInput.options[0].label = compactTimeline.matches ? 'K' : 'Kindergarten';
  }
  compactTimeline.addEventListener('change', labelTimelineGrade);
  labelTimelineGrade();

  function dateLabel(day, formatter = shortDate) {
    return formatter.format(new Date(`${isoDate(day)}T00:00:00Z`));
  }

  function spanLabel({ start, end }) {
    if (start === end) return dateLabel(start);
    const first = isoDate(start);
    const last = isoDate(end);
    return `${dateLabel(start)}–${first.slice(0, 7) === last.slice(0, 7) ? Number(last.slice(-2)) : dateLabel(end)}`;
  }

  function timingSummary(placements) {
    const programs = new Map();
    for (const entry of placements) {
      const { basis, spans } = entry.dates;
      const key = `${entry.sourceId}|${basis}`;
      if (!programs.has(key)) programs.set(key, { basis, program: entry.source?.program, spans: [] });
      programs.get(key).spans.push(...spans);
    }
    const list = make('ul', 'timing-summary');
    for (const { program, basis, spans } of programs.values()) {
      const labels = mergeSpans(spans, calendar).map(spanLabel);
      const visible = labels.slice(0, 3);
      if (labels.length > 3) visible.push(`and ${labels.length - 3} more`);
      const timing = [basisLabels[basis], visible.join(', ')].filter(Boolean).join(' · ');
      const line = make('li');
      line.append(make('strong', '', program ? `${program} ` : ''), document.createTextNode(program ? `· ${timing}` : timing));
      list.append(line);
    }
    return list;
  }

  function connectionRow(connection) {
    const row = make('section', 'connection');
    row.append(make('p', 'connection-statement', connection.statement));
    const top = make('div', 'connection-top');
    if (connection.secondary) top.append(make('span', 'connection-subject', connection.subject));
    top.append(make('code', '', connection.code));
    if (connection.label) top.append(make('span', 'qualifier', connection.label));
    row.append(top);

    if (connection.objectives.length) {
      const objectives = make('details', 'placement');
      objectives.append(make('summary', '', 'Matched NC objectives'));
      for (const [code, text] of connection.objectives) {
        const objective = make('p');
        objective.append(make('code', '', code), document.createTextNode(` ${text}`));
        objectives.append(objective);
      }
      row.append(objectives);
    }
    for (const guidance of connection.guidance) {
      const note = make('p');
      note.append(make('strong', '', 'Planning note'), document.createTextNode(` · ${guidance}`));
      row.append(note);
    }
    if (connection.placements.length) row.append(timingSummary(connection.placements));
    return row;
  }

  function renderConnections(record, body) {
    const bySubject = new Map();
    const secondary = [];
    for (const connection of record.connections) {
      if (connection.secondary) {
        secondary.push(connection);
        continue;
      }
      if (!bySubject.has(connection.subject)) bySubject.set(connection.subject, []);
      bySubject.get(connection.subject).push(connection);
    }
    for (const [subject, connections] of bySubject) {
      connections.sort((a, b) => Number(Boolean(b.placements.length)) - Number(Boolean(a.placements.length)) || Number(Boolean(a.label)) - Number(Boolean(b.label)));
      const group = make('section', 'connection-group');
      group.append(make('h4', '', subject), connectionRow(connections[0]));
      if (connections.length > 1) {
        const rest = make('details', 'placement more-connections');
        rest.append(make('summary', '', `More ${subject} connections (${connections.length - 1})`));
        for (const connection of connections.slice(1)) rest.append(connectionRow(connection));
        group.append(rest);
      }
      body.append(group);
    }
    if (secondary.length) {
      const rest = make('details', 'placement more-connections');
      rest.open = !bySubject.size;
      rest.append(make('summary', '', `Other grades and practices (${secondary.length})`));
      for (const connection of secondary) rest.append(connectionRow(connection));
      body.append(rest);
    }
  }

  function detailField(label, values, fullWidth = false) {
    const field = make('div', fullWidth ? 'full-width' : '');
    const description = make('dd');
    if (values.length === 1 || label === 'Boundary statement') {
      description.append(...values.map(value => make('p', '', value)));
    } else {
      const list = make('ul');
      list.append(...values.map(value => make('li', '', value)));
      description.append(list);
    }
    field.append(make('dt', '', label), description);
    return field;
  }

  function renderCstaDetails(record, body) {
    const details = make('dl', 'csta-details');
    details.append(
      detailField('Concept', [record.concept]),
      detailField('Subconcept', [record.subconcept])
    );
    for (const [label, values, fullWidth] of [
      ['Boundary statement', record.boundaries, true],
      ['Practices', record.practices],
      ['Dispositions', record.dispositions],
      ['CSTA unplugged examples', record.unpluggedExamples, true]
    ]) {
      if (values?.length) details.append(detailField(label, values, fullWidth));
    }
    const source = make('p', 'csta-card-source', 'Computer Science Teachers Association (2026) · ');
    source.append(cstaStandardLink(record.id, 'View official CSTA standard'));
    body.append(make('h3', '', 'CSTA standard details'), source, details);
  }

  function standardCard(record) {
    const card = make('details', 'standard');
    card.id = `standard-${record.id}`;
    const summary = make('summary');
    const heading = make('div');
    const meta = make('div', 'card-meta');
    meta.append(make('span', 'card-code', record.id), make('span', 'grade-label', gradeLabels[record.grade]));
    const badges = make('div', 'chips');
    badges.append(make('span', '', `${record.concept} · ${record.subconcept}`));
    if (!record.hasMcsTiming) {
      badges.append(make('span', 'timing-chip', 'No MCS timing'));
    }
    heading.append(meta, make('span', 'standard-title', record.title), badges);
    const chevron = make('span', 'chevron');
    chevron.setAttribute('aria-hidden', 'true');
    summary.append(heading, chevron);
    card.append(summary);
    card.addEventListener('toggle', () => {
      if (!card.open || card.children.length > 1) return;
      const body = make('div', 'standard-body');
      renderCstaDetails(record, body);
      if (record.unpluggedExamplesOriginal?.length) {
        const ideas = make('ul', 'crosswalk-ideas');
        ideas.append(...record.unpluggedExamplesOriginal.map(idea => make('li', '', idea)));
        body.append(make('h3', '', 'Unplugged ideas from this crosswalk'), ideas);
      }
      body.append(make('h3', '', 'Crosswalk connections to North Carolina'));
      if (record.connections.length) renderConnections(record, body);
      else body.append(make('p', '', 'No North Carolina or Moore County connections are listed for this standard.'));
      card.append(body);
    });
    return card;
  }

  function renderResults({ appendFrom = 0 } = {}) {
    const filters = Object.fromEntries(Object.entries(controls).map(([key, element]) => [key === 'search' ? 'query' : key, element.value]));
    const matches = search(index, filters);
    const results = linkedStandard ? matches.filter(record => record.id === linkedStandard) : matches;
    const list = byId('result-list');
    if (!appendFrom) list.replaceChildren();
    if (!results.length) list.append(make('p', 'empty', 'No standards match these filters. Try a shorter search or clear a filter.'));
    const added = results.slice(appendFrom, limit).map(standardCard);
    list.append(...added);
    const visible = Math.min(results.length, limit);
    byId('result-count').textContent = visible < results.length
      ? `Showing ${visible} of ${results.length}` : `${results.length} ${results.length === 1 ? 'standard' : 'standards'}`;
    byId('more').hidden = visible >= results.length;
    if (appendFrom && added.length) added[0].querySelector('summary').focus();
  }

  function updateFilters() {
    limit = perPage;
    renderResults();
  }

  function clearStandardFilters() {
    for (const control of Object.values(controls)) control.value = '';
  }

  function changeFilters() {
    if (linkedStandard) {
      linkedStandard = '';
      window.history.replaceState(null, '', '#standards');
    }
    updateFilters();
  }

  function renderSources() {
    const grade = byId('source-grade').value;
    const subject = byId('source-subject').value;
    const list = byId('sources-list');
    list.replaceChildren();
    for (const [level, gradeName] of schoolGrades) {
      if (grade && grade !== level) continue;
      const gradeGuides = guides.filter(source => source.grade === level && (!subject || source.subject === subject));
      if (!gradeGuides.length) continue;
      gradeGuides.sort((a, b) => districtSubjects.indexOf(a.subject) - districtSubjects.indexOf(b.subject));

      const group = make('section', 'guide-group');
      const heading = make('h3', 'guide-heading', gradeName);
      heading.id = `guide-grade-${level}`;
      group.setAttribute('aria-labelledby', heading.id);
      const grid = make('div', 'source-grid');
      for (const source of gradeGuides) {
        const card = make('article', 'source-card');
        card.dataset.subject = source.subject;
        card.append(make('span', 'source-category', subjectLabel(source.subject)));
        const title = make('h4');
        title.append(link(source.url, source.title));
        card.append(title);
        const context = [source.program, source.year].filter(Boolean).join(' · ');
        if (context) card.append(make('p', '', context));
        if (source.note) card.append(make('p', '', source.note));
        grid.append(card);
      }
      group.append(heading, grid);
      list.append(group);
    }
    if (!list.childElementCount) list.append(make('p', 'empty', 'No district guides match these filters.'));
  }

  function standardList(entries, grade, subject, quarter = false) {
    const unique = new Map();
    for (const entry of entries) {
      const standard = index.catalog.overall(subject, grade, entry.code);
      if (!standard.text) continue;
      const key = normalizeCode(standard.code);
      if (!unique.has(key)) unique.set(key, { ...standard, pacingCodes: new Set(), objectives: new Map(), timing: new Set() });
      const item = unique.get(key);
      item.pacingCodes.add(normalizeCode(entry.code));
      if (isPacing && normalizeCode(entry.code) !== key) {
        const text = index.catalog.statement(subject, grade, entry.code);
        if (text) item.objectives.set(entry.code, text);
      }
      if (quarter) {
        const timing = entry.timing || (isPacing && basisLabels[entry.dates?.basis]);
        if (timing) item.timing.add(timing);
      }
    }
    const standards = [...unique.values()];
    const rows = standards.map(({ code, text, pacingCodes, objectives, timing }) => {
      const row = make('li');
      row.dataset.standardCode = normalizeCode(code);
      row.append(make('code', '', code), document.createTextNode(` ${text}`));
      if (timing.size) row.append(make('p', 'timeline-quarter-timing', [...timing].join(' / ')));
      if (isPacing) {
        if (objectives.size) {
          const details = make('details', 'placement');
          details.append(make('summary', '', `Listed objectives (${objectives.size})`));
          const list = make('ul', 'timeline-standards');
          for (const [objective, statement] of objectives) {
            const child = make('li');
            child.dataset.standardCode = normalizeCode(objective);
            child.append(make('code', '', objective), document.createTextNode(` ${statement}`));
            list.append(child);
          }
          details.append(list);
          row.append(details);
        }
        return row;
      }
      const related = index.relatedStandards(grade, subject, code, pacingCodes);
      if (related.length) {
        const details = make('details', 'timeline-cs-details');
        const summary = make('summary', '', 'Related CS standards');
        summary.setAttribute('aria-label', `Related CS standards for ${code}`);
        const credit = make('p', 'timeline-cs-credit', 'Computer Science Teachers Association (2026)');
        const links = make('ul', 'timeline-cs-list');
        for (const { record, label } of related) {
          const item = make('li');
          const anchor = make('a', '', `${record.id} · ${record.title}`);
          anchor.href = standardHref(record.id);
          item.append(anchor);
          if (label === 'Adapt') item.append(document.createTextNode(' (Adapt)'));
          const reference = cstaStandardLink(record.id, 'CSTA reference');
          reference.className = 'timeline-cs-reference';
          item.append(document.createTextNode(' '), reference);
          links.append(item);
        }
        details.append(summary, links, credit);
        row.append(details);
      }
      return row;
    });
    const list = make('ul', 'timeline-standards');
    list.append(...rows.slice(0, 4));
    if (rows.length > 4) {
      const extra = make('details', 'placement timeline-more');
      extra.append(make('summary', '', `More ${quarter ? 'quarter ' : ''}standards (${rows.length - 4})`));
      const remainder = make('ul', 'timeline-standards');
      remainder.append(...rows.slice(4));
      extra.append(remainder);
      const item = make('li');
      item.append(extra);
      list.append(item);
    }
    return list;
  }

  function timelineSourceGroup(entries, grade, subject, basis) {
    const section = make('div', 'timeline-group');
    const source = entries[0].source;
    const heading = make('div', 'timeline-group-heading');
    heading.append(make('span', `basis-badge ${basis}`, basisLabels[basis]));
    if (source?.program) heading.append(make('strong', '', source.program));
    section.append(heading);

    if (basis === 'unit') {
      const details = make('details', 'placement');
      details.append(make('summary', '', 'See unit sequence and standards'));
      const units = new Map();
      for (const entry of entries) {
        const title = entry.unit || 'Unit';
        if (!units.has(title)) units.set(title, []);
        units.get(title).push(entry);
      }
      for (const [title, unit] of units) {
        details.append(make('p', 'timeline-unit', [title, unit[0].window].filter(Boolean).join(' · ')), standardList(unit, grade, subject));
      }
      section.append(make('p', 'timeline-note', 'The district gives a sequence and suggested durations.'), details);
    } else {
      if (isPacing) {
        const titles = [...new Set(entries.map(entry => entry.unit).filter(Boolean))];
        if (titles.length) section.append(make('p', 'timeline-unit', titles.join(' / ')));
      }
      const standards = standardList(entries, grade, subject);
      if (standards.childElementCount) section.append(standards);
      else section.append(make('p', 'timeline-note', 'Open the guide to check the listed standards.'));
    }

    if (source && subject !== 'Science') {
      const guide = link(source.url, 'Open pacing guide');
      guide.setAttribute('aria-label', `Open ${source.title}`);
      guide.className = 'timeline-source';
      section.append(guide);
    }
    return section;
  }

  function sciencePacingLink(grade) {
    const guide = link(window.timelineData.sciencePages[grade], 'MCS science pacing page');
    guide.className = 'timeline-source';
    return guide;
  }

  function projectedScienceBlocks(grade) {
    let offset = 0;
    return window.timelineData.sciencePacing[grade].map(({ weeks, codes }) => {
      const start = calendar.teaching[offset];
      offset += weeks * 5;
      return { start, end: calendar.teaching[offset - 1], codes };
    });
  }

  function renderProjectedScience(card, grade, view) {
    const current = projectedScienceBlocks(grade).filter(span => spanInTimeline(span, view));
    card.append(make('p', 'timeline-note', 'Dates are estimates based on the guide’s suggested pacing.'));
    if (!current.length) {
      card.append(make('p', 'timeline-note', `The projected schedule has no standards for this ${view.isQuarter ? 'quarter' : 'date'}.`));
    } else if (view.isQuarter) {
      const entries = current.flatMap(({ start, end, codes }) => codes.map(code => ({
        code, timing: `Projected pacing · ${spanLabel({ start, end })}`
      })));
      card.append(standardList(entries, grade, 'Science', true));
    } else {
      for (const { start, end, codes } of current) {
        const group = make('div', 'timeline-group');
        const heading = make('div', 'timeline-group-heading');
        heading.append(make('span', 'basis-badge estimate', 'Projected pacing'), make('strong', '', spanLabel({ start, end })));
        group.append(heading, standardList(codes.map(code => ({ code })), grade, 'Science'));
        card.append(group);
      }
    }
    card.append(sciencePacingLink(grade));
  }

  function spanInTimeline({ start, end }, view) {
    return view.isQuarter ? start <= view.end && end >= view.start : view.targets.some(day => day >= start && day <= end);
  }

  function buildTimelineSearchItems() {
    const items = new Map();

    function getItem(grade, subject, code, text, timelineCode = code) {
      const key = JSON.stringify([grade, subject, normalizeCode(code)]);
      if (!items.has(key)) {
        const gradeName = grade === 'K–5' ? 'Grades K–5' : schoolGradeLabel(grade);
        const context = `${gradeName} · ${subjectLabel(subject)}`;
        const terms = new Set([context, subject, text, code, `NC.${normalizeCode(code)}`]);
        items.set(key, { code, text, timelineCode, grade, subject, context, terms, units: new Set(), periods: new Set(), wholePeriods: new Set() });
      }
      return items.get(key);
    }

    function add({ grade, subject, code, unit, quarter, dates: { basis, spans } }) {
      const standard = index.catalog.overall(subject, grade, code);
      if (!standard.text) return;
      const parent = getItem(grade, subject, standard.code, standard.text);
      const objective = index.catalog.statement(subject, grade, code);
      const targets = [parent];
      if (isPacing && objective && normalizeCode(code) !== normalizeCode(standard.code)) {
        targets.push(getItem(grade, subject, code, objective, standard.code));
      } else {
        for (const value of [code, objective]) if (value) parent.terms.add(value);
      }

      const periods = calendar.quarters.flatMap((period, i) => {
        const matches = basis === 'year' || (basis === 'quarter' ? quarter === i + 1 :
          spans.some(span => spanInTimeline(span, { ...period, isQuarter: true })));
        return matches ? [i + 1] : [];
      });
      if (basis === 'unit') periods.push(0);
      if (normalizeCode(standard.code) === normalizeCode(code)) {
        for (const period of periods) parent.wholePeriods.add(period);
      }
      for (const item of targets) {
        if (unit) item.units.add(unit);
        for (const period of periods) item.periods.add(period);
      }
    }

    for (const entry of index.entries) {
      if (entry.subject !== 'Science' || !window.timelineData.sciencePacing[entry.grade]) add(entry);
    }
    for (const grade of Object.keys(window.timelineData.sciencePacing)) {
      for (const { start, end, codes } of projectedScienceBlocks(grade)) {
        for (const code of codes) add({ grade, subject: 'Science', code, dates: { basis: 'estimate', spans: [{ start, end }] } });
      }
    }
    if (isPacing) {
      // Include objectives even when the guide schedules only their parent standard.
      for (const [category, statements] of Object.entries(window.timelineData.wording)) {
        const inquiry = category.startsWith('Social studies ') && category.endsWith(' inquiry');
        const subject = inquiry ? 'Social studies' : category;
        if (!searchSubjects.includes(subject)) continue;
        for (const [code, text] of Object.entries(statements)) {
          let levels;
          if (inquiry) levels = category.includes('K–2') ? grades.slice(0, 3) : grades.slice(3);
          else if (/^SEP /.test(code)) levels = ['K–5'];
          else levels = [code.match(/(?:^|\.)([K1-5])\./)?.[1]].filter(Boolean);
          for (const grade of levels) {
            const overall = index.catalog.overall(subject, grade, code);
            getItem(grade, subject, code, text, overall.code);
          }
        }
      }
    }
    return [...items.values()].filter(item => isPacing || item.periods.size).map(({ terms, units, periods, wholePeriods, ...item }) => {
      const parent = items.get(JSON.stringify([item.grade, item.subject, normalizeCode(item.timelineCode)]));
      const parentPacing = !periods.size && parent?.wholePeriods.size > 0;
      return {
        ...item, units: [...units], parentPacing,
        textForSearch: [...terms, ...units].join(' ').toLowerCase(),
        periods: [...(parentPacing ? parent.wholePeriods : periods)].sort((a, b) => a - b)
      };
    });
  }

  function timelineSearchResult({ code, text, grade, subject, context, periods, units, timelineCode, parentPacing }, terms = []) {
    const item = make('li', 'site-search-result');
    item.append(make('code', '', code), document.createTextNode(` ${text}`), make('p', '', context));
    if (isPacing) {
      const matchingUnits = units.filter(unit => terms.some(term => unit.toLowerCase().includes(term)));
      if (matchingUnits.length) item.append(make('p', '', 'District unit · ' + matchingUnits.join(' / ')));
      if (parentPacing) item.append(make('p', '', `The guide lists pacing for the overall standard ${timelineCode}.`));
      if (!periods.length) item.append(make('p', '', 'No district pacing listed.'));
    }
    const links = make('div', 'site-search-periods');
    for (const quarter of periods) {
      const text = quarter ? `Quarter ${quarter}` : 'Unit sequence';
      const target = parentPacing ? timelineCode : code;
      const params = new URLSearchParams({ grade, subject, standard: normalizeCode(target) });
      if (quarter) params.set('quarter', quarter);
      const anchor = make('a', '', text);
      anchor.href = `#timeline?${params}`;
      anchor.setAttribute('aria-label', parentPacing
        ? `Open overall standard ${target} in ${text.toLowerCase()} for ${code}`
        : `Open ${code} in ${text.toLowerCase()}`);
      links.append(anchor);
    }
    item.append(links);
    return item;
  }

  function searchResult(anchor, context) {
    const item = make('li', 'site-search-result');
    item.append(anchor, make('p', '', context));
    return item;
  }

  function renderSearchGroup(title, results, renderItem) {
    const group = make('section', 'site-search-group');
    const list = make('ul', 'site-search-list');
    const preview = 8;
    list.append(...results.slice(0, preview).map(renderItem));
    group.append(make('h3', '', `${title} (${results.length})`), list);
    if (results.length > preview) {
      const remaining = results.length - preview;
      const more = make('details', 'placement');
      more.append(make('summary', '', `Show ${remaining} more`));
      more.addEventListener('toggle', () => {
        if (!more.open || more.childElementCount > 1) return;
        const extra = make('ul', 'site-search-list');
        extra.append(...results.slice(preview).map(renderItem));
        more.append(extra);
      });
      group.append(more);
    }
    return group;
  }

  function renderSiteSearch() {
    const list = byId('site-search-results');
    const status = byId('site-search-count');
    const query = siteSearchInput.value.trim();
    list.replaceChildren();
    const gradeMatch = query.match(/\b(?:grade\s+([k1-5])|([1-5])(?:st|nd|rd|th)\s+grade)\b/i);
    const grade = (gradeMatch?.[1] || gradeMatch?.[2] || '').toUpperCase();
    const keywords = gradeMatch ? query.replace(gradeMatch[0], '').trim() : query;
    const terms = searchTerms(keywords);
    timelineSearchItems ??= buildTimelineSearchItems();
    const includesTerms = text => terms.every(term => text.includes(term));
    const exactFirst = (results, key) => {
      const wanted = normalizeCode(keywords);
      const exact = result => Number(normalizeCode(result[key]) === wanted);
      return results.sort((a, b) => exact(b) - exact(a));
    };
    const matchesGrade = item => !grade || grade === item.grade || item.grade === 'K–5';
    if (isPacing) {
      const level = byId('search-grade').value;
      const subject = byId('search-subject').value;
      const matches = timelineSearchItems.filter(item => matchesGrade(item) &&
        (!level || item.grade === level || item.grade === 'K–5') && (!subject || item.subject === subject) &&
        includesTerms(item.textForSearch));
      exactFirst(matches, 'code');
      status.textContent = `${matches.length} matching ${matches.length === 1 ? 'standard or objective' : 'standards and objectives'}`;
      for (const area of searchSubjects) {
        const group = matches.filter(item => item.subject === area);
        if (group.length) list.append(renderSearchGroup(subjectLabel(area), group, item => timelineSearchResult(item, terms)));
      }
      if (!matches.length) list.append(make('p', 'empty', 'Try a shorter topic, a standard code, or a different grade or subject.'));
      return;
    }
    const standards = exactFirst(search(index, { query: keywords, grade }), 'id');
    const timeline = exactFirst(timelineSearchItems.filter(item => matchesGrade(item) && includesTerms(item.textForSearch)), 'code');
    const matchingGuides = guides.filter(guide =>
      matchesGrade(guide) && includesTerms([schoolGradeLabel(guide.grade), subjectLabel(guide.subject), guide.subject,
        guide.title, guide.program, guide.year].join(' ').toLowerCase())
    );
    const count = standards.length + timeline.length + matchingGuides.length;
    status.textContent = query
      ? `${count} ${count === 1 ? 'result' : 'results'}`
      : 'Browse by section or enter a topic, standard code, or guide name.';
    if (standards.length) list.append(renderSearchGroup('CS standards', standards, record => {
      const anchor = make('a', '', `${record.id} · ${record.title}`);
      anchor.href = standardHref(record.id);
      return searchResult(anchor, `${gradeLabels[record.grade]} · ${record.concept}`);
    }));
    if (timeline.length) list.append(renderSearchGroup('Teaching timeline', timeline, timelineSearchResult));
    if (matchingGuides.length) list.append(renderSearchGroup('District guides', matchingGuides, guide =>
      searchResult(link(guide.url, guide.title), `${schoolGradeLabel(guide.grade)} · ${subjectLabel(guide.subject)}`)
    ));
    if (!count) list.append(make('p', 'empty', 'Try a shorter keyword or check the standard code.'));
  }

  function appendQuarterStandards(card, entries, grade, subject) {
    const standards = standardList(entries, grade, subject, true);
    if (standards.childElementCount) card.append(standards);
    else card.append(make('p', 'timeline-note', 'Open the guide to check the listed standards.'));
    if (subject === 'Science') return;

    const sources = new Set(entries.map(entry => entry.source).filter(Boolean));
    if (!sources.size) return;
    const list = make('ul', 'timeline-quarter-guides');
    for (const source of sources) {
      const item = make('li');
      item.append(link(source.url, source.program ? `Open ${source.program} pacing guide` : 'Open pacing guide'));
      list.append(item);
    }
    card.append(list);
  }

  function renderSubject(grade, subject, view) {
    const card = make('section', 'timeline-subject');
    card.dataset.timelineSubject = subject;
    card.append(make('h4', '', subjectLabel(subject)));
    if (subject === 'Science' && window.timelineData.sciencePacing[grade]) {
      renderProjectedScience(card, grade, view);
      return card;
    }
    const entries = index.entries.filter(entry => {
      if (entry.grade !== grade || entry.subject !== subject) return false;
      const { basis, spans } = entry.dates;
      if (basis === 'quarter') return entry.quarter === view.quarter;
      if (basis === 'guide' || basis === 'estimate') return spans.some(span => spanInTimeline(span, view));
      return basis !== 'unit' || !view.isQuarter;
    });
    if (!entries.length) {
      const period = view.isQuarter ? 'quarter' : 'date';
      let message = `No pacing is listed for this ${period}.`;
      if (subject === 'Math') {
        const hasGuide = district.sources.some(source => source.grade === grade && source.subject === subject);
        message = hasGuide ? `No Eureka Math pacing is listed for this ${period}.` : 'No Eureka Math pacing guide is listed here for this grade.';
      }
      const note = make('p', 'timeline-note', message);
      if (subject !== 'Science') {
        note.append(document.createTextNode(' '), link('https://sites.google.com/ncmcs.org/curriculum/k-5', 'Check the MCS curriculum hub'));
      }
      card.append(note);
    } else if (view.isQuarter) {
      appendQuarterStandards(card, entries, grade, subject);
    } else {
      const groups = new Map();
      for (const entry of entries) {
        const { basis } = entry.dates;
        const key = `${basis}|${entry.sourceId}`;
        if (!groups.has(key)) groups.set(key, { basis, entries: [] });
        groups.get(key).entries.push(entry);
      }
      const order = Object.keys(basisLabels);
      const sections = [...groups.values()].sort((a, b) => order.indexOf(a.basis) - order.indexOf(b.basis));
      for (const { basis, entries } of sections) card.append(timelineSourceGroup(entries, grade, subject, basis));
    }
    if (subject === 'Science') card.append(sciencePacingLink(grade));
    return card;
  }

  function currentSchoolDay() {
    const parts = Object.fromEntries(schoolDate.formatToParts(new Date()).map(({ type, value }) => [type, value]));
    return dayNumber(`${parts.year}-${parts.month}-${parts.day}`);
  }

  function renderTimeline() {
    const isQuarter = viewControl.querySelector(':checked').value === 'quarter';
    const selected = timelineDay(dateInput.value, calendar);
    const subjects = byId('timeline-subjects');
    const strip = byId('timeline-days');
    subjects.replaceChildren();
    strip.replaceChildren();
    byId('timeline-quarter-control').hidden = !isQuarter;
    byId('timeline-week-controls').hidden = isQuarter;
    byId('timeline-week-buttons').hidden = isQuarter;
    const today = currentSchoolDay();
    todayButton.disabled = today < calendar.first || today > calendar.last;
    strip.hidden = isQuarter || !selected;
    if (isQuarter) {
      const quarter = chosenQuarter ?? (selected?.quarter || 1);
      quarterInput.value = String(quarter);
      const period = calendar.quarters[quarter - 1];
      byId('timeline-week').textContent = `Quarter ${quarter} · ${spanLabel(period)}`;
      byId('timeline-day-note').textContent = `${period.days.length} teaching days in Quarter ${quarter}.`;
      for (const subject of districtSubjects) {
        subjects.append(renderSubject(gradeInput.value, subject, { ...period, quarter, isQuarter }));
      }
      return;
    }
    if (!selected) {
      byId('timeline-week').textContent = 'Choose a school-year date';
      byId('timeline-day-note').textContent = `Enter a date between ${dateLabel(calendar.first)} and ${dateLabel(calendar.last)}.`;
      byId('week-back').disabled = true;
      byId('week-next').disabled = true;
      return;
    }
    byId('timeline-week').textContent = spanLabel({ start: selected.start, end: selected.end });
    const note = selected.isTeaching ? `${dateLabel(selected.selected, fullDate)} · Grading period ${selected.quarter}` :
      `${dateLabel(selected.selected, fullDate)} · ${selected.reason}${selected.targets.length ? '. Showing this week’s plans.' : '.'}`;
    byId('timeline-day-note').textContent = note;
    byId('week-back').disabled = !calendar.weekStarts.some(start => start < selected.start);
    byId('week-next').disabled = !calendar.weekStarts.some(start => start > selected.start);
    for (const day of selected.days) {
      const date = isoDate(day);
      const closure = calendar.closed.get(day);
      const earlyRelease = calendar.early.has(day);
      const outsideYear = day < calendar.first || day > calendar.last;
      const state = outsideYear ? 'Outside school year' : closure ? `No school, ${closure}` : earlyRelease ? 'Early release' : 'School day';
      const button = make('button', 'timeline-day');
      button.type = 'button';
      button.disabled = outsideYear;
      button.setAttribute('aria-pressed', String(day === selected.selected));
      button.setAttribute('aria-label', `${dateLabel(day, fullDate)}, ${state}`);
      const dayLabel = make('span', 'timeline-day-date');
      dayLabel.append(make('span', '', dateLabel(day, shortDay)), make('strong', '', Number(date.slice(-2))));
      button.append(dayLabel);
      const badges = make('span', 'timeline-day-badges');
      if (day === today) {
        button.setAttribute('aria-current', 'date');
        badges.append(make('span', 'timeline-day-badge day-badge-today', 'Today'));
      }
      if (!outsideYear && closure) {
        button.title = closure;
        badges.append(make('span', 'timeline-day-badge day-badge-closed', 'No school'));
      } else if (!outsideYear && earlyRelease) {
        badges.append(make('span', 'timeline-day-badge day-badge-early', 'Early release'));
      }
      if (badges.childElementCount) button.append(badges);
      if (outsideYear) button.append(make('small', '', state));
      button.addEventListener('click', () => {
        dateInput.value = date;
        renderTimeline();
        strip.children[selected.days.indexOf(day)].focus();
      });
      strip.append(button);
    }
    for (const subject of districtSubjects) subjects.append(renderSubject(gradeInput.value, subject, selected));
  }

  function moveWeek(direction) {
    const view = timelineDay(dateInput.value, calendar);
    if (!view) return;
    const week = direction < 0 ? calendar.weekStarts.findLast(day => day < view.start) : calendar.weekStarts.find(day => day > view.start);
    if (week === undefined) return;
    const days = calendar.teaching.filter(day => day >= week && day <= week + 4);
    const day = days.find(day => day - week === view.selected - view.start) ?? days[0];
    dateInput.value = isoDate(day);
    renderTimeline();
  }

  function selectTimelineView(mode) {
    // Older cached pages use a select for the same control.
    if (viewControl.tagName === 'SELECT') viewControl.value = mode;
    else viewControl.querySelector(`input[value="${mode}"]`).checked = true;
  }

  function openCurrentWeek() {
    const today = currentSchoolDay();
    dateInput.value = isoDate(Math.max(calendar.first, Math.min(calendar.last, today)));
    selectTimelineView('week');
    renderTimeline();
  }

  function openTimelineResult(params) {
    gradeInput.value = params.get('grade');
    const quarter = Number(params.get('quarter'));
    const period = calendar.quarters[quarter - 1];
    if (period) {
      chosenQuarter = quarter;
      dateInput.value = isoDate(period.days[0] ?? period.start);
      selectTimelineView('quarter');
      renderTimeline();
    } else {
      openCurrentWeek();
    }
    const subject = params.get('subject');
    const code = params.get('standard');
    const card = [...byId('timeline-subjects').children].find(card => card.dataset.timelineSubject === subject);
    const row = card?.querySelector(`[data-standard-code="${CSS.escape(code ?? '')}"]`);
    const target = row || card?.querySelector('h4') || byId('timeline-heading');
    for (let details = target.parentElement.closest('details'); details; details = details.parentElement.closest('details')) {
      details.open = true;
    }
    target.tabIndex = -1;
    target.focus();
  }

  function showView() {
    const hash = window.location.hash;
    const [path, query] = hash.split('?');
    const params = new URLSearchParams(query);
    const isStandards = !isPacing && (hash === '#standards' || hash.startsWith('#standards/'));
    const view = path === '#search' ? 'search' : hash === '#sources' ? 'sources' : isStandards ? 'standards' : 'timeline';
    for (const item of nav) {
      byId(`${item.dataset.view}-view`).hidden = item.dataset.view !== view;
      if (item.dataset.view === view) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    }
    if (view === 'search') {
      siteSearchInput.value = params.get('q') || '';
      if (isPacing) {
        byId('search-grade').value = params.get('grade') || '';
        byId('search-subject').value = params.get('subject') || '';
      }
      renderSiteSearch();
      if (view !== activeView) siteSearchInput.focus();
    }
    if (view === 'timeline') {
      if (path === '#timeline' && grades.includes(params.get('grade'))) openTimelineResult(params);
      else if (view !== activeView) openCurrentWeek();
    }
    activeView = view;
    const requested = hash.match(/^#standards\/([A-Z0-9-]+)$/i)?.[1].toUpperCase();
    if (standardIds.has(requested)) {
      linkedStandard = requested;
      clearStandardFilters();
      controls.search.value = linkedStandard;
      updateFilters();
      const card = byId(`standard-${linkedStandard}`);
      card.open = true;
      card.querySelector('summary').focus();
    } else if (linkedStandard) {
      linkedStandard = '';
      clearStandardFilters();
      updateFilters();
    }
  }

  function updateSiteSearch() {
    const params = new URLSearchParams();
    if (siteSearchInput.value.trim()) params.set('q', siteSearchInput.value.trim());
    if (isPacing) {
      for (const key of ['grade', 'subject']) {
        const value = byId(`search-${key}`).value;
        if (value) params.set(key, value);
      }
    }
    renderSiteSearch();
    const hash = params.toString() ? `#search?${params}` : '#search';
    if (window.location.hash !== hash) window.history.replaceState(null, '', hash);
  }
  siteSearchInput.addEventListener('input', updateSiteSearch);
  byId('topic-lookup')?.addEventListener('submit', event => {
    event.preventDefault();
    const q = byId('lookup-topic').value.trim();
    window.location.hash = q ? `#search?${new URLSearchParams({ q })}` : '#search';
  });
  if (isPacing) {
    byId('search-grade').addEventListener('change', updateSiteSearch);
    byId('search-subject').addEventListener('change', updateSiteSearch);
  } else {
    for (const control of Object.values(controls)) control.addEventListener(control.type === 'search' ? 'input' : 'change', changeFilters);
    byId('reset').addEventListener('click', () => {
      clearStandardFilters();
      changeFilters();
      controls.search.focus();
    });
    byId('more').addEventListener('click', () => {
      const previous = limit;
      limit += perPage;
      renderResults({ appendFrom: previous });
    });
    renderResults();
  }
  for (const id of ['source-grade', 'source-subject']) byId(id).addEventListener('change', renderSources);
  gradeInput.value = 'K';
  if (isPacing) {
    try {
      const savedGrade = localStorage.getItem('mcs-pacing-grade');
      if (grades.includes(savedGrade)) gradeInput.value = savedGrade;
    } catch { /* Grade selection also works when storage is unavailable. */ }
  }
  dateInput.min = isoDate(calendar.first);
  dateInput.max = isoDate(calendar.last);
  dateInput.addEventListener('change', renderTimeline);
  gradeInput.addEventListener('change', () => {
    if (isPacing) {
      try { localStorage.setItem('mcs-pacing-grade', gradeInput.value); } catch { /* Storage is optional. */ }
    }
    renderTimeline();
  });
  viewControl.addEventListener('change', renderTimeline);
  quarterInput.addEventListener('change', () => {
    chosenQuarter = Number(quarterInput.value);
    renderTimeline();
  });
  byId('week-back').addEventListener('click', () => moveWeek(-1));
  byId('week-next').addEventListener('click', () => moveWeek(1));
  todayButton.addEventListener('click', () => {
    const today = currentSchoolDay();
    if (today >= calendar.first && today <= calendar.last) dateInput.value = isoDate(today);
    renderTimeline();
  });
  const calendarLink = byId('timeline-calendar-link');
  calendarLink.href = calendar.url;
  calendarLink.target = '_blank';
  calendarLink.rel = 'noopener noreferrer';
  byId('timeline-range').textContent = `${spanLabel({ start: calendar.first, end: calendar.last })} · 2026–27 school year`;
  window.addEventListener('hashchange', showView);
  for (const reference of links) {
    const item = make('li');
    item.append(link(reference.url, reference.title));
    byId('reference-links').append(item);
  }
  renderSources();
  showView();
})();

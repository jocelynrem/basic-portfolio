(function (scope) {
  'use strict';

  const gradeLabels = { K: 'Pre-K / Kindergarten', 1: 'Grade 1', 2: 'Grade 2', 3: 'Grade 3', 4: 'Grade 4', 5: 'Grade 5' };
  const normalizeCode = code => code.trim().toUpperCase().replace(/^NC\./, '');
  const subjectFor = subject => ({ 'ELA discussion': 'ELA', 'Social studies inquiry': 'Social studies' }[subject] || subject);
  const splitCodes = code => code.split(/,\s*(?:or\s+)?|\s+or\s+/).map(value => value.trim()).filter(Boolean);
  const codeKey = (grade, subject, code) => [grade, subject, normalizeCode(code)].join('|');
  const unitKey = entry => JSON.stringify([entry.sourceId, entry.quarter, entry.unit]);
  const placementKey = entry => JSON.stringify([entry.sourceId, entry.quarter, entry.unit, entry.window, entry.location]);

  function createCatalog(wording) {
    const subjects = new Map(Object.entries(wording).map(([subject, entries]) => [subject,
      new Map(Object.entries(entries).map(([code, text]) => [normalizeCode(code), text]))
    ]));

    function statement(subject, grade, code) {
      const key = normalizeCode(code);
      if (subject === 'Social studies' && /^I\./i.test(code)) {
        const band = grade === 'K' || Number(grade) < 3 ? 'K–2' : '3–5';
        const inquiry = subjects.get(`Social studies ${band} inquiry`)?.get(key);
        if (inquiry) return inquiry;
      }
      return subjects.get(subject)?.get(key) || '';
    }

    function overall(subject, grade, code) {
      let parent = '';
      if (subject === 'ELA' && /^(?:RF|RI|RL|SL|W|L)\.[K1-5]\.\d+\.?[a-z]$/i.test(code)) {
        parent = code.replace(/\.?[a-z]$/i, '');
      } else if (subject === 'Science' && /^(?:PS|LS|ESS)\.[K1-5]\.\d+\.\d+$/i.test(code)) {
        parent = code.slice(0, code.lastIndexOf('.'));
      } else if (subject === 'Social studies' && /^[K1-5]\.[\w&]+\.\d+\.\d+$/i.test(code)) {
        parent = code.slice(0, code.lastIndexOf('.'));
      }
      const broad = parent && statement(subject, grade, parent);
      return broad ? { code: parent, text: broad } : { code, text: statement(subject, grade, code) };
    }

    return { overall, statement };
  }

  function groupConnections(connections, grade, catalog) {
    const groups = new Map();
    for (const connection of connections) {
      const overall = catalog.overall(connection.filterSubject, grade, connection.code);
      const secondary = connection.label.startsWith('Other grade') || connection.label === 'Practice';
      const key = [connection.subject, normalizeCode(overall.code), secondary].join('|');
      if (!groups.has(key)) {
        groups.set(key, {
          ...connection, code: overall.code, statement: overall.text || connection.text,
          notes: new Set(), guidance: new Set(), objectives: new Map(), placements: new Map(), secondary
        });
      }
      const group = groups.get(key);
      if (!connection.label) group.label = '';
      const objective = catalog.statement(connection.filterSubject, grade, connection.code);
      if (objective && normalizeCode(connection.code) !== normalizeCode(overall.code) && objective !== group.statement) {
        group.objectives.set(connection.code, objective);
      }
      if (connection.text && connection.text !== group.statement) group.notes.add(connection.text);
      if (connection.guidance && connection.guidance !== group.statement) group.guidance.add(connection.guidance);
      for (const item of connection.placements) group.placements.set(`${placementKey(item)}|${item.code}`, item);
    }
    return [...groups.values()].map(group => ({
      ...group, notes: [...group.notes], guidance: [...group.guidance], objectives: [...group.objectives], placements: [...group.placements.values()]
    }));
  }

  function createIndex(records, district, { wording = {}, calendar, datePlacement } = {}) {
    const sources = new Map(district.sources.map(source => [source.id, source]));
    const byCode = new Map();
    const curriculum = new Map();
    const catalog = createCatalog(wording);
    const teachingConnections = new Map();

    for (const link of district.curriculum) {
      const links = curriculum.get(unitKey(link)) || [];
      links.push(link);
      curriculum.set(unitKey(link), links);
    }
    const entries = district.entries.map(entry => {
      const key = codeKey(entry.grade, entry.subject, entry.code);
      const placements = byCode.get(key) || [];
      const unitLinks = (curriculum.get(unitKey(entry)) || []).filter(link =>
        link.matchingCodes.some(code => normalizeCode(code) === normalizeCode(entry.code))
      );
      const item = { ...entry, source: sources.get(entry.sourceId), unitLinks, dates: calendar && datePlacement(entry, calendar) };
      placements.push(item);
      byCode.set(key, placements);
      return item;
    });

    const indexed = records.map(record => {
      const connections = record.connections.flatMap(connection => splitCodes(connection.code).map(code => {
        const subject = subjectFor(connection.subject);
        const placements = new Map();

        if (!connection.label.startsWith('Other grade') && connection.label !== 'Practice') {
          const overall = catalog.overall(subject, record.grade, code);
          const teachingKey = codeKey(record.grade, subject, overall.code);
          const related = teachingConnections.get(teachingKey) || [];
          related.push({ record, code: normalizeCode(code), label: connection.label });
          teachingConnections.set(teachingKey, related);

          const exact = byCode.get(codeKey(record.grade, subject, code)) || [];
          const parent = subject === 'ELA' && /^(?:RF|RI|RL|SL|W|L)\.[K1-5]\.\d+\.?[a-g]$/i.test(code)
            ? code.replace(/\.?[a-g]$/i, '') : '';
          const broader = !exact.length && parent ? (byCode.get(codeKey(record.grade, subject, parent)) || []) : [];
          for (const entry of [...exact, ...broader]) {
            placements.set(placementKey(entry), { ...entry, broader: normalizeCode(entry.code) !== normalizeCode(code) });
          }
        }
        if (subject === 'Math' && !placements.size) return null;
        return { ...connection, code, filterSubject: subject, placements: [...placements.values()] };
      })).filter(Boolean);
      return {
        ...record,
        connections: groupConnections(connections, record.grade, catalog),
        hasMcsTiming: connections.some(connection => connection.placements.length)
      };
    });

    function relatedStandards(grade, subject, overallCode, pacingCodes) {
      const parent = normalizeCode(overallCode);
      const matches = new Map();
      for (const match of teachingConnections.get(codeKey(grade, subject, parent)) || []) {
        // A guide listing the whole standard can match its objectives. A guide
        // listing specific objectives only matches those and the whole standard.
        if (!pacingCodes.has(parent) && match.code !== parent && !pacingCodes.has(match.code)) continue;
        if (!matches.has(match.record.id) || !match.label) matches.set(match.record.id, match);
      }
      return [...matches.values()];
    }

    return { records: indexed, sources, entries, catalog, relatedStandards };
  }

  function timingMatches(entry, timing) {
    if (!timing || timing === 'verified') return true;
    if (timing === 'no-quarter') return entry.quarter == null;
    return entry.quarter === Number(timing);
  }

  function searchTerms(query) {
    return query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  }

  function search(index, { query = '', grade = '', concept = '', subject = '', timing = '' } = {}) {
    const terms = searchTerms(query);
    const results = [];
    for (const record of index.records) {
      if ((grade && record.grade !== grade) || (concept && record.concept !== concept)) continue;
      const connections = record.connections.filter(c => !subject || subject === c.filterSubject).map(c => ({
        ...c, placements: c.placements.filter(p => timingMatches(p, timing))
      })).filter(c => !timing || c.placements.length);
      if ((subject || timing) && !connections.length) continue;

      const searchable = [record.id, record.title, gradeLabels[record.grade], record.concept, record.subconcept,
        record.boundaries, record.practices, record.dispositions, record.unpluggedExamples, record.unpluggedExamplesOriginal].flat();
      for (const c of connections) {
        searchable.push(c.subject, c.code, c.statement, c.label, c.notes.join(' '), c.objectives.flat().join(' '));
        for (const p of c.placements) {
          searchable.push(p.unit, p.location, p.window, p.source?.program);
        }
      }
      const fullText = searchable.join(' ').toLowerCase();
      if (!terms.every(term => fullText.includes(term))) continue;
      results.push({ ...record, connections });
    }
    return results;
  }

  const api = { createIndex, gradeLabels, normalizeCode, placementKey, search, searchTerms, subjectFor };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else scope.crosswalk = api;
})(typeof window === 'undefined' ? globalThis : window);

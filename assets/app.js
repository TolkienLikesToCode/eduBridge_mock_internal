/* ==================================================================
 * APP LOGIC.
 *
 * Depends on the globals exported by assets/mock-data.js:
 *   MOCK_SCHOOLS, MOCK_ROWS, CURRENT_YEAR,
 *   ROLE_ALIASES, ROLE_LOOKUP, normalizeRole,
 *   splitArrayCell, parseRoles
 *
 * Provides:
 *   FLAG_LABELS / flagLabel / schoolOf
 *   validateRow / validateImportedRow
 *   normalizeSearchText / digraphSearchText / searchContains
 *   matchesFilters
 *   escapeHtml / roleLabel / groupBy
 *   chips + cells + group-row builders
 *   personRowCells / personRowOrg / personRowKlassen
 *   renderOrgTable / renderKlassenTable / renderSchoolsTable
 *   renderImportedTable (used by the importer preview)
 *   buildImportIndex (dedupe/duplicate lookup)
 * ================================================================== */

/* ---------------- Flag labels ---------------- */

var FLAG_LABELS = {
  can_login: 'Anmeldung erlaubt',
  needs_password_reset: 'Passwort-Reset',
  external: 'Externer Zugang'
};
function flagLabel(key) { return FLAG_LABELS[key] || key; }

function schoolOf(row) { return MOCK_SCHOOLS[row.school_id] || null; }

/* ---------------- Helpers ---------------- */

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
    return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m];
  });
}

function roleLabel(role) {
  if (role === 'schueler') return 'Schüler';
  if (role === 'lehrer') return 'Lehrer';
  if (role === 'sonstige') return 'Sonstige';
  if (role === 'klassenlehrer') return 'Klassenlehrer';
  return role;
}

function groupBy(rows, keyFn) {
  var map = new Map();
  for (var i = 0; i < rows.length; i++) {
    var k = keyFn(rows[i]);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(rows[i]);
  }
  return map;
}

/* ---------------- Validation (existing rows) ---------------- */

function validateRow(row) {
  var issues = [];
  (row.autoFilled || []).forEach(function (field) {
    if (field === 'Passwort') issues.push({ level: 'info', msg: 'Passwort fehlte – automatisch generiert' });
    else if (field === 'Benutzername') issues.push({ level: 'info', msg: 'Benutzername aus Name und Geburtstag abgeleitet' });
    else if (field === 'Geburtsdatum') issues.push({ level: 'info', msg: 'Geburtsdatum fehlte – automatisch ergänzt' });
    else if (field === 'Anwendungen') issues.push({ level: 'info', msg: 'Anwendungen aus Rolle abgeleitet' });
    else if (field === 'Flags') issues.push({ level: 'info', msg: 'Flags aus Rolle abgeleitet' });
  });

  if (!row.first_name) issues.push({ level: 'error', msg: 'Vorname fehlt und kann nicht erzeugt werden' });
  if (!row.last_name) issues.push({ level: 'error', msg: 'Nachname fehlt und kann nicht erzeugt werden' });
  if (!row.roles || !row.roles.length) issues.push({ level: 'error', msg: 'Rolle fehlt und kann nicht erzeugt werden' });
  if (row.roles && row.roles.indexOf('schueler') !== -1 && row.class_number == null) {
    issues.push({ level: 'error', msg: 'Klasse fehlt für Rolle Schüler' });
  }
  if (!schoolOf(row)) issues.push({ level: 'error', msg: 'Schule unbekannt (Schul-ID fehlt oder ungültig)' });

  if (row.roles && row.roles.indexOf('schueler') !== -1 && row.class_number != null) {
    var hasHead = MOCK_ROWS.some(function (p) {
      return p.roles.indexOf('lehrer') !== -1
        && p.teacher_of_class
        && p.school_id === row.school_id
        && p.teacher_of_class.class_number === row.class_number
        && p.teacher_of_class.class_letter === row.class_letter;
    });
    if (!hasHead) issues.push({ level: 'error', msg: 'Kein Klassenlehrer zugeordnet' });
  }
  return issues;
}

/* ---------------- Validation (imported rows) ----------------
 * Produces Hinweise for a row that is about to be imported:
 *  - missing required fields (school, vorname, nachname, klasse for Schüler, role)
 *  - duplicates (name+date) against existing rows or other imported rows
 *  - duplicate LKID against existing rows or other imported rows
 * ------------------------------------------------------------------ */

function importDedupeKey(r) {
  var fn = String(r.first_name || '').toLowerCase().trim();
  var ln = String(r.last_name || '').toLowerCase().trim();
  var bd = String(r.birthday_display || '').trim();
  if (!fn || !ln || !bd) return '';
  return fn + '|' + ln + '|' + bd;
}

/* Build a lookup once per import (existing DB + the batch being imported).
 * Returns { existingByKey, existingByLkid, batchByKey, batchByLkid } */
function buildImportIndex(newRows) {
  var existingByKey = {};
  var existingByLkid = {};
  MOCK_ROWS.forEach(function (r) {
    var k = importDedupeKey(r);
    if (k) existingByKey[k] = (existingByKey[k] || 0) + 1;
    if (r.lkid) existingByLkid[r.lkid] = (existingByLkid[r.lkid] || 0) + 1;
  });
  var batchByKey = {};
  var batchByLkid = {};
  newRows.forEach(function (r) {
    var k = importDedupeKey(r);
    if (k) batchByKey[k] = (batchByKey[k] || 0) + 1;
    if (r.lkid) batchByLkid[r.lkid] = (batchByLkid[r.lkid] || 0) + 1;
  });
  return {
    existingByKey: existingByKey,
    existingByLkid: existingByLkid,
    batchByKey: batchByKey,
    batchByLkid: batchByLkid
  };
}

function validateImportedRow(row, index) {
  var issues = [];

  if (!row.first_name) issues.push({ level: 'error', msg: 'Vorname fehlt' });
  if (!row.last_name) issues.push({ level: 'error', msg: 'Nachname fehlt' });
  if (!row.school_id) issues.push({ level: 'error', msg: 'Schul-ID fehlt' });
  else if (!schoolOf(row)) issues.push({ level: 'error', msg: 'Schule unbekannt: ' + row.school_id });
  if (!row.roles || !row.roles.length) issues.push({ level: 'error', msg: 'Rolle fehlt' });
  if (row.roles && row.roles.indexOf('schueler') !== -1 && row.class_number == null) {
    issues.push({ level: 'error', msg: 'Klasse fehlt für Rolle Schüler' });
  }
  if (!row.birthday_display) issues.push({ level: 'warn', msg: 'Geburtsdatum fehlt' });

  if (index) {
    var key = importDedupeKey(row);
    if (key) {
      var inBatch = index.batchByKey[key] || 0;
      if (inBatch > 1) {
        issues.push({ level: 'error', msg: 'Doppelter Eintrag im Import (Name + Geburtsdatum)' });
      }
      if ((index.existingByKey[key] || 0) > 0) {
        issues.push({ level: 'error', msg: 'Person existiert bereits (Name + Geburtsdatum)' });
      }
    }
    if (row.lkid) {
      if ((index.batchByLkid[row.lkid] || 0) > 1) {
        issues.push({ level: 'error', msg: 'LKID mehrfach im Import: ' + row.lkid });
      }
      if ((index.existingByLkid[row.lkid] || 0) > 0) {
        issues.push({ level: 'error', msg: 'LKID existiert bereits: ' + row.lkid });
      }
    }
  }

  return issues;
}

/* ---------------- Search normalization (bidirectional) ---------------- */

var SEARCH_FOLD = {
  'ä':'a','ö':'o','ü':'u','Ä':'a','Ö':'o','Ü':'u','ß':'s',
  'á':'a','à':'a','â':'a','ã':'a','å':'a','ā':'a','ă':'a','ą':'a',
  'é':'e','è':'e','ê':'e','ë':'e','ē':'e','ė':'e','ę':'e',
  'í':'i','ì':'i','î':'i','ï':'i','ī':'i','į':'i',
  'ó':'o','ò':'o','ô':'o','õ':'o','ø':'o','ō':'o','ő':'o',
  'ú':'u','ù':'u','û':'u','ū':'u','ů':'u','ű':'u',
  'ç':'c','ć':'c','č':'c',
  'ñ':'n','ń':'n',
  'ý':'y','ÿ':'y',
  'š':'s','ś':'s','ž':'z','ź':'z','ż':'z',
  'ř':'r','ď':'d','ť':'t','ň':'n','ľ':'l'
};
function foldSearchChar(c) { return SEARCH_FOLD[c] || c; }
function normalizeSearchText(str) {
  if (str == null) return '';
  var folded = String(str).replace(
    /[äöüÄÖÜßáàâãåāăąéèêëēėęíìîïīįóòôõøōőúùûūůűçćčñńýÿšśžźżřďťňľ]/g,
    foldSearchChar
  );
  folded = folded.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return folded.toLowerCase();
}
function digraphSearchText(str) {
  if (str == null) return '';
  return String(str)
    .replace(/ä/gi, 'ae').replace(/ö/gi, 'oe').replace(/ü/gi, 'ue').replace(/ß/gi, 'ss')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
function searchContains(haystack, needle) {
  if (!needle) return true;
  var h = String(haystack == null ? '' : haystack);
  var n = String(needle);
  if (normalizeSearchText(h).indexOf(normalizeSearchText(n)) !== -1) return true;
  if (digraphSearchText(h).indexOf(digraphSearchText(n)) !== -1) return true;
  return false;
}

/* ---------------- Filtering ---------------- */

function matchesFilters(r, filters) {
  if (!filters) return true;
  if (filters.schools && filters.schools.length) {
    if (filters.schools.indexOf(r.school_id) === -1) return false;
  }
  if (filters.years && filters.years.length) {
    if (filters.years.indexOf(String(r.assignment_year)) === -1) return false;
  }
  if (filters.roles && filters.roles.length) {
    var wanted = [];
    filters.roles.forEach(function (raw) {
      var canon = normalizeRole(raw);
      if (canon && wanted.indexOf(canon) === -1) wanted.push(canon);
    });
    if (wanted.length && !wanted.some(function (x) { return r.roles.indexOf(x) !== -1; })) {
      return false;
    }
  }
  if (filters.flags && filters.flags.length) {
    if (!filters.flags.some(function (x) { return r.flags.indexOf(x) !== -1; })) return false;
  }
  if (filters.query) {
    var tokens = filters.query.split(/\s+/).filter(Boolean);
    for (var i = 0; i < tokens.length; i++) {
      if (!matchToken(r, tokens[i].toLowerCase())) return false;
    }
  }
  return true;
}

function matchToken(r, token) {
  var m = token.match(/^([a-z]+):(.*)$/);
  if (m) return matchField(r, m[1], m[2]);
  return fuzzyMatch(r, token);
}
function matchField(r, field, value) {
  var school = schoolOf(r);
  function hit(s) { return searchContains(s, value); }
  switch (field) {
    case 'sid': case 'schoolid': return hit(r.school_id);
    case 'school': return hit(school ? school.name : '');
    case 'name': return hit(r.first_name) || hit(r.last_name);
    case 'first': case 'firstname': return hit(r.first_name);
    case 'last': case 'lastname': return hit(r.last_name);
    case 'role':
      var wantedRole = normalizeRole(value);
      if (wantedRole) return r.roles.indexOf(wantedRole) !== -1;
      return r.roles.some(function (x) { return hit(x); });
    case 'flag': return r.flags.some(function (x) { return hit(x); });
    case 'app': return r.applications.some(function (x) { return hit(x); });
    case 'username': return hit(r.username);
    case 'lkid': return hit(r.lkid);
    case 'appleid': return hit(r.apple_id);
    case 'birthday': return hit(r.birthday_display);
    case 'year': return String(r.assignment_year) === value;
    default: return fuzzyMatch(r, value);
  }
}
function fuzzyMatch(r, value) {
  var school = schoolOf(r);
  var fields = [
    r.school_id, school ? school.name : '',
    r.first_name, r.last_name, r.username, r.lkid, r.apple_id, r.birthday_display
  ];
  for (var i = 0; i < fields.length; i++) {
    if (searchContains(fields[i], value)) return true;
  }
  if (r.roles.some(function (x) { return searchContains(x, value); })) return true;
  if (r.flags.some(function (x) { return searchContains(x, value); })) return true;
  if (r.applications.some(function (x) { return searchContains(x, value); })) return true;
  return false;
}

/* ---------------- Chips / cell builders ---------------- */

function roleChips(roles) {
  if (!roles || !roles.length) return '<span class="missing-error">Rolle fehlt</span>';
  return roles.map(function (r) {
    return '<span class="chip chip-role" title="' + escapeHtml(r) + '">' + escapeHtml(roleLabel(r)) + '</span>';
  }).join('');
}
function appChips(apps) {
  if (!apps || !apps.length) return '<span class="muted">—</span>';
  return apps.map(function (a) { return '<span class="chip chip-app">' + escapeHtml(a) + '</span>'; }).join('');
}
function flagChips(flags) {
  if (!flags || !flags.length) return '<span class="muted">—</span>';
  return flags.map(function (f) {
    return '<span class="chip chip-flag" title="' + escapeHtml(f) + '">' + escapeHtml(flagLabel(f)) + '</span>';
  }).join('');
}
function passwordCell(r) {
  if (!r.password) return '<span class="missing-error">Passwort fehlt</span>';
  var tag = r.password_generated
    ? '<span class="chip chip-generated" title="Automatisch generiert">generiert</span>'
    : '';
  return '<span class="cell-mono">' + escapeHtml(r.password) + '</span>' + tag;
}
function birthdayCell(r) { return '<span class="cell-mono">' + escapeHtml(r.birthday_display || '—') + '</span>'; }
function usernameCell(r) { return '<span class="cell-mono">' + escapeHtml(r.username || '—') + '</span>'; }
function appleIdCell(r) { return '<span class="cell-mono cell-apple">' + escapeHtml(r.apple_id || '—') + '</span>'; }
function nameCell(v) { return '<span>' + escapeHtml(v || '—') + '</span>'; }

function issuesCell(issues) {
  if (!issues || !issues.length) {
    return '<span class="issue-ok-dot" title="Keine Hinweise"></span>';
  }
  var worst = issues.some(function (i) { return i.level === 'error'; })
    ? 'error'
    : (issues.some(function (i) { return i.level === 'warn'; }) ? 'warn' : 'info');
  var label = worst === 'error' ? '!' : (worst === 'warn' ? '?' : 'i');
  var payload = escapeHtml(JSON.stringify(issues));
  return '<button type="button" class="issue-btn issue-' + worst + '" ' +
    'data-issues="' + payload + '" title="Hinweise anzeigen">' + label + '</button>';
}

function openIssuesDialog(issues) {
  var dlg = document.getElementById('issues-dialog');
  if (!dlg) return;
  var body = dlg.querySelector('.dlg-body');
  body.innerHTML = '<ul>' + issues.map(function (i) {
    return '<li class="issue-' + escapeHtml(i.level) + '">' + escapeHtml(i.msg) + '</li>';
  }).join('') + '</ul>';
  if (typeof dlg.showModal === 'function') dlg.showModal();
  else dlg.setAttribute('open', '');
}

document.addEventListener('click', function (e) {
  var btn = e.target.closest && e.target.closest('.issue-btn');
  if (!btn) return;
  try {
    var issues = JSON.parse(btn.dataset.issues || '[]');
    openIssuesDialog(issues);
  } catch (_) { /* ignore */ }
});

function groupMetaCells(identifier, label, count) {
  var identifierCell = '<td class="col-meta"><span class="meta-school">' + escapeHtml(identifier) + '</span></td>';
  var labelCell = '<td class="col-meta-2">' +
    '<span class="meta-secondary">' + escapeHtml(label) + '</span>' +
    '<span class="meta-count">' + count + ' Personen</span>' +
  '</td>';
  return identifierCell + labelCell;
}
function emptyMetaCells() {
  return '<td class="col-meta"></td><td class="col-meta-2"></td>';
}
function lkidMetaCell(r) {
  return '<td class="col-meta"></td>' +
         '<td class="col-meta-2"><span class="cell-mono">' + escapeHtml(r.lkid || '—') + '</span></td>';
}

function schoolHeaderRow(schoolIdLabel, schoolName, personCount, unknownSchool) {
  return '<tr class="group-row level-1 school-row' + (unknownSchool ? ' row-error' : '') + '">' +
    groupMetaCells(schoolIdLabel, schoolName, personCount) +
    '<td colspan="10"></td>' +
  '</tr>';
}
function roleHeaderRow(roleText, count) {
  return '<tr class="group-row level-2">' +
    groupMetaCells(roleText, '', count) +
    '<td colspan="10"></td>' +
  '</tr>';
}
function classHeaderRow(classLabel, count) {
  return '<tr class="group-row level-3">' +
    groupMetaCells(classLabel, '', count) +
    '<td colspan="10"></td>' +
  '</tr>';
}

function personRowCells(r, displayRoleCell, issues) {
  return lkidMetaCell(r) +
    '<td>' + birthdayCell(r) + '</td>' +
    '<td>' + nameCell(r.first_name) + '</td>' +
    '<td>' + nameCell(r.last_name) + '</td>' +
    '<td>' + displayRoleCell + '</td>' +
    '<td>' + usernameCell(r) + '</td>' +
    '<td>' + appleIdCell(r) + '</td>' +
    '<td>' + passwordCell(r) + '</td>' +
    '<td>' + appChips(r.applications) + '</td>' +
    '<td>' + flagChips(r.flags) + '</td>' +
    '<td class="cell-issues">' + issuesCell(issues) + '</td>';
}

function personRowOrg(r, issues) {
  var hasError = issues.some(function (i) { return i.level === 'error'; });
  return '<tr class="person-row' + (hasError ? ' row-error' : '') + '">' +
    personRowCells(r, roleChips(r.roles), issues) + '</tr>';
}
function personRowKlassen(r, displayRole, issues) {
  var hasError = issues.some(function (i) { return i.level === 'error'; });
  var chip = '<span class="chip chip-role">' + escapeHtml(roleLabel(displayRole)) + '</span>';
  return '<tr class="person-row' + (hasError ? ' row-error' : '') + '">' +
    personRowCells(r, chip, issues) + '</tr>';
}

/* ---------------- Pagination helper ---------------- */

function applyPage(rows, p) {
  var size = Math.max(1, p.size || 100);
  var totalPages = Math.max(1, Math.ceil(rows.length / size));
  var page = Math.min(Math.max(1, p.page || 1), totalPages);
  var start = (page - 1) * size;
  return {
    slice: rows.slice(start, start + size),
    totalItems: rows.length,
    page: page,
    totalPages: totalPages
  };
}

/* ---------------- Table 1 — Schule / Rolle ---------------- */

function renderOrgTable(filters, pagination) {
  var tbody = document.querySelector('#table-org tbody');
  var emptyMeta = { warn: 0, error: 0, generated: 0 };
  if (!tbody) return { stats: emptyMeta, totalItems: 0, page: 1 };

  var allRows = MOCK_ROWS.filter(function (r) { return matchesFilters(r, filters); });
  var pageInfo = applyPage(allRows, pagination || { size: 100, page: 1 });
  var rows = pageInfo.slice;

  var bySchool = groupBy(rows, function (r) { return r.school_id; });
  var html = '';
  var stats = { warn: 0, error: 0, generated: 0 };

  bySchool.forEach(function (schoolRows, schoolId) {
    var school = schoolOf(schoolRows[0]);
    var unknownSchool = !school;
    var schoolName = school ? school.name : 'Unbekannte Schule';
    var schoolIdLabel = unknownSchool ? schoolId + ' (unbekannt)' : schoolId;

    html += schoolHeaderRow(schoolIdLabel, schoolName, schoolRows.length, unknownSchool);

    var byRole = groupBy(schoolRows, function (r) { return r.roles.join(',') || '_missing_'; });
    byRole.forEach(function (roleRows, roleKey) {
      var roleArr = roleKey === '_missing_' ? [] : roleKey.split(',');
      var roleText = roleArr.length ? roleArr.map(roleLabel).join(', ') : 'Rolle fehlt';

      html += roleHeaderRow(roleText, roleRows.length);

      if (roleArr.indexOf('schueler') !== -1) {
        var byClass = groupBy(roleRows, function (r) { return String(r.class_number); });
        byClass.forEach(function (classRows, classNum) {
          var classLabel = classNum === 'null' ? 'Klasse fehlt' : 'Klasse ' + classNum;
          html += classHeaderRow(classLabel, classRows.length);
          classRows.forEach(function (r) {
            var issues = validateRow(r);
            html += personRowOrg(r, issues);
            stats.warn += issues.filter(function (i) { return i.level === 'warn'; }).length;
            stats.error += issues.filter(function (i) { return i.level === 'error'; }).length;
            if (r.password_generated) stats.generated += 1;
          });
        });
      } else {
        roleRows.forEach(function (r) {
          var issues = validateRow(r);
          html += personRowOrg(r, issues);
          stats.warn += issues.filter(function (i) { return i.level === 'warn'; }).length;
          stats.error += issues.filter(function (i) { return i.level === 'error'; }).length;
          if (r.password_generated) stats.generated += 1;
        });
      }
    });
  });

  tbody.innerHTML = html;
  document.getElementById('table-org').hidden = false;
  document.getElementById('empty-state-org').hidden = true;
  return { stats: stats, totalItems: pageInfo.totalItems, page: pageInfo.page };
}

/* ---------------- Table 2 — Klassen / Zuordnung ---------------- */

function renderKlassenTable(filters, pagination) {
  var tbody = document.querySelector('#table-klassen tbody');
  if (!tbody) return;

  var allRows = MOCK_ROWS.filter(function (r) { return matchesFilters(r, filters); });
  var pageInfo = applyPage(allRows, pagination || { size: 100, page: 1 });
  var rows = pageInfo.slice;

  var bySchool = groupBy(rows, function (r) { return r.school_id; });
  var html = '';

  bySchool.forEach(function (schoolRows, schoolId) {
    var school = schoolOf(schoolRows[0]);
    var unknownSchool = !school;
    var schoolName = school ? school.name : 'Unbekannte Schule';
    var schoolIdLabel = unknownSchool ? schoolId + ' (unbekannt)' : schoolId;

    html += schoolHeaderRow(schoolIdLabel, schoolName, schoolRows.length, unknownSchool);

    var students = schoolRows.filter(function (r) { return r.roles.indexOf('schueler') !== -1; });
    var teachers = schoolRows.filter(function (r) { return r.roles.indexOf('lehrer') !== -1; });
    var sonstige = schoolRows.filter(function (r) { return r.roles.indexOf('sonstige') !== -1; });

    var teachersWithClass = teachers.filter(function (t) { return !!t.teacher_of_class; });
    var teachersWithoutClass = teachers.filter(function (t) { return !t.teacher_of_class; });

    var byClass = groupBy(students, function (r) {
      return String(r.class_number) + (r.class_letter || '');
    });

    byClass.forEach(function (classStudents, classKey) {
      var sample = classStudents[0];
      var classNum = sample.class_number;
      var classLetter = sample.class_letter || '';
      var classLabel = classNum == null ? 'Klasse fehlt' : 'Klasse ' + classNum + classLetter;

      html += classHeaderRow(classLabel, classStudents.length);

      var heads = teachersWithClass.filter(function (t) {
        return t.school_id === schoolId
          && t.teacher_of_class.class_number === classNum
          && (t.teacher_of_class.class_letter || '') === classLetter;
      });

      if (heads.length === 0) {
        html += '<tr class="person-row row-error">' +
          emptyMetaCells() +
          '<td colspan="10"><span class="missing-error">Kein Klassenlehrer zugeordnet</span></td>' +
        '</tr>';
      } else {
        heads.forEach(function (r) { html += personRowKlassen(r, 'klassenlehrer', validateRow(r)); });
      }
      classStudents.forEach(function (r) { html += personRowKlassen(r, 'schueler', validateRow(r)); });
    });

    if (teachersWithoutClass.length) {
      html += roleHeaderRow('Lehrer ohne Klassenzuordnung', teachersWithoutClass.length);
      teachersWithoutClass.forEach(function (r) {
        html += personRowKlassen(r, 'lehrer', validateRow(r));
      });
    }

    if (sonstige.length) {
      html += roleHeaderRow('Sonstige', sonstige.length);
      sonstige.forEach(function (r) {
        html += personRowKlassen(r, 'sonstige', validateRow(r));
      });
    }
  });

  tbody.innerHTML = html;
  document.getElementById('table-klassen').hidden = false;
  document.getElementById('empty-state-klassen').hidden = true;
}

/* ---------------- Schools ---------------- */

function renderSchoolsTable() {
  var tbody = document.getElementById('schools-tbody');
  if (!tbody) return;
  var html = '';
  Object.keys(MOCK_SCHOOLS).forEach(function (id) {
    var s = MOCK_SCHOOLS[id];
    var typeLabel = { grundschule: 'Grundschule', regelschule: 'Regelschule', gymnasium: 'Gymnasium' }[s.type] || s.type;
    html += '<tr>' +
      '<td class="cell-mono">' + escapeHtml(s.id) + '</td>' +
      '<td>' + escapeHtml(s.name) + '</td>' +
      '<td>' + escapeHtml(typeLabel) + '</td>' +
      '<td>' + escapeHtml(s.county) + '</td>' +
      '<td><button class="btn small">Bearbeiten</button></td>' +
    '</tr>';
  });
  tbody.innerHTML = html;
}

/* ---------------- Imported rows table (used by importer preview) -------
 * Renders the projected import rows through the SAME grouped markup,
 * with the same Hinweise system. Pagination is 50 per page. Invalid
 * rows get .row-error so they stand out visually.
 * --------------------------------------------------------------------- */

var IMPORT_PAGE_STATE = { page: 1, size: 50 };

function renderImportedTable(containerTbody, containerInfo, containerPrev, containerNext, newRows, index) {
  var allRows = newRows || [];
  var pageInfo = applyPage(allRows, IMPORT_PAGE_STATE);
  IMPORT_PAGE_STATE.page = pageInfo.page;
  var rows = pageInfo.slice;

  var bySchool = groupBy(rows, function (r) { return r.school_id || '_unknown_'; });
  var html = '';
  var stats = { warn: 0, error: 0 };

  bySchool.forEach(function (schoolRows, schoolId) {
    var school = MOCK_SCHOOLS[schoolId];
    var unknownSchool = !school;
    var schoolName = school ? school.name : 'Unbekannte Schule';
    var schoolIdLabel = unknownSchool ? (schoolId || '(leer)') + ' (unbekannt)' : schoolId;

    html += schoolHeaderRow(schoolIdLabel, schoolName, schoolRows.length, unknownSchool);

    var byRole = groupBy(schoolRows, function (r) { return r.roles.join(',') || '_missing_'; });
    byRole.forEach(function (roleRows, roleKey) {
      var roleArr = roleKey === '_missing_' ? [] : roleKey.split(',');
      var roleText = roleArr.length ? roleArr.map(roleLabel).join(', ') : 'Rolle fehlt';
      html += roleHeaderRow(roleText, roleRows.length);

      if (roleArr.indexOf('schueler') !== -1) {
        var byClass = groupBy(roleRows, function (r) {
          return (r.class_number == null ? 'null' : String(r.class_number)) + '|' + (r.class_letter || '');
        });
        byClass.forEach(function (classRows, classKey) {
          var parts = classKey.split('|');
          var classNum = parts[0];
          var letter = parts[1];
          var classLabel = classNum === 'null' ? 'Klasse fehlt' : ('Klasse ' + classNum + (letter || ''));
          html += classHeaderRow(classLabel, classRows.length);
          classRows.forEach(function (r) {
            var issues = validateImportedRow(r, index);
            stats.warn += issues.filter(function (i) { return i.level === 'warn'; }).length;
            stats.error += issues.filter(function (i) { return i.level === 'error'; }).length;
            html += personRowOrg(r, issues);
          });
        });
      } else {
        roleRows.forEach(function (r) {
          var issues = validateImportedRow(r, index);
          stats.warn += issues.filter(function (i) { return i.level === 'warn'; }).length;
          stats.error += issues.filter(function (i) { return i.level === 'error'; }).length;
          html += personRowOrg(r, issues);
        });
      }
    });
  });

  containerTbody.innerHTML = html;
  if (containerInfo) {
    containerInfo.textContent = 'Seite ' + pageInfo.page + ' von ' + pageInfo.totalPages +
      ' · ' + pageInfo.totalItems + ' Einträge · ' +
      stats.error + ' Fehler, ' + stats.warn + ' Warnungen';
  }
  if (containerPrev) containerPrev.disabled = pageInfo.page <= 1;
  if (containerNext) containerNext.disabled = pageInfo.page >= pageInfo.totalPages;

  return { stats: stats, totalItems: pageInfo.totalItems, page: pageInfo.page, totalPages: pageInfo.totalPages };
}
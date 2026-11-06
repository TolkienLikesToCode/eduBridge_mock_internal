/* ==================================================================
 * MOCK DATA GENERATION ONLY.
 *
 * This file is deliberately decoupled from the app. It exports:
 *   - MOCK_SCHOOLS           school directory
 *   - MOCK_ROWS              generated people
 *   - ROLE_ALIASES           canonical role -> alias list
 *   - ROLE_LOOKUP            normalized alias -> canonical role
 *   - normalizeRole(raw)     -> canonical role or null
 *   - splitArrayCell(raw)    -> string[] (splits ONLY on commas)
 *   - parseRoles(raw)        -> string[] (canonical roles, never empty)
 *
 * Everything else (rendering, filtering, validation, UI helpers) lives
 * in assets/app.js.
 *
 * Regenerate this file only when you actually want new mock data.
 * ================================================================== */

var CURRENT_YEAR = new Date().getFullYear();

/* ------------------------------------------------------------------
 * Schools
 * ------------------------------------------------------------------ */

var MOCK_SCHOOLS = (function () {
  var names = [
    ['grundschule', 'Grundschule Nord', 'Grundschule Süd', 'Grundschule Ost',
     'Grundschule West', 'Grundschule Mitte', 'Grundschule Am Park',
     'Grundschule Regenbogen', 'Grundschule Sonnenblume'],
    ['regelschule', 'Regelschule Greiz', 'Regelschule Zeulenroda',
     'Regelschule Auma', 'Regelschule Weida', 'Regelschule Berga',
     'Regelschule Triebes', 'Regelschule Münchenbernsdorf'],
    ['gymnasium', 'Gymnasium Greiz', 'Gymnasium Zeulenroda',
     'Gymnasium Auma', 'Gymnasium Weida', 'Gymnasium Berga']
  ];
  var out = {};
  var counter = 0;
  var prefix = { grundschule: 1, regelschule: 2, gymnasium: 6 };
  names.forEach(function (group) {
    var type = group[0];
    for (var i = 1; i < group.length; i++) {
      counter += 1;
      var id = String(prefix[type] * 10000 + counter);
      out[id] = {
        id: id,
        name: group[i],
        type: type,
        county: 'LK Greiz'
      };
    }
  });
  return out;
})();

/* ------------------------------------------------------------------
 * ROLE ALIAS REGISTRY
 *
 * Canonical roles: 'schueler', 'lehrer', 'sonstige'.
 * Array cells split on COMMAS only.
 * ------------------------------------------------------------------ */

var ROLE_ALIASES = {
  schueler: [
    'schueler','schuler','schüler','schülerin','schuelerin','schulerin',
    'schuelerinnen','schülerinnen','schueler/innen','schüler/innen',
    'schueler*innen','schüler*innen','schueler-innen','schüler-innen',
    'schueler/-innen','schüler/-innen','schueler:innen','schüler:innen',
    'student','students','pupil','pupils','learner','learners',
    'kind','kinder','child','children','kids',
    'sch','schu','schü','schuel','schuelering','schueler-in','schüler-in'
  ],
  lehrer: [
    'lehrer','lehrerin','lehrerinnen','lehrer/innen','lehrer*innen',
    'lehrer-innen','lehrer/-innen','lehrer:innen',
    'teacher','teachers','tutor','tutors','instructor','instructors',
    'educator','educators','pedagogue','pedagogues',
    'lehr','lehrkraft','lehrkraefte','lehrkräfte','lehrer-in','lehrperson',
    'l'
  ],
  sonstige: [
    'sonstige','sonstiger','sonstiges','sonst','sonstig',
    'other','others','misc','miscellaneous','staff','external',
    'extern','externe','externer','externes','gaeste','gäste','guest','guests',
    'besucher','besucherin','besucherinnen',
    'verwaltung','admin','administrator','sekretariat','hausmeister',
    'referendar','referendarin','referendare','referendarinnen',
    'praktikant','praktikantin','praktikanten','praktikantinnen',
    'freiwillig','freiwillige','freiwilliger','fsj','bfd',
    's'
  ]
};

var ROLE_LOOKUP = (function () {
  var map = {};
  function key(s) {
    return String(s == null ? '' : s)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z]/g, '');
  }
  Object.keys(ROLE_ALIASES).forEach(function (canonical) {
    map[key(canonical)] = canonical;
    ROLE_ALIASES[canonical].forEach(function (alias) {
      map[key(alias)] = canonical;
    });
  });
  return map;
})();

function normalizeRole(raw) {
  if (raw == null) return null;
  var k = String(raw)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
  if (!k) return null;
  if (ROLE_LOOKUP[k]) return ROLE_LOOKUP[k];
  var keys = Object.keys(ROLE_LOOKUP);
  for (var i = 0; i < keys.length; i++) {
    if (keys[i].length >= 3 && k.indexOf(keys[i]) === 0) return ROLE_LOOKUP[keys[i]];
  }
  for (var j = 0; j < keys.length; j++) {
    if (keys[j].length >= 4 && k.indexOf(keys[j]) !== -1) return ROLE_LOOKUP[keys[j]];
  }
  return null;
}

function splitArrayCell(raw) {
  if (raw == null) return [];
  var str = String(raw).trim();
  if (!str) return [];
  return str.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
}

function parseRoles(raw) {
  var tokens = splitArrayCell(raw);
  if (!tokens.length) return ['sonstige'];
  var out = [];
  tokens.forEach(function (t) {
    var canon = normalizeRole(t);
    if (canon && out.indexOf(canon) === -1) out.push(canon);
  });
  if (!out.length) {
    var whole = normalizeRole(String(raw));
    if (whole) return [whole];
    return ['sonstige'];
  }
  return out;
}

/* ------------------------------------------------------------------
 * Name pools
 * ------------------------------------------------------------------ */

var FIRST_NAMES_GERMAN = [
  'Anna','Ben','Clara','David','Emma','Felix','Greta','Hannah','Ida','Jonas',
  'Klara','Lukas','Mia','Noah','Olivia','Paul','Quirin','Rosa','Samuel','Theresa',
  'Ulrich','Vera','Wilhelm','Xaver','Yara','Zoe','Änne','Jörg','Ömer','Renée',
  'Søren','Céline','André','Björn','Karl-Heinz','Anna-Lena','Jean-Pierre',
  'Anne-Marie','Marie-Luise','Hans-Peter','Ulf','Sophie','Marie','Charlotte',
  'Emil','Oskar','Lina','Finn'
];
var FIRST_NAMES_ME = [
  'Mohammed','Ahmed','Ali','Hassan','Hussein','Omar','Yusuf','Ibrahim','Mustafa',
  'Mehmet','Emre','Burak','Kaan','Hakan','Serkan','Kerem','Reza','Amir','Arman',
  'Kian','Dariush','Farhad','Navid','Sina','Layla','Fatima','Aisha','Maryam',
  'Zahra','Noor','Yasmin','Sara','Ayşe','Elif','Zeynep','Merve','Esra','Derya',
  'Selin','Dilan','Shirin','Parisa','Nasrin','Rojin','Berfin','Avin','Ranya'
];
var LAST_NAMES_GERMAN = [
  'Müller','Schmidt','Schneider','Fischer','Weber','Meyer','Wagner','Becker',
  'Schulz','Hoffmann','Koch','Richter','Klein','Wolf','Schröder','Neumann',
  'Schwarz','Zimmermann','Braun','Krüger','Hartmann','Lange','Schmitt','Werner',
  'Schmitz','Krause','Meier','Lehmann','Schulze','Köhler','Herrmann','König',
  'Walter','Mayer','Huber','Kaiser','Fuchs','Peters','Lang','Scholz','Möller',
  'Weiß','Jung','Hahn','Vogel','Friedrich','Keller','Günther','Frank','Berger',
  'Winkler','Roth','Beck','Lorenz','Baumann','Franke','Albrecht','Schuster',
  'Simon','Ludwig','Böhm','Winter','Kraus','Martin','Schumacher','Krämer',
  'Vogt','Stein','Jäger','Otto','Sommer','Groß','Seidel','Heinrich','Brandt',
  'Haas','Schreiber','Graf','Schulte','Dietrich','Ziegler','Kuhn','Kühn',
  'Pohl','Engel','Horn','Busch','Bergmann','Thomas','Voigt','Sauer','Arnold',
  'Wolff','Pfeiffer'
];
var LAST_NAMES_ME = [
  'Yilmaz','Kaya','Demir','Sahin','Celik','Yildiz','Yildirim','Ozturk','Aydin',
  'Ozdemir','Arslan','Dogan','Kilic','Aslan','Cetin','Kara','Koc','Kurt',
  'Ozkan','Simsek','Hassan','Hussein','Ali','Ibrahim','Khalil','Nasser',
  'Haddad','Saleh','Mansour','Karam','Aziz','Farah','Khalaf','Sabbagh','Rezai',
  'Ahmadi','Hosseini','Karimi','Mohammadi','Rahimi','Jafari','Moradi',
  'Sadeghi','Bagheri','Ebrahimi','Rostami','Azizi','Rashidi','Sharifi','Farhadi'
];
var CHILDRENS_WORDS = [
  'sonne','blume','wolke','apfel','stern','baum','wind','regen','wiese','mond',
  'hase','fuchs','biene','schnee','berg','fluss','rose','tulpe','vogel','fisch',
  'brot','milch','honig','zucker','katze','hund','maus','ente','pferd','ziege',
  'huhn','kuh','auto','ball','buch','bild','farbe','licht','feuer','wasser',
  'erde','luft','eis','salz','sand','stein','gras','blatt','burg','turm',
  'haus','hof','garten','wald','feld','weg'
];

var SPECIAL_CHARS = '!@#$%^&*-_=+?';
var UPPERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
var LOWERS = 'abcdefghijkmnopqrstuvwxyz';
var DIGITS = '23456789';

function makeRng(seed) {
  var s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
var rng = makeRng(20240612);
function pick(arr) { return arr[Math.floor(rng() * arr.length)]; }
function pickInt(min, max) { return min + Math.floor(rng() * (max - min + 1)); }
function maybe(p) { return rng() < p; }

var LOWERCASE_PARTICLES = ['von','van','de','zu','der','den','la','le','du','di','bin','al','el'];
function capitalizeWord(w) {
  if (!w) return w;
  var parts = w.split("'");
  if (parts.length > 1) {
    return parts.map(function (p) {
      return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
    }).join("'");
  }
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}
function normalizeGermanName(raw) {
  if (raw == null) return '';
  var s = String(raw);
  s = s.replace(/[\u00A0\t\r\n]+/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  s = s.replace(/^[\s,;.:\-_]+|[\s,;.:\-_]+$/g, '');
  var words = s.split(' ');
  words = words.map(function (w, idx) {
    if (!w) return w;
    var lower = w.toLowerCase();
    if (idx > 0 && LOWERCASE_PARTICLES.indexOf(lower) !== -1) return lower;
    return capitalizeWord(w);
  });
  words = words.map(function (w) {
    if (w.indexOf('-') === -1) return w;
    return w.split('-').map(capitalizeWord).join('-');
  });
  return words.join(' ');
}

var UMLAUT_MAP = { 'ä':'ae','ö':'oe','ü':'ue','Ä':'Ae','Ö':'Oe','Ü':'Ue','ß':'ss' };
function stripUmlauts(str) { return str.replace(/[äöüÄÖÜß]/g, function (c) { return UMLAUT_MAP[c] || c; }); }
function toAscii(str) { return stripUmlauts(str).normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
function normalizeForUsername(str) { return toAscii(str).toLowerCase().replace(/[^a-z]/g, ''); }

function randomBirthday() { return { y: pickInt(2006, 2019), m: pickInt(1, 12), d: pickInt(1, 28) }; }
function pad2(n) { return String(n).padStart(2, '0'); }
function birthdayToDisplay(b) { return pad2(b.d) + '.' + pad2(b.m) + '.' + b.y; }
function birthdayToDDMM(b) { return pad2(b.d) + pad2(b.m); }

var usedUsernames = {};
function makeUsername(firstName, lastName, birthday, year) {
  var f = normalizeForUsername(firstName).slice(0, 3) || 'aaa';
  var l = normalizeForUsername(lastName).slice(0, 3) || 'bbb';
  var base = (f + l).padEnd(6, 'x') + String(year % 100);
  var suffix = birthday ? birthdayToDDMM(birthday) : String(year % 100);
  var candidate = base + suffix;
  var counter = 0;
  while (usedUsernames[candidate]) { counter += 1; candidate = base + suffix + counter; }
  usedUsernames[candidate] = true;
  return candidate;
}
function makeAppleId(username) { return username + '@appleid.lra-greiz.de'; }

var usedPasswordsByClass = {};
var usedPasswordsByLevelYear = {};
var passwordCounter = 0;
function randomFrom(str) { return str.charAt(Math.floor(rng() * str.length)); }
function shuffle(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(rng() * (i + 1));
    var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}
function makeComplexPassword(length) {
  var chars = [randomFrom(UPPERS), randomFrom(LOWERS), randomFrom(DIGITS), randomFrom(SPECIAL_CHARS)];
  var pool = UPPERS + LOWERS + DIGITS + SPECIAL_CHARS;
  while (chars.length < length) chars.push(randomFrom(pool));
  return shuffle(chars).join('');
}
function makeGrundschulePassword(classNumber, schoolId, year) {
  var classKey = schoolId + '|' + classNumber + '|' + year;
  var levelKey = classNumber + '|' + year;
  var attempt = 0;
  while (attempt < 500) {
    attempt += 1;
    var p = pick(CHILDRENS_WORDS) + pick(CHILDRENS_WORDS);
    if (usedPasswordsByClass[classKey] && usedPasswordsByClass[classKey][p]) continue;
    if (usedPasswordsByLevelYear[levelKey] && usedPasswordsByLevelYear[levelKey][p]) continue;
    if (!usedPasswordsByClass[classKey]) usedPasswordsByClass[classKey] = {};
    if (!usedPasswordsByLevelYear[levelKey]) usedPasswordsByLevelYear[levelKey] = {};
    usedPasswordsByClass[classKey][p] = true;
    usedPasswordsByLevelYear[levelKey][p] = true;
    return p;
  }
  passwordCounter += 1;
  return makeComplexPassword(8);
}

function messyName(name) {
  var variants = [
    name, name, name,
    '  ' + name + '  ',
    name.toLowerCase(), name.toUpperCase(),
    name + '  ',
    name.replace(/ü/, 'ue').replace(/ö/, 'oe').replace(/ä/, 'ae').replace(/ß/, 'ss')
  ];
  return pick(variants);
}

/* ------------------------------------------------------------------
 * Dataset generation
 *
 * Students are distributed across the last ten intake years so the
 * table has variation in assignment_year and LKID prefix. Head
 * teachers, plain teachers, and sonstige get the current year.
 * ------------------------------------------------------------------ */

var MOCK_ROWS = (function () {
  var everyone = [];
  var lkidCounter = 0;
  var schoolIds = Object.keys(MOCK_SCHOOLS);
  var earliestYear = CURRENT_YEAR - 9;

  var classesBySchool = {};
  schoolIds.forEach(function (schoolId) {
    var school = MOCK_SCHOOLS[schoolId];
    var minClass = school.type === 'grundschule' ? 1 : 5;
    var maxClass = school.type === 'grundschule' ? 4
                 : school.type === 'regelschule' ? 10 : 12;
    var n = pickInt(2, 4);
    var chosen = [];
    for (var k = 0; k < n; k++) {
      var cn = pickInt(minClass, maxClass);
      var cl = pick(['a', 'b', 'c']);
      var key = cn + cl;
      if (chosen.indexOf(key) !== -1) { k--; continue; }
      chosen.push(key);
    }
    classesBySchool[schoolId] = chosen.map(function (key) {
      return {
        class_number: parseInt(key.slice(0, -1), 10),
        class_letter: key.slice(-1)
      };
    });
  });

  var headTeachers = [];
  schoolIds.forEach(function (schoolId) {
    classesBySchool[schoolId].forEach(function (cls) {
      headTeachers.push({
        kind: 'head_teacher',
        school_id: schoolId,
        class_number: cls.class_number,
        class_letter: cls.class_letter,
        first_name: normalizeGermanName(messyName(pick(FIRST_NAMES_GERMAN.concat(FIRST_NAMES_ME)))),
        last_name:  normalizeGermanName(messyName(pick(LAST_NAMES_GERMAN.concat(LAST_NAMES_ME)))),
        roles: ['lehrer'],
        birthday: randomBirthday(),
        assignment_year: CURRENT_YEAR
      });
    });
  });

  var studentCount = 1840;
  var students = [];
  var flatClasses = [];
  schoolIds.forEach(function (schoolId) {
    classesBySchool[schoolId].forEach(function (cls) {
      flatClasses.push({ school_id: schoolId, cls: cls });
    });
  });
  for (var s = 0; s < studentCount; s++) {
    var entry = flatClasses[s % flatClasses.length];
    var intakeYear = earliestYear + Math.floor(rng() * 10);
    students.push({
      kind: 'student',
      school_id: entry.school_id,
      class_number: entry.cls.class_number,
      class_letter: entry.cls.class_letter,
      first_name: normalizeGermanName(messyName(pick(FIRST_NAMES_GERMAN.concat(FIRST_NAMES_ME)))),
      last_name:  normalizeGermanName(messyName(pick(LAST_NAMES_GERMAN.concat(LAST_NAMES_ME)))),
      roles: ['schueler'],
      birthday: randomBirthday(),
      assignment_year: intakeYear
    });
  }

  var plainTeachers = [];
  var plainTeacherCount = 120;
  for (var t = 0; t < plainTeacherCount; t++) {
    plainTeachers.push({
      kind: 'plain_teacher',
      school_id: pick(schoolIds),
      class_number: null,
      class_letter: null,
      first_name: normalizeGermanName(messyName(pick(FIRST_NAMES_GERMAN.concat(FIRST_NAMES_ME)))),
      last_name:  normalizeGermanName(messyName(pick(LAST_NAMES_GERMAN.concat(LAST_NAMES_ME)))),
      roles: ['lehrer'],
      birthday: randomBirthday(),
      assignment_year: CURRENT_YEAR
    });
  }

  var sonstige = [];
  var sonstigeCount = 40;
  for (var z = 0; z < sonstigeCount; z++) {
    sonstige.push({
      kind: 'sonstige',
      school_id: pick(schoolIds),
      class_number: null,
      class_letter: null,
      first_name: normalizeGermanName(messyName(pick(FIRST_NAMES_GERMAN.concat(FIRST_NAMES_ME)))),
      last_name:  normalizeGermanName(messyName(pick(LAST_NAMES_GERMAN.concat(LAST_NAMES_ME)))),
      roles: ['sonstige'],
      birthday: randomBirthday(),
      assignment_year: CURRENT_YEAR
    });
  }

  everyone = headTeachers.concat(plainTeachers, students, sonstige);

  everyone.forEach(function (p) {
    var school = MOCK_SCHOOLS[p.school_id];
    var year = p.assignment_year;
    var autoFilled = [];

    p.birthday_display = birthdayToDisplay(p.birthday);
    autoFilled.push('Geburtsdatum');

    p.username = makeUsername(p.first_name, p.last_name, p.birthday, year);
    autoFilled.push('Benutzername');

    p.apple_id = makeAppleId(p.username);

    lkidCounter += 1;
    p.lkid = p.school_id + '-' + year + '-' + String(lkidCounter).padStart(5, '0');

    var isPrimary = p.roles.indexOf('schueler') !== -1
                 && school.type === 'grundschule'
                 && p.class_number != null && p.class_number <= 4;
    if (isPrimary) p.password = makeGrundschulePassword(p.class_number, p.school_id, year);
    else if (p.roles.indexOf('lehrer') !== -1) p.password = makeComplexPassword(10);
    else p.password = makeComplexPassword(8);
    p.password_generated = true;
    autoFilled.push('Passwort');

    var apps = [];
    if (p.roles.indexOf('schueler') !== -1) {
      apps.push('M365');
      if (maybe(0.5)) apps.push('Schulportal');
      if (maybe(0.3)) apps.push('Nextcloud');
      if (maybe(0.2)) apps.push('MDM');
    } else if (p.roles.indexOf('lehrer') !== -1) {
      apps.push('M365'); apps.push('Schulportal'); apps.push('MDM');
      if (maybe(0.6)) apps.push('Nextcloud');
    }
    p.applications = apps;
    if (apps.length) autoFilled.push('Anwendungen');

    var flags = [];
    if (p.roles.length) flags.push('can_login');
    if (maybe(0.08)) flags.push('needs_password_reset');
    if (p.roles.indexOf('sonstige') !== -1 && maybe(0.3)) flags.push('external');
    p.flags = flags;
    if (flags.length) autoFilled.push('Flags');

    p.autoFilled = autoFilled;
    p.teacher_of_class = null;
    p._kind = p.kind;
    delete p.kind;
  });

  headTeachers.forEach(function (ht) {
    var match = everyone.find(function (p) {
      return p._kind === 'head_teacher'
        && p.school_id === ht.school_id
        && p.class_number === ht.class_number
        && p.class_letter === ht.class_letter;
    });
    if (match) {
      match.teacher_of_class = { class_number: ht.class_number, class_letter: ht.class_letter };
    }
  });

  everyone.sort(function (a, b) {
    if (a.school_id !== b.school_id) return a.school_id < b.school_id ? -1 : 1;
    var ra = a.roles[0] || '';
    var rb = b.roles[0] || '';
    if (ra !== rb) return ra < rb ? -1 : 1;
    var ca = (a.class_number == null ? 999 : a.class_number) + (a.class_letter || '');
    var cb = (b.class_number == null ? 999 : b.class_number) + (b.class_letter || '');
    if (ca !== cb) return ca < cb ? -1 : 1;
    return (a.last_name || '').localeCompare(b.last_name || '');
  });

  return everyone;
})();
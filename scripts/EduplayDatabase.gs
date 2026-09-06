/**
 * ==============================================================================
 * 🎓 EDUPLAY - GOOGLE APPS SCRIPT CLOUD DATABASE & REST API ENGINE
 * Slogan: "Học vui – Chơi chất – Tương tác thật"
 * Architecture: EDUPLAY React Web <-> Apps Script API (/exec) <-> Google Sheets
 * Version: 3.0.0
 * Timezone: Asia/Ho_Chi_Minh
 * ==============================================================================
 */

// ==========================================
// 1. GLOBAL CONFIGURATION & SCHEMA REGISTRY
// ==========================================

const TIMEZONE = 'Asia/Ho_Chi_Minh';
const EDUPLAY_HEADER_BG = '#0f172a'; // Slate 900
const EDUPLAY_HEADER_TEXT = '#f8fafc'; // Slate 50
const EDUPLAY_HEADER_FONT_SIZE = 10;
const EDUPLAY_FONT_FAMILY = 'Arial';

// 16 Bảng dữ liệu chuẩn của hệ sinh thái EDUPLAY
const EDUPLAY_SCHEMAS = {
  SETTINGS: [
    'key', 'value', 'category', 'description', 'updatedAt'
  ],
  GAME_CATALOG: [
    'id', 'slug', 'name', 'description', 'category', 'minTeams', 'maxTeams',
    'supportsQuestions', 'supportsCamera', 'supportsScore', 'supportsCertificate',
    'enabled', 'featured', 'sortOrder', 'createdAt', 'updatedAt'
  ],
  CLASSES: [
    'id', 'classCode', 'className', 'grade', 'schoolYear', 'teacherName',
    'schoolName', 'subject', 'studentCount', 'enabled', 'createdAt', 'updatedAt'
  ],
  STUDENTS: [
    'id', 'classId', 'studentCode', 'fullName', 'displayName', 'groupName',
    'teamPreference', 'enabled', 'createdAt', 'updatedAt'
  ],
  QUESTION_BANKS: [
    'id', 'name', 'subject', 'grade', 'topic', 'description',
    'questionCount', 'enabled', 'createdAt', 'updatedAt'
  ],
  QUESTIONS: [
    'id', 'bankId', 'order', 'subject', 'grade', 'topic', 'questionType',
    'question', 'optionA', 'optionB', 'optionC', 'optionD', 'correctAnswer',
    'explanation', 'difficulty', 'normalPoints', 'stealPoints', 'specialPoints',
    'isSpecial', 'enabled', 'tags', 'createdAt', 'updatedAt'
  ],
  GAME_SESSIONS: [
    'id', 'sessionCode', 'gameId', 'gameSlug', 'activityName', 'classId',
    'className', 'teacherName', 'subject', 'grade', 'questionBankId',
    'status', 'currentRound', 'currentQuestion', 'totalQuestions',
    'startedAt', 'finishedAt', 'winnerTeamId', 'winnerName', 'createdAt', 'updatedAt'
  ],
  TEAMS: [
    'id', 'sessionId', 'teamCode', 'teamName', 'teamColor', 'score', 'rank',
    'raceWins', 'correctAnswers', 'wrongAnswers', 'stealWins', 'specialCorrect',
    'createdAt', 'updatedAt'
  ],
  PARTICIPANTS: [
    'id', 'sessionId', 'studentId', 'studentName', 'teamId', 'teamCode',
    'participationOrder', 'timesSelected', 'score', 'createdAt', 'updatedAt'
  ],
  SCORE_EVENTS: [
    'id', 'sessionId', 'gameSlug', 'roundNumber', 'questionId', 'teamId',
    'teamCode', 'studentId', 'eventType', 'points', 'eventKey', 'note', 'createdAt'
  ],
  GAME_RESULTS: [
    'id', 'sessionId', 'gameSlug', 'teamId', 'teamName', 'finalScore',
    'rank', 'correctAnswers', 'wrongAnswers', 'bonusPoints', 'winner',
    'statsJson', 'createdAt'
  ],
  CAM_RACE_RESULTS: [
    'id', 'sessionId', 'questionId', 'questionOrder', 'winnerTeam',
    'blueDetectedAt', 'orangeDetectedAt', 'timeDifferenceMs', 'isTie',
    'isFalseStart', 'detectionMethod', 'blueMarkerConfidence',
    'orangeMarkerConfidence', 'firstAnswerTeam', 'firstAnswer',
    'firstAnswerCorrect', 'stealTeam', 'stealAnswer', 'stealCorrect',
    'bluePoints', 'orangePoints', 'playedAt'
  ],
  LUCKY_WHEEL_HISTORY: [
    'id', 'sessionId', 'spinNumber', 'wheelType', 'selectedId',
    'selectedName', 'reward', 'points', 'createdAt'
  ],
  RANDOM_PICKER_HISTORY: [
    'id', 'sessionId', 'studentId', 'studentName', 'pickNumber',
    'excludedAfterPick', 'pickedAt'
  ],
  CERTIFICATES: [
    'id', 'sessionId', 'gameSlug', 'recipientType', 'recipientId',
    'recipientName', 'awardTitle', 'score', 'rank', 'teacherName',
    'className', 'schoolName', 'certificateCode', 'issuedAt'
  ],
  APP_LOGS: [
    'id', 'level', 'module', 'action', 'message', 'sessionId',
    'payload', 'createdAt'
  ]
};

// ==========================================
// 2. HTTP ENTRY POINTS: doGet & doPost
// ==========================================

/**
 * Handle GET requests (e.g. /exec?action=settings.get or /exec?action=questions.listByBank&bankId=xxx)
 */
function doGet(e) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};
    const action = params.action || 'settings.get';
    
    // Convert GET parameters into data payload
    const data = {};
    Object.keys(params).forEach(key => {
      if (key !== 'action') {
        data[key] = params[key];
      }
    });

    return handleApiRequest(action, data);
  } catch (err) {
    appendLog('ERROR', 'API', 'doGet', err.toString(), '', e);
    return errorResponse('SERVER_ERROR', err.toString());
  }
}

/**
 * Handle POST requests
 * Input format: { "action": "sessions.create", "data": { ... } }
 * Supports text/plain, application/json, and URL encoded payload
 */
function doPost(e) {
  try {
    let action = '';
    let data = {};

    if (e && e.postData && e.postData.contents) {
      try {
        const body = JSON.parse(e.postData.contents);
        action = body.action || '';
        data = body.data || {};
      } catch (parseErr) {
        // Fallback if sent as form payload
        if (e.parameter) {
          action = e.parameter.action || '';
          if (e.parameter.data) {
            try {
              data = JSON.parse(e.parameter.data);
            } catch (pErr) {
              data = e.parameter;
            }
          } else {
            data = e.parameter;
          }
        }
      }
    } else if (e && e.parameter) {
      action = e.parameter.action || '';
      data = e.parameter;
    }

    if (!action) {
      return errorResponse('INVALID_ACTION', 'Action is required in POST payload');
    }

    return handleApiRequest(action, data);
  } catch (err) {
    appendLog('ERROR', 'API', 'doPost', err.toString(), '', e ? e.postData : null);
    return errorResponse('SERVER_ERROR', err.toString());
  }
}

// ==========================================
// 3. API ROUTER & WHITELIST
// ==========================================

function handleApiRequest(action, data) {
  data = data || {};
  
  // Whitelist routing
  switch (action) {
    // 1. Settings
    case 'settings.get':
      return apiSettingsGet();

    // 2. Games Catalog
    case 'games.list':
      return apiGamesList(data);
    case 'games.get':
      return apiGamesGet(data);

    // 3. Classes
    case 'classes.list':
      return apiClassesList(data);
    case 'classes.get':
      return apiClassesGet(data);
    case 'classes.create':
      return apiClassesCreate(data);
    case 'classes.update':
      return apiClassesUpdate(data);
    case 'classes.delete':
      return apiClassesDelete(data);

    // 4. Students
    case 'students.list':
      return apiStudentsList(data);
    case 'students.listByClass':
      return apiStudentsListByClass(data);
    case 'students.get':
      return apiStudentsGet(data);
    case 'students.create':
      return apiStudentsCreate(data);
    case 'students.update':
      return apiStudentsUpdate(data);
    case 'students.delete':
      return apiStudentsDelete(data);

    // 5. Question Banks
    case 'questionBanks.list':
      return apiQuestionBanksList(data);
    case 'questionBanks.get':
      return apiQuestionBanksGet(data);
    case 'questionBanks.create':
      return apiQuestionBanksCreate(data);
    case 'questionBanks.update':
      return apiQuestionBanksUpdate(data);
    case 'questionBanks.delete':
      return apiQuestionBanksDelete(data);

    // 6. Questions
    case 'questions.list':
      return apiQuestionsList(data);
    case 'questions.listByBank':
      return apiQuestionsListByBank(data);
    case 'questions.get':
      return apiQuestionsGet(data);
    case 'questions.create':
      return apiQuestionsCreate(data);
    case 'questions.update':
      return apiQuestionsUpdate(data);
    case 'questions.delete':
      return apiQuestionsDelete(data);

    // 7. Sessions
    case 'sessions.create':
      return apiSessionsCreate(data);
    case 'sessions.get':
      return apiSessionsGet(data);
    case 'sessions.update':
      return apiSessionsUpdate(data);
    case 'sessions.finish':
      return apiSessionsFinish(data);
    case 'sessions.list':
      return apiSessionsList(data);
    case 'sessions.listByClass':
      return apiSessionsListByClass(data);

    // 8. Teams
    case 'teams.create':
      return apiTeamsCreate(data);
    case 'teams.listBySession':
      return apiTeamsListBySession(data);
    case 'teams.update':
      return apiTeamsUpdate(data);
    case 'teams.getScore':
      return apiTeamsGetScore(data);

    // 9. Participants
    case 'participants.add':
      return apiParticipantsAdd(data);
    case 'participants.listBySession':
      return apiParticipantsListBySession(data);
    case 'participants.assignTeam':
      return apiParticipantsAssignTeam(data);
    case 'participants.remove':
      return apiParticipantsRemove(data);

    // 10. Scores Engine
    case 'scores.addEvent':
      return apiScoresAddEvent(data);
    case 'scores.getBySession':
      return apiScoresGetBySession(data);
    case 'scores.listEvents':
      return apiScoresListEvents(data);

    // 11. CAM RACE
    case 'camRace.race.add':
      return apiCamRaceAdd(data);
    case 'camRace.answer.add':
      return apiCamRaceAnswerAdd(data);
    case 'camRace.result.completeQuestion':
      return apiCamRaceCompleteQuestion(data);
    case 'camRace.history.listBySession':
      return apiCamRaceHistoryList(data);

    // 12. QUIZ BATTLE
    case 'quiz.answer.add':
      return apiQuizAnswerAdd(data);

    // 13. FASTEST HAND
    case 'fastestHand.buzz':
      return apiFastestHandBuzz(data);
    case 'fastestHand.answer':
      return apiFastestHandAnswer(data);

    // 14. LUCKY WHEEL
    case 'luckyWheel.addSpin':
      return apiLuckyWheelAddSpin(data);
    case 'luckyWheel.listHistory':
      return apiLuckyWheelListHistory(data);

    // 15. RANDOM PICKER
    case 'randomPicker.addPick':
      return apiRandomPickerAddPick(data);
    case 'randomPicker.listHistory':
      return apiRandomPickerListHistory(data);
    case 'randomPicker.resetSession':
      return apiRandomPickerResetSession(data);

    // 16. TEAM CHALLENGE
    case 'teamChallenge.addScore':
      return apiTeamChallengeAddScore(data);
    case 'teamChallenge.getLeaderboard':
      return apiTeamChallengeGetLeaderboard(data);

    // 17. Game Results & Leaderboard
    case 'results.create':
      return apiResultsCreate(data);
    case 'results.listBySession':
      return apiResultsListBySession(data);
    case 'leaderboard.top3':
      return apiLeaderboardTop3(data);

    // 18. Certificates
    case 'certificates.create':
      return apiCertificatesCreate(data);
    case 'certificates.getBySession':
      return apiCertificatesGetBySession(data);

    default:
      return errorResponse('INVALID_ACTION', `Action "${action}" is not supported by EDUPLAY API.`);
  }
}

// ==========================================
// 4. RESPONSE HELPERS
// ==========================================

function successResponse(data, message) {
  const payload = {
    success: true,
    data: data !== undefined ? data : null,
    message: message || 'OK',
    timestamp: getCurrentTimestamp()
  };
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function errorResponse(code, message) {
  const payload = {
    success: false,
    error: code || 'UNKNOWN_ERROR',
    message: message || 'An error occurred',
    timestamp: getCurrentTimestamp()
  };
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// 5. DATABASE HELPERS (REUSABLE DATA ACCESS)
// ==========================================

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(name);
  if (!sheet) {
    throw new Error(`Sheet "${name}" does not exist. Please run setupDatabase() first.`);
  }
  return sheet;
}

function getHeaders(sheet) {
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) return [];
  return sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());
}

function rowToObject(headers, row) {
  const obj = {};
  headers.forEach((header, idx) => {
    if (header) {
      let val = row[idx];
      // Convert Date object to ISO string
      if (val instanceof Date) {
        val = Utilities.formatDate(val, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
      }
      obj[header] = val !== undefined ? val : null;
    }
  });
  return obj;
}

function objectToRow(headers, object) {
  return headers.map(header => {
    const val = object[header];
    if (val === undefined || val === null) return '';
    if (typeof val === 'boolean') return val;
    if (typeof val === 'object') return JSON.stringify(val);
    return val;
  });
}

function findRowById(sheet, id) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return null;
  const headers = getHeaders(sheet);
  const idColIndex = headers.indexOf('id') + 1;
  if (idColIndex === 0) return null;

  const idValues = sheet.getRange(2, idColIndex, lastRow - 1, 1).getValues();
  for (let i = 0; i < idValues.length; i++) {
    if (String(idValues[i][0]) === String(id)) {
      const rowIndex = i + 2;
      const rowData = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
      return {
        rowIndex: rowIndex,
        data: rowToObject(headers, rowData)
      };
    }
  }
  return null;
}

function findRowsByField(sheet, field, value) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  const headers = getHeaders(sheet);
  const colIndex = headers.indexOf(field) + 1;
  if (colIndex === 0) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  const results = [];
  const compareStr = String(value);

  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    if (String(row[colIndex - 1]) === compareStr) {
      results.push(rowToObject(headers, row));
    }
  }
  return results;
}

function appendObject(sheet, object) {
  const headers = getHeaders(sheet);
  const rowData = objectToRow(headers, object);
  sheet.appendRow(rowData);
  return object;
}

function updateObjectById(sheet, id, updates) {
  const found = findRowById(sheet, id);
  if (!found) return null;

  const headers = getHeaders(sheet);
  const updatedObject = Object.assign({}, found.data, updates);
  // Do NOT allow client to modify 'id'
  updatedObject.id = id;
  if (headers.includes('updatedAt') && !updates.updatedAt) {
    updatedObject.updatedAt = getCurrentTimestamp();
  }

  const rowData = objectToRow(headers, updatedObject);
  sheet.getRange(found.rowIndex, 1, 1, headers.length).setValues([rowData]);
  return updatedObject;
}

function deleteObjectById(sheet, id) {
  const found = findRowById(sheet, id);
  if (!found) return false;
  sheet.deleteRow(found.rowIndex);
  return true;
}

function generateId(prefix) {
  const cleanPrefix = prefix ? (prefix.endsWith('_') ? prefix : prefix + '_') : '';
  return cleanPrefix + Utilities.getUuid().replace(/-/g, '').substring(0, 16);
}

function generateSessionCode() {
  const randNum = Math.floor(1000 + Math.random() * 9000);
  return `EDU-${randNum}`;
}

function generateCertificateCode() {
  const randHex = Math.random().toString(36).substring(2, 6).toUpperCase();
  const year = new Date().getFullYear();
  return `EDUPLAY-${year}-${randHex}`;
}

function getCurrentTimestamp() {
  return Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function appendLog(level, module, action, message, sessionId, payload) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('APP_LOGS');
    if (!sheet) return;

    const row = [
      generateId('log'),
      level || 'INFO',
      module || 'GENERAL',
      action || '',
      message || '',
      sessionId || '',
      typeof payload === 'object' ? JSON.stringify(payload) : (payload || ''),
      getCurrentTimestamp()
    ];
    sheet.appendRow(row);
  } catch (err) {
    Logger.log('Error logging: ' + err.toString());
  }
}

// ==========================================
// 6. VALIDATION & SANITIZATION HELPERS
// ==========================================

function requireFields(data, fields) {
  const missing = [];
  fields.forEach(f => {
    if (data[f] === undefined || data[f] === null || data[f] === '') {
      missing.push(f);
    }
  });
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
}

function sanitizeString(val) {
  if (typeof val !== 'string') return val;
  return val.trim();
}

function validateGameSlug(slug) {
  const validSlugs = ['cam-race', 'quiz-battle', 'lucky-wheel', 'fastest-hand', 'random-picker', 'team-challenge'];
  if (!validSlugs.includes(slug)) {
    throw new Error(`Invalid game slug: "${slug}". Must be one of: ${validSlugs.join(', ')}`);
  }
  return true;
}

// ==========================================
// 7. SETTINGS API
// ==========================================

function apiSettingsGet() {
  const sheet = getSheet('SETTINGS');
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return successResponse({}, 'Settings empty');
  }

  const values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  const settings = {};
  values.forEach(row => {
    const key = String(row[0]).trim();
    let val = row[1];
    if (val === 'TRUE' || val === true) val = true;
    else if (val === 'FALSE' || val === false) val = false;
    else if (!isNaN(Number(val)) && val !== '') val = Number(val);
    if (key) settings[key] = val;
  });

  return successResponse(settings, 'Settings loaded successfully');
}

// ==========================================
// 8. GAME CATALOG API
// ==========================================

function apiGamesList(data) {
  const sheet = getSheet('GAME_CATALOG');
  const headers = getHeaders(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return successResponse([], 'No games');

  const rows = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  const games = rows
    .map(r => rowToObject(headers, r))
    .filter(g => g.enabled === true || g.enabled === 'TRUE' || String(g.enabled).toLowerCase() === 'true')
    .sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0));

  return successResponse(games, 'Games loaded');
}

function apiGamesGet(data) {
  requireFields(data, ['slug']);
  const sheet = getSheet('GAME_CATALOG');
  const rows = findRowsByField(sheet, 'slug', data.slug);
  if (rows.length === 0) {
    return errorResponse('GAME_NOT_FOUND', `Game with slug "${data.slug}" not found`);
  }
  return successResponse(rows[0], 'Game loaded');
}

// ==========================================
// 9. CLASSES CRUD API
// ==========================================

function apiClassesList(data) {
  const sheet = getSheet('CLASSES');
  const headers = getHeaders(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return successResponse([], 'No classes');

  const rows = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  const classes = rows
    .map(r => rowToObject(headers, r))
    .filter(c => c.enabled !== false && String(c.enabled).toLowerCase() !== 'false');

  return successResponse(classes, 'Classes loaded');
}

function apiClassesGet(data) {
  requireFields(data, ['id']);
  const sheet = getSheet('CLASSES');
  const found = findRowById(sheet, data.id);
  if (!found) return errorResponse('CLASS_NOT_FOUND', `Class id ${data.id} not found`);
  return successResponse(found.data, 'Class loaded');
}

function apiClassesCreate(data) {
  requireFields(data, ['className', 'grade']);
  const sheet = getSheet('CLASSES');

  const newClass = {
    id: generateId('class'),
    classCode: data.classCode || sanitizeString(data.className),
    className: sanitizeString(data.className),
    grade: Number(data.grade) || 5,
    schoolYear: data.schoolYear || '2025-2026',
    teacherName: data.teacherName || 'Giáo viên',
    schoolName: data.schoolName || 'Trường Tiểu học EDUPLAY',
    subject: data.subject || 'Tin học',
    studentCount: Number(data.studentCount) || 0,
    enabled: data.enabled !== undefined ? data.enabled : true,
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp()
  };

  appendObject(sheet, newClass);
  appendLog('INFO', 'CLASSES', 'CREATE', `Created class ${newClass.className}`, '', newClass);
  return successResponse(newClass, 'Class created successfully');
}

function apiClassesUpdate(data) {
  requireFields(data, ['id']);
  const sheet = getSheet('CLASSES');
  const updated = updateObjectById(sheet, data.id, data);
  if (!updated) return errorResponse('CLASS_NOT_FOUND', `Class id ${data.id} not found`);
  return successResponse(updated, 'Class updated successfully');
}

function apiClassesDelete(data) {
  requireFields(data, ['id']);
  const sheet = getSheet('CLASSES');
  const success = deleteObjectById(sheet, data.id);
  if (!success) return errorResponse('CLASS_NOT_FOUND', `Class id ${data.id} not found`);
  return successResponse({ deletedId: data.id }, 'Class deleted successfully');
}

// ==========================================
// 10. STUDENTS CRUD API
// ==========================================

function apiStudentsList(data) {
  const sheet = getSheet('STUDENTS');
  const headers = getHeaders(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return successResponse([], 'No students');

  const rows = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  const students = rows.map(r => rowToObject(headers, r));
  return successResponse(students, 'Students loaded');
}

function apiStudentsListByClass(data) {
  requireFields(data, ['classId']);
  const sheet = getSheet('STUDENTS');
  const students = findRowsByField(sheet, 'classId', data.classId)
    .filter(s => s.enabled !== false && String(s.enabled).toLowerCase() !== 'false');
  return successResponse(students, `Loaded ${students.length} students for class ${data.classId}`);
}

function apiStudentsGet(data) {
  requireFields(data, ['id']);
  const sheet = getSheet('STUDENTS');
  const found = findRowById(sheet, data.id);
  if (!found) return errorResponse('STUDENT_NOT_FOUND', `Student id ${data.id} not found`);
  return successResponse(found.data, 'Student loaded');
}

function apiStudentsCreate(data) {
  requireFields(data, ['classId', 'fullName']);
  const sheet = getSheet('STUDENTS');

  const newStudent = {
    id: generateId('st'),
    classId: data.classId,
    studentCode: data.studentCode || `HS_${Date.now().toString().substring(8)}`,
    fullName: sanitizeString(data.fullName),
    displayName: sanitizeString(data.displayName || data.fullName),
    groupName: data.groupName || 'Tổ 1',
    teamPreference: data.teamPreference || 'BLUE',
    enabled: data.enabled !== undefined ? data.enabled : true,
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp()
  };

  appendObject(sheet, newStudent);
  return successResponse(newStudent, 'Student created successfully');
}

function apiStudentsUpdate(data) {
  requireFields(data, ['id']);
  const sheet = getSheet('STUDENTS');
  const updated = updateObjectById(sheet, data.id, data);
  if (!updated) return errorResponse('STUDENT_NOT_FOUND', `Student id ${data.id} not found`);
  return successResponse(updated, 'Student updated successfully');
}

function apiStudentsDelete(data) {
  requireFields(data, ['id']);
  const sheet = getSheet('STUDENTS');
  const success = deleteObjectById(sheet, data.id);
  if (!success) return errorResponse('STUDENT_NOT_FOUND', `Student id ${data.id} not found`);
  return successResponse({ deletedId: data.id }, 'Student deleted successfully');
}

// ==========================================
// 11. QUESTION BANKS CRUD API
// ==========================================

function apiQuestionBanksList(data) {
  const sheet = getSheet('QUESTION_BANKS');
  const headers = getHeaders(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return successResponse([], 'No question banks');

  const rows = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  const banks = rows.map(r => rowToObject(headers, r));
  return successResponse(banks, 'Question banks loaded');
}

function apiQuestionBanksGet(data) {
  requireFields(data, ['id']);
  const sheet = getSheet('QUESTION_BANKS');
  const found = findRowById(sheet, data.id);
  if (!found) return errorResponse('BANK_NOT_FOUND', `Bank id ${data.id} not found`);
  return successResponse(found.data, 'Question bank loaded');
}

function apiQuestionBanksCreate(data) {
  requireFields(data, ['name', 'subject']);
  const sheet = getSheet('QUESTION_BANKS');

  const newBank = {
    id: generateId('bank'),
    name: sanitizeString(data.name),
    subject: sanitizeString(data.subject),
    grade: Number(data.grade) || 5,
    topic: data.topic || '',
    description: data.description || '',
    questionCount: Number(data.questionCount) || 0,
    enabled: data.enabled !== undefined ? data.enabled : true,
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp()
  };

  appendObject(sheet, newBank);
  return successResponse(newBank, 'Question bank created');
}

function apiQuestionBanksUpdate(data) {
  requireFields(data, ['id']);
  const sheet = getSheet('QUESTION_BANKS');
  const updated = updateObjectById(sheet, data.id, data);
  if (!updated) return errorResponse('BANK_NOT_FOUND', `Bank id ${data.id} not found`);
  return successResponse(updated, 'Question bank updated');
}

function apiQuestionBanksDelete(data) {
  requireFields(data, ['id']);
  const sheet = getSheet('QUESTION_BANKS');
  const success = deleteObjectById(sheet, data.id);
  if (!success) return errorResponse('BANK_NOT_FOUND', `Bank id ${data.id} not found`);
  return successResponse({ deletedId: data.id }, 'Question bank deleted');
}

// ==========================================
// 12. QUESTIONS CRUD API
// ==========================================

function formatQuestionOutput(q) {
  // Convert 0, 1, 2, 3 or A, B, C, D to standard letter
  let ansLetter = 'A';
  if (q.correctAnswer === 0 || q.correctAnswer === '0' || q.correctAnswer === 'A') ansLetter = 'A';
  else if (q.correctAnswer === 1 || q.correctAnswer === '1' || q.correctAnswer === 'B') ansLetter = 'B';
  else if (q.correctAnswer === 2 || q.correctAnswer === '2' || q.correctAnswer === 'C') ansLetter = 'C';
  else if (q.correctAnswer === 3 || q.correctAnswer === '3' || q.correctAnswer === 'D') ansLetter = 'D';

  return {
    id: q.id,
    bankId: q.bankId,
    order: Number(q.order) || 1,
    questionType: q.questionType || 'multiple_choice',
    question: q.question,
    options: {
      A: q.optionA,
      B: q.optionB,
      C: q.optionC,
      D: q.optionD
    },
    // Array format for easy client UI binding
    optionsList: [q.optionA, q.optionB, q.optionC, q.optionD],
    correctAnswer: ansLetter,
    correctAnswerIndex: ansLetter === 'A' ? 0 : (ansLetter === 'B' ? 1 : (ansLetter === 'C' ? 2 : 3)),
    explanation: q.explanation || '',
    difficulty: q.difficulty || 'MEDIUM',
    normalPoints: Number(q.normalPoints) || 10,
    stealPoints: Number(q.stealPoints) || 5,
    specialPoints: Number(q.specialPoints) || 20,
    isSpecial: q.isSpecial === true || q.isSpecial === 'TRUE' || String(q.isSpecial).toLowerCase() === 'true',
    tags: q.tags || ''
  };
}

function apiQuestionsList(data) {
  const sheet = getSheet('QUESTIONS');
  const headers = getHeaders(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return successResponse([], 'No questions');

  const rows = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  const questions = rows
    .map(r => rowToObject(headers, r))
    .filter(q => q.enabled !== false && String(q.enabled).toLowerCase() !== 'false')
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
    .map(formatQuestionOutput);

  return successResponse(questions, 'Questions loaded');
}

function apiQuestionsListByBank(data) {
  requireFields(data, ['bankId']);
  const sheet = getSheet('QUESTIONS');
  const rows = findRowsByField(sheet, 'bankId', data.bankId)
    .filter(q => q.enabled !== false && String(q.enabled).toLowerCase() !== 'false')
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
    .map(formatQuestionOutput);

  return successResponse(rows, `Loaded ${rows.length} questions for bank ${data.bankId}`);
}

function apiQuestionsGet(data) {
  requireFields(data, ['id']);
  const sheet = getSheet('QUESTIONS');
  const found = findRowById(sheet, data.id);
  if (!found) return errorResponse('QUESTION_NOT_FOUND', `Question id ${data.id} not found`);
  return successResponse(formatQuestionOutput(found.data), 'Question loaded');
}

function apiQuestionsCreate(data) {
  requireFields(data, ['bankId', 'question', 'optionA', 'optionB', 'correctAnswer']);
  const sheet = getSheet('QUESTIONS');

  const newQuestion = {
    id: generateId('q'),
    bankId: data.bankId,
    order: Number(data.order) || 1,
    subject: data.subject || 'Tin học',
    grade: Number(data.grade) || 5,
    topic: data.topic || 'Kiến thức',
    questionType: data.questionType || 'multiple_choice',
    question: sanitizeString(data.question),
    optionA: sanitizeString(data.optionA),
    optionB: sanitizeString(data.optionB),
    optionC: sanitizeString(data.optionC || ''),
    optionD: sanitizeString(data.optionD || ''),
    correctAnswer: data.correctAnswer,
    explanation: data.explanation || '',
    difficulty: data.difficulty || 'MEDIUM',
    normalPoints: Number(data.normalPoints) || 10,
    stealPoints: Number(data.stealPoints) || 5,
    specialPoints: Number(data.specialPoints) || 20,
    isSpecial: data.isSpecial !== undefined ? data.isSpecial : false,
    enabled: data.enabled !== undefined ? data.enabled : true,
    tags: data.tags || '',
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp()
  };

  appendObject(sheet, newQuestion);
  return successResponse(formatQuestionOutput(newQuestion), 'Question created');
}

function apiQuestionsUpdate(data) {
  requireFields(data, ['id']);
  const sheet = getSheet('QUESTIONS');
  const updated = updateObjectById(sheet, data.id, data);
  if (!updated) return errorResponse('QUESTION_NOT_FOUND', `Question id ${data.id} not found`);
  return successResponse(formatQuestionOutput(updated), 'Question updated');
}

function apiQuestionsDelete(data) {
  requireFields(data, ['id']);
  const sheet = getSheet('QUESTIONS');
  const success = deleteObjectById(sheet, data.id);
  if (!success) return errorResponse('QUESTION_NOT_FOUND', `Question id ${data.id} not found`);
  return successResponse({ deletedId: data.id }, 'Question deleted');
}

// ==========================================
// 13. GAME SESSIONS API
// ==========================================

function apiSessionsCreate(data) {
  requireFields(data, ['gameSlug']);
  validateGameSlug(data.gameSlug);

  const sheet = getSheet('GAME_SESSIONS');
  const sessionId = generateId('ses');
  const sessionCode = generateSessionCode();

  const newSession = {
    id: sessionId,
    sessionCode: sessionCode,
    gameId: data.gameId || `game_${data.gameSlug}`,
    gameSlug: data.gameSlug,
    activityName: data.activityName || 'Tiết học EDUPLAY',
    classId: data.classId || 'class_5a_demo',
    className: data.className || 'Lớp 5A',
    teacherName: data.teacherName || 'Thầy/Cô Giáo',
    subject: data.subject || 'Tin học',
    grade: data.grade || 5,
    questionBankId: data.questionBankId || 'bank_tinhoc5_demo',
    status: data.status || 'PLAYING',
    currentRound: 1,
    currentQuestion: 1,
    totalQuestions: Number(data.totalQuestions) || 15,
    startedAt: getCurrentTimestamp(),
    finishedAt: '',
    winnerTeamId: '',
    winnerName: '',
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp()
  };

  appendObject(sheet, newSession);
  appendLog('INFO', 'SESSION', 'SESSION_CREATED', `Session ${sessionCode} created for ${data.gameSlug}`, sessionId, newSession);

  // If Cam Race, automatically create default BLUE & ORANGE teams
  if (data.gameSlug === 'cam-race') {
    const teamSheet = getSheet('TEAMS');
    const blueTeam = {
      id: generateId('tm'),
      sessionId: sessionId,
      teamCode: 'BLUE',
      teamName: data.blueTeamName || 'BLUE TECH',
      teamColor: '#2563eb',
      score: 0,
      rank: 1,
      raceWins: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      stealWins: 0,
      specialCorrect: 0,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    };
    const orangeTeam = {
      id: generateId('tm'),
      sessionId: sessionId,
      teamCode: 'ORANGE',
      teamName: data.orangeTeamName || 'ORANGE FIRE',
      teamColor: '#ea580c',
      score: 0,
      rank: 1,
      raceWins: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      stealWins: 0,
      specialCorrect: 0,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    };
    appendObject(teamSheet, blueTeam);
    appendObject(teamSheet, orangeTeam);
  }

  return successResponse(newSession, 'Game session created successfully');
}

function apiSessionsGet(data) {
  requireFields(data, ['id']);
  const sheet = getSheet('GAME_SESSIONS');
  const found = findRowById(sheet, data.id);
  if (!found) return errorResponse('SESSION_NOT_FOUND', `Session ${data.id} not found`);

  // Load associated teams
  const teamSheet = getSheet('TEAMS');
  const teams = findRowsByField(teamSheet, 'sessionId', data.id);

  const res = Object.assign({}, found.data, { teams: teams });
  return successResponse(res, 'Session loaded');
}

function apiSessionsUpdate(data) {
  requireFields(data, ['id']);
  const sheet = getSheet('GAME_SESSIONS');
  const updated = updateObjectById(sheet, data.id, data);
  if (!updated) return errorResponse('SESSION_NOT_FOUND', `Session ${data.id} not found`);
  return successResponse(updated, 'Session updated');
}

function apiSessionsList(data) {
  const sheet = getSheet('GAME_SESSIONS');
  const headers = getHeaders(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return successResponse([], 'No sessions');

  const rows = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  const sessions = rows
    .map(r => rowToObject(headers, r))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 50); // limit 50 recent

  return successResponse(sessions, 'Sessions loaded');
}

function apiSessionsListByClass(data) {
  requireFields(data, ['classId']);
  const sheet = getSheet('GAME_SESSIONS');
  const sessions = findRowsByField(sheet, 'classId', data.classId);
  return successResponse(sessions, `Loaded ${sessions.length} sessions for class`);
}

/**
 * Finish a session with concurrency lock, score tallying, and game results generation
 */
function apiSessionsFinish(data) {
  requireFields(data, ['id']);
  const sessionId = data.id;

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000); // 15 seconds lock

    const sessionSheet = getSheet('GAME_SESSIONS');
    const sessionRow = findRowById(sessionSheet, sessionId);
    if (!sessionRow) return errorResponse('SESSION_NOT_FOUND', 'Session not found');

    // 1. Get teams and sort by score
    const teamSheet = getSheet('TEAMS');
    const teams = findRowsByField(teamSheet, 'sessionId', sessionId);

    teams.sort((a, b) => {
      const scoreDiff = (Number(b.score) || 0) - (Number(a.score) || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return (Number(b.correctAnswers) || 0) - (Number(a.correctAnswers) || 0);
    });

    // 2. Rank teams & update results
    const resultsSheet = getSheet('GAME_RESULTS');
    const resultsCreated = [];

    teams.forEach((t, idx) => {
      const rank = idx + 1;
      const isWinner = rank === 1;

      // Update team rank
      updateObjectById(teamSheet, t.id, { rank: rank });

      // Create GAME_RESULTS record
      const resultObj = {
        id: generateId('res'),
        sessionId: sessionId,
        gameSlug: sessionRow.data.gameSlug,
        teamId: t.id,
        teamName: t.teamName,
        finalScore: Number(t.score) || 0,
        rank: rank,
        correctAnswers: Number(t.correctAnswers) || 0,
        wrongAnswers: Number(t.wrongAnswers) || 0,
        bonusPoints: 0,
        winner: isWinner,
        statsJson: JSON.stringify({
          raceWins: t.raceWins || 0,
          stealWins: t.stealWins || 0,
          specialCorrect: t.specialCorrect || 0
        }),
        createdAt: getCurrentTimestamp()
      };
      appendObject(resultsSheet, resultObj);
      resultsCreated.push(resultObj);
    });

    const winner = teams.length > 0 ? teams[0] : null;

    // 3. Mark session FINISHED
    const updatedSession = updateObjectById(sessionSheet, sessionId, {
      status: 'FINISHED',
      finishedAt: getCurrentTimestamp(),
      winnerTeamId: winner ? winner.id : '',
      winnerName: winner ? winner.teamName : ''
    });

    appendLog('INFO', 'SESSION', 'SESSION_FINISHED', `Session ${sessionId} completed. Winner: ${winner ? winner.teamName : 'None'}`, sessionId, {
      winner: winner,
      scores: teams.map(t => ({ team: t.teamName, score: t.score }))
    });

    return successResponse({
      session: updatedSession,
      winner: winner,
      teams: teams,
      results: resultsCreated
    }, 'Session finished successfully');

  } catch (lockErr) {
    return errorResponse('LOCK_TIMEOUT', 'Server busy finalizing session. Please retry: ' + lockErr.toString());
  } finally {
    lock.releaseLock();
  }
}

// ==========================================
// 14. TEAMS API
// ==========================================

function apiTeamsCreate(data) {
  requireFields(data, ['sessionId', 'teamCode', 'teamName']);
  const sheet = getSheet('TEAMS');

  const newTeam = {
    id: generateId('tm'),
    sessionId: data.sessionId,
    teamCode: data.teamCode.toUpperCase(),
    teamName: sanitizeString(data.teamName),
    teamColor: data.teamColor || '#3b82f6',
    score: Number(data.score) || 0,
    rank: 1,
    raceWins: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    stealWins: 0,
    specialCorrect: 0,
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp()
  };

  appendObject(sheet, newTeam);
  return successResponse(newTeam, 'Team created');
}

function apiTeamsListBySession(data) {
  requireFields(data, ['sessionId']);
  const sheet = getSheet('TEAMS');
  const teams = findRowsByField(sheet, 'sessionId', data.sessionId)
    .sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
  return successResponse(teams, 'Teams loaded');
}

function apiTeamsUpdate(data) {
  requireFields(data, ['id']);
  const sheet = getSheet('TEAMS');
  const updated = updateObjectById(sheet, data.id, data);
  if (!updated) return errorResponse('TEAM_NOT_FOUND', `Team id ${data.id} not found`);
  return successResponse(updated, 'Team updated');
}

function apiTeamsGetScore(data) {
  requireFields(data, ['sessionId']);
  const sheet = getSheet('TEAMS');
  const teams = findRowsByField(sheet, 'sessionId', data.sessionId);
  const scoreMap = {};
  teams.forEach(t => {
    scoreMap[t.teamCode] = Number(t.score) || 0;
  });
  return successResponse(scoreMap, 'Scores retrieved');
}

// ==========================================
// 15. PARTICIPANTS API
// ==========================================

function apiParticipantsAdd(data) {
  requireFields(data, ['sessionId', 'studentId', 'studentName']);
  const sheet = getSheet('PARTICIPANTS');

  const newPart = {
    id: generateId('part'),
    sessionId: data.sessionId,
    studentId: data.studentId,
    studentName: sanitizeString(data.studentName),
    teamId: data.teamId || '',
    teamCode: data.teamCode || '',
    participationOrder: Number(data.participationOrder) || 1,
    timesSelected: 0,
    score: 0,
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp()
  };

  appendObject(sheet, newPart);
  return successResponse(newPart, 'Participant added');
}

function apiParticipantsListBySession(data) {
  requireFields(data, ['sessionId']);
  const sheet = getSheet('PARTICIPANTS');
  const participants = findRowsByField(sheet, 'sessionId', data.sessionId);
  return successResponse(participants, 'Participants loaded');
}

function apiParticipantsAssignTeam(data) {
  requireFields(data, ['id', 'teamId', 'teamCode']);
  const sheet = getSheet('PARTICIPANTS');
  const updated = updateObjectById(sheet, data.id, {
    teamId: data.teamId,
    teamCode: data.teamCode
  });
  if (!updated) return errorResponse('PARTICIPANT_NOT_FOUND', 'Participant not found');
  return successResponse(updated, 'Participant assigned to team');
}

function apiParticipantsRemove(data) {
  requireFields(data, ['id']);
  const sheet = getSheet('PARTICIPANTS');
  const success = deleteObjectById(sheet, data.id);
  if (!success) return errorResponse('PARTICIPANT_NOT_FOUND', 'Participant not found');
  return successResponse({ deletedId: data.id }, 'Participant removed');
}

// ==========================================
// 16. SHARED SCORE ENGINE & EVENT DEDUPLICATION
// ==========================================

/**
 * Server-side score calculator rule engine
 */
function calculateScore(gameSlug, eventType, question, customPoints) {
  const isSpecial = question ? (question.isSpecial === true || String(question.isSpecial).toLowerCase() === 'true') : false;
  const normalPoints = question ? (Number(question.normalPoints) || 10) : 10;
  const specialPoints = question ? (Number(question.specialPoints) || 20) : 20;
  const stealPoints = question ? (Number(question.stealPoints) || 5) : 5;

  switch (eventType) {
    case 'CORRECT':
    case 'RACE_CORRECT':
      return isSpecial ? specialPoints : normalPoints;
    case 'SPECIAL_CORRECT':
      return specialPoints;
    case 'STEAL_CORRECT':
      return stealPoints;
    case 'WRONG':
    case 'RACE_WRONG':
    case 'STEAL_WRONG':
      return 0;
    case 'BONUS':
    case 'WHEEL_REWARD':
      return Number(customPoints) || 10;
    case 'PENALTY':
      return -Math.abs(Number(customPoints) || 5);
    case 'MANUAL_ADJUSTMENT':
      return Number(customPoints) || 0;
    default:
      return Number(customPoints) || 0;
  }
}

/**
 * Generic Score Event with LockService and Deduplication
 */
function apiScoresAddEvent(data) {
  requireFields(data, ['sessionId', 'gameSlug', 'teamCode', 'eventType']);

  const eventKey = data.eventKey || `${data.sessionId}_${data.questionId || 'rnd'}_${data.teamCode}_${data.eventType}`;
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000); // 10 seconds lock

    const scoreSheet = getSheet('SCORE_EVENTS');

    // Anti-duplicate check using eventKey
    const existingEvents = findRowsByField(scoreSheet, 'eventKey', eventKey);
    if (existingEvents.length > 0) {
      return errorResponse('DUPLICATE_SCORE_EVENT', 'Sự kiện điểm đã được ghi nhận trước đó.');
    }

    // Determine points
    let points = 0;
    if (data.questionId) {
      const qSheet = getSheet('QUESTIONS');
      const qRow = findRowById(qSheet, data.questionId);
      points = calculateScore(data.gameSlug, data.eventType, qRow ? qRow.data : null, data.points);
    } else {
      points = calculateScore(data.gameSlug, data.eventType, null, data.points);
    }

    // 1. Record score event
    const eventObj = {
      id: generateId('evt'),
      sessionId: data.sessionId,
      gameSlug: data.gameSlug,
      roundNumber: Number(data.roundNumber) || 1,
      questionId: data.questionId || '',
      teamId: data.teamId || '',
      teamCode: data.teamCode,
      studentId: data.studentId || '',
      eventType: data.eventType,
      points: points,
      eventKey: eventKey,
      note: data.note || '',
      createdAt: getCurrentTimestamp()
    };
    appendObject(scoreSheet, eventObj);

    // 2. Update TEAMS table atomically
    const teamSheet = getSheet('TEAMS');
    const teams = findRowsByField(teamSheet, 'sessionId', data.sessionId);
    const targetTeam = teams.find(t => t.teamCode === data.teamCode);

    let updatedTeam = null;
    if (targetTeam) {
      const updates = {
        score: (Number(targetTeam.score) || 0) + points
      };

      if (data.eventType === 'RACE_CORRECT' || data.eventType === 'CORRECT') {
        updates.correctAnswers = (Number(targetTeam.correctAnswers) || 0) + 1;
        if (data.eventType === 'RACE_CORRECT') {
          updates.raceWins = (Number(targetTeam.raceWins) || 0) + 1;
        }
      } else if (data.eventType === 'RACE_WRONG' || data.eventType === 'WRONG') {
        updates.wrongAnswers = (Number(targetTeam.wrongAnswers) || 0) + 1;
      } else if (data.eventType === 'STEAL_CORRECT') {
        updates.stealWins = (Number(targetTeam.stealWins) || 0) + 1;
        updates.correctAnswers = (Number(targetTeam.correctAnswers) || 0) + 1;
      } else if (data.eventType === 'SPECIAL_CORRECT') {
        updates.specialCorrect = (Number(targetTeam.specialCorrect) || 0) + 1;
        updates.correctAnswers = (Number(targetTeam.correctAnswers) || 0) + 1;
      }

      updatedTeam = updateObjectById(teamSheet, targetTeam.id, updates);
    }

    appendLog('INFO', 'SCORE', 'SCORE_ADDED', `+${points} pts to ${data.teamCode} (${data.eventType})`, data.sessionId, eventObj);

    return successResponse({
      event: eventObj,
      team: updatedTeam,
      pointsAwarded: points
    }, 'Score recorded');

  } catch (err) {
    return errorResponse('SCORE_LOCK_ERROR', err.toString());
  } finally {
    lock.releaseLock();
  }
}

function apiScoresGetBySession(data) {
  requireFields(data, ['sessionId']);
  const sheet = getSheet('SCORE_EVENTS');
  const events = findRowsByField(sheet, 'sessionId', data.sessionId);
  return successResponse(events, 'Session scores loaded');
}

function apiScoresListEvents(data) {
  requireFields(data, ['sessionId']);
  return apiScoresGetBySession(data);
}

// ==========================================
// 17. CAM RACE SPECIALIZED API
// (Logic & Time diff only - NO webcam images, NO biometric)
// ==========================================

function apiCamRaceAdd(data) {
  requireFields(data, ['sessionId', 'questionId', 'winnerTeam']);
  const sheet = getSheet('CAM_RACE_RESULTS');

  const raceResult = {
    id: generateId('cam'),
    sessionId: data.sessionId,
    questionId: data.questionId,
    questionOrder: Number(data.questionOrder) || 1,
    winnerTeam: data.winnerTeam.toUpperCase(),
    blueDetectedAt: data.blueDetectedAt !== undefined ? data.blueDetectedAt : null,
    orangeDetectedAt: data.orangeDetectedAt !== undefined ? data.orangeDetectedAt : null,
    timeDifferenceMs: data.timeDifferenceMs !== undefined ? data.timeDifferenceMs : null,
    isTie: data.isTie === true,
    isFalseStart: data.isFalseStart === true,
    detectionMethod: data.detectionMethod || 'CAMERA',
    blueMarkerConfidence: Number(data.blueMarkerConfidence) || 0,
    orangeMarkerConfidence: Number(data.orangeMarkerConfidence) || 0,
    firstAnswerTeam: '',
    firstAnswer: '',
    firstAnswerCorrect: false,
    stealTeam: '',
    stealAnswer: '',
    stealCorrect: false,
    bluePoints: 0,
    orangePoints: 0,
    playedAt: getCurrentTimestamp()
  };

  appendObject(sheet, raceResult);
  appendLog('INFO', 'CAM_RACE', 'CAM_RACE_RECORDED', `Race Q${data.questionOrder} won by ${data.winnerTeam}`, data.sessionId, {
    winner: data.winnerTeam,
    timeDiff: data.timeDifferenceMs
  });

  return successResponse(raceResult, 'Camera race detected successfully');
}

function apiCamRaceAnswerAdd(data) {
  requireFields(data, ['sessionId', 'questionId', 'teamCode', 'answer', 'answerType']);
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000);

    // 1. Fetch Question to verify answer & points
    const qSheet = getSheet('QUESTIONS');
    const question = findRowById(qSheet, data.questionId);
    if (!question) return errorResponse('QUESTION_NOT_FOUND', 'Question not found');

    const qData = question.data;
    const isSpecial = qData.isSpecial === true || String(qData.isSpecial).toLowerCase() === 'true';
    
    // Normalize correct answer letter
    let expectedLetter = 'A';
    if (qData.correctAnswer === 0 || qData.correctAnswer === '0' || qData.correctAnswer === 'A') expectedLetter = 'A';
    else if (qData.correctAnswer === 1 || qData.correctAnswer === '1' || qData.correctAnswer === 'B') expectedLetter = 'B';
    else if (qData.correctAnswer === 2 || qData.correctAnswer === '2' || qData.correctAnswer === 'C') expectedLetter = 'C';
    else if (qData.correctAnswer === 3 || qData.correctAnswer === '3' || qData.correctAnswer === 'D') expectedLetter = 'D';

    const givenAnswer = String(data.answer).trim().toUpperCase();
    const isCorrect = givenAnswer === expectedLetter;

    // Determine eventType & Points
    let eventType = '';
    let points = 0;

    if (data.answerType === 'RACE') {
      if (isCorrect) {
        eventType = isSpecial ? 'SPECIAL_CORRECT' : 'RACE_CORRECT';
        points = isSpecial ? (Number(qData.specialPoints) || 20) : (Number(qData.normalPoints) || 10);
      } else {
        eventType = 'RACE_WRONG';
        points = 0;
      }
    } else if (data.answerType === 'STEAL') {
      if (isCorrect) {
        eventType = 'STEAL_CORRECT';
        points = Number(qData.stealPoints) || 5;
      } else {
        eventType = 'STEAL_WRONG';
        points = 0;
      }
    }

    const eventKey = `${data.sessionId}_q${data.questionId}_${data.teamCode}_${eventType}`;

    // Record Score Event
    const scoreSheet = getSheet('SCORE_EVENTS');
    const existing = findRowsByField(scoreSheet, 'eventKey', eventKey);
    let eventObj = null;

    if (existing.length === 0) {
      eventObj = {
        id: generateId('evt'),
        sessionId: data.sessionId,
        gameSlug: 'cam-race',
        roundNumber: Number(data.roundNumber) || 1,
        questionId: data.questionId,
        teamId: '',
        teamCode: data.teamCode,
        studentId: '',
        eventType: eventType,
        points: points,
        eventKey: eventKey,
        note: `Answer: ${givenAnswer} (Expected: ${expectedLetter})`,
        createdAt: getCurrentTimestamp()
      };
      appendObject(scoreSheet, eventObj);

      // Update TEAMS table
      const teamSheet = getSheet('TEAMS');
      const teams = findRowsByField(teamSheet, 'sessionId', data.sessionId);
      const team = teams.find(t => t.teamCode === data.teamCode);

      if (team) {
        const teamUpdates = {
          score: (Number(team.score) || 0) + points
        };
        if (isCorrect) {
          teamUpdates.correctAnswers = (Number(team.correctAnswers) || 0) + 1;
          if (data.answerType === 'STEAL') {
            teamUpdates.stealWins = (Number(team.stealWins) || 0) + 1;
          } else if (isSpecial) {
            teamUpdates.specialCorrect = (Number(team.specialCorrect) || 0) + 1;
          }
        } else {
          teamUpdates.wrongAnswers = (Number(team.wrongAnswers) || 0) + 1;
        }
        updateObjectById(teamSheet, team.id, teamUpdates);
      }
    }

    // Update CAM_RACE_RESULTS entry
    const camSheet = getSheet('CAM_RACE_RESULTS');
    const raceEntries = findRowsByField(camSheet, 'sessionId', data.sessionId);
    const targetEntry = raceEntries.find(r => String(r.questionId) === String(data.questionId));

    if (targetEntry) {
      const updates = {};
      if (data.answerType === 'RACE') {
        updates.firstAnswerTeam = data.teamCode;
        updates.firstAnswer = givenAnswer;
        updates.firstAnswerCorrect = isCorrect;
        if (data.teamCode === 'BLUE') updates.bluePoints = points;
        else if (data.teamCode === 'ORANGE') updates.orangePoints = points;
      } else if (data.answerType === 'STEAL') {
        updates.stealTeam = data.teamCode;
        updates.stealAnswer = givenAnswer;
        updates.stealCorrect = isCorrect;
        if (data.teamCode === 'BLUE') updates.bluePoints = points;
        else if (data.teamCode === 'ORANGE') updates.orangePoints = points;
      }
      updateObjectById(camSheet, targetEntry.id, updates);
    }

    return successResponse({
      isCorrect: isCorrect,
      correctAnswer: expectedLetter,
      points: points,
      eventType: eventType,
      teamCode: data.teamCode
    }, isCorrect ? 'Đáp án CHÍNH XÁC!' : 'Đáp án không chính xác');

  } catch (err) {
    return errorResponse('CAM_ANSWER_ERROR', err.toString());
  } finally {
    lock.releaseLock();
  }
}

function apiCamRaceCompleteQuestion(data) {
  requireFields(data, ['sessionId', 'currentQuestion']);
  const sessionSheet = getSheet('GAME_SESSIONS');
  const session = findRowById(sessionSheet, data.sessionId);
  if (!session) return errorResponse('SESSION_NOT_FOUND', 'Session not found');

  const totalQuestions = Number(session.data.totalQuestions) || 15;
  const nextQ = Math.min(Number(data.currentQuestion) + 1, totalQuestions);
  const readyToFinish = Number(data.currentQuestion) >= totalQuestions;

  updateObjectById(sessionSheet, data.sessionId, {
    currentQuestion: nextQ
  });

  return successResponse({
    currentQuestion: nextQ,
    totalQuestions: totalQuestions,
    readyToFinish: readyToFinish
  }, 'Question completed');
}

function apiCamRaceHistoryList(data) {
  requireFields(data, ['sessionId']);
  const sheet = getSheet('CAM_RACE_RESULTS');
  const results = findRowsByField(sheet, 'sessionId', data.sessionId);
  return successResponse(results, 'Cam Race history loaded');
}

// ==========================================
// 18. QUIZ BATTLE API
// ==========================================

function apiQuizAnswerAdd(data) {
  requireFields(data, ['sessionId', 'questionId', 'teamCode', 'answer']);
  // Delegate to shared score engine
  data.gameSlug = 'quiz-battle';
  data.answerType = 'RACE';
  return apiCamRaceAnswerAdd(data);
}

// ==========================================
// 19. FASTEST HAND API
// ==========================================

function apiFastestHandBuzz(data) {
  requireFields(data, ['sessionId', 'roundNumber', 'teamCode']);
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);

    const sheet = getSheet('APP_LOGS');
    const buzzKey = `buzz_${data.sessionId}_r${data.roundNumber}`;

    // Verify if first buzz recorded in logs
    const existing = findRowsByField(sheet, 'action', buzzKey);
    if (existing.length > 0) {
      return successResponse({
        winnerTeamCode: existing[0].message,
        isFirst: false
      }, 'Chuông đã được bấm bởi đội ' + existing[0].message);
    }

    appendLog('INFO', 'FASTEST_HAND', buzzKey, data.teamCode, data.sessionId, {
      buzzTimestamp: data.buzzTimestamp || getCurrentTimestamp()
    });

    return successResponse({
      winnerTeamCode: data.teamCode,
      isFirst: true
    }, `Đội ${data.teamCode} bấm chuông nhanh nhất!`);
  } finally {
    lock.releaseLock();
  }
}

function apiFastestHandAnswer(data) {
  requireFields(data, ['sessionId', 'teamCode', 'isCorrect']);
  data.gameSlug = 'fastest-hand';
  data.eventType = data.isCorrect ? 'CORRECT' : 'WRONG';
  return apiScoresAddEvent(data);
}

// ==========================================
// 20. LUCKY WHEEL API
// ==========================================

function apiLuckyWheelAddSpin(data) {
  requireFields(data, ['sessionId', 'selectedName']);
  const sheet = getSheet('LUCKY_WHEEL_HISTORY');

  const spinRecord = {
    id: generateId('spin'),
    sessionId: data.sessionId,
    spinNumber: Number(data.spinNumber) || 1,
    wheelType: data.wheelType || 'STUDENT',
    selectedId: data.selectedId || '',
    selectedName: sanitizeString(data.selectedName),
    reward: data.reward || '',
    points: Number(data.points) || 0,
    createdAt: getCurrentTimestamp()
  };

  appendObject(sheet, spinRecord);
  appendLog('INFO', 'LUCKY_WHEEL', 'LUCKY_WHEEL_SPIN', `Spin selected: ${data.selectedName} (${data.reward || data.points + 'đ'})`, data.sessionId, spinRecord);

  // If spin yields points and teamId is specified, add score event
  if (data.points && Number(data.points) > 0 && data.teamCode) {
    apiScoresAddEvent({
      sessionId: data.sessionId,
      gameSlug: 'lucky-wheel',
      teamCode: data.teamCode,
      eventType: 'WHEEL_REWARD',
      points: Number(data.points),
      eventKey: `wheel_${spinRecord.id}`
    });
  }

  return successResponse(spinRecord, 'Spin recorded');
}

function apiLuckyWheelListHistory(data) {
  requireFields(data, ['sessionId']);
  const sheet = getSheet('LUCKY_WHEEL_HISTORY');
  const history = findRowsByField(sheet, 'sessionId', data.sessionId);
  return successResponse(history, 'Lucky wheel history loaded');
}

// ==========================================
// 21. RANDOM PICKER API
// ==========================================

function apiRandomPickerAddPick(data) {
  requireFields(data, ['sessionId', 'studentName']);
  const sheet = getSheet('RANDOM_PICKER_HISTORY');

  const pickRecord = {
    id: generateId('pick'),
    sessionId: data.sessionId,
    studentId: data.studentId || '',
    studentName: sanitizeString(data.studentName),
    pickNumber: Number(data.pickNumber) || 1,
    excludedAfterPick: data.excludedAfterPick !== undefined ? data.excludedAfterPick : true,
    pickedAt: getCurrentTimestamp()
  };

  appendObject(sheet, pickRecord);
  appendLog('INFO', 'RANDOM_PICKER', 'RANDOM_PICK', `Picked: ${data.studentName}`, data.sessionId, pickRecord);
  return successResponse(pickRecord, 'Student pick recorded');
}

function apiRandomPickerListHistory(data) {
  requireFields(data, ['sessionId']);
  const sheet = getSheet('RANDOM_PICKER_HISTORY');
  const history = findRowsByField(sheet, 'sessionId', data.sessionId);
  return successResponse(history, 'Random picker history loaded');
}

function apiRandomPickerResetSession(data) {
  requireFields(data, ['sessionId']);
  // Clear or return fresh status
  return successResponse({ resetSessionId: data.sessionId }, 'Picker session reset');
}

// ==========================================
// 22. TEAM CHALLENGE API
// ==========================================

function apiTeamChallengeAddScore(data) {
  requireFields(data, ['sessionId', 'teamCode', 'points']);
  data.gameSlug = 'team-challenge';
  data.eventType = data.points >= 0 ? 'BONUS' : 'PENALTY';
  return apiScoresAddEvent(data);
}

function apiTeamChallengeGetLeaderboard(data) {
  requireFields(data, ['sessionId']);
  const sheet = getSheet('TEAMS');
  const teams = findRowsByField(sheet, 'sessionId', data.sessionId)
    .sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
  return successResponse(teams, 'Leaderboard retrieved');
}

// ==========================================
// 23. RESULTS & LEADERBOARD API
// ==========================================

function apiResultsCreate(data) {
  requireFields(data, ['sessionId', 'teamId', 'finalScore']);
  const sheet = getSheet('GAME_RESULTS');

  const result = {
    id: generateId('res'),
    sessionId: data.sessionId,
    gameSlug: data.gameSlug || 'cam-race',
    teamId: data.teamId,
    teamName: data.teamName || '',
    finalScore: Number(data.finalScore) || 0,
    rank: Number(data.rank) || 1,
    correctAnswers: Number(data.correctAnswers) || 0,
    wrongAnswers: Number(data.wrongAnswers) || 0,
    bonusPoints: Number(data.bonusPoints) || 0,
    winner: data.winner === true,
    statsJson: typeof data.stats === 'object' ? JSON.stringify(data.stats) : (data.statsJson || '{}'),
    createdAt: getCurrentTimestamp()
  };

  appendObject(sheet, result);
  return successResponse(result, 'Game result created');
}

function apiResultsListBySession(data) {
  requireFields(data, ['sessionId']);
  const sheet = getSheet('GAME_RESULTS');
  const results = findRowsByField(sheet, 'sessionId', data.sessionId)
    .sort((a, b) => (Number(a.rank) || 0) - (Number(b.rank) || 0));
  return successResponse(results, 'Results loaded');
}

function apiLeaderboardTop3(data) {
  const sheet = getSheet('GAME_RESULTS');
  const headers = getHeaders(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return successResponse([], 'No results');

  let rows = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues()
    .map(r => rowToObject(headers, r));

  if (data.gameSlug) {
    rows = rows.filter(r => r.gameSlug === data.gameSlug);
  }

  const top3 = rows
    .sort((a, b) => (Number(b.finalScore) || 0) - (Number(a.finalScore) || 0))
    .slice(0, 3);

  return successResponse(top3, 'Top 3 retrieved');
}

// ==========================================
// 24. CERTIFICATES API
// ==========================================

function apiCertificatesCreate(data) {
  requireFields(data, ['sessionId']);
  const certSheet = getSheet('CERTIFICATES');

  // Check if certificate already issued for this session & recipient
  const sessionSheet = getSheet('GAME_SESSIONS');
  const session = findRowById(sessionSheet, data.sessionId);
  if (!session) return errorResponse('SESSION_NOT_FOUND', 'Session not found');

  const sData = session.data;
  const recipientName = data.recipientName || sData.winnerName || 'Đội Xuất Sắc';
  const awardTitle = data.awardTitle || 'QUÁN QUÂN EDUPLAY';

  // Check duplicate certificate
  const existingCerts = findRowsByField(certSheet, 'sessionId', data.sessionId);
  const dup = existingCerts.find(c => c.recipientName === recipientName && c.awardTitle === awardTitle);
  if (dup) {
    return successResponse(dup, 'Chứng nhận đã được cấp trước đó');
  }

  const certCode = generateCertificateCode();
  const cert = {
    id: generateId('cert'),
    sessionId: data.sessionId,
    gameSlug: sData.gameSlug,
    recipientType: data.recipientType || 'TEAM',
    recipientId: data.recipientId || sData.winnerTeamId || '',
    recipientName: recipientName,
    awardTitle: awardTitle,
    score: Number(data.score) || 0,
    rank: Number(data.rank) || 1,
    teacherName: sData.teacherName,
    className: sData.className,
    schoolName: data.schoolName || 'Trường Tiểu học EDUPLAY',
    certificateCode: certCode,
    issuedAt: getCurrentTimestamp()
  };

  appendObject(certSheet, cert);
  appendLog('INFO', 'CERTIFICATE', 'CERTIFICATE_CREATED', `Certificate ${certCode} issued to ${recipientName}`, data.sessionId, cert);
  return successResponse(cert, 'Certificate issued successfully');
}

function apiCertificatesGetBySession(data) {
  requireFields(data, ['sessionId']);
  const sheet = getSheet('CERTIFICATES');
  const certs = findRowsByField(sheet, 'sessionId', data.sessionId);
  return successResponse(certs, 'Certificates loaded');
}

// ==========================================
// 25. DATABASE SETUP & INITIALIZATION
// (Kept for full standalone setup in Google Sheets)
// ==========================================

function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const startTime = new Date().getTime();
  
  Logger.log('🚀 Bắt đầu khởi tạo hệ sinh thái EDUPLAY Database...');

  // 1. Tạo và cấu hình 16 sheet
  Object.keys(EDUPLAY_SCHEMAS).forEach(sheetName => {
    const headers = EDUPLAY_SCHEMAS[sheetName];
    const sheet = getOrCreateSheet(ss, sheetName, headers);
    ensureHeaders(sheet, headers);
    formatSheetHeader(sheet, headers.length);
  });

  // 2. Áp dụng Data Validation cho các trường dữ liệu quan trọng
  applyDataValidations(ss);

  // 3. Nạp dữ liệu cấu hình ban đầu
  seedSettings(ss);
  seedGameCatalog(ss);
  seedQuestionBanks(ss);
  seedQuestions(ss);

  const durationSec = ((new Date().getTime() - startTime) / 1000).toFixed(2);
  appendLog('INFO', 'DATABASE', 'SETUP', `Khởi tạo database EDUPLAY thành công trong ${durationSec}s`);

  SpreadsheetApp.getUi().alert(
    '🎉 EDUPLAY CLOUD DATABASE ĐÃ SẴN SÀNG!',
    `Đã thiết lập đầy đủ 16 bảng dữ liệu, chuẩn hóa headers và nạp dữ liệu hạt giống (${durationSec}s).\n\n` +
    '• 6 Game trong Catalog\n• 15 Câu hỏi trắc nghiệm Tin học 5\n• 13 Cấu hình tham số hệ thống\n• API Engine v3.0 đã kích hoạt!',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🎓 EDUPLAY')
    .addItem('⚙️ Setup / Cập nhật Database (16 bảng)', 'setupDatabase')
    .addSeparator()
    .addItem('🎮 Nạp danh mục Game Catalog (6 game)', 'menuSeedCatalog')
    .addItem('📝 Nạp 15 câu hỏi Tin học lớp 5', 'menuSeedQuestions')
    .addItem('📚 Tạo lớp học và 10 học sinh Demo', 'seedDemoClass')
    .addSeparator()
    .addItem('📊 Xem thống kê tổng quan Database', 'showDatabaseStatistics')
    .addToUi();
}

function menuSeedCatalog() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  seedGameCatalog(ss);
  SpreadsheetApp.getUi().alert('Đã cập nhật danh mục 6 trò chơi EDUPLAY!');
}

function menuSeedQuestions() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  seedQuestions(ss);
  SpreadsheetApp.getUi().alert('Đã cập nhật bộ 15 câu hỏi Tin học lớp 5 vào ngân hàng câu hỏi!');
}

function getOrCreateSheet(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (headers && headers.length > 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  }
  return sheet;
}

function ensureHeaders(sheet, expectedHeaders) {
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0] || [];

  if (currentHeaders.length === 0 || currentHeaders[0] === '') {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    return;
  }

  const missingHeaders = expectedHeaders.filter(h => !currentHeaders.includes(h));
  if (missingHeaders.length > 0) {
    const startCol = currentHeaders.length + 1;
    sheet.getRange(1, startCol, 1, missingHeaders.length).setValues([missingHeaders]);
  }
}

function formatSheetHeader(sheet, numColumns) {
  const headerRange = sheet.getRange(1, 1, 1, numColumns);
  headerRange
    .setBackground(EDUPLAY_HEADER_BG)
    .setFontColor(EDUPLAY_HEADER_TEXT)
    .setFontWeight('bold')
    .setFontSize(EDUPLAY_HEADER_FONT_SIZE)
    .setFontFamily(EDUPLAY_FONT_FAMILY)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(false);

  sheet.setRowHeight(1, 36);
  sheet.setFrozenRows(1);

  const filter = sheet.getFilter();
  if (!filter) {
    sheet.getRange(1, 1, Math.max(sheet.getLastRow(), 2), numColumns).createFilter();
  }
}

function seedSettings(ss) {
  const sheet = ss.getSheetByName('SETTINGS');
  if (!sheet) return;

  const defaults = [
    { key: 'platformName', value: 'EDUPLAY', category: 'BRAND', description: 'Tên nền tảng tương tác lớp học' },
    { key: 'platformSubtitle', value: 'Hệ thống trò chơi tương tác lớp học', category: 'BRAND', description: 'Khẩu hiệu nền tảng' },
    { key: 'defaultLanguage', value: 'vi', category: 'LOCALIZATION', description: 'Ngôn ngữ mặc định (vi/en)' },
    { key: 'defaultQuestionCount', value: '15', category: 'GAMEPLAY', description: 'Số lượng câu hỏi mặc định mỗi trận' },
    { key: 'defaultCorrectPoints', value: '10', category: 'GAMEPLAY', description: 'Điểm cộng khi trả lời đúng' },
    { key: 'defaultStealPoints', value: '5', category: 'GAMEPLAY', description: 'Điểm cộng khi cướp câu trả lời đúng' },
    { key: 'defaultSpecialPoints', value: '20', category: 'GAMEPLAY', description: 'Điểm cộng câu hỏi ngôi sao hi vọng' },
    { key: 'defaultCountdownSeconds', value: '3', category: 'GAMEPLAY', description: 'Thời gian đếm ngược bắt đầu vòng thi (giây)' },
    { key: 'enableSound', value: 'TRUE', category: 'SYSTEM', description: 'Bật/tắt hiệu ứng âm thanh và nhạc nền' },
    { key: 'enableAnimation', value: 'TRUE', category: 'SYSTEM', description: 'Bật/tắt hiệu ứng pháo hoa và motion' },
    { key: 'enableCertificate', value: 'TRUE', category: 'SYSTEM', description: 'Tự động tạo chứng nhận khen thưởng' },
    { key: 'camRaceTieThresholdMs', value: '200', category: 'CAM_RACE', description: 'Độ trễ mili-giây tối đa để coi là hòa giơ thẻ cùng lúc' },
    { key: 'camRaceFreezeMs', value: '1500', category: 'CAM_RACE', description: 'Thời gian đóng băng sau khi nhận diện thành công (ms)' }
  ];

  const existingKeys = getExistingColumnValues(sheet, 1);
  const toAdd = defaults
    .filter(item => !existingKeys.includes(item.key))
    .map(item => [item.key, item.value, item.category, item.description, getCurrentTimestamp()]);

  if (toAdd.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, toAdd.length, toAdd[0].length).setValues(toAdd);
  }
}

function seedGameCatalog(ss) {
  const sheet = ss.getSheetByName('GAME_CATALOG');
  if (!sheet) return;

  const catalog = [
    { id: 'game_camrace', slug: 'cam-race', name: 'CAM RACE', description: 'Đại chiến Webcam: Nhận diện thẻ màu bằng AI Computer Vision.', category: 'Vận động & AI', minTeams: 2, maxTeams: 2, supportsQuestions: true, supportsCamera: true, supportsScore: true, supportsCertificate: true, enabled: true, featured: true, sortOrder: 1 },
    { id: 'game_quizbattle', slug: 'quiz-battle', name: 'QUIZ BATTLE', description: 'Đấu trường Tri thức: Thi đấu đối kháng 2-4 đội trả lời câu hỏi trắc nghiệm.', category: 'Trí tuệ & Trắc nghiệm', minTeams: 2, maxTeams: 4, supportsQuestions: true, supportsCamera: false, supportsScore: true, supportsCertificate: true, enabled: true, featured: true, sortOrder: 2 },
    { id: 'game_luckywheel', slug: 'lucky-wheel', name: 'LUCKY WHEEL', description: 'Vòng quay May mắn: Quay số chọn học sinh, tổ xuất sắc, tặng điểm thưởng.', category: 'May mắn & Hoạt náo', minTeams: 1, maxTeams: 8, supportsQuestions: false, supportsCamera: false, supportsScore: true, supportsCertificate: false, enabled: true, featured: true, sortOrder: 3 },
    { id: 'game_fastesthand', slug: 'fastest-hand', name: 'FASTEST HAND', description: 'Ai nhanh hơn: Bấm chuông điện tử đo thời gian phản xạ (mili-giây).', category: 'Phản xạ & Tốc độ', minTeams: 2, maxTeams: 4, supportsQuestions: true, supportsCamera: false, supportsScore: true, supportsCertificate: true, enabled: true, featured: false, sortOrder: 4 },
    { id: 'game_randompicker', slug: 'random-picker', name: 'RANDOM PICKER', description: 'Gọi tên ngẫu nhiên: Vòng quay tên học sinh công bằng, minh bạch.', category: 'Lựa chọn', minTeams: 1, maxTeams: 1, supportsQuestions: false, supportsCamera: false, supportsScore: false, supportsCertificate: false, enabled: true, featured: false, sortOrder: 5 },
    { id: 'game_teamchallenge', slug: 'team-challenge', name: 'TEAM CHALLENGE', description: 'Thử thách đồng đội: Bảng điểm thi đua các tổ trên máy chiếu 16:9.', category: 'Thi đua nhóm', minTeams: 2, maxTeams: 6, supportsQuestions: false, supportsCamera: false, supportsScore: true, supportsCertificate: true, enabled: true, featured: false, sortOrder: 6 }
  ];

  const existingSlugs = getExistingColumnValues(sheet, 2);
  const toAdd = catalog
    .filter(g => !existingSlugs.includes(g.slug))
    .map(g => [
      g.id, g.slug, g.name, g.description, g.category, g.minTeams, g.maxTeams,
      g.supportsQuestions, g.supportsCamera, g.supportsScore, g.supportsCertificate,
      g.enabled, g.featured, g.sortOrder, getCurrentTimestamp(), getCurrentTimestamp()
    ]);

  if (toAdd.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, toAdd.length, toAdd[0].length).setValues(toAdd);
  }
}

function seedQuestionBanks(ss) {
  const sheet = ss.getSheetByName('QUESTION_BANKS');
  if (!sheet) return;

  const defaultBank = {
    id: 'bank_tinhoc5_demo',
    name: 'Tin học lớp 5 – Bộ câu hỏi chuẩn kiến thức',
    subject: 'Tin học',
    grade: 5,
    topic: 'Tổng hợp kiến thức Tin học Tiểu học',
    description: 'Bộ 15 câu hỏi trắc nghiệm Tin học 5 bao gồm máy tính, thư mục, Scratch, Internet an toàn và thông tin cá nhân.',
    questionCount: 15,
    enabled: true
  };

  const existingIds = getExistingColumnValues(sheet, 1);
  if (!existingIds.includes(defaultBank.id)) {
    const row = [
      defaultBank.id, defaultBank.name, defaultBank.subject, defaultBank.grade,
      defaultBank.topic, defaultBank.description, defaultBank.questionCount,
      defaultBank.enabled, getCurrentTimestamp(), getCurrentTimestamp()
    ];
    sheet.appendRow(row);
  }
}

function seedQuestions(ss) {
  const sheet = ss.getSheetByName('QUESTIONS');
  if (!sheet) return;

  const questionsList = [
    { order: 1, topic: 'Máy tính & Phần cứng', questionType: 'multiple_choice', question: 'Thiết bị nào sau đây được dùng để nhập dữ liệu vào máy tính?', optionA: 'Màn hình máy tính', optionB: 'Bàn phím và chuột', optionC: 'Loa và tai nghe', optionD: 'Máy in màu', correctAnswer: 1, explanation: 'Bàn phím và chuột là thiết bị vào (input).', difficulty: 'EASY', isSpecial: false, tags: 'thiet_bi,phan_cung,lop5' },
    { order: 2, topic: 'Tệp & Thư mục', questionType: 'multiple_choice', question: 'Trong máy tính, tệp tin thường được lưu trữ bên trong:', optionA: 'Thư mục (Folder)', optionB: 'Chuột máy tính', optionC: 'Dây nguồn', optionD: 'Bàn phím', correctAnswer: 0, explanation: 'Thư mục dùng để chứa và phân loại tệp tin.', difficulty: 'EASY', isSpecial: false, tags: 'tep,thu_muc' },
    { order: 3, topic: 'Internet & Trình duyệt', questionType: 'multiple_choice', question: 'Phần mềm nào dưới đây là một trình duyệt web giúp em xem thông tin trên Internet?', optionA: 'Paint', optionB: 'Scratch 3.0', optionC: 'Google Chrome', optionD: 'Windows Media Player', correctAnswer: 2, explanation: 'Google Chrome là trình duyệt web phổ biến.', difficulty: 'EASY', isSpecial: false, tags: 'internet,trinh_duyet' },
    { order: 4, topic: 'An toàn mạng & Mật khẩu', questionType: 'multiple_choice', question: 'Mật khẩu nào sau đây được coi là an toàn và khó bị đoán nhất?', optionA: '123456', optionB: 'tenem123', optionC: 'Lop5A@2026!#', optionD: '00000000', correctAnswer: 2, explanation: 'Mật khẩu mạnh kết hợp chữ hoa, chữ thường, số và ký tự đặc biệt.', difficulty: 'MEDIUM', isSpecial: false, tags: 'an_toan_mang,mat_khau' },
    { order: 5, topic: 'Lập trình Scratch', questionType: 'multiple_choice', question: 'Trong phần mềm Scratch, nhân vật được gọi bằng thuật ngữ tiếng Anh là gì?', optionA: 'Backdrop', optionB: 'Sprite', optionC: 'Block', optionD: 'Stage', correctAnswer: 1, explanation: 'Sprite là đối tượng nhân vật trong Scratch.', difficulty: 'EASY', isSpecial: false, tags: 'scratch,sprite' },
    { order: 6, topic: 'Lập trình Scratch', questionType: 'multiple_choice', question: 'Khối lệnh nào trong Scratch giúp nhân vật lặp lại một chuỗi hành động nhiều lần?', optionA: 'Khối lệnh [repeat / lặp lại]', optionB: 'Khối lệnh [say / nói]', optionC: 'Khối lệnh [stop / dừng lại]', optionD: 'Khối lệnh [next costume]', correctAnswer: 0, explanation: 'Khối lệnh [repeat] dùng để tạo vòng lặp.', difficulty: 'MEDIUM', isSpecial: false, tags: 'scratch,vong_lap' },
    { order: 7, topic: 'Thông tin cá nhân', questionType: 'multiple_choice', question: 'Thông tin nào sau đây TUYỆT ĐỐI KHÔNG nên công khai cho người lạ trên mạng xã hội?', optionA: 'Tên bài hát em yêu thích', optionB: 'Màu sắc yêu thích', optionC: 'Địa chỉ nhà ở và mật khẩu tài khoản', optionD: 'Tên nhân vật hoạt hình', correctAnswer: 2, explanation: 'Địa chỉ nhà và mật khẩu là thông tin cá nhân tối mật.', difficulty: 'EASY', isSpecial: false, tags: 'thong_tin_ca_nhan,an_toan' },
    { order: 8, topic: 'Thiết bị số', questionType: 'multiple_choice', question: 'Thiết bị nào sau đây là thiết bị lưu trữ dữ liệu di động phổ biến?', optionA: 'Bàn phím cơ', optionB: 'Thẻ nhớ / Ổ USB flash drive', optionC: 'Máy quét (Scanner)', optionD: 'Microphone', correctAnswer: 1, explanation: 'USB và thẻ nhớ là thiết bị lưu trữ di động.', difficulty: 'EASY', isSpecial: false, tags: 'thiet_bi_so,usb' },
    { order: 9, topic: 'Tệp & Đuôi mở rộng', questionType: 'multiple_choice', question: 'Tệp có phần mở rộng là .docx hoặc .doc thường là loại tệp gì?', optionA: 'Tệp video', optionB: 'Tệp âm thanh', optionC: 'Tệp văn bản Word', optionD: 'Tệp hình ảnh', correctAnswer: 2, explanation: '.docx là định dạng tệp văn bản chuẩn Microsoft Word.', difficulty: 'MEDIUM', isSpecial: false, tags: 'tep,duoi_mo_rong' },
    { order: 10, topic: 'Lập trình & Thuật toán', questionType: 'multiple_choice', question: '★ [CÂU ĐẶC BIỆT] Khi gặp khối lệnh [Forever] (Liên tục) trong Scratch, khối lệnh bên trong sẽ:', optionA: 'Chỉ thực hiện đúng 1 lần', optionB: 'Thực hiện lặp lại mãi mãi cho đến khi dừng chương trình', optionC: 'Biến mất khỏi màn hình', optionD: 'Báo lỗi và tắt máy', correctAnswer: 1, explanation: 'Forever là vòng lặp vô hạn.', difficulty: 'HARD', isSpecial: true, tags: 'scratch,vong_lap,dac_biet' },
    { order: 11, topic: 'An toàn mạng', questionType: 'multiple_choice', question: 'Khi đang lướt web, bất ngờ xuất hiện thông báo "Bạn trúng thưởng 100 triệu", em nên làm gì?', optionA: 'Bấm vào ngay để nhận thưởng', optionB: 'Chia sẻ cho bạn bè', optionC: 'Không bấm vào liên kết lạ, đóng trang web và báo thầy cô/bố mẹ', optionD: 'Nhập số điện thoại', correctAnswer: 2, explanation: 'Đó là chiêu trò lừa đảo trực tuyến nguy hiểm.', difficulty: 'MEDIUM', isSpecial: false, tags: 'an_toan_mang,lua_dao' },
    { order: 12, topic: 'Thiết bị số & Bản quyền', questionType: 'multiple_choice', question: 'Hành động nào thể hiện văn hóa ứng xử văn minh và tôn trọng bản quyền số?', optionA: 'Tự nhận sản phẩm của người khác là của mình', optionB: 'Ghi rõ nguồn tác giả khi sử dụng hình ảnh tham khảo', optionC: 'Tải phần mềm lậu', optionD: 'Đăng bình luận khiếm nhã', correctAnswer: 1, explanation: 'Ghi rõ nguồn tác giả là tôn trọng bản quyền trí tuệ.', difficulty: 'MEDIUM', isSpecial: false, tags: 'ban_quyen,van_hoa_so' },
    { order: 13, topic: 'Lập trình Scratch', questionType: 'multiple_choice', question: 'Để nhân vật mèo Scratch kêu tiếng "Meow", ta dùng khối lệnh nhóm nào?', optionA: 'Âm thanh (Sound)', optionB: 'Bút vẽ (Pen)', optionC: 'Cảm biến (Sensing)', optionD: 'Các phép toán', correctAnswer: 0, explanation: 'Nhóm Sound phát âm thanh.', difficulty: 'EASY', isSpecial: false, tags: 'scratch,am_thanh' },
    { order: 14, topic: 'Máy tính & Hệ điều hành', questionType: 'multiple_choice', question: 'Phần mềm nền tảng quản lý toàn bộ phần cứng và phần mềm máy tính được gọi là gì?', optionA: 'Hệ điều hành (Ví dụ: Windows, macOS)', optionB: 'Phần mềm chơi game', optionC: 'Bộ gõ Unikey', optionD: 'Trình phát video', correctAnswer: 0, explanation: 'Hệ điều hành quản trị toàn bộ tài nguyên máy tính.', difficulty: 'MEDIUM', isSpecial: false, tags: 'he_dieu_hanh,windows' },
    { order: 15, topic: 'Tư duy máy tính & Thuật toán', questionType: 'multiple_choice', question: '★ [CÂU ĐẶC BIỆT] Trong lập trình, khái niệm "Thuật toán" (Algorithm) có thể hiểu là:', optionA: 'Một chiếc máy tính rất mạnh', optionB: 'Dãy các bước rõ ràng, tuần tự để giải quyết vấn đề', optionC: 'Một lỗi bàn phím', optionD: 'Mật khẩu wifi', correctAnswer: 1, explanation: 'Thuật toán là tập hợp hữu hạn các chỉ dẫn rõ ràng theo trình tự.', difficulty: 'HARD', isSpecial: true, tags: 'thuat_toan,tu_duy,dac_biet' }
  ];

  const bankId = 'bank_tinhoc5_demo';
  const existingOrders = getExistingQuestionOrders(sheet, bankId);

  const toAdd = questionsList
    .filter(q => !existingOrders.includes(q.order))
    .map(q => [
      generateId('q'), bankId, q.order, 'Tin học', 5, q.topic, q.questionType,
      q.question, q.optionA, q.optionB, q.optionC, q.optionD, q.correctAnswer,
      q.explanation, q.difficulty, 10, 5, 20, q.isSpecial, true, q.tags,
      getCurrentTimestamp(), getCurrentTimestamp()
    ]);

  if (toAdd.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, toAdd.length, toAdd[0].length).setValues(toAdd);
  }
}

function seedDemoClass() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const classSheet = ss.getSheetByName('CLASSES');
  const studentSheet = ss.getSheetByName('STUDENTS');
  if (!classSheet || !studentSheet) return;

  const demoClassId = 'class_5a_demo';
  const existingClasses = getExistingColumnValues(classSheet, 1);

  if (!existingClasses.includes(demoClassId)) {
    const classRow = [
      demoClassId, '5A', 'Lớp 5A', 5, '2025-2026', 'Thầy/Cô Giáo viên Tin học',
      'Trường Tiểu học EDUPLAY', 'Tin học', 10, true,
      getCurrentTimestamp(), getCurrentTimestamp()
    ];
    classSheet.appendRow(classRow);
  }

  const existingStudents = getExistingColumnValues(studentSheet, 3);
  const newStudents = [];

  for (let i = 1; i <= 10; i++) {
    const code = `HS5A_${i < 10 ? '0' + i : i}`;
    if (!existingStudents.includes(code)) {
      const groupNum = ((i - 1) % 4) + 1;
      newStudents.push([
        generateId('st'), demoClassId, code,
        `Học sinh ${i < 10 ? '0' + i : i}`, `HS ${i < 10 ? '0' + i : i}`,
        `Tổ ${groupNum}`, i % 2 === 1 ? 'BLUE' : 'ORANGE', true,
        getCurrentTimestamp(), getCurrentTimestamp()
      ]);
    }
  }

  if (newStudents.length > 0) {
    studentSheet.getRange(studentSheet.getLastRow() + 1, 1, newStudents.length, newStudents[0].length).setValues(newStudents);
  }

  SpreadsheetApp.getUi().alert(
    '📚 ĐÃ TẠO LỚP HỌC DEMO THÀNH CÔNG!',
    'Đã thêm "Lớp 5A" và 10 bạn học sinh mẫu (HS 01 -> HS 10) chia đều vào các tổ và 2 đội Blue/Orange.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function applyDataValidations(ss) {
  try {
    setBooleanValidation(ss, 'GAME_CATALOG', ['H', 'I', 'J', 'K', 'L', 'M']);
    setBooleanValidation(ss, 'CLASSES', ['J']);
    setBooleanValidation(ss, 'STUDENTS', ['H']);
    setListValidation(ss, 'QUESTIONS', 'G', ['multiple_choice', 'true_false', 'short_answer', 'fill_blank', 'sorting', 'drag_drop']);
    setListValidation(ss, 'QUESTIONS', 'O', ['EASY', 'MEDIUM', 'HARD']);
    setBooleanValidation(ss, 'QUESTIONS', ['S', 'T']);
    setListValidation(ss, 'GAME_SESSIONS', 'L', ['READY', 'PLAYING', 'PAUSED', 'FINISHED', 'CANCELLED']);
    setListValidation(ss, 'CAM_RACE_RESULTS', 'E', ['BLUE', 'ORANGE', 'TIE', 'NONE']);
    setListValidation(ss, 'CAM_RACE_RESULTS', 'K', ['CAMERA', 'MANUAL']);
    setListValidation(ss, 'LUCKY_WHEEL_HISTORY', 'D', ['STUDENT', 'TEAM', 'QUESTION', 'REWARD', 'CHALLENGE']);
    setListValidation(ss, 'SCORE_EVENTS', 'I', ['CORRECT', 'WRONG', 'RACE_CORRECT', 'RACE_WRONG', 'STEAL_CORRECT', 'STEAL_WRONG', 'SPECIAL_CORRECT', 'BONUS', 'PENALTY', 'MANUAL_ADJUSTMENT', 'WHEEL_REWARD']);
    setListValidation(ss, 'CERTIFICATES', 'D', ['TEAM', 'STUDENT', 'CLASS']);
    setListValidation(ss, 'APP_LOGS', 'B', ['INFO', 'WARNING', 'ERROR']);
  } catch (e) {
    Logger.log('Validation setup error: ' + e.toString());
  }
}

function setListValidation(ss, sheetName, columnLetter, values) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(values, true).setAllowInvalid(false).build();
  sheet.getRange(`${columnLetter}2:${columnLetter}1000`).setDataValidation(rule);
}

function setBooleanValidation(ss, sheetName, columnLetters) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;
  const rule = SpreadsheetApp.newDataValidation().requireCheckbox().build();
  columnLetters.forEach(col => {
    sheet.getRange(`${col}2:${col}1000`).setDataValidation(rule);
  });
}

function getExistingColumnValues(sheet, columnIndex) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  const range = sheet.getRange(2, columnIndex, lastRow - 1, 1);
  return range.getValues().map(row => String(row[0])).filter(val => val !== '');
}

function getExistingQuestionOrders(sheet, bankId) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  const range = sheet.getRange(2, 2, lastRow - 1, 2);
  const orders = [];
  range.getValues().forEach(row => {
    if (row[0] === bankId && row[1] !== '') {
      orders.push(Number(row[1]));
    }
  });
  return orders;
}

function showDatabaseStatistics() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let statsMessage = '📊 THỐNG KÊ BẢN GHI EDUPLAY:\n\n';
  Object.keys(EDUPLAY_SCHEMAS).forEach(name => {
    const sheet = ss.getSheetByName(name);
    const count = sheet ? Math.max(0, sheet.getLastRow() - 1) : 'Chưa tạo';
    statsMessage += `• ${name.padEnd(22, ' ')}: ${count} dòng\n`;
  });
  SpreadsheetApp.getUi().alert('TỔNG QUAN HỆ THỐNG EDUPLAY', statsMessage, SpreadsheetApp.getUi().ButtonSet.OK);
}

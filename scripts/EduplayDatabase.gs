/**
 * ==============================================================================
 * 🎓 EDUPLAY - HỆ THỐNG TRÒ CHƠI TƯƠNG TÁC THEO ĐỘI (GOOGLE APPS SCRIPT ENGINE)
 * Kiến trúc: Database Google Sheets chuẩn hóa theo mô hình 2–4 ĐỘI
 * Phiên bản: 4.0.0 (Team-First Architecture & REST-style Web App API)
 * Timezone: Asia/Ho_Chi_Minh
 * ==============================================================================
 */

// ==========================================
// 1. CẤU HÌNH HỆ THỐNG & ĐỊNH NGHĨA 18 SCHEMAS
// ==========================================

const TIMEZONE = 'Asia/Ho_Chi_Minh';
const EDUPLAY_HEADER_BG = '#0f172a'; // Slate 900
const EDUPLAY_HEADER_TEXT = '#f8fafc'; // Slate 50
const EDUPLAY_HEADER_FONT_SIZE = 10;
const EDUPLAY_FONT_FAMILY = 'Arial';

// Danh mục 18 Bảng dữ liệu chuẩn của hệ sinh thái EDUPLAY (Team-Only)
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
    'schoolName', 'subject', 'enabled', 'createdAt', 'updatedAt'
  ],
  QUESTION_BANKS: [
    'id', 'bankCode', 'name', 'subject', 'grade', 'topic', 'description',
    'questionCount', 'enabled', 'createdAt', 'updatedAt'
  ],
  QUESTIONS: [
    'id', 'bankId', 'order', 'subject', 'grade', 'topic', 'questionType',
    'question', 'optionA', 'optionB', 'optionC', 'optionD', 'correctAnswer',
    'explanation', 'difficulty', 'normalPoints', 'specialPoints', 'isSpecial',
    'enabled', 'tags', 'createdAt', 'updatedAt'
  ],
  GAME_SESSIONS: [
    'id', 'sessionCode', 'gameId', 'gameSlug', 'activityName', 'classId',
    'className', 'teacherName', 'schoolName', 'subject', 'grade', 'questionBankId',
    'teamCount', 'status', 'currentRound', 'currentQuestion', 'totalQuestions',
    'winnerTeamId', 'winnerTeamName', 'startedAt', 'finishedAt', 'createdAt', 'updatedAt'
  ],
  TEAMS: [
    'id', 'sessionId', 'teamCode', 'teamName', 'teamColor', 'markerColor',
    'score', 'rank', 'correctAnswers', 'wrongAnswers', 'stealWins',
    'bonusPoints', 'penaltyPoints', 'specialCorrect', 'createdAt', 'updatedAt'
  ],
  SCORE_EVENTS: [
    'id', 'sessionId', 'gameSlug', 'roundNumber', 'questionId', 'teamId',
    'teamCode', 'eventType', 'points', 'eventKey', 'note', 'createdAt'
  ],
  GAME_RESULTS: [
    'id', 'sessionId', 'gameSlug', 'teamId', 'teamCode', 'teamName', 'teamColor',
    'finalScore', 'rank', 'correctAnswers', 'wrongAnswers', 'stealWins',
    'bonusPoints', 'penaltyPoints', 'specialCorrect', 'winner', 'statsJson', 'createdAt'
  ],
  CAM_RACE_RESULTS: [
    'id', 'sessionId', 'questionId', 'questionOrder', 'winnerTeamId', 'winnerTeamCode',
    'blueDetectedAt', 'orangeDetectedAt', 'timeDifferenceMs', 'isTie', 'isFalseStart',
    'detectionMethod', 'blueMarkerConfidence', 'orangeMarkerConfidence', 'firstAnswer',
    'firstAnswerCorrect', 'stealTeamId', 'stealAnswer', 'stealCorrect', 'pointsAwarded', 'playedAt'
  ],
  SMILE_RACE_RESULTS: [
    'id', 'sessionId', 'questionId', 'questionOrder', 'winnerTeamId', 'winnerTeamCode',
    'winnerTeamName', 'gestureTimestamp', 'gestureScore', 'markerConfidence',
    'stableFrames', 'isTie', 'detectionMethod', 'firstAnswer', 'firstAnswerCorrect',
    'stealTeamId', 'stealTeamCode', 'stealAnswer', 'stealCorrect', 'fullPoints',
    'stealPoints', 'pointsAwarded', 'playedAt'
  ],
  FASTEST_HAND_RESULTS: [
    'id', 'sessionId', 'roundNumber', 'questionId', 'winnerTeamId', 'winnerTeamCode',
    'buzzTimestamp', 'responseTimeMs', 'answer', 'isCorrect', 'pointsAwarded', 'playedAt'
  ],
  LUCKY_WHEEL_HISTORY: [
    'id', 'sessionId', 'spinNumber', 'wheelType', 'selectedTeamId',
    'selectedTeamName', 'selectedValue', 'reward', 'points', 'createdAt'
  ],
  RANDOM_TEAM_HISTORY: [
    'id', 'sessionId', 'pickNumber', 'pickType', 'selectedTeamId',
    'selectedTeamName', 'selectedValue', 'excludedAfterPick', 'pickedAt'
  ],
  TEAM_CHALLENGE_RESULTS: [
    'id', 'sessionId', 'roundNumber', 'questionId', 'teamId', 'teamCode',
    'answer', 'isCorrect', 'eventType', 'pointsAwarded', 'createdAt'
  ],
  CERTIFICATES: [
    'id', 'sessionId', 'gameSlug', 'teamId', 'teamCode', 'teamName',
    'awardTitle', 'finalScore', 'rank', 'teacherName', 'className',
    'schoolName', 'certificateCode', 'issuedAt'
  ],
  IMPORT_HISTORY: [
    'id', 'importType', 'fileName', 'fileType', 'targetBankId', 'totalRows',
    'createdRows', 'updatedRows', 'skippedRows', 'errorRows', 'mode', 'createdAt'
  ],
  APP_LOGS: [
    'id', 'level', 'module', 'action', 'message', 'sessionId', 'payload', 'createdAt'
  ]
};

// ==========================================
// 2. MENU GOOGLE SHEET (onOpen)
// ==========================================

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🎓 EDUPLAY')
    .addItem('⚙️ Setup / Update Database', 'setupDatabase')
    .addSeparator()
    .addItem('🎮 Update Game Catalog', 'menuSeedCatalog')
    .addItem('📝 Seed 15 Questions', 'menuSeedQuestions')
    .addItem('🔄 Migrate Legacy Database', 'migrateLegacyDatabase')
    .addSeparator()
    .addItem('📊 Database Summary', 'showDatabaseSummary')
    .addToUi();
}

function menuSeedCatalog() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  seedGameCatalog(ss);
  SpreadsheetApp.getUi().alert('🎮 Đã cập nhật 6 game chính thức vào GAME_CATALOG!');
}

function menuSeedQuestions() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  seedQuestionBanks(ss);
  seedQuestions(ss);
  SpreadsheetApp.getUi().alert('📝 Đã nạp 15 câu hỏi Tin học 5 vào ngân hàng câu hỏi!');
}

// ==========================================
// 3. CORE WEB APP ENTRY POINTS (doGet / doPost)
// ==========================================

/**
 * Handle GET requests (e.g. /exec?action=settings.get)
 */
function doGet(e) {
  try {
    const action = e && e.parameter && e.parameter.action ? String(e.parameter.action).trim() : 'settings.get';
    const data = {};
    if (e && e.parameter) {
      Object.keys(e.parameter).forEach(k => {
        if (k !== 'action') {
          data[k] = e.parameter[k];
        }
      });
    }
    const response = handleApiRequest(action, data);
    return createJsonResponse(response);
  } catch (err) {
    appendLog('ERROR', 'SYSTEM', 'doGet', err.toString(), '', e ? JSON.stringify(e.parameter) : '');
    return createJsonResponse(errorResponse('SERVER_ERROR', err.message || 'Lỗi xử lý yêu cầu GET'));
  }
}

/**
 * Handle POST requests (Accepts JSON body or text/plain JSON string to avoid CORS issues)
 */
function doPost(e) {
  try {
    let requestPayload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        requestPayload = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        return createJsonResponse(errorResponse('INVALID_JSON', 'Payload không đúng định dạng JSON: ' + parseErr.message));
      }
    } else if (e && e.parameter) {
      requestPayload = e.parameter;
    }

    const action = requestPayload.action ? String(requestPayload.action).trim() : '';
    const data = requestPayload.data || {};

    if (!action) {
      return createJsonResponse(errorResponse('MISSING_ACTION', 'Thiếu trường action trong yêu cầu POST'));
    }

    const response = handleApiRequest(action, data);
    return createJsonResponse(response);
  } catch (err) {
    appendLog('ERROR', 'SYSTEM', 'doPost', err.toString(), '', e && e.postData ? e.postData.contents : '');
    return createJsonResponse(errorResponse('SERVER_ERROR', err.message || 'Lỗi xử lý yêu cầu POST'));
  }
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function successResponse(data, message) {
  return {
    success: true,
    data: data !== undefined ? data : null,
    message: message || 'OK',
    timestamp: getCurrentTimestamp()
  };
}

function errorResponse(code, message) {
  return {
    success: false,
    error: code || 'ERROR',
    message: message || 'Đã xảy ra lỗi',
    timestamp: getCurrentTimestamp()
  };
}

// ==========================================
// 4. ROUTER & API WHITELIST
// ==========================================

const API_ACTIONS = {
  // 1. Settings
  'settings.get': apiGetSettings,

  // 2. Games Catalog
  'games.list': apiListGames,
  'games.get': apiGetGame,

  // 3. Classes CRUD
  'classes.list': apiListClasses,
  'classes.get': apiGetClass,
  'classes.create': apiCreateClass,
  'classes.update': apiUpdateClass,
  'classes.delete': apiDeleteClass,

  // 4. Question Banks CRUD
  'questionBanks.list': apiListQuestionBanks,
  'questionBanks.get': apiGetQuestionBank,
  'questionBanks.create': apiCreateQuestionBank,
  'questionBanks.update': apiUpdateQuestionBank,
  'questionBanks.delete': apiDeleteQuestionBank,

  // 5. Questions CRUD
  'questions.list': apiListQuestions,
  'questions.listByBank': apiListQuestionsByBank,
  'questions.get': apiGetQuestion,
  'questions.create': apiCreateQuestion,
  'questions.update': apiUpdateQuestion,
  'questions.delete': apiDeleteQuestion,

  // 6. Import Batch
  'questions.importBatch': apiImportQuestionsBatch,
  'teams.importBatch': apiImportTeamsBatch,
  'imports.history.list': apiListImportHistory,

  // 7. Sessions API
  'sessions.create': apiCreateSession,
  'sessions.get': apiGetSession,
  'sessions.update': apiUpdateSession,
  'sessions.list': apiListSessions,
  'sessions.listByClass': apiListSessionsByClass,
  'sessions.finish': apiFinishSession,
  'sessions.cancel': apiCancelSession,

  // 8. Teams API
  'teams.create': apiCreateTeam,
  'teams.createBatch': apiCreateTeamsBatch,
  'teams.listBySession': apiListTeamsBySession,
  'teams.get': apiGetTeam,
  'teams.update': apiUpdateTeam,
  'teams.delete': apiDeleteTeam,
  'teams.getScore': apiGetTeamScore,
  'teams.getLeaderboard': apiGetTeamLeaderboard,

  // 9. Score Ledger Engine
  'scores.addEvent': apiAddScoreEvent,
  'scores.listBySession': apiListScoresBySession,
  'scores.getBySession': apiListScoresBySession,
  'scores.recalculate': apiRecalculateScores,

  // 10. Cam Race API (2 Teams Blue/Orange, No biometrics)
  'camRace.race.add': apiCamRaceAddRace,
  'camRace.answer.add': apiCamRaceAddAnswer,
  'camRace.question.complete': apiCamRaceCompleteQuestion,
  'camRace.result.completeQuestion': apiCamRaceCompleteQuestion,
  'camRace.history.listBySession': apiCamRaceListHistory,

  // 11. Smile Race API (2-4 Teams, Gesture Score only, No Face/Biometrics)
  'smileRace.gesture.add': apiSmileRaceAddGesture,
  'smileRace.answer.add': apiSmileRaceAddAnswer,
  'smileRace.question.complete': apiSmileRaceCompleteQuestion,
  'smileRace.history.listBySession': apiSmileRaceListHistory,

  // 12. Fastest Hand API (First buzz lock)
  'fastestHand.buzz': apiFastestHandBuzz,
  'fastestHand.answer': apiFastestHandAnswer,
  'fastestHand.question.complete': apiFastestHandCompleteQuestion,
  'fastestHand.history.listBySession': apiFastestHandListHistory,

  // 13. Lucky Wheel API
  'luckyWheel.spin.add': apiLuckyWheelAddSpin,
  'luckyWheel.history.listBySession': apiLuckyWheelListHistory,

  // 14. Random Team Picker API
  'randomTeam.pick.add': apiRandomTeamAddPick,
  'randomTeam.history.listBySession': apiRandomTeamListHistory,
  'randomTeam.resetSession': apiRandomTeamResetSession,

  // 15. Team Challenge API
  'teamChallenge.answer.add': apiTeamChallengeAddAnswer,
  'teamChallenge.score.add': apiTeamChallengeAddScore,
  'teamChallenge.round.complete': apiTeamChallengeCompleteRound,
  'teamChallenge.history.listBySession': apiTeamChallengeListHistory,

  // 16. Progress & Results & Leaderboard
  'progress.completeQuestion': apiProgressCompleteQuestion,
  'results.listBySession': apiListResultsBySession,
  'results.getWinner': apiGetWinnerBySession,
  'leaderboard.bySession': apiGetLeaderboardBySession,
  'leaderboard.top3': apiGetTop3Leaderboard,

  // 17. Certificates (Team-Only)
  'certificates.create': apiCreateCertificate,
  'certificates.listBySession': apiListCertificatesBySession,
  'certificates.get': apiGetCertificate,

  // 18. Logs
  'appLogs.list': apiListAppLogs
};

function handleApiRequest(action, data) {
  if (!Object.prototype.hasOwnProperty.call(API_ACTIONS, action)) {
    return errorResponse('INVALID_ACTION', `Action '${action}' không nằm trong whitelist của EDUPLAY API.`);
  }

  try {
    const handler = API_ACTIONS[action];
    return handler(data || {});
  } catch (err) {
    appendLog('ERROR', 'API', action, err.message || err.toString(), (data && data.sessionId) || '', data);
    return errorResponse('EXECUTION_ERROR', `Lỗi khi thực thi action '${action}': ${err.message}`);
  }
}

// ==========================================
// 5. DATABASE HELPERS & SANITIZATION
// ==========================================

function getSheet(sheetName) {
  if (!EDUPLAY_SCHEMAS[sheetName]) {
    throw new Error(`Bảng '${sheetName}' không hợp lệ hoặc không thuộc hệ sinh thái EDUPLAY.`);
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    // Tự động tạo nếu bảng chưa có
    sheet = getOrCreateSheet(ss, sheetName, EDUPLAY_SCHEMAS[sheetName]);
    ensureHeaders(sheet, EDUPLAY_SCHEMAS[sheetName]);
    formatSheetHeader(sheet, EDUPLAY_SCHEMAS[sheetName].length);
  }
  return sheet;
}

function getHeaders(sheet) {
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  return sheet.getRange(1, 1, 1, lastCol).getValues()[0] || [];
}

function rowToObject(headers, row) {
  const obj = {};
  for (let i = 0; i < headers.length; i++) {
    const key = headers[i];
    if (key) {
      obj[key] = row[i] !== undefined ? row[i] : null;
    }
  }
  return obj;
}

function objectToRow(headers, obj) {
  return headers.map(h => {
    const val = obj[h];
    if (val === undefined || val === null) return '';
    if (typeof val === 'object') return JSON.stringify(val);
    return val;
  });
}

function findRowById(sheet, id) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return null;
  const headers = getHeaders(sheet);
  const idCol = headers.indexOf('id');
  if (idCol === -1) return null;

  const data = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) {
      return {
        rowIndex: i + 2,
        data: rowToObject(headers, data[i])
      };
    }
  }
  return null;
}

function findRowsByField(sheet, field, value) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  const headers = getHeaders(sheet);
  const colIndex = headers.indexOf(field);
  if (colIndex === -1) return [];

  const data = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  const results = [];
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][colIndex]) === String(value)) {
      results.push({
        rowIndex: i + 2,
        data: rowToObject(headers, data[i])
      });
    }
  }
  return results;
}

function appendObject(sheet, obj) {
  const headers = getHeaders(sheet);
  if (!obj.id) {
    const prefix = sheet.getName().toLowerCase().replace(/_/g, '').substring(0, 5);
    obj.id = generateId(prefix);
  }
  if (headers.includes('createdAt') && !obj.createdAt) {
    obj.createdAt = getCurrentTimestamp();
  }
  if (headers.includes('updatedAt') && !obj.updatedAt) {
    obj.updatedAt = getCurrentTimestamp();
  }
  const row = objectToRow(headers, obj);
  sheet.appendRow(row);
  return obj;
}

function updateObjectById(sheet, id, updates) {
  const found = findRowById(sheet, id);
  if (!found) return null;

  const headers = getHeaders(sheet);
  const updatedObj = { ...found.data, ...updates };
  if (headers.includes('updatedAt')) {
    updatedObj.updatedAt = getCurrentTimestamp();
  }
  const row = objectToRow(headers, updatedObj);
  sheet.getRange(found.rowIndex, 1, 1, headers.length).setValues([row]);
  return updatedObj;
}

function deleteObjectById(sheet, id) {
  const found = findRowById(sheet, id);
  if (!found) return false;
  sheet.deleteRow(found.rowIndex);
  return true;
}

function sanitizeString(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function requireFields(data, fields) {
  for (const f of fields) {
    if (data[f] === undefined || data[f] === null || data[f] === '') {
      throw new Error(`Trường bắt buộc còn thiếu: '${f}'`);
    }
  }
}

// ==========================================
// 6. API HANDLERS - SETTINGS
// ==========================================

function apiGetSettings() {
  const sheet = getSheet('SETTINGS');
  const lastRow = sheet.getLastRow();
  const result = {
    platformName: 'EDUPLAY',
    platformSubtitle: 'Hệ thống trò chơi tương tác lớp học',
    defaultLanguage: 'vi',
    minTeams: 2,
    maxTeams: 4,
    defaultQuestionCount: 15,
    defaultCorrectPoints: 10,
    defaultSpecialPoints: 20,
    defaultStealRatio: 0.5,
    defaultCountdownSeconds: 3,
    camRaceTieThresholdMs: 200,
    camRaceFreezeMs: 1500,
    smileRaceTieThresholdMs: 200,
    smileRaceGestureThreshold: 0.60,
    smileRaceStableFrames: 4,
    smileRaceMaxStealAttempts: 1,
    fastestHandLockOnFirstBuzz: true
  };

  if (lastRow > 1) {
    const data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    data.forEach(row => {
      const key = String(row[0]).trim();
      let val = row[1];
      if (val === 'TRUE') val = true;
      else if (val === 'FALSE') val = false;
      else if (!isNaN(Number(val)) && val !== '') val = Number(val);
      if (key) result[key] = val;
    });
  }

  return successResponse(result);
}

// ==========================================
// 7. API HANDLERS - GAME CATALOG
// ==========================================

function apiListGames() {
  const sheet = getSheet('GAME_CATALOG');
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return successResponse([]);

  const headers = getHeaders(sheet);
  const data = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  const games = data
    .map(row => rowToObject(headers, row))
    .filter(g => g.enabled === true || String(g.enabled).toUpperCase() === 'TRUE')
    .sort((a, b) => (Number(a.sortOrder) || 99) - (Number(b.sortOrder) || 99));

  return successResponse(games);
}

function apiGetGame(data) {
  requireFields(data, ['slug']);
  const sheet = getSheet('GAME_CATALOG');
  const found = findRowsByField(sheet, 'slug', data.slug);
  if (found.length === 0) {
    return errorResponse('GAME_NOT_FOUND', `Không tìm thấy trò chơi với slug: ${data.slug}`);
  }
  return successResponse(found[0].data);
}

// ==========================================
// 8. API HANDLERS - CLASSES CRUD
// ==========================================

function apiListClasses() {
  const sheet = getSheet('CLASSES');
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return successResponse([]);
  const headers = getHeaders(sheet);
  const list = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues()
    .map(row => rowToObject(headers, row));
  return successResponse(list);
}

function apiGetClass(data) {
  requireFields(data, ['id']);
  const sheet = getSheet('CLASSES');
  const found = findRowById(sheet, data.id);
  if (!found) return errorResponse('CLASS_NOT_FOUND', 'Không tìm thấy lớp học');
  return successResponse(found.data);
}

function apiCreateClass(data) {
  requireFields(data, ['className']);
  const sheet = getSheet('CLASSES');
  const newClass = {
    id: generateId('class'),
    classCode: sanitizeString(data.classCode) || `CLS-${Math.floor(1000 + Math.random() * 9000)}`,
    className: sanitizeString(data.className),
    grade: data.grade || 5,
    schoolYear: sanitizeString(data.schoolYear) || '2025-2026',
    teacherName: sanitizeString(data.teacherName) || '',
    schoolName: sanitizeString(data.schoolName) || '',
    subject: sanitizeString(data.subject) || 'Tin học',
    enabled: data.enabled !== undefined ? Boolean(data.enabled) : true,
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp()
  };
  appendObject(sheet, newClass);
  return successResponse(newClass, 'Đã tạo lớp học thành công');
}

function apiUpdateClass(data) {
  requireFields(data, ['id']);
  const sheet = getSheet('CLASSES');
  const updated = updateObjectById(sheet, data.id, data);
  if (!updated) return errorResponse('CLASS_NOT_FOUND', 'Không tìm thấy lớp học');
  return successResponse(updated, 'Đã cập nhật thông tin lớp học');
}

function apiDeleteClass(data) {
  requireFields(data, ['id']);
  const sheet = getSheet('CLASSES');
  const deleted = deleteObjectById(sheet, data.id);
  if (!deleted) return errorResponse('CLASS_NOT_FOUND', 'Không tìm thấy lớp học để xóa');
  return successResponse({ deleted: true }, 'Đã xóa lớp học');
}

// ==========================================
// 9. API HANDLERS - QUESTION BANKS CRUD
// ==========================================

function apiListQuestionBanks() {
  const sheet = getSheet('QUESTION_BANKS');
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return successResponse([]);
  const headers = getHeaders(sheet);
  const list = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues()
    .map(row => rowToObject(headers, row));
  return successResponse(list);
}

function apiGetQuestionBank(data) {
  requireFields(data, ['id']);
  const sheet = getSheet('QUESTION_BANKS');
  const found = findRowById(sheet, data.id);
  if (!found) return errorResponse('BANK_NOT_FOUND', 'Không tìm thấy ngân hàng câu hỏi');
  return successResponse(found.data);
}

function apiCreateQuestionBank(data) {
  requireFields(data, ['name']);
  const sheet = getSheet('QUESTION_BANKS');
  const bank = {
    id: generateId('bank'),
    bankCode: sanitizeString(data.bankCode) || `BANK_${Math.floor(1000 + Math.random() * 9000)}`,
    name: sanitizeString(data.name),
    subject: sanitizeString(data.subject) || 'Tin học',
    grade: Number(data.grade) || 5,
    topic: sanitizeString(data.topic) || '',
    description: sanitizeString(data.description) || '',
    questionCount: 0,
    enabled: true,
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp()
  };
  appendObject(sheet, bank);
  return successResponse(bank, 'Đã tạo ngân hàng câu hỏi mới');
}

function apiUpdateQuestionBank(data) {
  requireFields(data, ['id']);
  const sheet = getSheet('QUESTION_BANKS');
  const updated = updateObjectById(sheet, data.id, data);
  if (!updated) return errorResponse('BANK_NOT_FOUND', 'Không tìm thấy ngân hàng câu hỏi');
  return successResponse(updated, 'Đã cập nhật ngân hàng câu hỏi');
}

function apiDeleteQuestionBank(data) {
  requireFields(data, ['id']);
  const sheet = getSheet('QUESTION_BANKS');
  const deleted = deleteObjectById(sheet, data.id);
  if (!deleted) return errorResponse('BANK_NOT_FOUND', 'Không tìm thấy ngân hàng để xóa');
  return successResponse({ deleted: true }, 'Đã xóa ngân hàng câu hỏi');
}

// ==========================================
// 10. API HANDLERS - QUESTIONS CRUD
// ==========================================

function formatQuestionResponse(q) {
  return {
    id: q.id,
    bankId: q.bankId,
    order: Number(q.order) || 1,
    subject: q.subject,
    grade: Number(q.grade) || 5,
    topic: q.topic,
    questionType: q.questionType || 'multiple_choice',
    question: q.question,
    options: {
      A: q.optionA || '',
      B: q.optionB || '',
      C: q.optionC || '',
      D: q.optionD || ''
    },
    correctAnswer: q.correctAnswer || 'A',
    explanation: q.explanation || '',
    difficulty: q.difficulty || 'MEDIUM',
    normalPoints: Number(q.normalPoints) || 10,
    specialPoints: Number(q.specialPoints) || 20,
    isSpecial: q.isSpecial === true || String(q.isSpecial).toUpperCase() === 'TRUE',
    enabled: q.enabled !== false && String(q.enabled).toUpperCase() !== 'FALSE',
    tags: q.tags || ''
  };
}

function apiListQuestions(data) {
  const sheet = getSheet('QUESTIONS');
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return successResponse([]);
  const headers = getHeaders(sheet);
  const rows = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  const list = rows
    .map(r => formatQuestionResponse(rowToObject(headers, r)))
    .filter(q => q.enabled);
  return successResponse(list);
}

function apiListQuestionsByBank(data) {
  requireFields(data, ['bankId']);
  const sheet = getSheet('QUESTIONS');
  const found = findRowsByField(sheet, 'bankId', data.bankId);
  const questions = found
    .map(f => formatQuestionResponse(f.data))
    .filter(q => q.enabled)
    .sort((a, b) => a.order - b.order);
  return successResponse(questions);
}

function apiGetQuestion(data) {
  requireFields(data, ['id']);
  const sheet = getSheet('QUESTIONS');
  const found = findRowById(sheet, data.id);
  if (!found) return errorResponse('QUESTION_NOT_FOUND', 'Không tìm thấy câu hỏi');
  return successResponse(formatQuestionResponse(found.data));
}

function apiCreateQuestion(data) {
  requireFields(data, ['bankId', 'question', 'correctAnswer']);
  const sheet = getSheet('QUESTIONS');
  const q = {
    id: generateId('q'),
    bankId: data.bankId,
    order: Number(data.order) || 1,
    subject: sanitizeString(data.subject) || 'Tin học',
    grade: Number(data.grade) || 5,
    topic: sanitizeString(data.topic) || '',
    questionType: data.questionType || 'multiple_choice',
    question: sanitizeString(data.question),
    optionA: sanitizeString(data.optionA || (data.options && data.options.A)),
    optionB: sanitizeString(data.optionB || (data.options && data.options.B)),
    optionC: sanitizeString(data.optionC || (data.options && data.options.C)),
    optionD: sanitizeString(data.optionD || (data.options && data.options.D)),
    correctAnswer: String(data.correctAnswer).trim().toUpperCase(),
    explanation: sanitizeString(data.explanation),
    difficulty: data.difficulty || 'MEDIUM',
    normalPoints: Number(data.normalPoints) || 10,
    specialPoints: Number(data.specialPoints) || 20,
    isSpecial: Boolean(data.isSpecial),
    enabled: true,
    tags: sanitizeString(data.tags),
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp()
  };
  appendObject(sheet, q);
  return successResponse(formatQuestionResponse(q), 'Đã thêm câu hỏi mới');
}

function apiUpdateQuestion(data) {
  requireFields(data, ['id']);
  const sheet = getSheet('QUESTIONS');
  const updates = { ...data };
  if (data.options) {
    if (data.options.A !== undefined) updates.optionA = data.options.A;
    if (data.options.B !== undefined) updates.optionB = data.options.B;
    if (data.options.C !== undefined) updates.optionC = data.options.C;
    if (data.options.D !== undefined) updates.optionD = data.options.D;
  }
  const updated = updateObjectById(sheet, data.id, updates);
  if (!updated) return errorResponse('QUESTION_NOT_FOUND', 'Không tìm thấy câu hỏi');
  return successResponse(formatQuestionResponse(updated), 'Đã cập nhật câu hỏi');
}

function apiDeleteQuestion(data) {
  requireFields(data, ['id']);
  const sheet = getSheet('QUESTIONS');
  const deleted = deleteObjectById(sheet, data.id);
  if (!deleted) return errorResponse('QUESTION_NOT_FOUND', 'Không tìm thấy câu hỏi');
  return successResponse({ deleted: true }, 'Đã xóa câu hỏi');
}

// ==========================================
// 11. API HANDLERS - IMPORT BATCH
// ==========================================

function apiImportQuestionsBatch(data) {
  requireFields(data, ['bankId', 'rows']);
  const bankId = data.bankId;
  const mode = data.mode || 'CREATE';
  const rows = Array.isArray(data.rows) ? data.rows : [];

  const sheet = getSheet('QUESTIONS');
  const historySheet = getSheet('IMPORT_HISTORY');

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  const errors = [];

  rows.forEach((r, idx) => {
    try {
      if (!r.question || !r.correctAnswer) {
        failed++;
        errors.push(`Dòng ${idx + 1}: Thiếu nội dung câu hỏi hoặc đáp án đúng.`);
        return;
      }

      const qText = sanitizeString(r.question);
      const existing = findRowsByField(sheet, 'question', qText);

      if (existing.length > 0) {
        if (mode === 'SKIP') {
          skipped++;
          return;
        } else if (mode === 'UPDATE') {
          updateObjectById(sheet, existing[0].data.id, {
            ...r,
            bankId: bankId,
            optionA: r.optionA || (r.options && r.options.A),
            optionB: r.optionB || (r.options && r.options.B),
            optionC: r.optionC || (r.options && r.options.C),
            optionD: r.optionD || (r.options && r.options.D)
          });
          updated++;
          return;
        }
      }

      // CREATE
      appendObject(sheet, {
        id: generateId('q'),
        bankId: bankId,
        order: Number(r.order) || (sheet.getLastRow()),
        subject: sanitizeString(r.subject) || 'Tin học',
        grade: Number(r.grade) || 5,
        topic: sanitizeString(r.topic) || '',
        questionType: r.questionType || 'multiple_choice',
        question: qText,
        optionA: sanitizeString(r.optionA || (r.options && r.options.A)),
        optionB: sanitizeString(r.optionB || (r.options && r.options.B)),
        optionC: sanitizeString(r.optionC || (r.options && r.options.C)),
        optionD: sanitizeString(r.optionD || (r.options && r.options.D)),
        correctAnswer: String(r.correctAnswer).trim().toUpperCase(),
        explanation: sanitizeString(r.explanation),
        difficulty: r.difficulty || 'MEDIUM',
        normalPoints: Number(r.normalPoints) || 10,
        specialPoints: Number(r.specialPoints) || 20,
        isSpecial: Boolean(r.isSpecial),
        enabled: true,
        tags: sanitizeString(r.tags)
      });
      created++;
    } catch (err) {
      failed++;
      errors.push(`Dòng ${idx + 1}: ${err.message}`);
    }
  });

  // Ghi IMPORT_HISTORY
  appendObject(historySheet, {
    id: generateId('imp'),
    importType: 'QUESTIONS',
    fileName: data.fileName || 'web_import.json',
    fileType: data.fileType || 'JSON',
    targetBankId: bankId,
    totalRows: rows.length,
    createdRows: created,
    updatedRows: updated,
    skippedRows: skipped,
    errorRows: failed,
    mode: mode,
    createdAt: getCurrentTimestamp()
  });

  appendLog('INFO', 'IMPORT', 'questions.importBatch', `Import ${rows.length} câu hỏi: ${created} tạo, ${updated} sửa, ${skipped} bỏ qua, ${failed} lỗi.`, '', {
    bankId: bankId,
    created: created,
    failed: failed
  });

  return successResponse({
    total: rows.length,
    created: created,
    updated: updated,
    skipped: skipped,
    failed: failed,
    errors: errors
  }, 'Xử lý import câu hỏi hoàn tất');
}

function apiImportTeamsBatch(data) {
  requireFields(data, ['sessionId', 'rows']);
  const sessionId = data.sessionId;
  const rows = Array.isArray(data.rows) ? data.rows : [];
  if (rows.length > 4) {
    return errorResponse('TEAM_LIMIT_EXCEEDED', 'Mỗi phiên chơi chỉ hỗ trợ tối đa 4 đội.');
  }

  const teamSheet = getSheet('TEAMS');
  const historySheet = getSheet('IMPORT_HISTORY');
  let created = 0;

  rows.forEach((r, idx) => {
    const code = r.teamCode || `TEAM${idx + 1}`;
    appendObject(teamSheet, {
      id: generateId('team'),
      sessionId: sessionId,
      teamCode: code,
      teamName: sanitizeString(r.teamName) || `Đội ${idx + 1}`,
      teamColor: r.teamColor || '#2563EB',
      markerColor: r.markerColor || r.teamColor || '#2563EB',
      score: 0,
      rank: idx + 1,
      correctAnswers: 0,
      wrongAnswers: 0,
      stealWins: 0,
      bonusPoints: 0,
      penaltyPoints: 0,
      specialCorrect: 0
    });
    created++;
  });

  appendObject(historySheet, {
    id: generateId('imp'),
    importType: 'TEAMS',
    fileName: data.fileName || 'teams_import.json',
    fileType: data.fileType || 'JSON',
    targetBankId: sessionId,
    totalRows: rows.length,
    createdRows: created,
    updatedRows: 0,
    skippedRows: 0,
    errorRows: 0,
    mode: 'CREATE'
  });

  return successResponse({ total: rows.length, created: created }, 'Import đội hoàn tất');
}

function apiListImportHistory() {
  const sheet = getSheet('IMPORT_HISTORY');
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return successResponse([]);
  const headers = getHeaders(sheet);
  const rows = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  return successResponse(rows.map(r => rowToObject(headers, r)).reverse());
}

// ==========================================
// 12. API HANDLERS - GAME SESSIONS
// ==========================================

function apiCreateSession(data) {
  requireFields(data, ['gameSlug']);
  const gameSlug = data.gameSlug;

  // 1. Kiểm tra game tồn tại
  const catalogSheet = getSheet('GAME_CATALOG');
  const gameRows = findRowsByField(catalogSheet, 'slug', gameSlug);
  if (gameRows.length === 0) {
    return errorResponse('GAME_NOT_FOUND', `Trò chơi '${gameSlug}' không tồn tại trong GAME_CATALOG`);
  }
  const gameInfo = gameRows[0].data;

  // 2. Validate teamCount
  let teamCount = Number(data.teamCount) || 2;
  if (gameSlug === 'cam-race') {
    teamCount = 2; // Cam Race luôn cố định 2 đội
  } else if (teamCount < 2 || teamCount > 4) {
    return errorResponse('INVALID_TEAM_COUNT', `Số lượng đội phải từ 2 đến 4 (nhận được ${teamCount}).`);
  }

  const sessionId = data.sessionId || generateId('session');
  const sessionCode = generateSessionCode();
  const sessionSheet = getSheet('GAME_SESSIONS');
  const teamSheet = getSheet('TEAMS');

  const sessionObj = {
    id: sessionId,
    sessionCode: sessionCode,
    gameId: gameInfo.id || `game_${gameSlug}`,
    gameSlug: gameSlug,
    activityName: sanitizeString(data.activityName) || `${gameInfo.name} - Trận đấu mới`,
    classId: sanitizeString(data.classId) || '',
    className: sanitizeString(data.className) || 'Lớp học',
    teacherName: sanitizeString(data.teacherName) || '',
    schoolName: sanitizeString(data.schoolName) || '',
    subject: sanitizeString(data.subject) || 'Tin học',
    grade: sanitizeString(data.grade) || '5',
    questionBankId: sanitizeString(data.questionBankId) || 'bank_tinhoc5_demo',
    teamCount: teamCount,
    status: data.status || 'READY',
    currentRound: 1,
    currentQuestion: 1,
    totalQuestions: Number(data.totalQuestions) || 15,
    winnerTeamId: '',
    winnerTeamName: '',
    startedAt: getCurrentTimestamp(),
    finishedAt: '',
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp()
  };

  appendObject(sessionSheet, sessionObj);

  // 3. Tự động khởi tạo các Đội cho phiên thi đấu
  const createdTeams = [];
  const defaultColors = ['#2563EB', '#EA580C', '#16A34A', '#9333EA']; // Blue, Orange, Green, Purple
  const defaultNames = ['Tia Chớp', 'Ngọn Lửa', 'Chiến Binh', 'Ngôi Sao'];

  for (let i = 0; i < teamCount; i++) {
    let code = `TEAM${i + 1}`;
    let name = defaultNames[i];
    let color = defaultColors[i];

    if (gameSlug === 'cam-race') {
      code = i === 0 ? 'BLUE' : 'ORANGE';
      name = i === 0 ? (data.blueTeamName || 'Đội Xanh (Blue)') : (data.orangeTeamName || 'Đội Cam (Orange)');
      color = i === 0 ? '#2563EB' : '#EA580C';
    }

    if (data.teams && data.teams[i]) {
      name = data.teams[i].teamName || name;
      color = data.teams[i].teamColor || color;
      if (data.teams[i].teamCode) code = data.teams[i].teamCode;
    }

    const t = {
      id: generateId('team'),
      sessionId: sessionId,
      teamCode: code,
      teamName: name,
      teamColor: color,
      markerColor: color,
      score: 0,
      rank: i + 1,
      correctAnswers: 0,
      wrongAnswers: 0,
      stealWins: 0,
      bonusPoints: 0,
      penaltyPoints: 0,
      specialCorrect: 0
    };
    appendObject(teamSheet, t);
    createdTeams.push(t);
  }

  appendLog('INFO', 'SYSTEM', 'SESSION_CREATED', `Khởi tạo trận ${gameSlug} (${teamCount} đội) - Code: ${sessionCode}`, sessionId, {
    gameSlug: gameSlug,
    teamCount: teamCount
  });

  return successResponse({
    ...sessionObj,
    teams: createdTeams
  }, 'Đã khởi tạo phiên thi đấu thành công');
}

function apiGetSession(data) {
  requireFields(data, ['sessionId']);
  const sessionSheet = getSheet('GAME_SESSIONS');
  const teamSheet = getSheet('TEAMS');

  const found = findRowById(sessionSheet, data.sessionId);
  if (!found) return errorResponse('SESSION_NOT_FOUND', 'Không tìm thấy phiên thi đấu');

  const teams = findRowsByField(teamSheet, 'sessionId', data.sessionId).map(r => r.data);
  return successResponse({
    ...found.data,
    teams: teams
  });
}

function apiUpdateSession(data) {
  requireFields(data, ['sessionId']);
  const sheet = getSheet('GAME_SESSIONS');
  const updated = updateObjectById(sheet, data.sessionId, data);
  if (!updated) return errorResponse('SESSION_NOT_FOUND', 'Không tìm thấy phiên thi đấu');
  return successResponse(updated, 'Đã cập nhật phiên thi đấu');
}

function apiListSessions(data) {
  const sheet = getSheet('GAME_SESSIONS');
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return successResponse([]);
  const headers = getHeaders(sheet);
  const rows = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  const list = rows.map(r => rowToObject(headers, r)).reverse();
  return successResponse(list.slice(0, 50));
}

function apiListSessionsByClass(data) {
  requireFields(data, ['classId']);
  const sheet = getSheet('GAME_SESSIONS');
  const rows = findRowsByField(sheet, 'classId', data.classId).map(r => r.data).reverse();
  return successResponse(rows);
}

function apiCancelSession(data) {
  requireFields(data, ['sessionId']);
  const sheet = getSheet('GAME_SESSIONS');
  const updated = updateObjectById(sheet, data.sessionId, { status: 'CANCELLED' });
  if (!updated) return errorResponse('SESSION_NOT_FOUND', 'Không tìm thấy phiên để hủy');
  return successResponse(updated, 'Đã hủy phiên thi đấu');
}

// ==========================================
// 13. API HANDLERS - TEAMS
// ==========================================

function apiCreateTeam(data) {
  requireFields(data, ['sessionId', 'teamName']);
  const sheet = getSheet('TEAMS');
  const existing = findRowsByField(sheet, 'sessionId', data.sessionId);
  if (existing.length >= 4) {
    return errorResponse('TEAM_LIMIT_EXCEEDED', 'Mỗi phiên chơi chỉ hỗ trợ tối đa 4 đội.');
  }

  const code = data.teamCode || `TEAM${existing.length + 1}`;
  const team = {
    id: generateId('team'),
    sessionId: data.sessionId,
    teamCode: code,
    teamName: sanitizeString(data.teamName),
    teamColor: data.teamColor || '#2563EB',
    markerColor: data.markerColor || data.teamColor || '#2563EB',
    score: Number(data.score) || 0,
    rank: existing.length + 1,
    correctAnswers: 0,
    wrongAnswers: 0,
    stealWins: 0,
    bonusPoints: 0,
    penaltyPoints: 0,
    specialCorrect: 0
  };
  appendObject(sheet, team);
  return successResponse(team, 'Đã thêm đội mới vào trận đấu');
}

function apiCreateTeamsBatch(data) {
  requireFields(data, ['sessionId', 'teams']);
  const sheet = getSheet('TEAMS');
  const results = [];
  data.teams.slice(0, 4).forEach((t, idx) => {
    const code = t.teamCode || `TEAM${idx + 1}`;
    const obj = {
      id: generateId('team'),
      sessionId: data.sessionId,
      teamCode: code,
      teamName: sanitizeString(t.teamName) || `Đội ${idx + 1}`,
      teamColor: t.teamColor || '#2563EB',
      markerColor: t.markerColor || t.teamColor || '#2563EB',
      score: 0,
      rank: idx + 1,
      correctAnswers: 0,
      wrongAnswers: 0,
      stealWins: 0,
      bonusPoints: 0,
      penaltyPoints: 0,
      specialCorrect: 0
    };
    appendObject(sheet, obj);
    results.push(obj);
  });
  return successResponse(results, 'Đã nạp danh sách đội');
}

function apiListTeamsBySession(data) {
  requireFields(data, ['sessionId']);
  const sheet = getSheet('TEAMS');
  const teams = findRowsByField(sheet, 'sessionId', data.sessionId).map(r => r.data);
  // Sort score DESC
  teams.sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
  return successResponse(teams);
}

function apiGetTeam(data) {
  requireFields(data, ['teamId']);
  const sheet = getSheet('TEAMS');
  const found = findRowById(sheet, data.teamId);
  if (!found) return errorResponse('TEAM_NOT_FOUND', 'Không tìm thấy đội');
  return successResponse(found.data);
}

function apiUpdateTeam(data) {
  requireFields(data, ['teamId']);
  const sheet = getSheet('TEAMS');
  const updated = updateObjectById(sheet, data.teamId, data);
  if (!updated) return errorResponse('TEAM_NOT_FOUND', 'Không tìm thấy đội');
  return successResponse(updated, 'Đã cập nhật thông tin đội');
}

function apiDeleteTeam(data) {
  requireFields(data, ['teamId']);
  const sheet = getSheet('TEAMS');
  const deleted = deleteObjectById(sheet, data.teamId);
  if (!deleted) return errorResponse('TEAM_NOT_FOUND', 'Không tìm thấy đội');
  return successResponse({ deleted: true }, 'Đã xóa đội');
}

function apiGetTeamScore(data) {
  requireFields(data, ['teamId']);
  const sheet = getSheet('TEAMS');
  const found = findRowById(sheet, data.teamId);
  if (!found) return errorResponse('TEAM_NOT_FOUND', 'Không tìm thấy đội');
  return successResponse({
    teamId: found.data.id,
    teamName: found.data.teamName,
    score: Number(found.data.score) || 0
  });
}

function apiGetTeamLeaderboard(data) {
  requireFields(data, ['sessionId']);
  return apiListTeamsBySession(data);
}

// ==========================================
// 14. GENERIC SCORE ENGINE & LOCKSERVICE
// ==========================================

function calculatePointsForQuestion(question, eventType, customPoints) {
  if (customPoints !== undefined && customPoints !== null && !isNaN(Number(customPoints))) {
    return Number(customPoints);
  }

  let basePoints = 10;
  if (question) {
    basePoints = question.isSpecial ? (Number(question.specialPoints) || 20) : (Number(question.normalPoints) || 10);
  }

  // Tỉ lệ điểm cướp = 50% (làm tròn xuống)
  if (eventType.includes('STEAL')) {
    return Math.floor(basePoints * 0.5);
  }

  if (eventType.includes('WRONG')) {
    return 0;
  }

  return basePoints;
}

function apiAddScoreEvent(data) {
  requireFields(data, ['sessionId', 'teamCode', 'eventType']);
  const lock = LockService.getScriptLock();
  try {
    // Chờ khóa 10 giây để chống xung đột ghi điểm
    lock.waitLock(10000);

    const sessionId = data.sessionId;
    const teamCode = String(data.teamCode).trim().toUpperCase();
    const eventType = String(data.eventType).trim().toUpperCase();
    const eventKey = data.eventKey || `${sessionId}_${data.questionId || 'rnd'}_${teamCode}_${eventType}_${Date.now()}`;

    const scoreSheet = getSheet('SCORE_EVENTS');
    const teamSheet = getSheet('TEAMS');
    const questionSheet = getSheet('QUESTIONS');

    // 1. CHỐNG CỘNG ĐIỂM TRÙNG (Idempotency)
    const existingEvents = findRowsByField(scoreSheet, 'eventKey', eventKey);
    if (existingEvents.length > 0) {
      return errorResponse('DUPLICATE_SCORE_EVENT', `Sự kiện điểm đã được ghi nhận trước đó (Key: ${eventKey})`);
    }

    // 2. Tìm câu hỏi nếu có questionId
    let questionObj = null;
    if (data.questionId) {
      const qFound = findRowById(questionSheet, data.questionId);
      if (qFound) questionObj = qFound.data;
    }

    // 3. Tính điểm server-side
    const awardedPoints = calculatePointsForQuestion(questionObj, eventType, data.points);

    // 4. Tìm đội trong TEAMS
    const teamRows = findRowsByField(teamSheet, 'sessionId', sessionId);
    let targetTeam = null;
    let targetRowIndex = -1;

    for (const tr of teamRows) {
      if (String(tr.data.teamCode).toUpperCase() === teamCode || String(tr.data.id) === String(data.teamId)) {
        targetTeam = tr.data;
        targetRowIndex = tr.rowIndex;
        break;
      }
    }

    if (!targetTeam) {
      return errorResponse('TEAM_NOT_FOUND', `Không tìm thấy đội '${teamCode}' trong phiên ${sessionId}`);
    }

    // 5. Ghi SCORE_EVENTS
    const scoreEventRecord = {
      id: generateId('score'),
      sessionId: sessionId,
      gameSlug: data.gameSlug || 'game',
      roundNumber: Number(data.roundNumber) || 1,
      questionId: data.questionId || '',
      teamId: targetTeam.id,
      teamCode: targetTeam.teamCode,
      eventType: eventType,
      points: awardedPoints,
      eventKey: eventKey,
      note: sanitizeString(data.note) || '',
      createdAt: getCurrentTimestamp()
    };
    appendObject(scoreSheet, scoreEventRecord);

    // 6. Cập nhật điểm và thống kê đội
    const newScore = (Number(targetTeam.score) || 0) + awardedPoints;
    let correctInc = 0;
    let wrongInc = 0;
    let stealInc = 0;
    let specialInc = 0;

    if (eventType.includes('CORRECT')) {
      correctInc = 1;
      if (questionObj && (questionObj.isSpecial === true || String(questionObj.isSpecial).toUpperCase() === 'TRUE')) {
        specialInc = 1;
      }
    }
    if (eventType.includes('WRONG')) {
      wrongInc = 1;
    }
    if (eventType.includes('STEAL_CORRECT')) {
      stealInc = 1;
    }

    updateObjectById(teamSheet, targetTeam.id, {
      score: newScore,
      correctAnswers: (Number(targetTeam.correctAnswers) || 0) + correctInc,
      wrongAnswers: (Number(targetTeam.wrongAnswers) || 0) + wrongInc,
      stealWins: (Number(targetTeam.stealWins) || 0) + stealInc,
      specialCorrect: (Number(targetTeam.specialCorrect) || 0) + specialInc,
      bonusPoints: awardedPoints > 0 && eventType === 'BONUS' ? (Number(targetTeam.bonusPoints) || 0) + awardedPoints : targetTeam.bonusPoints,
      penaltyPoints: awardedPoints < 0 || eventType === 'PENALTY' ? (Number(targetTeam.penaltyPoints) || 0) + Math.abs(awardedPoints) : targetTeam.penaltyPoints
    });

    appendLog('INFO', 'SCORING', 'SCORE_ADDED', `${targetTeam.teamName} (${targetTeam.teamCode}): ${awardedPoints >= 0 ? '+' : ''}${awardedPoints}đ [${eventType}]`, sessionId, {
      points: awardedPoints,
      newScore: newScore,
      eventKey: eventKey
    });

    return successResponse({
      teamId: targetTeam.id,
      teamCode: targetTeam.teamCode,
      pointsAwarded: awardedPoints,
      newScore: newScore,
      eventKey: eventKey
    }, 'Đã cập nhật điểm thành công');
  } catch (err) {
    return errorResponse('SCORE_LOCK_ERROR', `Không thể ghi điểm do bận khóa server: ${err.message}`);
  } finally {
    lock.releaseLock();
  }
}

function apiListScoresBySession(data) {
  requireFields(data, ['sessionId']);
  const sheet = getSheet('SCORE_EVENTS');
  const rows = findRowsByField(sheet, 'sessionId', data.sessionId).map(r => r.data);
  return successResponse(rows);
}

function apiRecalculateScores(data) {
  requireFields(data, ['sessionId']);
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const scoreSheet = getSheet('SCORE_EVENTS');
    const teamSheet = getSheet('TEAMS');

    const events = findRowsByField(scoreSheet, 'sessionId', data.sessionId).map(r => r.data);
    const teams = findRowsByField(teamSheet, 'sessionId', data.sessionId).map(r => r.data);

    const totals = {};
    teams.forEach(t => {
      totals[t.id] = {
        score: 0,
        correct: 0,
        wrong: 0,
        steal: 0,
        special: 0
      };
    });

    events.forEach(ev => {
      if (totals[ev.teamId]) {
        totals[ev.teamId].score += (Number(ev.points) || 0);
        if (String(ev.eventType).includes('CORRECT')) totals[ev.teamId].correct++;
        if (String(ev.eventType).includes('WRONG')) totals[ev.teamId].wrong++;
        if (String(ev.eventType).includes('STEAL_CORRECT')) totals[ev.teamId].steal++;
        if (String(ev.eventType) === 'SPECIAL_CORRECT') totals[ev.teamId].special++;
      }
    });

    teams.forEach(t => {
      const stats = totals[t.id];
      updateObjectById(teamSheet, t.id, {
        score: stats.score,
        correctAnswers: stats.correct,
        wrongAnswers: stats.wrong,
        stealWins: stats.steal,
        specialCorrect: stats.special
      });
    });

    return successResponse(totals, 'Đã tính toán lại toàn bộ điểm số từ sổ cái.');
  } finally {
    lock.releaseLock();
  }
}

// ==========================================
// 15. API HANDLERS - CAM RACE
// ==========================================

function apiCamRaceAddRace(data) {
  requireFields(data, ['sessionId', 'questionId', 'winnerTeamCode']);
  const sheet = getSheet('CAM_RACE_RESULTS');
  const teamSheet = getSheet('TEAMS');

  // Tìm winnerTeamId
  const teamRows = findRowsByField(teamSheet, 'sessionId', data.sessionId);
  let winnerId = '';
  teamRows.forEach(tr => {
    if (String(tr.data.teamCode).toUpperCase() === String(data.winnerTeamCode).toUpperCase()) {
      winnerId = tr.data.id;
    }
  });

  const record = {
    id: generateId('camrace'),
    sessionId: data.sessionId,
    questionId: data.questionId,
    questionOrder: Number(data.questionOrder) || 1,
    winnerTeamId: winnerId,
    winnerTeamCode: data.winnerTeamCode,
    blueDetectedAt: data.blueDetectedAt !== undefined ? data.blueDetectedAt : null,
    orangeDetectedAt: data.orangeDetectedAt !== undefined ? data.orangeDetectedAt : null,
    timeDifferenceMs: data.timeDifferenceMs !== undefined ? data.timeDifferenceMs : null,
    isTie: Boolean(data.isTie),
    isFalseStart: Boolean(data.isFalseStart),
    detectionMethod: data.detectionMethod || 'CAMERA',
    blueMarkerConfidence: data.blueMarkerConfidence || null,
    orangeMarkerConfidence: data.orangeMarkerConfidence || null,
    firstAnswer: '',
    firstAnswerCorrect: false,
    stealTeamId: '',
    stealAnswer: '',
    stealCorrect: false,
    pointsAwarded: 0,
    playedAt: getCurrentTimestamp()
  };

  appendObject(sheet, record);
  appendLog('INFO', 'CAM_RACE', 'CAM_RACE_RECORDED', `Cam Race vòng tranh quyền: Đội ${data.winnerTeamCode} giành quyền.`, data.sessionId, record);

  return successResponse(record, 'Đã ghi nhận kết quả vòng tranh quyền thẻ màu Cam Race');
}

function apiCamRaceAddAnswer(data) {
  requireFields(data, ['sessionId', 'questionId', 'teamCode', 'answer']);
  const questionSheet = getSheet('QUESTIONS');
  const camResultSheet = getSheet('CAM_RACE_RESULTS');

  // Kiểm tra đáp án câu hỏi
  let isCorrect = false;
  let questionObj = null;
  const qFound = findRowById(questionSheet, data.questionId);
  if (qFound) {
    questionObj = qFound.data;
    isCorrect = String(data.answer).trim().toUpperCase() === String(questionObj.correctAnswer).trim().toUpperCase();
  }

  const answerType = data.answerType || 'RACE';
  const eventType = answerType === 'STEAL'
    ? (isCorrect ? 'CAM_RACE_STEAL_CORRECT' : 'CAM_RACE_STEAL_WRONG')
    : (isCorrect ? 'CAM_RACE_CORRECT' : 'CAM_RACE_WRONG');

  // Thêm điểm qua ledger
  const scoreResult = apiAddScoreEvent({
    sessionId: data.sessionId,
    gameSlug: 'cam-race',
    questionId: data.questionId,
    teamCode: data.teamCode,
    eventType: eventType,
    eventKey: `${data.sessionId}_q${data.questionId}_${data.teamCode}_${eventType}`
  });

  const points = (scoreResult.success && scoreResult.data) ? scoreResult.data.pointsAwarded : 0;

  // Cập nhật CAM_RACE_RESULTS câu hỏi này
  const results = findRowsByField(camResultSheet, 'sessionId', data.sessionId);
  const qRecord = results.find(r => String(r.data.questionId) === String(data.questionId));
  if (qRecord) {
    if (answerType === 'RACE') {
      updateObjectById(camResultSheet, qRecord.data.id, {
        firstAnswer: data.answer,
        firstAnswerCorrect: isCorrect,
        pointsAwarded: points
      });
    } else {
      updateObjectById(camResultSheet, qRecord.data.id, {
        stealAnswer: data.answer,
        stealCorrect: isCorrect,
        pointsAwarded: (Number(qRecord.data.pointsAwarded) || 0) + points
      });
    }
  }

  return successResponse({
    isCorrect: isCorrect,
    pointsAwarded: points,
    correctAnswer: questionObj ? questionObj.correctAnswer : ''
  }, isCorrect ? 'Chúc mừng! Trả lời chính xác.' : 'Rất tiếc! Trả lời chưa chính xác.');
}

function apiCamRaceCompleteQuestion(data) {
  return apiProgressCompleteQuestion(data);
}

function apiCamRaceListHistory(data) {
  requireFields(data, ['sessionId']);
  const sheet = getSheet('CAM_RACE_RESULTS');
  const rows = findRowsByField(sheet, 'sessionId', data.sessionId).map(r => r.data);
  return successResponse(rows);
}

// ==========================================
// 16. API HANDLERS - SMILE RACE
// ==========================================

function apiSmileRaceAddGesture(data) {
  requireFields(data, ['sessionId', 'questionId', 'winnerTeamCode']);
  const sheet = getSheet('SMILE_RACE_RESULTS');
  const teamSheet = getSheet('TEAMS');

  let winnerId = data.winnerTeamId || '';
  if (!winnerId) {
    const teamRows = findRowsByField(teamSheet, 'sessionId', data.sessionId);
    teamRows.forEach(tr => {
      if (String(tr.data.teamCode).toUpperCase() === String(data.winnerTeamCode).toUpperCase()) {
        winnerId = tr.data.id;
      }
    });
  }

  const record = {
    id: generateId('smilerace'),
    sessionId: data.sessionId,
    questionId: data.questionId,
    questionOrder: Number(data.questionOrder) || 1,
    winnerTeamId: winnerId,
    winnerTeamCode: data.winnerTeamCode,
    winnerTeamName: data.winnerTeamName || data.winnerTeamCode,
    gestureTimestamp: data.gestureTimestamp || null,
    gestureScore: data.gestureScore || 0,
    markerConfidence: data.markerConfidence || null,
    stableFrames: data.stableFrames || 4,
    isTie: Boolean(data.isTie),
    detectionMethod: data.detectionMethod || 'CAMERA',
    firstAnswer: '',
    firstAnswerCorrect: false,
    stealTeamId: '',
    stealTeamCode: '',
    stealAnswer: '',
    stealCorrect: false,
    fullPoints: 10,
    stealPoints: 5,
    pointsAwarded: 0,
    playedAt: getCurrentTimestamp()
  };

  appendObject(sheet, record);
  appendLog('INFO', 'SMILE_RACE', 'SMILE_RACE_RECORDED', `Smile Race: ${record.winnerTeamName} cười chiến thắng (Score: ${record.gestureScore})`, data.sessionId, {
    winnerTeamCode: data.winnerTeamCode,
    gestureScore: data.gestureScore
  });

  return successResponse(record, 'Đã ghi nhận kết quả nụ cười đội chiến thắng');
}

function apiSmileRaceAddAnswer(data) {
  requireFields(data, ['sessionId', 'questionId', 'teamCode', 'answer']);
  const questionSheet = getSheet('QUESTIONS');
  const smileResultSheet = getSheet('SMILE_RACE_RESULTS');

  let isCorrect = false;
  let questionObj = null;
  const qFound = findRowById(questionSheet, data.questionId);
  if (qFound) {
    questionObj = qFound.data;
    isCorrect = String(data.answer).trim().toUpperCase() === String(questionObj.correctAnswer).trim().toUpperCase();
  }

  const answerType = data.answerType || 'RACE';
  const eventType = answerType === 'STEAL'
    ? (isCorrect ? 'SMILE_STEAL_CORRECT' : 'SMILE_STEAL_WRONG')
    : (isCorrect ? 'SMILE_RACE_CORRECT' : 'SMILE_RACE_WRONG');

  const scoreResult = apiAddScoreEvent({
    sessionId: data.sessionId,
    gameSlug: 'smile-race',
    questionId: data.questionId,
    teamCode: data.teamCode,
    teamId: data.teamId,
    eventType: eventType,
    eventKey: `${data.sessionId}_q${data.questionId}_${data.teamCode}_${eventType}`
  });

  const points = (scoreResult.success && scoreResult.data) ? scoreResult.data.pointsAwarded : 0;

  // Cập nhật SMILE_RACE_RESULTS
  const results = findRowsByField(smileResultSheet, 'sessionId', data.sessionId);
  const qRecord = results.find(r => String(r.data.questionId) === String(data.questionId));
  if (qRecord) {
    if (answerType === 'RACE') {
      updateObjectById(smileResultSheet, qRecord.data.id, {
        firstAnswer: data.answer,
        firstAnswerCorrect: isCorrect,
        pointsAwarded: points
      });
    } else {
      updateObjectById(smileResultSheet, qRecord.data.id, {
        stealTeamId: data.teamId || '',
        stealTeamCode: data.teamCode,
        stealAnswer: data.answer,
        stealCorrect: isCorrect,
        pointsAwarded: (Number(qRecord.data.pointsAwarded) || 0) + points
      });
    }
  }

  return successResponse({
    isCorrect: isCorrect,
    pointsAwarded: points,
    correctAnswer: questionObj ? questionObj.correctAnswer : ''
  }, isCorrect ? 'Chính xác!' : 'Sai rồi!');
}

function apiSmileRaceCompleteQuestion(data) {
  return apiProgressCompleteQuestion(data);
}

function apiSmileRaceListHistory(data) {
  requireFields(data, ['sessionId']);
  const sheet = getSheet('SMILE_RACE_RESULTS');
  const rows = findRowsByField(sheet, 'sessionId', data.sessionId).map(r => r.data);
  return successResponse(rows);
}

// ==========================================
// 17. API HANDLERS - FASTEST HAND
// ==========================================

function apiFastestHandBuzz(data) {
  requireFields(data, ['sessionId', 'roundNumber', 'teamCode']);
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(8000);
    const sheet = getSheet('FASTEST_HAND_RESULTS');
    const roundNumber = Number(data.roundNumber) || 1;

    // KIỂM TRA FIRST BUZZ LOCK: Đội đầu tiên bấm thành công sẽ khóa vòng này
    const existing = findRowsByField(sheet, 'sessionId', data.sessionId);
    const roundWinner = existing.find(r => Number(r.data.roundNumber) === roundNumber);

    if (roundWinner) {
      return errorResponse('BUZZ_LOCKED', `Đội '${roundWinner.data.winnerTeamCode}' đã giành quyền bấm chuông trước.`);
    }

    const record = {
      id: generateId('fasthand'),
      sessionId: data.sessionId,
      roundNumber: roundNumber,
      questionId: data.questionId || '',
      winnerTeamId: data.teamId || '',
      winnerTeamCode: data.teamCode,
      buzzTimestamp: data.buzzTimestamp || Date.now(),
      responseTimeMs: data.responseTimeMs || 0,
      answer: '',
      isCorrect: false,
      pointsAwarded: 0,
      playedAt: getCurrentTimestamp()
    };

    appendObject(sheet, record);
    appendLog('INFO', 'FASTEST_HAND', 'FASTEST_HAND_BUZZ', `Fastest Hand: ${data.teamCode} bấm chuông đầu tiên (Thời gian: ${data.responseTimeMs}ms)`, data.sessionId, record);

    return successResponse(record, `Đội ${data.teamCode} bấm chuông nhanh nhất!`);
  } finally {
    lock.releaseLock();
  }
}

function apiFastestHandAnswer(data) {
  requireFields(data, ['sessionId', 'roundNumber', 'teamCode', 'answer']);
  const questionSheet = getSheet('QUESTIONS');
  const resultSheet = getSheet('FASTEST_HAND_RESULTS');

  let isCorrect = false;
  let questionObj = null;
  if (data.questionId) {
    const qFound = findRowById(questionSheet, data.questionId);
    if (qFound) {
      questionObj = qFound.data;
      isCorrect = String(data.answer).trim().toUpperCase() === String(questionObj.correctAnswer).trim().toUpperCase();
    }
  } else {
    isCorrect = data.isCorrect === true;
  }

  const eventType = isCorrect ? 'FASTEST_HAND_CORRECT' : 'FASTEST_HAND_WRONG';
  const scoreRes = apiAddScoreEvent({
    sessionId: data.sessionId,
    gameSlug: 'fastest-hand',
    roundNumber: data.roundNumber,
    questionId: data.questionId,
    teamCode: data.teamCode,
    teamId: data.teamId,
    eventType: eventType,
    eventKey: `${data.sessionId}_r${data.roundNumber}_${data.teamCode}_${eventType}`
  });

  const points = (scoreRes.success && scoreRes.data) ? scoreRes.data.pointsAwarded : 0;

  // Cập nhật FASTEST_HAND_RESULTS
  const existing = findRowsByField(resultSheet, 'sessionId', data.sessionId);
  const rRecord = existing.find(r => Number(r.data.roundNumber) === Number(data.roundNumber));
  if (rRecord) {
    updateObjectById(resultSheet, rRecord.data.id, {
      answer: data.answer,
      isCorrect: isCorrect,
      pointsAwarded: points
    });
  }

  return successResponse({
    isCorrect: isCorrect,
    pointsAwarded: points
  }, isCorrect ? 'Chính xác! +10 điểm' : 'Chưa đúng!');
}

function apiFastestHandCompleteQuestion(data) {
  return apiProgressCompleteQuestion(data);
}

function apiFastestHandListHistory(data) {
  requireFields(data, ['sessionId']);
  const sheet = getSheet('FASTEST_HAND_RESULTS');
  const rows = findRowsByField(sheet, 'sessionId', data.sessionId).map(r => r.data);
  return successResponse(rows);
}

// ==========================================
// 18. API HANDLERS - LUCKY WHEEL
// ==========================================

function apiLuckyWheelAddSpin(data) {
  requireFields(data, ['sessionId', 'wheelType']);
  const sheet = getSheet('LUCKY_WHEEL_HISTORY');

  const points = Number(data.points) || 0;
  const record = {
    id: generateId('wheel'),
    sessionId: data.sessionId,
    spinNumber: Number(data.spinNumber) || 1,
    wheelType: data.wheelType,
    selectedTeamId: data.selectedTeamId || '',
    selectedTeamName: data.selectedTeamName || '',
    selectedValue: data.selectedValue || '',
    reward: data.reward || '',
    points: points,
    createdAt: getCurrentTimestamp()
  };
  appendObject(sheet, record);

  // Nếu vòng quay thưởng điểm cho đội
  if (points !== 0 && data.selectedTeamCode) {
    apiAddScoreEvent({
      sessionId: data.sessionId,
      gameSlug: 'lucky-wheel',
      teamCode: data.selectedTeamCode,
      teamId: data.selectedTeamId,
      eventType: 'WHEEL_REWARD',
      points: points,
      note: `Thưởng vòng quay may mắn: ${data.reward || data.selectedValue}`,
      eventKey: `${data.sessionId}_spin${record.spinNumber}_${data.selectedTeamCode}`
    });
  }

  appendLog('INFO', 'LUCKY_WHEEL', 'LUCKY_WHEEL_SPIN', `Quay trúng: ${record.selectedValue} (${record.selectedTeamName || 'Toàn trận'})`, data.sessionId, record);
  return successResponse(record, 'Đã lưu lịch sử vòng quay may mắn');
}

function apiLuckyWheelListHistory(data) {
  requireFields(data, ['sessionId']);
  const sheet = getSheet('LUCKY_WHEEL_HISTORY');
  const rows = findRowsByField(sheet, 'sessionId', data.sessionId).map(r => r.data);
  return successResponse(rows);
}

// ==========================================
// 19. API HANDLERS - RANDOM TEAM PICKER
// ==========================================

function apiRandomTeamAddPick(data) {
  requireFields(data, ['sessionId', 'selectedTeamName']);
  const sheet = getSheet('RANDOM_TEAM_HISTORY');

  const record = {
    id: generateId('rand'),
    sessionId: data.sessionId,
    pickNumber: Number(data.pickNumber) || 1,
    pickType: data.pickType || 'TEAM',
    selectedTeamId: data.selectedTeamId || '',
    selectedTeamName: data.selectedTeamName,
    selectedValue: data.selectedValue || data.selectedTeamName,
    excludedAfterPick: Boolean(data.excludedAfterPick),
    pickedAt: getCurrentTimestamp()
  };
  appendObject(sheet, record);
  appendLog('INFO', 'RANDOM_PICKER', 'RANDOM_TEAM_PICK', `Bốc thăm ngẫu nhiên chọn: ${record.selectedTeamName}`, data.sessionId, record);
  return successResponse(record, 'Đã lưu lượt bốc thăm');
}

function apiRandomTeamListHistory(data) {
  requireFields(data, ['sessionId']);
  const sheet = getSheet('RANDOM_TEAM_HISTORY');
  const rows = findRowsByField(sheet, 'sessionId', data.sessionId).map(r => r.data);
  return successResponse(rows);
}

function apiRandomTeamResetSession(data) {
  requireFields(data, ['sessionId']);
  const sheet = getSheet('RANDOM_TEAM_HISTORY');
  const rows = findRowsByField(sheet, 'sessionId', data.sessionId);
  // Đánh dấu reset
  appendLog('INFO', 'RANDOM_PICKER', 'RESET', `Reset bốc thăm ngẫu nhiên phiên ${data.sessionId}`, data.sessionId);
  return successResponse({ reset: true, totalPicks: rows.length }, 'Đã khởi động lại lượt bốc thăm');
}

// ==========================================
// 20. API HANDLERS - TEAM CHALLENGE
// ==========================================

function apiTeamChallengeAddAnswer(data) {
  requireFields(data, ['sessionId', 'teamId', 'answer']);
  const questionSheet = getSheet('QUESTIONS');
  const challengeSheet = getSheet('TEAM_CHALLENGE_RESULTS');
  const teamSheet = getSheet('TEAMS');

  let isCorrect = false;
  let points = 10;

  if (data.questionId) {
    const qFound = findRowById(questionSheet, data.questionId);
    if (qFound) {
      isCorrect = String(data.answer).trim().toUpperCase() === String(qFound.data.correctAnswer).trim().toUpperCase();
      points = isCorrect ? (Number(qFound.data.normalPoints) || 10) : 0;
    }
  } else {
    isCorrect = data.isCorrect === true;
    points = isCorrect ? (Number(data.points) || 10) : 0;
  }

  const teamFound = findRowById(teamSheet, data.teamId);
  const teamCode = teamFound ? teamFound.data.teamCode : 'TEAM';

  const eventType = isCorrect ? 'TEAM_CHALLENGE_CORRECT' : 'TEAM_CHALLENGE_WRONG';
  apiAddScoreEvent({
    sessionId: data.sessionId,
    gameSlug: 'team-challenge',
    roundNumber: data.roundNumber || 1,
    questionId: data.questionId,
    teamId: data.teamId,
    teamCode: teamCode,
    eventType: eventType,
    points: points,
    eventKey: `${data.sessionId}_tc_r${data.roundNumber || 1}_${data.teamId}_${eventType}`
  });

  const record = {
    id: generateId('tc'),
    sessionId: data.sessionId,
    roundNumber: Number(data.roundNumber) || 1,
    questionId: data.questionId || '',
    teamId: data.teamId,
    teamCode: teamCode,
    answer: data.answer,
    isCorrect: isCorrect,
    eventType: eventType,
    pointsAwarded: points,
    createdAt: getCurrentTimestamp()
  };
  appendObject(challengeSheet, record);

  return successResponse(record, isCorrect ? 'Đội hoàn thành thử thách thành công!' : 'Thử thách chưa đạt.');
}

function apiTeamChallengeAddScore(data) {
  requireFields(data, ['sessionId', 'teamId', 'points']);
  const teamSheet = getSheet('TEAMS');
  const teamFound = findRowById(teamSheet, data.teamId);
  const teamCode = teamFound ? teamFound.data.teamCode : 'TEAM';

  return apiAddScoreEvent({
    sessionId: data.sessionId,
    gameSlug: 'team-challenge',
    teamId: data.teamId,
    teamCode: teamCode,
    eventType: Number(data.points) >= 0 ? 'BONUS' : 'PENALTY',
    points: Number(data.points),
    note: data.note || 'Thưởng điểm thử thách đồng đội'
  });
}

function apiTeamChallengeCompleteRound(data) {
  return apiProgressCompleteQuestion(data);
}

function apiTeamChallengeListHistory(data) {
  requireFields(data, ['sessionId']);
  const sheet = getSheet('TEAM_CHALLENGE_RESULTS');
  const rows = findRowsByField(sheet, 'sessionId', data.sessionId).map(r => r.data);
  return successResponse(rows);
}

// ==========================================
// 21. FINISH SESSION & RANKING ENGINE
// ==========================================

function apiProgressCompleteQuestion(data) {
  requireFields(data, ['sessionId']);
  const sheet = getSheet('GAME_SESSIONS');
  const found = findRowById(sheet, data.sessionId);
  if (!found) return errorResponse('SESSION_NOT_FOUND', 'Không tìm thấy phiên thi đấu');

  const session = found.data;
  const currentQ = Number(session.currentQuestion) || 1;
  const totalQ = Number(session.totalQuestions) || 15;
  const nextQ = Math.min(currentQ + 1, totalQ);
  const isFinished = currentQ >= totalQ;

  updateObjectById(sheet, session.id, {
    currentQuestion: nextQ,
    status: isFinished ? 'PLAYING' : session.status
  });

  return successResponse({
    currentQuestion: nextQ,
    totalQuestions: totalQ,
    isFinalQuestion: currentQ === totalQ,
    readyToFinish: isFinished
  }, `Đã hoàn tất câu ${currentQ}/${totalQ}`);
}

function apiFinishSession(data) {
  requireFields(data, ['sessionId']);
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    const sessionSheet = getSheet('GAME_SESSIONS');
    const teamSheet = getSheet('TEAMS');
    const resultSheet = getSheet('GAME_RESULTS');

    const sFound = findRowById(sessionSheet, data.sessionId);
    if (!sFound) return errorResponse('SESSION_NOT_FOUND', 'Không tìm thấy phiên thi đấu');
    const session = sFound.data;

    // 1. Lấy danh sách đội và tính điểm
    const teams = findRowsByField(teamSheet, 'sessionId', data.sessionId).map(r => r.data);
    if (teams.length === 0) {
      return errorResponse('NO_TEAMS', 'Phiên thi đấu chưa có đội nào.');
    }

    // 2. XỬ LÝ XẾP HẠNG & TIE-BREAKING
    // Ưu tiên: 1. score DESC, 2. correctAnswers DESC, 3. specialCorrect DESC, 4. stealWins DESC
    teams.sort((a, b) => {
      const scoreDiff = (Number(b.score) || 0) - (Number(a.score) || 0);
      if (scoreDiff !== 0) return scoreDiff;

      const correctDiff = (Number(b.correctAnswers) || 0) - (Number(a.correctAnswers) || 0);
      if (correctDiff !== 0) return correctDiff;

      const specialDiff = (Number(b.specialCorrect) || 0) - (Number(a.specialCorrect) || 0);
      if (specialDiff !== 0) return specialDiff;

      return (Number(b.stealWins) || 0) - (Number(a.stealWins) || 0);
    });

    // 3. Cập nhật rank và ghi GAME_RESULTS
    const gameResults = [];
    teams.forEach((t, idx) => {
      const rank = idx + 1;
      const isWinner = rank === 1;

      updateObjectById(teamSheet, t.id, { rank: rank });

      const resObj = {
        id: generateId('res'),
        sessionId: session.id,
        gameSlug: session.gameSlug,
        teamId: t.id,
        teamCode: t.teamCode,
        teamName: t.teamName,
        teamColor: t.teamColor,
        finalScore: Number(t.score) || 0,
        rank: rank,
        correctAnswers: Number(t.correctAnswers) || 0,
        wrongAnswers: Number(t.wrongAnswers) || 0,
        stealWins: Number(t.stealWins) || 0,
        bonusPoints: Number(t.bonusPoints) || 0,
        penaltyPoints: Number(t.penaltyPoints) || 0,
        specialCorrect: Number(t.specialCorrect) || 0,
        winner: isWinner,
        statsJson: JSON.stringify({
          rankBadge: rank === 1 ? '🥇 Quán quân' : rank === 2 ? '🥈 Á quân' : rank === 3 ? '🥉 Quý quân' : '🏅 Khuyến khích',
          accuracy: (Number(t.correctAnswers) || 0) + (Number(t.wrongAnswers) || 0) > 0
            ? Math.round(((Number(t.correctAnswers) || 0) / ((Number(t.correctAnswers) || 0) + (Number(t.wrongAnswers) || 0))) * 100) + '%'
            : '0%'
        }),
        createdAt: getCurrentTimestamp()
      };
      appendObject(resultSheet, resObj);
      gameResults.push(resObj);
    });

    const winnerTeam = teams[0];

    // 4. Cập nhật GAME_SESSIONS
    updateObjectById(sessionSheet, session.id, {
      winnerTeamId: winnerTeam.id,
      winnerTeamName: winnerTeam.teamName,
      status: 'FINISHED',
      finishedAt: getCurrentTimestamp()
    });

    appendLog('INFO', 'SYSTEM', 'SESSION_FINISHED', `Trận đấu hoàn tất: Đội Vô địch: ${winnerTeam.teamName} (${winnerTeam.score} điểm)`, session.id, {
      winnerTeamId: winnerTeam.id,
      winnerScore: winnerTeam.score,
      totalTeams: teams.length
    });

    return successResponse({
      sessionId: session.id,
      winnerTeam: winnerTeam,
      leaderboard: gameResults
    }, `Chúc mừng ${winnerTeam.teamName} đã giành chiến thắng chung cuộc!`);
  } finally {
    lock.releaseLock();
  }
}

function apiListResultsBySession(data) {
  requireFields(data, ['sessionId']);
  const sheet = getSheet('GAME_RESULTS');
  const rows = findRowsByField(sheet, 'sessionId', data.sessionId).map(r => r.data);
  rows.sort((a, b) => Number(a.rank) - Number(b.rank));
  return successResponse(rows);
}

function apiGetWinnerBySession(data) {
  requireFields(data, ['sessionId']);
  const sheet = getSheet('GAME_RESULTS');
  const rows = findRowsByField(sheet, 'sessionId', data.sessionId).map(r => r.data);
  const winner = rows.find(r => r.winner === true || String(r.winner).toUpperCase() === 'TRUE');
  if (!winner) return errorResponse('WINNER_NOT_FOUND', 'Chưa có kết quả quán quân');
  return successResponse(winner);
}

function apiGetLeaderboardBySession(data) {
  return apiListResultsBySession(data);
}

function apiGetTop3Leaderboard(data) {
  const sheet = getSheet('GAME_RESULTS');
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return successResponse([]);
  const headers = getHeaders(sheet);
  let list = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues()
    .map(r => rowToObject(headers, r));

  if (data.gameSlug) {
    list = list.filter(r => r.gameSlug === data.gameSlug);
  }
  list.sort((a, b) => (Number(b.finalScore) || 0) - (Number(a.finalScore) || 0));
  return successResponse(list.slice(0, 3));
}

// ==========================================
// 22. CERTIFICATES API (TEAM-ONLY)
// ==========================================

function apiCreateCertificate(data) {
  requireFields(data, ['sessionId', 'teamId']);
  const certSheet = getSheet('CERTIFICATES');
  const sessionSheet = getSheet('GAME_SESSIONS');
  const teamSheet = getSheet('TEAMS');

  // 1. Kiểm tra tồn tại phiên & đội
  const sFound = findRowById(sessionSheet, data.sessionId);
  if (!sFound) return errorResponse('SESSION_NOT_FOUND', 'Không tìm thấy phiên chơi');
  const session = sFound.data;

  const tFound = findRowById(teamSheet, data.teamId);
  if (!tFound) return errorResponse('TEAM_NOT_FOUND', 'Không tìm thấy đội');
  const team = tFound.data;

  const awardTitle = data.awardTitle || (team.rank === 1 ? `${session.gameSlug.toUpperCase()} CHAMPION` : 'EDUPLAY HONORABLE AWARD');

  // 2. Chống tạo trùng cùng (sessionId, teamId, awardTitle)
  const existing = findRowsByField(certSheet, 'sessionId', data.sessionId);
  const duplicate = existing.find(c => c.data.teamId === team.id && c.data.awardTitle === awardTitle);
  if (duplicate) {
    return successResponse(duplicate.data, 'Giấy chứng nhận cho đội đã tồn tại');
  }

  // 3. Sinh Certificate Code
  const certCode = `EDUPLAY-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

  const certObj = {
    id: generateId('cert'),
    sessionId: session.id,
    gameSlug: session.gameSlug,
    teamId: team.id,
    teamCode: team.teamCode,
    teamName: team.teamName,
    awardTitle: awardTitle,
    finalScore: Number(team.score) || 0,
    rank: Number(team.rank) || 1,
    teacherName: session.teacherName || 'Giáo viên bộ môn',
    className: session.className || '5A',
    schoolName: session.schoolName || 'Trường Tiểu học',
    certificateCode: certCode,
    issuedAt: getCurrentTimestamp()
  };

  appendObject(certSheet, certObj);
  appendLog('INFO', 'CERTIFICATE', 'CERTIFICATE_CREATED', `Cấp chứng nhận ${awardTitle} cho ${team.teamName} (Mã: ${certCode})`, session.id, certObj);

  return successResponse(certObj, 'Đã tạo giấy chứng nhận thành công cho Đội');
}

function apiListCertificatesBySession(data) {
  requireFields(data, ['sessionId']);
  const sheet = getSheet('CERTIFICATES');
  const rows = findRowsByField(sheet, 'sessionId', data.sessionId).map(r => r.data);
  return successResponse(rows);
}

function apiGetCertificate(data) {
  requireFields(data, ['id']);
  const sheet = getSheet('CERTIFICATES');
  const found = findRowById(sheet, data.id);
  if (!found) return errorResponse('CERTIFICATE_NOT_FOUND', 'Không tìm thấy giấy chứng nhận');
  return successResponse(found.data);
}

// ==========================================
// 23. APP LOGS API
// ==========================================

function apiListAppLogs(data) {
  const sheet = getSheet('APP_LOGS');
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return successResponse([]);
  const headers = getHeaders(sheet);
  const rows = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  let list = rows.map(r => rowToObject(headers, r)).reverse();

  if (data.sessionId) {
    list = list.filter(l => l.sessionId === data.sessionId);
  }
  if (data.level) {
    list = list.filter(l => l.level === data.level);
  }

  return successResponse(list.slice(0, 100));
}

// ==========================================
// 24. CORE SETUP DATABASE & MIGRATION
// ==========================================

function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let createdCount = 0;
  let updatedCount = 0;

  Object.keys(EDUPLAY_SCHEMAS).forEach(sheetName => {
    const expectedHeaders = EDUPLAY_SCHEMAS[sheetName];
    const isNew = ss.getSheetByName(sheetName) === null;
    const sheet = getOrCreateSheet(ss, sheetName, expectedHeaders);

    ensureHeaders(sheet, expectedHeaders);
    formatSheetHeader(sheet, expectedHeaders.length);

    if (isNew) {
      createdCount++;
    } else {
      updatedCount++;
    }
  });

  ensureDataValidation(ss);

  seedSettings(ss);
  seedGameCatalog(ss);
  seedQuestionBanks(ss);
  seedQuestions(ss);

  appendLog('INFO', 'SYSTEM', 'setupDatabase', `Khởi tạo/Cập nhật hoàn tất: ${createdCount} bảng mới, ${updatedCount} bảng cập nhật.`, '', {
    createdCount: createdCount,
    updatedCount: updatedCount,
    totalSchemas: Object.keys(EDUPLAY_SCHEMAS).length
  });

  try {
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      '🎓 EDUPLAY - KHỞI TẠO DATABASE & API THÀNH CÔNG!',
      `Đã chuẩn hóa thành công 18 bảng dữ liệu theo mô hình ĐỘI (2–4 đội):\n` +
      `• Tạo mới: ${createdCount} bảng\n` +
      `• Cập nhật cấu trúc: ${updatedCount} bảng\n` +
      `• Đã nạp 6 game chính thức & 15 câu hỏi Tin học 5 chuẩn.\n` +
      `• Web App REST API sẵn sàng phục vụ doGet / doPost.\n` +
      `• Không quản lý học sinh (Students/Participants không sử dụng).`,
      ui.ButtonSet.OK
    );
  } catch (e) {
    Logger.log('Đã chạy xong setupDatabase');
  }
}

function migrateLegacyDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let logMessages = [];

  const catalogSheet = ss.getSheetByName('GAME_CATALOG');
  if (catalogSheet) {
    const lastRow = catalogSheet.getLastRow();
    if (lastRow > 1) {
      const data = catalogSheet.getRange(2, 1, lastRow - 1, catalogSheet.getLastColumn()).getValues();
      const headers = catalogSheet.getRange(1, 1, 1, catalogSheet.getLastColumn()).getValues()[0];
      const slugCol = headers.indexOf('slug');
      const enabledCol = headers.indexOf('enabled');
      const updatedAtCol = headers.indexOf('updatedAt');

      if (slugCol !== -1 && enabledCol !== -1) {
        for (let i = 0; i < data.length; i++) {
          const rowSlug = String(data[i][slugCol]);
          if (rowSlug === 'quiz-battle' || rowSlug === 'quiz_battle') {
            catalogSheet.getRange(i + 2, enabledCol + 1).setValue(false);
            if (updatedAtCol !== -1) {
              catalogSheet.getRange(i + 2, updatedAtCol + 1).setValue(getCurrentTimestamp());
            }
            logMessages.push('Đã vô hiệu hóa game cũ: quiz-battle (enabled = FALSE)');
          }
        }
      }
    }
  }

  seedGameCatalog(ss);
  logMessages.push('Đã đồng bộ lại 6 game chính thức (kèm smile-race).');

  const legacySheets = ['STUDENTS', 'PARTICIPANTS'];
  legacySheets.forEach(name => {
    const oldSheet = ss.getSheetByName(name);
    if (oldSheet) {
      logMessages.push(`Bảng cũ [${name}] được bảo lưu an toàn (không dùng trong logic mới).`);
    }
  });

  appendLog('INFO', 'SYSTEM', 'migrateLegacyDatabase', 'Chạy migration hoàn tất.', '', logMessages);

  try {
    SpreadsheetApp.getUi().alert(
      '🔄 MIGRATION HOÀN TẤT!',
      logMessages.join('\n'),
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (e) {
    Logger.log('Migration completed: ' + JSON.stringify(logMessages));
  }
}

// ==========================================
// 25. FORMATTING & SEED HELPERS
// ==========================================

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

  try {
    const filter = sheet.getFilter();
    if (!filter) {
      sheet.getRange(1, 1, Math.max(sheet.getLastRow(), 2), numColumns).createFilter();
    }
  } catch (e) {}

  for (let c = 1; c <= Math.min(numColumns, 20); c++) {
    try {
      sheet.autoResizeColumn(c);
      if (sheet.getColumnWidth(c) < 80) {
        sheet.setColumnWidth(c, 100);
      }
    } catch (err) {}
  }
}

function getCurrentTimestamp() {
  return Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function generateId(prefix) {
  const cleanPrefix = prefix ? (prefix.endsWith('_') ? prefix : prefix + '_') : '';
  return cleanPrefix + Utilities.getUuid().replace(/-/g, '').substring(0, 16);
}

function generateSessionCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generateCertificateCode() {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `EDUPLAY-2026-${num}`;
}

function appendLog(level, module, action, message, sessionId, payload) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('APP_LOGS');
    if (!sheet) return;

    const row = [
      generateId('log'),
      level || 'INFO',
      module || 'SYSTEM',
      action || '',
      message || '',
      sessionId || '',
      payload ? (typeof payload === 'string' ? payload : JSON.stringify(payload)) : '',
      getCurrentTimestamp()
    ];
    sheet.appendRow(row);
  } catch (e) {
    Logger.log('Không thể ghi log: ' + e.toString());
  }
}

function getExistingColumnValues(sheet, columnIndex) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  const range = sheet.getRange(2, columnIndex, lastRow - 1, 1);
  return range.getValues().map(row => String(row[0])).filter(val => val !== '');
}

function seedSettings(ss) {
  const sheet = ss.getSheetByName('SETTINGS');
  if (!sheet) return;

  const defaults = [
    { key: 'platformName', value: 'EDUPLAY', category: 'BRAND', description: 'Tên nền tảng tương tác lớp học' },
    { key: 'platformSubtitle', value: 'Hệ thống trò chơi tương tác lớp học', category: 'BRAND', description: 'Khẩu hiệu nền tảng' },
    { key: 'defaultLanguage', value: 'vi', category: 'LOCALIZATION', description: 'Ngôn ngữ mặc định (vi/en)' },
    { key: 'minTeams', value: '2', category: 'GAMEPLAY', description: 'Số lượng đội tối thiểu' },
    { key: 'maxTeams', value: '4', category: 'GAMEPLAY', description: 'Số lượng đội tối đa' },
    { key: 'defaultQuestionCount', value: '15', category: 'GAMEPLAY', description: 'Số lượng câu hỏi mặc định mỗi trận' },
    { key: 'defaultCorrectPoints', value: '10', category: 'GAMEPLAY', description: 'Điểm cộng khi trả lời đúng' },
    { key: 'defaultSpecialPoints', value: '20', category: 'GAMEPLAY', description: 'Điểm cộng câu hỏi ngôi sao đặc biệt' },
    { key: 'defaultStealRatio', value: '0.5', category: 'GAMEPLAY', description: 'Tỉ lệ điểm cướp (10 -> 5, 20 -> 10)' },
    { key: 'defaultCountdownSeconds', value: '3', category: 'GAMEPLAY', description: 'Thời gian đếm ngược bắt đầu vòng thi (giây)' },
    { key: 'enableSound', value: 'TRUE', category: 'SYSTEM', description: 'Bật/tắt hiệu ứng âm thanh và nhạc nền' },
    { key: 'enableAnimation', value: 'TRUE', category: 'SYSTEM', description: 'Bật/tắt hiệu ứng chuyển cảnh và pháo hoa' },
    { key: 'enableCertificate', value: 'TRUE', category: 'SYSTEM', description: 'Tự động tạo giấy chứng nhận theo Đội' },
    { key: 'camRaceTieThresholdMs', value: '200', category: 'CAM_RACE', description: 'Độ trễ mili-giây tối đa để tính hòa giơ thẻ' },
    { key: 'camRaceFreezeMs', value: '1500', category: 'CAM_RACE', description: 'Thời gian đóng băng sau khi nhận diện thẻ (ms)' },
    { key: 'smileRaceTieThresholdMs', value: '200', category: 'SMILE_RACE', description: 'Độ trễ mili-giây tối đa tính hòa nụ cười' },
    { key: 'smileRaceGestureThreshold', value: '0.60', category: 'SMILE_RACE', description: 'Ngưỡng nụ cười mở rộng nhận diện' },
    { key: 'smileRaceStableFrames', value: '4', category: 'SMILE_RACE', description: 'Số khung hình liên tiếp đạt chuẩn' },
    { key: 'smileRaceMaxStealAttempts', value: '1', category: 'SMILE_RACE', description: 'Số lần cho phép cướp quyền trả lời' },
    { key: 'fastestHandLockOnFirstBuzz', value: 'TRUE', category: 'FASTEST_HAND', description: 'Khóa chuông ngay sau lần bấm đầu tiên hợp lệ' }
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
    {
      id: 'game_camrace',
      slug: 'cam-race',
      name: 'CAM RACE',
      description: 'Đại chiến Webcam: Nhận diện thẻ màu BLUE / ORANGE bằng Computer Vision cực nhanh.',
      category: 'Vận động & AI',
      minTeams: 2,
      maxTeams: 2,
      supportsQuestions: true,
      supportsCamera: true,
      supportsScore: true,
      supportsCertificate: true,
      enabled: true,
      featured: true,
      sortOrder: 1
    },
    {
      id: 'game_smilerace',
      slug: 'smile-race',
      name: 'SMILE RACE',
      description: 'Đấu trường Nụ cười: Nhận diện nụ cười rạng rỡ của 2–4 đội qua camera phân vùng đa luồng.',
      category: 'Vận động & AI',
      minTeams: 2,
      maxTeams: 4,
      supportsQuestions: true,
      supportsCamera: true,
      supportsScore: true,
      supportsCertificate: true,
      enabled: true,
      featured: true,
      sortOrder: 2
    },
    {
      id: 'game_luckywheel',
      slug: 'lucky-wheel',
      name: 'LUCKY WHEEL',
      description: 'Vòng quay May mắn: Quay chọn đội trả lời, tặng điểm thưởng hoặc thử thách hoạt náo.',
      category: 'May mắn & Hoạt náo',
      minTeams: 2,
      maxTeams: 4,
      supportsQuestions: false,
      supportsCamera: false,
      supportsScore: true,
      supportsCertificate: false,
      enabled: true,
      featured: true,
      sortOrder: 3
    },
    {
      id: 'game_fastesthand',
      slug: 'fastest-hand',
      name: 'FASTEST HAND',
      description: 'Ai nhanh hơn: Bấm chuông điện tử đo thời gian phản xạ (mili-giây) chính xác giữa các đội.',
      category: 'Phản xạ & Tốc độ',
      minTeams: 2,
      maxTeams: 4,
      supportsQuestions: true,
      supportsCamera: false,
      supportsScore: true,
      supportsCertificate: true,
      enabled: true,
      featured: false,
      sortOrder: 4
    },
    {
      id: 'game_randompicker',
      slug: 'random-team-picker',
      name: 'RANDOM TEAM PICKER',
      description: 'Chọn đội ngẫu nhiên: Vòng quay và hiệu ứng bốc thăm chọn đội công bằng, minh bạch.',
      category: 'Lựa chọn',
      minTeams: 2,
      maxTeams: 4,
      supportsQuestions: false,
      supportsCamera: false,
      supportsScore: false,
      supportsCertificate: false,
      enabled: true,
      featured: false,
      sortOrder: 5
    },
    {
      id: 'game_teamchallenge',
      slug: 'team-challenge',
      name: 'TEAM CHALLENGE',
      description: 'Thử thách đồng đội: Bảng điểm thi đua các đội trực tiếp trên máy chiếu 16:9 sắc nét.',
      category: 'Thi đua nhóm',
      minTeams: 2,
      maxTeams: 4,
      supportsQuestions: false,
      supportsCamera: false,
      supportsScore: true,
      supportsCertificate: true,
      enabled: true,
      featured: false,
      sortOrder: 6
    }
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
    bankCode: 'TINHOC5_DEMO',
    name: 'Tin học lớp 5 – Bộ câu hỏi demo',
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
      defaultBank.id, defaultBank.bankCode, defaultBank.name, defaultBank.subject,
      defaultBank.grade, defaultBank.topic, defaultBank.description,
      defaultBank.questionCount, defaultBank.enabled,
      getCurrentTimestamp(), getCurrentTimestamp()
    ];
    sheet.appendRow(row);
  }
}

function seedQuestions(ss) {
  const sheet = ss.getSheetByName('QUESTIONS');
  if (!sheet) return;

  const questionsList = [
    {
      order: 1,
      topic: 'Máy tính & Phần cứng',
      questionType: 'multiple_choice',
      question: 'Thiết bị nào sau đây được dùng để nhập dữ liệu vào máy tính?',
      optionA: 'Màn hình máy tính',
      optionB: 'Bàn phím và chuột',
      optionC: 'Loa và tai nghe',
      optionD: 'Máy in màu',
      correctAnswer: 'B',
      explanation: 'Bàn phím và chuột là thiết bị vào (input) truyền thông tin vào máy tính.',
      difficulty: 'EASY',
      isSpecial: false,
      tags: 'thiet_bi,phan_cung,lop5'
    },
    {
      order: 2,
      topic: 'Tệp & Thư mục',
      questionType: 'multiple_choice',
      question: 'Trong máy tính, tệp tin thường được lưu trữ bên trong:',
      optionA: 'Thư mục (Folder)',
      optionB: 'Chuột máy tính',
      optionC: 'Dây nguồn',
      optionD: 'Bàn phím',
      correctAnswer: 'A',
      explanation: 'Thư mục (Folder) dùng để lưu trữ và phân loại các tệp tin một cách khoa học.',
      difficulty: 'EASY',
      isSpecial: false,
      tags: 'tep,thu_muc'
    },
    {
      order: 3,
      topic: 'Internet & Trình duyệt',
      questionType: 'multiple_choice',
      question: 'Phần mềm nào dưới đây là một trình duyệt web giúp em xem thông tin trên Internet?',
      optionA: 'Paint',
      optionB: 'Scratch 3.0',
      optionC: 'Google Chrome',
      optionD: 'Windows Media Player',
      correctAnswer: 'C',
      explanation: 'Google Chrome là trình duyệt web giúp truy cập các trang mạng trên Internet.',
      difficulty: 'EASY',
      isSpecial: false,
      tags: 'internet,trinh_duyet'
    },
    {
      order: 4,
      topic: 'An toàn mạng & Mật khẩu',
      questionType: 'multiple_choice',
      question: 'Mật khẩu nào sau đây được coi là an toàn và khó bị đoán nhất?',
      optionA: '123456',
      optionB: 'tenem123',
      optionC: 'Lop5A@2026!#',
      optionD: '00000000',
      correctAnswer: 'C',
      explanation: 'Mật khẩu mạnh bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.',
      difficulty: 'MEDIUM',
      isSpecial: false,
      tags: 'an_toan_mang,mat_khau'
    },
    {
      order: 5,
      topic: 'Lập trình Scratch',
      questionType: 'multiple_choice',
      question: 'Trong phần mềm Scratch, nhân vật được gọi bằng thuật ngữ tiếng Anh là gì?',
      optionA: 'Backdrop',
      optionB: 'Sprite',
      optionC: 'Block',
      optionD: 'Stage',
      correctAnswer: 'B',
      explanation: 'Sprite là từ dùng để chỉ nhân vật chuyển động trong phần mềm Scratch.',
      difficulty: 'EASY',
      isSpecial: false,
      tags: 'scratch,sprite'
    },
    {
      order: 6,
      topic: 'Lập trình Scratch',
      questionType: 'multiple_choice',
      question: 'Khối lệnh nào trong Scratch giúp nhân vật lặp lại một chuỗi hành động nhiều lần?',
      optionA: 'Khối lệnh [repeat / lặp lại]',
      optionB: 'Khối lệnh [say / nói]',
      optionC: 'Khối lệnh [stop / dừng lại]',
      optionD: 'Khối lệnh [next costume]',
      correctAnswer: 'A',
      explanation: 'Khối lệnh [repeat] dùng để tạo vòng lặp hữu hạn hành động.',
      difficulty: 'MEDIUM',
      isSpecial: false,
      tags: 'scratch,vong_lap'
    },
    {
      order: 7,
      topic: 'Thông tin cá nhân',
      questionType: 'multiple_choice',
      question: 'Thông tin nào sau đây TUYỆT ĐỐI KHÔNG nên công khai cho người lạ trên mạng xã hội?',
      optionA: 'Tên bài hát em yêu thích',
      optionB: 'Màu sắc yêu thích',
      optionC: 'Địa chỉ nhà ở và mật khẩu tài khoản',
      optionD: 'Tên nhân vật hoạt hình',
      correctAnswer: 'C',
      explanation: 'Địa chỉ nhà ở và mật khẩu là thông tin bảo mật tuyệt đối, không được chia sẻ.',
      difficulty: 'EASY',
      isSpecial: false,
      tags: 'thong_tin_ca_nhan,an_toan'
    },
    {
      order: 8,
      topic: 'Thiết bị số',
      questionType: 'multiple_choice',
      question: 'Thiết bị nào sau đây là thiết bị lưu trữ dữ liệu di động phổ biến?',
      optionA: 'Bàn phím cơ',
      optionB: 'Thẻ nhớ / Ổ USB flash drive',
      optionC: 'Máy quét (Scanner)',
      optionD: 'Microphone',
      correctAnswer: 'B',
      explanation: 'USB và thẻ nhớ là thiết bị lưu trữ dữ liệu di động nhỏ gọn.',
      difficulty: 'EASY',
      isSpecial: false,
      tags: 'thiet_bi_so,usb'
    },
    {
      order: 9,
      topic: 'Tệp & Đuôi mở rộng',
      questionType: 'multiple_choice',
      question: 'Tệp có phần mở rộng là .docx hoặc .doc thường là loại tệp gì?',
      optionA: 'Tệp video',
      optionB: 'Tệp âm thanh',
      optionC: 'Tệp văn bản Word',
      optionD: 'Tệp hình ảnh',
      correctAnswer: 'C',
      explanation: '.docx là định dạng tệp tài liệu văn bản Microsoft Word.',
      difficulty: 'MEDIUM',
      isSpecial: false,
      tags: 'tep,duoi_mo_rong'
    },
    {
      order: 10,
      topic: 'Lập trình & Thuật toán',
      questionType: 'multiple_choice',
      question: '★ [CÂU ĐẶC BIỆT] Khi gặp khối lệnh [Forever] (Liên tục) trong Scratch, khối lệnh bên trong sẽ:',
      optionA: 'Chỉ thực hiện đúng 1 lần',
      optionB: 'Thực hiện lặp lại mãi mãi cho đến khi dừng chương trình',
      optionC: 'Biến mất khỏi màn hình',
      optionD: 'Báo lỗi và tắt máy',
      correctAnswer: 'B',
      explanation: 'Forever là vòng lặp vô hạn, lệnh lặp lại liên tục cho đến khi nhấn nút đỏ dừng lại.',
      difficulty: 'HARD',
      isSpecial: true,
      tags: 'scratch,vong_lap,dac_biet'
    },
    {
      order: 11,
      topic: 'An toàn mạng',
      questionType: 'multiple_choice',
      question: 'Khi đang lướt web, bất ngờ xuất hiện thông báo "Bạn trúng thưởng 100 triệu", em nên làm gì?',
      optionA: 'Bấm vào ngay để nhận thưởng',
      optionB: 'Chia sẻ cho bạn bè',
      optionC: 'Không bấm vào liên kết lạ, đóng trang web và báo thầy cô/bố mẹ',
      optionD: 'Nhập số điện thoại',
      correctAnswer: 'C',
      explanation: 'Đó là chiêu trò lừa đảo qua mạng, tuyệt đối không click hay cung cấp thông tin.',
      difficulty: 'MEDIUM',
      isSpecial: false,
      tags: 'an_toan_mang,lua_dao'
    },
    {
      order: 12,
      topic: 'Thiết bị số & Bản quyền',
      questionType: 'multiple_choice',
      question: 'Hành động nào thể hiện văn hóa ứng xử văn minh và tôn trọng bản quyền số?',
      optionA: 'Tự nhận sản phẩm của người khác là của mình',
      optionB: 'Ghi rõ nguồn tác giả khi sử dụng hình ảnh tham khảo',
      optionC: 'Tải phần mềm lậu',
      optionD: 'Đăng bình luận khiếm nhã',
      correctAnswer: 'B',
      explanation: 'Ghi rõ nguồn tác giả là biểu hiện của sự tôn trọng quyền sở hữu trí tuệ.',
      difficulty: 'MEDIUM',
      isSpecial: false,
      tags: 'ban_quyen,van_hoa_so'
    },
    {
      order: 13,
      topic: 'Lập trình Scratch',
      questionType: 'multiple_choice',
      question: 'Để nhân vật mèo Scratch kêu tiếng "Meow", ta dùng khối lệnh thuộc nhóm nào?',
      optionA: 'Âm thanh (Sound)',
      optionB: 'Bút vẽ (Pen)',
      optionC: 'Cảm biến (Sensing)',
      optionD: 'Các phép toán',
      correctAnswer: 'A',
      explanation: 'Nhóm Sound quản lý phát các tệp âm thanh trong Scratch.',
      difficulty: 'EASY',
      isSpecial: false,
      tags: 'scratch,am_thanh'
    },
    {
      order: 14,
      topic: 'Máy tính & Hệ điều hành',
      questionType: 'multiple_choice',
      question: 'Phần mềm nền tảng quản lý toàn bộ phần cứng và phần mềm máy tính được gọi là gì?',
      optionA: 'Hệ điều hành (Ví dụ: Windows, macOS)',
      optionB: 'Phần mềm chơi game',
      optionC: 'Bộ gõ Unikey',
      optionD: 'Trình phát video',
      correctAnswer: 'A',
      explanation: 'Hệ điều hành quản trị toàn bộ hoạt động của thiết bị phần cứng và phần mềm.',
      difficulty: 'MEDIUM',
      isSpecial: false,
      tags: 'he_dieu_hanh,windows'
    },
    {
      order: 15,
      topic: 'Tư duy máy tính & Thuật toán',
      questionType: 'multiple_choice',
      question: '★ [CÂU ĐẶC BIỆT] Trong lập trình, khái niệm "Thuật toán" (Algorithm) có thể hiểu là:',
      optionA: 'Một chiếc máy tính rất mạnh',
      optionB: 'Dãy các bước rõ ràng, tuần tự để giải quyết một bài toán hay nhiệm vụ',
      optionC: 'Một lỗi bàn phím',
      optionD: 'Mật khẩu wifi',
      correctAnswer: 'B',
      explanation: 'Thuật toán là tập hợp các chỉ dẫn hữu hạn, rõ ràng, được thực hiện theo trình tự.',
      difficulty: 'HARD',
      isSpecial: true,
      tags: 'thuat_toan,tu_duy,dac_biet'
    }
  ];

  const bankId = 'bank_tinhoc5_demo';
  const lastRow = sheet.getLastRow();
  const existingOrders = [];

  if (lastRow > 1) {
    const range = sheet.getRange(2, 2, lastRow - 1, 2);
    range.getValues().forEach(row => {
      if (row[0] === bankId && row[1] !== '') {
        existingOrders.push(Number(row[1]));
      }
    });
  }

  const toAdd = questionsList
    .filter(q => !existingOrders.includes(q.order))
    .map(q => [
      generateId('q'),
      bankId,
      q.order,
      'Tin học',
      5,
      q.topic,
      q.questionType,
      q.question,
      q.optionA,
      q.optionB,
      q.optionC,
      q.optionD,
      q.correctAnswer,
      q.explanation,
      q.difficulty,
      10, // normalPoints
      20, // specialPoints
      q.isSpecial,
      true, // enabled
      q.tags,
      getCurrentTimestamp(),
      getCurrentTimestamp()
    ]);

  if (toAdd.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, toAdd.length, toAdd[0].length).setValues(toAdd);
  }
}

function ensureDataValidation(ss) {
  try {
    setListValidation(ss, 'GAME_SESSIONS', 'M', ['2', '3', '4']);
    setListValidation(ss, 'GAME_SESSIONS', 'N', ['READY', 'PLAYING', 'PAUSED', 'FINISHED', 'CANCELLED']);

    setListValidation(ss, 'QUESTIONS', 'G', ['multiple_choice', 'true_false', 'short_answer', 'fill_blank', 'sorting', 'drag_drop']);
    setListValidation(ss, 'QUESTIONS', 'O', ['EASY', 'MEDIUM', 'HARD']);
    setBooleanValidation(ss, 'QUESTIONS', ['R', 'S']);

    setListValidation(ss, 'CAM_RACE_RESULTS', 'L', ['CAMERA', 'MANUAL']);
    setListValidation(ss, 'SMILE_RACE_RESULTS', 'M', ['CAMERA', 'MANUAL']);

    setListValidation(ss, 'LUCKY_WHEEL_HISTORY', 'D', ['TEAM', 'QUESTION', 'REWARD', 'CHALLENGE', 'POINTS']);
    setListValidation(ss, 'RANDOM_TEAM_HISTORY', 'D', ['TEAM', 'QUESTION', 'CHALLENGE', 'REWARD']);

    setListValidation(ss, 'IMPORT_HISTORY', 'B', ['QUESTIONS', 'TEAMS']);
    setListValidation(ss, 'IMPORT_HISTORY', 'D', ['CSV', 'XLSX', 'XLS']);
    setListValidation(ss, 'IMPORT_HISTORY', 'K', ['CREATE', 'SKIP', 'UPDATE']);

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

function showDatabaseSummary() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let summary = '📊 TỔNG QUAN HỆ THỐNG EDUPLAY (THEO ĐỘI):\n\n';

  const metrics = [
    { label: 'Trò chơi (Games)', sheet: 'GAME_CATALOG' },
    { label: 'Lớp học (Classes)', sheet: 'CLASSES' },
    { label: 'Ngân hàng câu hỏi (Banks)', sheet: 'QUESTION_BANKS' },
    { label: 'Câu hỏi (Questions)', sheet: 'QUESTIONS' },
    { label: 'Phiên chơi (Game Sessions)', sheet: 'GAME_SESSIONS' },
    { label: 'Đội thi đấu (Teams)', sheet: 'TEAMS' },
    { label: 'Sự kiện điểm (Score Events)', sheet: 'SCORE_EVENTS' },
    { label: 'Kết quả trận (Game Results)', sheet: 'GAME_RESULTS' },
    { label: 'Kết quả Cam Race', sheet: 'CAM_RACE_RESULTS' },
    { label: 'Kết quả Smile Race', sheet: 'SMILE_RACE_RESULTS' },
    { label: 'Kết quả Fastest Hand', sheet: 'FASTEST_HAND_RESULTS' },
    { label: 'Lịch sử Vòng quay (Lucky Wheel)', sheet: 'LUCKY_WHEEL_HISTORY' },
    { label: 'Lịch sử Bốc thăm (Random Team)', sheet: 'RANDOM_TEAM_HISTORY' },
    { label: 'Kết quả Team Challenge', sheet: 'TEAM_CHALLENGE_RESULTS' },
    { label: 'Giấy chứng nhận (Certificates)', sheet: 'CERTIFICATES' },
    { label: 'Lịch sử Import dữ liệu', sheet: 'IMPORT_HISTORY' },
    { label: 'Nhật ký ứng dụng (App Logs)', sheet: 'APP_LOGS' }
  ];

  metrics.forEach(m => {
    const sheet = ss.getSheetByName(m.sheet);
    const count = sheet ? Math.max(0, sheet.getLastRow() - 1) : 'Chưa tạo';
    summary += `• ${m.label.padEnd(30, ' ')}: ${count} bản ghi\n`;
  });

  summary += '\n* Chế độ: Quản lý Đội độc lập (2-4 Đội), bảo vệ tính riêng tư học sinh.';

  try {
    SpreadsheetApp.getUi().alert('TỔNG QUAN DATABASE EDUPLAY', summary, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {
    Logger.log(summary);
  }
}

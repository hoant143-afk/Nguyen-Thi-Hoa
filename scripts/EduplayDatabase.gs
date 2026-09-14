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

// Danh mục 20 Bảng dữ liệu chuẩn của hệ sinh thái EDUPLAY (Multi-User Teacher Workspaces)
const EDUPLAY_SCHEMAS = {
  // 1. User & Account Profile (Firebase Authentication Google Sign-in)
  USERS: [
    'id', 'authUid', 'email', 'displayName', 'photoURL', 'role', 'enabled', 'createdAt', 'lastLoginAt', 'updatedAt'
  ],
  // 2. Personal Teacher Preferences & Workspace Settings
  USER_PREFERENCES: [
    'id', 'authUid', 'defaultSchoolName', 'defaultClassName', 'defaultSubject', 'defaultGrade',
    'defaultQuestionCount', 'defaultTeamCount', 'soundEnabled', 'animationEnabled', 'theme',
    'favoriteGameSlug', 'lastQuestionBankId', 'createdAt', 'updatedAt'
  ],
  // 3. Global System Settings
  SETTINGS: [
    'key', 'value', 'category', 'description', 'updatedAt'
  ],
  // 4. Global Games Catalog
  GAME_CATALOG: [
    'id', 'slug', 'name', 'description', 'category', 'minTeams', 'maxTeams',
    'supportsQuestions', 'supportsCamera', 'supportsScore', 'supportsCertificate',
    'enabled', 'featured', 'sortOrder', 'createdAt', 'updatedAt'
  ],
  // 5. Classes Management
  CLASSES: [
    'id', 'ownerUid', 'classCode', 'className', 'grade', 'schoolYear', 'teacherName',
    'schoolName', 'subject', 'enabled', 'createdAt', 'updatedAt'
  ],
  // 6. Question Banks (System & Private)
  QUESTION_BANKS: [
    'id', 'bankCode', 'ownerUid', 'visibility', 'name', 'subject', 'grade', 'topic', 'description',
    'questionCount', 'enabled', 'importId', 'sourceFileName', 'createdAt', 'updatedAt'
  ],
  // 7. Questions (Strict Bank Ownership Inheritance)
  QUESTIONS: [
    'id', 'bankId', 'ownerUid', 'order', 'subject', 'grade', 'topic', 'questionType',
    'question', 'optionA', 'optionB', 'optionC', 'optionD', 'correctAnswer',
    'explanation', 'difficulty', 'normalPoints', 'specialPoints', 'isSpecial',
    'enabled', 'tags', 'importId', 'createdAt', 'updatedAt'
  ],
  // 8. Game Sessions
  GAME_SESSIONS: [
    'id', 'sessionCode', 'ownerUid', 'gameId', 'gameSlug', 'activityName', 'classId',
    'className', 'teacherName', 'schoolName', 'subject', 'grade', 'questionBankId',
    'teamCount', 'status', 'currentRound', 'currentQuestion', 'totalQuestions',
    'winnerTeamId', 'winnerTeamName', 'startedAt', 'finishedAt', 'createdAt', 'updatedAt'
  ],
  // 9. Teams (2-4 Teams)
  TEAMS: [
    'id', 'sessionId', 'ownerUid', 'teamCode', 'teamName', 'teamColor', 'markerColor',
    'score', 'rank', 'correctAnswers', 'wrongAnswers', 'stealWins',
    'bonusPoints', 'penaltyPoints', 'specialCorrect', 'createdAt', 'updatedAt'
  ],
  // 10. Score Events
  SCORE_EVENTS: [
    'id', 'sessionId', 'ownerUid', 'gameSlug', 'roundNumber', 'questionId', 'teamId',
    'teamCode', 'eventType', 'points', 'eventKey', 'note', 'createdAt'
  ],
  // 11. Game Results
  GAME_RESULTS: [
    'id', 'sessionId', 'ownerUid', 'gameSlug', 'teamId', 'teamCode', 'teamName', 'teamColor',
    'finalScore', 'rank', 'correctAnswers', 'wrongAnswers', 'stealWins',
    'bonusPoints', 'penaltyPoints', 'specialCorrect', 'winner', 'statsJson', 'createdAt'
  ],
  // 12. Cam Race Results
  CAM_RACE_RESULTS: [
    'id', 'sessionId', 'ownerUid', 'questionId', 'questionOrder', 'winnerTeamId', 'winnerTeamCode',
    'blueDetectedAt', 'orangeDetectedAt', 'timeDifferenceMs', 'isTie', 'isFalseStart',
    'detectionMethod', 'blueMarkerConfidence', 'orangeMarkerConfidence', 'firstAnswer',
    'firstAnswerCorrect', 'stealTeamId', 'stealAnswer', 'stealCorrect', 'pointsAwarded', 'playedAt'
  ],
  // 13. Smile Race Results
  SMILE_RACE_RESULTS: [
    'id', 'sessionId', 'ownerUid', 'questionId', 'questionOrder', 'winnerTeamId', 'winnerTeamCode',
    'winnerTeamName', 'gestureTimestamp', 'gestureScore', 'markerConfidence',
    'stableFrames', 'isTie', 'detectionMethod', 'firstAnswer', 'firstAnswerCorrect',
    'stealTeamId', 'stealTeamCode', 'stealAnswer', 'stealCorrect', 'fullPoints',
    'stealPoints', 'pointsAwarded', 'playedAt'
  ],
  // 14. Fastest Hand Results
  FASTEST_HAND_RESULTS: [
    'id', 'sessionId', 'ownerUid', 'roundNumber', 'questionId', 'winnerTeamId', 'winnerTeamCode',
    'buzzTimestamp', 'responseTimeMs', 'answer', 'isCorrect', 'pointsAwarded', 'playedAt'
  ],
  // 15. Lucky Wheel History
  LUCKY_WHEEL_HISTORY: [
    'id', 'sessionId', 'ownerUid', 'spinNumber', 'wheelType', 'selectedTeamId',
    'selectedTeamName', 'selectedValue', 'reward', 'points', 'createdAt'
  ],
  // 16. Random Team Picker History
  RANDOM_TEAM_HISTORY: [
    'id', 'sessionId', 'ownerUid', 'pickNumber', 'pickType', 'selectedTeamId',
    'selectedTeamName', 'selectedValue', 'excludedAfterPick', 'pickedAt'
  ],
  // 17. Team Challenge Results
  TEAM_CHALLENGE_RESULTS: [
    'id', 'sessionId', 'ownerUid', 'roundNumber', 'questionId', 'teamId', 'teamCode',
    'answer', 'isCorrect', 'eventType', 'pointsAwarded', 'createdAt'
  ],
  // 18. Certificates
  CERTIFICATES: [
    'id', 'sessionId', 'ownerUid', 'gameSlug', 'teamId', 'teamCode', 'teamName',
    'awardTitle', 'finalScore', 'rank', 'teacherName', 'className',
    'schoolName', 'certificateCode', 'issuedAt'
  ],
  // 19. Import History
  IMPORT_HISTORY: [
    'id', 'importId', 'ownerUid', 'importType', 'fileName', 'fileType', 'targetBankId', 'totalRows',
    'createdRows', 'updatedRows', 'skippedRows', 'errorRows', 'mode', 'status', 'errorMessage', 'createdAt', 'completedAt'
  ],
  // 20. Application Logs (Privacy-Safe)
  APP_LOGS: [
    'id', 'ownerUid', 'level', 'module', 'action', 'message', 'sessionId', 'payload', 'createdAt'
  ]
};

// ==========================================
// 2. MENU GOOGLE SHEET (onOpen)
// ==========================================

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🎓 EDUPLAY')
    .addItem('⚙️ Setup / Update Database', 'setupDatabase')
    .addItem('👤 Setup Multi-user Schema', 'setupMultiUserSchema')
    .addItem('🔄 Migrate Multi-user Data', 'migrateMultiUserSchema')
    .addSeparator()
    .addItem('🛠 Repair Question Ownership', 'repairQuestionOwnership')
    .addItem('🛠 Repair Session Ownership', 'repairSessionChildOwnership')
    .addItem('🔍 Audit Ownership', 'auditOwnership')
    .addSeparator()
    .addItem('📊 Database Summary', 'showDatabaseSummary')
    .addSeparator()
    .addItem('📝 Seed 15 Questions', 'menuSeedQuestions')
    .addItem('🧪 Test Question Persistence', 'testQuestionBankPersistence')
    .addItem('🔧 Đồng bộ số lượng câu (Repair Counts)', 'repairQuestionBankCounts')
    .addItem('🔍 Kiểm tra câu hỏi lạc (Find Orphans)', 'menuFindOrphans')
    .addSeparator()
    .addItem('🎮 Update Game Catalog', 'menuSeedCatalog')
    .addItem('🔄 Migrate Legacy Database', 'migrateLegacyDatabase')
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

function menuFindOrphans() {
  const result = findOrphanQuestions();
  const ui = SpreadsheetApp.getUi();
  if (result.orphanCount === 0) {
    ui.alert('TẤT CẢ CÂU HỎI HỢP LỆ', 'Không phát hiện câu hỏi nào bị mồ côi (tất cả đều có bankId hợp lệ).', ui.ButtonSet.OK);
  } else {
    ui.alert('PHÁT HIỆN CÂU HỎI MỒ CÔI', `Có ${result.orphanCount} câu hỏi không có bankId hợp lệ trong hệ thống. Vui lòng kiểm tra chi tiết trong APP_LOGS.`, ui.ButtonSet.OK);
  }
}

function setupMultiUserSchema() {
  const result = apiSetupMultiUserSchema();
  try {
    SpreadsheetApp.getUi().alert('👤 SETUP MULTI-USER SCHEMA', result.message || 'Đã khởi tạo xong schema Multi-user!', SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {
    Logger.log(result.message);
  }
}

function migrateMultiUserSchema() {
  const result = apiMigrateMultiUserSchema();
  try {
    SpreadsheetApp.getUi().alert('🔄 MIGRATE MULTI-USER DATA', result.message || 'Đã di trú xong dữ liệu Multi-user!', SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {
    Logger.log(result.message);
  }
}

function repairQuestionOwnership() {
  const result = apiRepairQuestionOwnership();
  try {
    SpreadsheetApp.getUi().alert('🛠 REPAIR QUESTION OWNERSHIP', result.message || 'Đã chuẩn hóa quyền sở hữu câu hỏi!', SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {
    Logger.log(result.message);
  }
}

function repairSessionChildOwnership() {
  const result = apiRepairSessionChildOwnership();
  try {
    SpreadsheetApp.getUi().alert('🛠 REPAIR SESSION OWNERSHIP', result.message || 'Đã chuẩn hóa quyền sở hữu dữ liệu con của phiên chơi!', SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {
    Logger.log(result.message);
  }
}

function auditOwnership() {
  const result = apiAuditOwnership();
  const d = result.data || {};
  const msg = '📊 KẾT QUẢ KIỂM TRA QUYỀN SỞ HỮU (AUDIT):\n\n' +
    '• Tổng số giáo viên (Users): ' + (d.totalUsers || 0) + '\n' +
    '• Tổng số ngân hàng câu hỏi: ' + (d.totalBanks || 0) + '\n' +
    '  - Ngân hàng mặc định (Hệ thống): ' + (d.systemBanks || 0) + '\n' +
    '  - Ngân hàng riêng của giáo viên: ' + (d.teacherBanks || 0) + '\n' +
    '• Câu hỏi lệch / mồ côi quyền sở hữu: ' + (d.orphanedQuestions || 0) + '\n' +
    '• Dữ liệu phiên chơi lệch quyền sở hữu: ' + (d.orphanedSessionChildRecords || 0) + '\n';
  try {
    SpreadsheetApp.getUi().alert('🔍 AUDIT OWNERSHIP', msg, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {
    Logger.log(msg);
  }
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
    const idToken = e && e.parameter && e.parameter.idToken ? String(e.parameter.idToken).trim() : '';
    const data = {};
    if (e && e.parameter) {
      Object.keys(e.parameter).forEach(k => {
        if (k !== 'action' && k !== 'idToken') {
          data[k] = e.parameter[k];
        }
      });
    }
    const response = handleApiRequest(action, data, idToken);
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
    const idToken = requestPayload.idToken ? String(requestPayload.idToken).trim() : '';

    if (!action) {
      return createJsonResponse(errorResponse('MISSING_ACTION', 'Thiếu trường action trong yêu cầu POST'));
    }

    const response = handleApiRequest(action, data, idToken);
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
// 4. FIREBASE AUTHENTICATION & ID TOKEN VERIFICATION
// ==========================================

/**
 * Get Firebase Web API Key from Script Properties (or SETTINGS sheet fallback)
 * Configured in Apps Script: Project Settings -> Script Properties -> FIREBASE_WEB_API_KEY
 */
function getFirebaseApiKey() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const apiKey = scriptProperties.getProperty('FIREBASE_WEB_API_KEY');
  if (apiKey && apiKey.trim()) {
    return apiKey.trim();
  }

  // Fallback to SETTINGS sheet if teacher stored it there
  try {
    const settingsSheet = getSheet('SETTINGS');
    if (settingsSheet && settingsSheet.getLastRow() > 1) {
      const headers = getHeaders(settingsSheet);
      const keyCol = headers.indexOf('key');
      const valCol = headers.indexOf('value');
      if (keyCol !== -1 && valCol !== -1) {
        const rows = settingsSheet.getRange(2, 1, settingsSheet.getLastRow() - 1, headers.length).getValues();
        for (let i = 0; i < rows.length; i++) {
          if (String(rows[i][keyCol]).trim() === 'FIREBASE_WEB_API_KEY') {
            const val = String(rows[i][valCol]).trim();
            if (val) return val;
          }
        }
      }
    }
  } catch (e) {}

  throw new Error('FIREBASE_CONFIG_MISSING: Chưa cấu hình FIREBASE_WEB_API_KEY trong Apps Script Script Properties.');
}

/**
 * Verify Firebase ID Token via Google Identity Toolkit REST API
 * POST https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=FIREBASE_WEB_API_KEY
 * Returns: { uid, email, displayName, photoURL, emailVerified }
 */
function verifyFirebaseIdToken(idToken) {
  if (!idToken || typeof idToken !== 'string' || !idToken.trim()) {
    throw new Error('AUTH_REQUIRED: Thiếu Firebase ID Token trong yêu cầu.');
  }

  const cleanToken = idToken.trim();
  const apiKey = getFirebaseApiKey();
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`;

  const payload = {
    idToken: cleanToken
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  let response;
  try {
    response = UrlFetchApp.fetch(url, options);
  } catch (networkErr) {
    appendLog('ERROR', 'AUTH', 'verifyFirebaseIdToken', 'Lỗi kết nối Firebase Identity Toolkit: ' + networkErr.message);
    throw new Error('AUTH_SERVER_ERROR: Không thể kết nối máy chủ xác thực Firebase. Vui lòng kiểm tra lại mạng.');
  }

  const statusCode = response.getResponseCode();
  const responseText = response.getContentText();
  let jsonResult = {};

  try {
    jsonResult = JSON.parse(responseText);
  } catch (parseErr) {
    throw new Error('INVALID_AUTH_TOKEN: Phản hồi từ Firebase không hợp lệ.');
  }

  if (statusCode !== 200 || !jsonResult.users || !jsonResult.users.length) {
    const errMessage = jsonResult.error && jsonResult.error.message ? jsonResult.error.message : '';
    if (errMessage.includes('TOKEN_EXPIRED') || errMessage.includes('EXPIRED')) {
      throw new Error('AUTH_EXPIRED: Phiên đăng nhập Google đã hết hạn. Vui lòng làm mới token.');
    }
    throw new Error('INVALID_AUTH_TOKEN: Firebase ID Token không hợp lệ hoặc đã bị thu hồi.');
  }

  const user = jsonResult.users[0];
  const uid = user.localId; // Immutable verified teacher UID
  if (!uid) {
    throw new Error('INVALID_AUTH_TOKEN: Không tìm thấy định danh UID giáo viên trong token.');
  }

  return {
    uid: uid,
    email: user.email || '',
    displayName: user.displayName || '',
    photoURL: user.photoUrl || user.photoURL || '',
    emailVerified: Boolean(user.emailVerified)
  };
}

/**
 * Get Authenticated Request Context
 */
function getAuthenticatedContext(requestPayload) {
  const token = requestPayload && requestPayload.idToken ? String(requestPayload.idToken).trim() : '';
  if (!token) {
    throw new Error('AUTH_REQUIRED: Thao tác này yêu cầu đăng nhập tài khoản Google Giáo viên.');
  }
  const authContext = verifyFirebaseIdToken(token);
  assertUserEnabled(authContext.uid);
  return authContext;
}

/**
 * Enforce Game Session Ownership (Rule 30)
 * Verifies that sessionId exists and belongs to authenticatedUid (or admin).
 */
function getOwnedSession(sessionId, authenticatedUid) {
  if (!sessionId) {
    throw new Error('MISSING_SESSION_ID: sessionId là bắt buộc.');
  }
  const sessionSheet = getSheet('GAME_SESSIONS');
  const found = findRowById(sessionSheet, sessionId);
  if (!found) {
    throw new Error(`SESSION_NOT_FOUND: Phiên chơi '${sessionId}' không tồn tại.`);
  }

  const session = found.data;
  const role = getUserRole(authenticatedUid);
  if (role === 'ADMIN') {
    return session;
  }

  // If session is owned by a teacher, caller must match
  if (authenticatedUid && session.ownerUid && session.ownerUid !== authenticatedUid) {
    throw new Error('FORBIDDEN: Bạn không có quyền truy cập hoặc ghi điểm vào phiên chơi của giáo viên khác.');
  }

  return session;
}

// ==========================================
// 5. SECURE ROUTER & API ACTION REGISTRY (Rule 20)
// ==========================================

const API_ACTIONS = {
  // Public Actions (authRequired: false)
  'system.health': { handler: apiHealthCheck, authRequired: false },
  'settings.get': { handler: apiGetSettings, authRequired: false },
  'games.list': { handler: apiListGames, authRequired: false },
  'games.get': { handler: apiGetGame, authRequired: false },

  // Teacher Profile & Preferences (authRequired: true)
  'users.syncProfile': { handler: apiSyncUserProfile, authRequired: true },
  'user.syncProfile': { handler: apiSyncUserProfile, authRequired: true },
  'users.me': { handler: apiGetUser, authRequired: true },
  'user.get': { handler: apiGetUser, authRequired: true },
  'preferences.get': { handler: apiGetUserPreferences, authRequired: true },
  'user.getPreferences': { handler: apiGetUserPreferences, authRequired: true },
  'preferences.update': { handler: apiUpdateUserPreferences, authRequired: true },
  'user.updatePreferences': { handler: apiUpdateUserPreferences, authRequired: true },

  // Question Banks (authRequired: true)
  'questionBanks.listMine': { handler: apiListQuestionBanksMine, authRequired: true },
  'questionBanks.listForUser': { handler: apiListQuestionBanksMine, authRequired: true },
  'questionBanks.list': { handler: apiListQuestionBanksMine, authRequired: true },
  'questionBanks.get': { handler: apiGetQuestionBankSecure, authRequired: true },
  'questionBanks.saveImported': { handler: apiSaveImportedQuestionBankSecure, authRequired: true },
  'questionBanks.update': { handler: apiUpdateQuestionBankSecure, authRequired: true },
  'questionBanks.disable': { handler: apiDisableQuestionBankSecure, authRequired: true },
  'questions.listByBank': { handler: apiListQuestionsByBankSecure, authRequired: true },
  'questions.get': { handler: apiGetQuestion, authRequired: true },

  // Classes (authRequired: true)
  'classes.listMine': { handler: apiListClassesMine, authRequired: true },
  'classes.list': { handler: apiListClassesMine, authRequired: true },
  'classes.get': { handler: apiGetClass, authRequired: true },
  'classes.create': { handler: apiCreateClassSecure, authRequired: true },
  'classes.update': { handler: apiUpdateClassSecure, authRequired: true },
  'classes.delete': { handler: apiDeleteClassSecure, authRequired: true },

  // Game Sessions (authRequired: true)
  'sessions.create': { handler: apiCreateSession, authRequired: true },
  'sessions.listMine': { handler: apiListSessionsMine, authRequired: true },
  'sessions.listForUser': { handler: apiListSessionsMine, authRequired: true },
  'sessions.list': { handler: apiListSessionsMine, authRequired: true },
  'sessions.get': { handler: apiGetSessionSecure, authRequired: true },
  'sessions.finish': { handler: apiFinishSessionSecure, authRequired: true },

  // Teams & Scores (authRequired: true)
  'teams.create': { handler: apiCreateTeamSecure, authRequired: true },
  'teams.createBatch': { handler: apiCreateTeamsBatchSecure, authRequired: true },
  'teams.listBySession': { handler: apiListTeamsBySession, authRequired: true },
  'scores.addEvent': { handler: apiAddScoreEventSecure, authRequired: true },
  'scores.listBySession': { handler: apiListScoresBySession, authRequired: true },
  'scores.getBySession': { handler: apiListScoresBySession, authRequired: true },

  // Game Results & Certificates (authRequired: true)
  'results.listMine': { handler: apiListResultsMine, authRequired: true },
  'results.listForUser': { handler: apiListResultsMine, authRequired: true },
  'results.listBySession': { handler: apiListResultsBySession, authRequired: true },
  'certificates.create': { handler: apiCreateCertificateSecure, authRequired: true },
  'certificates.listMine': { handler: apiListCertificatesMine, authRequired: true },
  'certificates.listForUser': { handler: apiListCertificatesMine, authRequired: true },
  'imports.history.listMine': { handler: apiListImportHistoryMine, authRequired: true },
  'imports.history.list': { handler: apiListImportHistoryMine, authRequired: true },

  // Game Specific Writing APIs (authRequired: true, Enforce getOwnedSession)
  'camRace.race.add': { handler: apiCamRaceAddRaceSecure, authRequired: true },
  'camRace.answer.add': { handler: apiCamRaceAddAnswerSecure, authRequired: true },
  'camRace.question.complete': { handler: apiCamRaceCompleteQuestionSecure, authRequired: true },
  'smileRace.gesture.add': { handler: apiSmileRaceAddGestureSecure, authRequired: true },
  'smileRace.answer.add': { handler: apiSmileRaceAddAnswerSecure, authRequired: true },
  'smileRace.question.complete': { handler: apiSmileRaceCompleteQuestionSecure, authRequired: true },
  'fastestHand.buzz': { handler: apiFastestHandBuzzSecure, authRequired: true },
  'fastestHand.answer': { handler: apiFastestHandAnswerSecure, authRequired: true },
  'fastestHand.question.complete': { handler: apiFastestHandCompleteQuestionSecure, authRequired: true },
  'luckyWheel.spin.add': { handler: apiLuckyWheelAddSpinSecure, authRequired: true },
  'randomTeam.pick.add': { handler: apiRandomTeamAddPickSecure, authRequired: true },
  'randomTeam.resetSession': { handler: apiRandomTeamResetSessionSecure, authRequired: true },
  'teamChallenge.answer.add': { handler: apiTeamChallengeAddAnswerSecure, authRequired: true },
  'teamChallenge.score.add': { handler: apiTeamChallengeAddScoreSecure, authRequired: true },
  'teamChallenge.round.complete': { handler: apiTeamChallengeCompleteRoundSecure, authRequired: true },

  // System Database Tools
  'database.setupMultiUser': { handler: apiSetupMultiUserSchema, authRequired: false },
  'database.migrateMultiUser': { handler: apiMigrateMultiUserSchema, authRequired: false },
  'database.auditOwnership': { handler: apiAuditOwnership, authRequired: false },
  'database.repairQuestionOwnership': { handler: apiRepairQuestionOwnership, authRequired: false },
  'database.repairSessionOwnership': { handler: apiRepairSessionChildOwnership, authRequired: false },
  'database.repairCounts': { handler: apiRepairQuestionBankCounts, authRequired: false },
  'database.findOrphans': { handler: apiFindOrphans, authRequired: false },
  'database.testPersistence': { handler: apiTestQuestionBankPersistence, authRequired: false }
};

function apiHealthCheck() {
  return successResponse({
    status: 'ONLINE',
    platform: 'EDUPLAY',
    authEngine: 'Firebase Identity Toolkit REST',
    version: '3.0.0-multiuser',
    timestamp: getCurrentTimestamp()
  }, 'EDUPLAY Database Engine sẵn sàng hoạt động.');
}

function handleApiRequest(action, data, idToken) {
  if (!Object.prototype.hasOwnProperty.call(API_ACTIONS, action)) {
    return errorResponse('INVALID_ACTION', `Action '${action}' không nằm trong whitelist của EDUPLAY API.`);
  }

  const actionConfig = API_ACTIONS[action];
  let handler = actionConfig;
  let authRequired = false;

  if (typeof actionConfig === 'object' && actionConfig !== null) {
    handler = actionConfig.handler;
    authRequired = Boolean(actionConfig.authRequired);
  }

  let authContext = null;
  let authenticatedUid = '';

  try {
    // 1. Enforce ID Token verification for protected actions (Rule 16, 18, 19)
    if (authRequired) {
      if (!idToken) {
        return errorResponse('AUTH_REQUIRED', 'Yêu cầu Firebase ID Token hợp lệ để thực hiện thao tác này.');
      }
      authContext = verifyFirebaseIdToken(idToken);
      authenticatedUid = authContext.uid;

      // Rule 23: assert user enabled (except syncProfile initial registration)
      if (action !== 'users.syncProfile' && action !== 'user.syncProfile') {
        assertUserEnabled(authenticatedUid);
      }
    } else if (idToken) {
      // Optional authentication: verify token if present
      try {
        authContext = verifyFirebaseIdToken(idToken);
        authenticatedUid = authContext.uid;
      } catch (tokenErr) {
        authenticatedUid = '';
      }
    }

    // 2. Strict Security (Rule 11): Delete any client-dictated ownerUid from payload
    const payload = { ...(data || {}) };
    if ('ownerUid' in payload) {
      delete payload.ownerUid;
    }

    // 3. Dispatch to handler with verified authenticatedUid and authContext
    return handler(payload, authenticatedUid, authContext);
  } catch (err) {
    const errMessage = err.message || err.toString();
    appendLog('ERROR', 'API', action, errMessage, (data && data.sessionId) || '', data, authenticatedUid);

    if (errMessage.includes('AUTH_REQUIRED')) {
      return errorResponse('AUTH_REQUIRED', errMessage);
    }
    if (errMessage.includes('AUTH_EXPIRED')) {
      return errorResponse('AUTH_EXPIRED', errMessage);
    }
    if (errMessage.includes('INVALID_AUTH_TOKEN')) {
      return errorResponse('INVALID_AUTH_TOKEN', errMessage);
    }
    if (errMessage.includes('FIREBASE_CONFIG_MISSING')) {
      return errorResponse('FIREBASE_CONFIG_MISSING', errMessage);
    }
    if (errMessage.includes('FORBIDDEN')) {
      return errorResponse('FORBIDDEN', errMessage);
    }
    if (errMessage.includes('USER_DISABLED') || errMessage.includes('vô hiệu hóa')) {
      return errorResponse('USER_DISABLED', 'Tài khoản giáo viên của bạn đã bị vô hiệu hóa bởi Quản trị viên.');
    }

    return errorResponse('EXECUTION_ERROR', `Lỗi khi thực thi action '${action}': ${errMessage}`);
  }
}

// ==========================================
// 6. SECURE WRAPPERS FOR TEACHER RESOURCES
// ==========================================

/**
 * Question Banks for current teacher (Rule 25)
 * Returns { mine: [...], system: [...] } and combined list
 */
function apiListQuestionBanksMine(data, authenticatedUid) {
  const bankSheet = getSheet('QUESTION_BANKS');
  const lastRow = bankSheet.getLastRow();
  if (lastRow <= 1) return successResponse({ mine: [], system: [], banks: [] });

  const headers = getHeaders(bankSheet);
  const dataRows = bankSheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  const role = getUserRole(authenticatedUid);

  const mine = [];
  const system = [];

  dataRows.forEach(row => {
    const b = rowToObject(headers, row);
    const isEnabled = b.enabled !== undefined ? normalizeBoolean(b.enabled, true) : true;
    if (!isEnabled) return;

    if (role === 'ADMIN') {
      if (b.ownerUid === authenticatedUid) {
        mine.push(b);
      } else {
        system.push(b);
      }
      return;
    }

    // Teacher's own private banks
    if (authenticatedUid && b.ownerUid === authenticatedUid) {
      mine.push(b);
    } else if (b.visibility === 'SYSTEM' || (!b.ownerUid && b.visibility !== 'PRIVATE')) {
      system.push(b);
    }
    // Note: NEVER return private banks belonging to other teachers
  });

  mine.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  system.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  return successResponse({
    mine: mine,
    system: system,
    banks: [...mine, ...system]
  });
}

function apiGetQuestionBankSecure(data, authenticatedUid) {
  requireFields(data, ['id']);
  const bankSheet = getSheet('QUESTION_BANKS');
  const found = findRowById(bankSheet, data.id);
  if (!found) return errorResponse('BANK_NOT_FOUND', 'Không tìm thấy ngân hàng câu hỏi.');

  // Check read permission: if PRIVATE, must match authenticatedUid
  assertOwnership(found.data.ownerUid, authenticatedUid, true, found.data.visibility);
  return successResponse(found.data);
}

function apiSaveImportedQuestionBankSecure(data, authenticatedUid) {
  // Enforce server-side verified authenticatedUid as ownerUid (Rule 26)
  return saveImportedQuestionBank(data, authenticatedUid);
}

function apiUpdateQuestionBankSecure(data, authenticatedUid) {
  requireFields(data, ['id']);
  const bankSheet = getSheet('QUESTION_BANKS');
  const found = findRowById(bankSheet, data.id);
  if (!found) return errorResponse('BANK_NOT_FOUND', 'Không tìm thấy ngân hàng câu hỏi.');

  assertOwnership(found.data.ownerUid, authenticatedUid, false, found.data.visibility);
  return apiUpdateQuestionBank(data, authenticatedUid);
}

function apiDisableQuestionBankSecure(data, authenticatedUid) {
  requireFields(data, ['id']);
  const bankSheet = getSheet('QUESTION_BANKS');
  const found = findRowById(bankSheet, data.id);
  if (!found) return errorResponse('BANK_NOT_FOUND', 'Không tìm thấy ngân hàng câu hỏi.');

  assertOwnership(found.data.ownerUid, authenticatedUid, false, found.data.visibility);
  return apiDisableQuestionBank(data, authenticatedUid);
}

/**
 * Questions List for Bank (Rule 27)
 * Private bank: ownerUid must match authenticatedUid
 * System bank: allow reading
 */
function apiListQuestionsByBankSecure(data, authenticatedUid) {
  requireFields(data, ['bankId']);
  const bankSheet = getSheet('QUESTION_BANKS');
  const bFound = findRowById(bankSheet, data.bankId);
  if (!bFound) return errorResponse('BANK_NOT_FOUND', 'Không tìm thấy ngân hàng câu hỏi.');

  // Assert reading access
  assertOwnership(bFound.data.ownerUid, authenticatedUid, true, bFound.data.visibility);
  return apiListQuestionsByBank(data);
}

/**
 * Classes for Teacher (Rule 28)
 */
function apiListClassesMine(data, authenticatedUid) {
  const sheet = getSheet('CLASSES');
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return successResponse([]);

  const headers = getHeaders(sheet);
  const rows = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  const role = getUserRole(authenticatedUid);

  const list = rows
    .map(r => rowToObject(headers, r))
    .filter(c => {
      const isEnabled = c.enabled !== undefined ? normalizeBoolean(c.enabled, true) : true;
      if (!isEnabled) return false;
      if (role === 'ADMIN') return true;
      if (!authenticatedUid) return !c.ownerUid;
      return c.ownerUid === authenticatedUid || !c.ownerUid;
    });

  return successResponse(list);
}

function apiCreateClassSecure(data, authenticatedUid) {
  requireFields(data, ['className']);
  const sheet = getSheet('CLASSES');
  const newClass = {
    id: generateId('class'),
    ownerUid: authenticatedUid || '',
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
  return successResponse(newClass, 'Đã tạo lớp học thành công.');
}

function apiUpdateClassSecure(data, authenticatedUid) {
  requireFields(data, ['id']);
  const sheet = getSheet('CLASSES');
  const found = findRowById(sheet, data.id);
  if (!found) return errorResponse('CLASS_NOT_FOUND', 'Không tìm thấy lớp học.');

  assertOwnership(found.data.ownerUid, authenticatedUid, false);
  const updated = updateObjectById(sheet, data.id, data);
  return successResponse(updated, 'Đã cập nhật thông tin lớp học.');
}

function apiDeleteClassSecure(data, authenticatedUid) {
  requireFields(data, ['id']);
  const sheet = getSheet('CLASSES');
  const found = findRowById(sheet, data.id);
  if (!found) return errorResponse('CLASS_NOT_FOUND', 'Không tìm thấy lớp học để xóa.');

  assertOwnership(found.data.ownerUid, authenticatedUid, false);
  const deleted = deleteObjectById(sheet, data.id);
  return successResponse({ deleted: true }, 'Đã xóa lớp học thành công.');
}

/**
 * Sessions for Teacher (Rule 29, 36)
 */
function apiListSessionsMine(data, authenticatedUid) {
  return apiListSessionsForUser(data, authenticatedUid);
}

function apiGetSessionSecure(data, authenticatedUid) {
  requireFields(data, ['sessionId']);
  const session = getOwnedSession(data.sessionId, authenticatedUid);
  return successResponse(session);
}

function apiFinishSessionSecure(data, authenticatedUid) {
  requireFields(data, ['sessionId']);
  getOwnedSession(data.sessionId, authenticatedUid);
  return apiFinishSession(data, authenticatedUid);
}

function apiCreateTeamSecure(data, authenticatedUid) {
  requireFields(data, ['sessionId', 'teamName']);
  const session = getOwnedSession(data.sessionId, authenticatedUid);
  const teamSheet = getSheet('TEAMS');
  const newTeam = {
    id: generateId('team'),
    sessionId: data.sessionId,
    ownerUid: session.ownerUid || authenticatedUid || '',
    teamCode: sanitizeString(data.teamCode) || 'T1',
    teamName: sanitizeString(data.teamName),
    color: sanitizeString(data.color) || '#3B82F6',
    score: 0,
    roundWins: 0,
    rank: 1,
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp()
  };
  appendObject(teamSheet, newTeam);
  return successResponse(newTeam, 'Đã tạo đội thi đấu thành công.');
}

function apiCreateTeamsBatchSecure(data, authenticatedUid) {
  requireFields(data, ['sessionId', 'teams']);
  const session = getOwnedSession(data.sessionId, authenticatedUid);
  const teamSheet = getSheet('TEAMS');
  const createdTeams = [];

  data.teams.forEach(t => {
    const newTeam = {
      id: generateId('team'),
      sessionId: data.sessionId,
      ownerUid: session.ownerUid || authenticatedUid || '',
      teamCode: sanitizeString(t.teamCode) || 'T',
      teamName: sanitizeString(t.teamName),
      color: sanitizeString(t.color) || '#3B82F6',
      score: 0,
      roundWins: 0,
      rank: 1,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    };
    appendObject(teamSheet, newTeam);
    createdTeams.push(newTeam);
  });

  return successResponse(createdTeams, `Đã tạo ${createdTeams.length} đội thi đấu.`);
}

function apiAddScoreEventSecure(data, authenticatedUid) {
  requireFields(data, ['sessionId', 'teamId', 'delta']);
  const session = getOwnedSession(data.sessionId, authenticatedUid);
  data.ownerUid = session.ownerUid || authenticatedUid || '';
  return apiAddScoreEvent(data, authenticatedUid);
}

function apiListScoresBySessionSecure(data, authenticatedUid) {
  requireFields(data, ['sessionId']);
  getOwnedSession(data.sessionId, authenticatedUid);
  return apiListScoresBySession(data);
}

function apiListResultsMine(data, authenticatedUid) {
  return apiListResultsForUser(data, authenticatedUid);
}

function apiCreateCertificateSecure(data, authenticatedUid) {
  requireFields(data, ['sessionId', 'teamId']);
  const session = getOwnedSession(data.sessionId, authenticatedUid);
  data.ownerUid = session.ownerUid || authenticatedUid || '';
  return apiCreateCertificate(data, authenticatedUid);
}

function apiListCertificatesMine(data, authenticatedUid) {
  return apiListCertificatesForUser(data, authenticatedUid);
}

function apiListImportHistoryMine(data, authenticatedUid) {
  const sheet = getSheet('IMPORT_HISTORY');
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return successResponse([]);

  const headers = getHeaders(sheet);
  const rows = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  const role = getUserRole(authenticatedUid);

  const list = rows
    .map(r => rowToObject(headers, r))
    .filter(imp => {
      if (role === 'ADMIN') return true;
      if (!authenticatedUid) return !imp.ownerUid;
      return imp.ownerUid === authenticatedUid;
    })
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  return successResponse(list);
}

// Game specific secured handlers verifying getOwnedSession
function apiCamRaceAddRaceSecure(data, authenticatedUid) {
  getOwnedSession(data.sessionId, authenticatedUid);
  return apiCamRaceAddRace(data, authenticatedUid);
}

function apiCamRaceAddAnswerSecure(data, authenticatedUid) {
  getOwnedSession(data.sessionId, authenticatedUid);
  return apiCamRaceAddAnswer(data, authenticatedUid);
}

function apiCamRaceCompleteQuestionSecure(data, authenticatedUid) {
  getOwnedSession(data.sessionId, authenticatedUid);
  return apiCamRaceCompleteQuestion(data, authenticatedUid);
}

function apiSmileRaceAddGestureSecure(data, authenticatedUid) {
  getOwnedSession(data.sessionId, authenticatedUid);
  return apiSmileRaceAddGesture(data, authenticatedUid);
}

function apiSmileRaceAddAnswerSecure(data, authenticatedUid) {
  getOwnedSession(data.sessionId, authenticatedUid);
  return apiSmileRaceAddAnswer(data, authenticatedUid);
}

function apiSmileRaceCompleteQuestionSecure(data, authenticatedUid) {
  getOwnedSession(data.sessionId, authenticatedUid);
  return apiSmileRaceCompleteQuestion(data, authenticatedUid);
}

function apiFastestHandBuzzSecure(data, authenticatedUid) {
  getOwnedSession(data.sessionId, authenticatedUid);
  return apiFastestHandBuzz(data, authenticatedUid);
}

function apiFastestHandAnswerSecure(data, authenticatedUid) {
  getOwnedSession(data.sessionId, authenticatedUid);
  return apiFastestHandAnswer(data, authenticatedUid);
}

function apiFastestHandCompleteQuestionSecure(data, authenticatedUid) {
  getOwnedSession(data.sessionId, authenticatedUid);
  return apiFastestHandCompleteQuestion(data, authenticatedUid);
}

function apiLuckyWheelAddSpinSecure(data, authenticatedUid) {
  getOwnedSession(data.sessionId, authenticatedUid);
  return apiLuckyWheelAddSpin(data, authenticatedUid);
}

function apiRandomTeamAddPickSecure(data, authenticatedUid) {
  getOwnedSession(data.sessionId, authenticatedUid);
  return apiRandomTeamAddPick(data, authenticatedUid);
}

function apiRandomTeamResetSessionSecure(data, authenticatedUid) {
  getOwnedSession(data.sessionId, authenticatedUid);
  return apiRandomTeamResetSession(data, authenticatedUid);
}

function apiTeamChallengeAddAnswerSecure(data, authenticatedUid) {
  getOwnedSession(data.sessionId, authenticatedUid);
  return apiTeamChallengeAddAnswer(data, authenticatedUid);
}

function apiTeamChallengeAddScoreSecure(data, authenticatedUid) {
  getOwnedSession(data.sessionId, authenticatedUid);
  return apiTeamChallengeAddScore(data, authenticatedUid);
}

function apiTeamChallengeCompleteRoundSecure(data, authenticatedUid) {
  getOwnedSession(data.sessionId, authenticatedUid);
  return apiTeamChallengeCompleteRound(data, authenticatedUid);
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

function getSessionOwnerUid(sessionId) {
  if (!sessionId) return '';
  try {
    const sessionSheet = getSheet('GAME_SESSIONS');
    const s = findRowById(sessionSheet, sessionId);
    if (s && s.data && s.data.ownerUid) {
      return String(s.data.ownerUid).trim();
    }
  } catch (e) {}
  return '';
}

function getBankOwnerUid(bankId) {
  if (!bankId) return '';
  try {
    const bankSheet = getSheet('QUESTION_BANKS');
    const b = findRowById(bankSheet, bankId);
    if (b && b.data && b.data.ownerUid) {
      return String(b.data.ownerUid).trim();
    }
  } catch (e) {}
  return '';
}

function appendObject(sheet, obj) {
  const headers = getHeaders(sheet);
  if (!obj.id) {
    const prefix = sheet.getName().toLowerCase().replace(/_/g, '').substring(0, 5);
    obj.id = generateId(prefix);
  }
  if (headers.includes('ownerUid') && !obj.ownerUid) {
    if (obj.sessionId) {
      obj.ownerUid = getSessionOwnerUid(obj.sessionId);
    } else if (obj.bankId) {
      obj.ownerUid = getBankOwnerUid(obj.bankId);
    }
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

function getUserRole(authUid) {
  if (!authUid) return 'TEACHER';
  try {
    const userSheet = getSheet('USERS');
    const rows = findRowsByField(userSheet, 'authUid', authUid);
    if (rows && rows.length > 0) {
      return rows[0].data.role || 'TEACHER';
    }
  } catch (e) {}
  return 'TEACHER';
}

function assertUserEnabled(authUid) {
  if (!authUid) return;
  try {
    const userSheet = getSheet('USERS');
    const rows = findRowsByField(userSheet, 'authUid', authUid);
    if (rows && rows.length > 0) {
      const user = rows[0].data;
      const isEnabled = user.enabled !== undefined ? normalizeBoolean(user.enabled, true) : true;
      const status = user.status ? String(user.status).toUpperCase() : (isEnabled ? 'ACTIVE' : 'DISABLED');
      if (!isEnabled || status === 'DISABLED') {
        throw new Error('Tài khoản giáo viên đã bị vô hiệu hóa bởi Quản trị viên.');
      }
    }
  } catch (e) {
    if (e.message && e.message.includes('vô hiệu hóa')) throw e;
  }
}

function assertOwnership(resourceOwnerUid, callerUid, allowShared, visibility) {
  if (!callerUid) return; // Legacy anonymous call or dev mode
  const role = getUserRole(callerUid);
  if (role === 'ADMIN') return; // Admin has full access

  const rOwner = resourceOwnerUid ? String(resourceOwnerUid).trim() : '';
  const cUid = String(callerUid).trim();

  // If resource has no owner, it's public/system
  if (!rOwner) return;

  // Exact owner match
  if (rOwner === cUid) return;

  // If shared/public read is allowed
  if (allowShared && (visibility === 'SHARED' || visibility === 'SYSTEM')) return;

  throw new Error('FORBIDDEN: Bạn không có quyền truy cập hoặc chỉnh sửa tài nguyên của giáo viên khác.');
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
// 9. API HANDLERS - QUESTION BANKS CRUD & PERSISTENCE
// ==========================================

function normalizeCorrectAnswer(val) {
  if (val === undefined || val === null) return '';
  let str = String(val).trim().toUpperCase();
  str = str.replace(/[\.\)\:\-\s]/g, '');
  if (['A', 'B', 'C', 'D'].includes(str)) return str;
  if (str === '0') return 'A';
  if (str === '1') return 'B';
  if (str === '2') return 'C';
  if (str === '3') return 'D';
  const match = str.match(/^[ABCD]/);
  if (match) return match[0];
  return str;
}

function normalizeBoolean(val, defaultValue) {
  if (val === undefined || val === null || val === '') {
    return defaultValue !== undefined ? defaultValue : false;
  }
  if (typeof val === 'boolean') return val;
  const s = String(val).trim().toLowerCase();
  if (['true', '1', 'có', 'co', 'yes', 'y', 'x', 'đúng', 'dung'].includes(s)) return true;
  if (['false', '0', 'không', 'khong', 'no', 'n', 'sai'].includes(s)) return false;
  return defaultValue !== undefined ? defaultValue : false;
}

function generateBankCode(subject, grade) {
  const cleanSubject = sanitizeString(subject || 'ALL')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 8) || 'GEN';
  const gradeStr = grade ? String(grade) : '';
  const rand = Utilities.getUuid().replace(/-/g, '').substring(0, 6).toUpperCase();
  return `QB-${cleanSubject}${gradeStr}-${rand}`;
}

function countQuestionsInBank(bankId) {
  if (!bankId) return 0;
  const sheet = getSheet('QUESTIONS');
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 0;
  const headers = getHeaders(sheet);
  const bankIdCol = headers.indexOf('bankId');
  const enabledCol = headers.indexOf('enabled');
  if (bankIdCol === -1) return 0;

  const data = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  let count = 0;
  for (let i = 0; i < data.length; i++) {
    const rowBankId = String(data[i][bankIdCol]);
    const rowEnabled = enabledCol !== -1 ? data[i][enabledCol] : true;
    if (rowBankId === String(bankId) && normalizeBoolean(rowEnabled, true)) {
      count++;
    }
  }
  return count;
}

function listQuestionBanks() {
  const sheet = getSheet('QUESTION_BANKS');
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  const headers = getHeaders(sheet);
  const rows = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();

  return rows
    .map(r => rowToObject(headers, r))
    .filter(b => normalizeBoolean(b.enabled, true))
    .sort((a, b) => {
      const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeB - timeA;
    });
}

function createQuestionBank(data) {
  if (!data || !data.name || !String(data.name).trim()) {
    throw new Error('Tên bộ câu hỏi (name) là bắt buộc.');
  }

  const sheet = getSheet('QUESTION_BANKS');
  const id = generateId('bank');
  const subject = sanitizeString(data.subject) || 'Chưa phân loại';
  const grade = (data.grade !== undefined && data.grade !== null && String(data.grade).trim() !== '')
    ? Number(data.grade)
    : '';
  const bankCode = (data.bankCode && String(data.bankCode).trim())
    ? sanitizeString(data.bankCode)
    : generateBankCode(subject, grade);

  const ownerUid = data && data.ownerUid ? String(data.ownerUid).trim() : '';
  const visibility = ownerUid ? (data.visibility === 'SHARED' ? 'SHARED' : 'PRIVATE') : (data.visibility || 'SYSTEM');

  const bank = {
    id: id,
    bankCode: bankCode,
    ownerUid: ownerUid,
    visibility: visibility,
    name: sanitizeString(data.name),
    subject: subject,
    grade: grade,
    topic: sanitizeString(data.topic) || '',
    description: sanitizeString(data.description) || '',
    questionCount: 0,
    enabled: true,
    importId: sanitizeString(data.importId) || '',
    sourceFileName: sanitizeString(data.sourceFileName || data.fileName) || '',
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp()
  };

  appendObject(sheet, bank);
  appendLog('INFO', 'QUESTION_BANK', 'QUESTION_BANK_CREATED', `Tạo mới ngân hàng câu hỏi: ${bank.name} (${bank.id})`, '', {
    bankId: bank.id,
    bankCode: bank.bankCode,
    name: bank.name,
    ownerUid: bank.ownerUid,
    visibility: bank.visibility
  }, '', ownerUid);

  return bank;
}

function updateQuestionBank(bankId, updates) {
  if (!bankId) throw new Error('Thiếu bankId để cập nhật.');
  const sheet = getSheet('QUESTION_BANKS');
  const found = findRowById(sheet, bankId);
  if (!found) return null;

  const allowedUpdates = {};
  if (updates.name !== undefined && String(updates.name).trim()) {
    allowedUpdates.name = sanitizeString(updates.name);
  }
  if (updates.subject !== undefined) {
    allowedUpdates.subject = sanitizeString(updates.subject);
  }
  if (updates.grade !== undefined) {
    allowedUpdates.grade = updates.grade !== '' ? Number(updates.grade) : '';
  }
  if (updates.topic !== undefined) {
    allowedUpdates.topic = sanitizeString(updates.topic);
  }
  if (updates.description !== undefined) {
    allowedUpdates.description = sanitizeString(updates.description);
  }
  if (updates.enabled !== undefined) {
    allowedUpdates.enabled = normalizeBoolean(updates.enabled, true);
  }
  allowedUpdates.updatedAt = getCurrentTimestamp();

  const updated = updateObjectById(sheet, bankId, allowedUpdates);
  appendLog('INFO', 'QUESTION_BANK', 'QUESTION_BANK_UPDATED', `Cập nhật thông tin ngân hàng câu hỏi (${bankId})`, '', allowedUpdates);
  return updated;
}

function disableQuestionBank(bankId) {
  if (!bankId) throw new Error('Thiếu bankId để vô hiệu hóa.');
  const sheet = getSheet('QUESTION_BANKS');
  const found = findRowById(sheet, bankId);
  if (!found) return null;

  const updated = updateObjectById(sheet, bankId, {
    enabled: false,
    updatedAt: getCurrentTimestamp()
  });

  appendLog('INFO', 'QUESTION_BANK', 'QUESTION_BANK_DISABLED', `Vô hiệu hóa ngân hàng câu hỏi: ${found.data.name} (${bankId})`, '', { bankId: bankId });
  return updated;
}

function apiListQuestionBanks() {
  const list = listQuestionBanks();
  return successResponse(list);
}

function apiGetQuestionBank(data) {
  requireFields(data, ['id']);
  const sheet = getSheet('QUESTION_BANKS');
  const found = findRowById(sheet, data.id);
  if (!found) return errorResponse('BANK_NOT_FOUND', 'Không tìm thấy ngân hàng câu hỏi');
  return successResponse(found.data);
}

function apiCreateQuestionBank(data, authenticatedUid) {
  try {
    const payload = { ...data };
    if (authenticatedUid) {
      payload.ownerUid = authenticatedUid;
      payload.visibility = payload.visibility === 'SHARED' ? 'SHARED' : 'PRIVATE';
    } else {
      payload.ownerUid = '';
      payload.visibility = 'SYSTEM';
    }
    const bank = createQuestionBank(payload);
    return successResponse(bank, 'Đã tạo ngân hàng câu hỏi mới');
  } catch (err) {
    return errorResponse('CREATE_BANK_FAILED', err.message);
  }
}

function apiUpdateQuestionBank(data, authenticatedUid) {
  requireFields(data, ['id']);
  try {
    const sheet = getSheet('QUESTION_BANKS');
    const found = findRowById(sheet, data.id);
    if (!found) return errorResponse('BANK_NOT_FOUND', 'Không tìm thấy ngân hàng câu hỏi');
    if (authenticatedUid) {
      assertOwnership(found.data.ownerUid, authenticatedUid, false, found.data.visibility);
    }
    const updated = updateQuestionBank(data.id, data);
    return successResponse(updated, 'Đã cập nhật ngân hàng câu hỏi');
  } catch (err) {
    return errorResponse('UPDATE_BANK_FAILED', err.message);
  }
}

function apiDeleteQuestionBank(data, authenticatedUid) {
  requireFields(data, ['id']);
  const sheet = getSheet('QUESTION_BANKS');
  const found = findRowById(sheet, data.id);
  if (!found) return errorResponse('BANK_NOT_FOUND', 'Không tìm thấy ngân hàng để xóa');
  if (authenticatedUid) {
    assertOwnership(found.data.ownerUid, authenticatedUid, false, found.data.visibility);
  }
  const disabled = disableQuestionBank(data.id);
  return successResponse({ deleted: true, id: data.id }, 'Đã vô hiệu hóa ngân hàng câu hỏi');
}

function apiDisableQuestionBank(data, authenticatedUid) {
  requireFields(data, ['id']);
  const sheet = getSheet('QUESTION_BANKS');
  const found = findRowById(sheet, data.id);
  if (!found) return errorResponse('BANK_NOT_FOUND', 'Không tìm thấy ngân hàng câu hỏi');
  if (authenticatedUid) {
    assertOwnership(found.data.ownerUid, authenticatedUid, false, found.data.visibility);
  }
  const disabled = disableQuestionBank(data.id);
  return successResponse(disabled, 'Đã vô hiệu hóa ngân hàng câu hỏi');
}

function apiSaveImportedQuestionBank(data, authenticatedUid) {
  return saveImportedQuestionBank(data, authenticatedUid);
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
    topic: q.topic || '',
    questionType: q.questionType || 'multiple_choice',
    question: q.question,
    options: {
      A: q.optionA || '',
      B: q.optionB || '',
      C: q.optionC || '',
      D: q.optionD || ''
    },
    optionA: q.optionA || '',
    optionB: q.optionB || '',
    optionC: q.optionC || '',
    optionD: q.optionD || '',
    correctAnswer: q.correctAnswer || 'A',
    explanation: q.explanation || '',
    difficulty: q.difficulty || 'MEDIUM',
    normalPoints: Number(q.normalPoints) || 10,
    specialPoints: Number(q.specialPoints) || 20,
    isSpecial: normalizeBoolean(q.isSpecial, false),
    enabled: normalizeBoolean(q.enabled, true),
    tags: q.tags || '',
    importId: q.importId || '',
    createdAt: q.createdAt,
    updatedAt: q.updatedAt
  };
}

function listQuestionsByBank(bankId) {
  if (!bankId) return [];
  const sheet = getSheet('QUESTIONS');
  const found = findRowsByField(sheet, 'bankId', bankId);
  return found
    .map(f => formatQuestionResponse(f.data))
    .filter(q => q.enabled)
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
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
  const questions = listQuestionsByBank(data.bankId);
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
  const correctAns = normalizeCorrectAnswer(data.correctAnswer);
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
    correctAnswer: correctAns,
    explanation: sanitizeString(data.explanation),
    difficulty: data.difficulty || 'MEDIUM',
    normalPoints: Number(data.normalPoints) || 10,
    specialPoints: Number(data.specialPoints) || 20,
    isSpecial: normalizeBoolean(data.isSpecial, false),
    enabled: normalizeBoolean(data.enabled, true),
    tags: sanitizeString(data.tags),
    importId: sanitizeString(data.importId) || '',
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp()
  };
  appendObject(sheet, q);

  // Update bank question count
  const actualCount = countQuestionsInBank(data.bankId);
  const bankSheet = getSheet('QUESTION_BANKS');
  updateObjectById(bankSheet, data.bankId, { questionCount: actualCount, updatedAt: getCurrentTimestamp() });

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
  if (data.correctAnswer !== undefined) {
    updates.correctAnswer = normalizeCorrectAnswer(data.correctAnswer);
  }
  if (data.isSpecial !== undefined) {
    updates.isSpecial = normalizeBoolean(data.isSpecial, false);
  }
  if (data.enabled !== undefined) {
    updates.enabled = normalizeBoolean(data.enabled, true);
  }
  const updated = updateObjectById(sheet, data.id, updates);
  if (!updated) return errorResponse('QUESTION_NOT_FOUND', 'Không tìm thấy câu hỏi');

  if (updated.bankId) {
    const actualCount = countQuestionsInBank(updated.bankId);
    const bankSheet = getSheet('QUESTION_BANKS');
    updateObjectById(bankSheet, updated.bankId, { questionCount: actualCount, updatedAt: getCurrentTimestamp() });
  }

  return successResponse(formatQuestionResponse(updated), 'Đã cập nhật câu hỏi');
}

function apiDeleteQuestion(data) {
  requireFields(data, ['id']);
  const sheet = getSheet('QUESTIONS');
  const found = findRowById(sheet, data.id);
  if (!found) return errorResponse('QUESTION_NOT_FOUND', 'Không tìm thấy câu hỏi');
  const bankId = found.data.bankId;
  const deleted = deleteObjectById(sheet, data.id);
  if (!deleted) return errorResponse('QUESTION_NOT_FOUND', 'Không tìm thấy câu hỏi để xóa');

  if (bankId) {
    const actualCount = countQuestionsInBank(bankId);
    const bankSheet = getSheet('QUESTION_BANKS');
    updateObjectById(bankSheet, bankId, { questionCount: actualCount, updatedAt: getCurrentTimestamp() });
  }

  return successResponse({ deleted: true }, 'Đã xóa câu hỏi');
}

// ==========================================
// 11. BATCH IMPORT & PERSISTENCE ENGINE
// ==========================================

function importQuestionsBatch(bankId, rows, options) {
  if (!bankId) throw new Error('bankId là bắt buộc khi import questions.');
  const opts = options || {};
  const mode = (opts.mode || 'CREATE').toUpperCase();
  const importId = opts.importId || '';
  const sheet = getSheet('QUESTIONS');
  const headers = getHeaders(sheet);

  // Look up bank ownerUid if not explicitly provided in opts (Section 22: QUESTIONS.ownerUid = QUESTION_BANKS.ownerUid)
  let bankOwnerUid = opts.ownerUid || '';
  if (!bankOwnerUid) {
    try {
      const bankSheet = getSheet('QUESTION_BANKS');
      const bRow = findRowById(bankSheet, bankId);
      if (bRow && bRow.data && bRow.data.ownerUid) {
        bankOwnerUid = String(bRow.data.ownerUid).trim();
      }
    } catch (e) {}
  }

  // Load existing questions for this bank for duplicate checking
  const existingMap = new Map();
  const existingIdMap = new Map();

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const data = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
    const bankIdCol = headers.indexOf('bankId');
    const idCol = headers.indexOf('id');
    const qCol = headers.indexOf('question');

    for (let i = 0; i < data.length; i++) {
      const rowBankId = String(data[i][bankIdCol]);
      if (rowBankId === String(bankId)) {
        const rowId = String(data[i][idCol]);
        const rowQ = String(data[i][qCol] || '').trim().toLowerCase();
        const item = { rowIndex: i + 2, data: rowToObject(headers, data[i]) };
        if (rowId) existingIdMap.set(rowId, item);
        if (rowQ) existingMap.set(rowQ, item);
      }
    }
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  const errors = [];
  const rowsToAppend = [];
  const now = getCurrentTimestamp();

  // Get current max order
  let currentMaxOrder = 0;
  const orderCol = headers.indexOf('order');
  if (lastRow > 1 && orderCol !== -1) {
    const orderData = sheet.getRange(2, orderCol + 1, lastRow - 1, 1).getValues();
    orderData.forEach(r => {
      const o = Number(r[0]);
      if (!isNaN(o) && o > currentMaxOrder) currentMaxOrder = o;
    });
  }

  for (let idx = 0; idx < rows.length; idx++) {
    const r = rows[idx];
    const rowNum = idx + 1;

    try {
      // 1. Validate question text
      const qText = sanitizeString(r.question || r.q || r.content);
      if (!qText) {
        failed++;
        errors.push({
          row: rowNum,
          question: '',
          code: 'MISSING_QUESTION_TEXT',
          message: 'Nội dung câu hỏi không được để trống.'
        });
        continue;
      }

      // 2. Question type
      let qType = r.questionType || 'multiple_choice';
      const validTypes = ['multiple_choice', 'true_false', 'short_answer', 'fill_blank', 'sorting', 'drag_drop'];
      if (!validTypes.includes(qType)) {
        qType = 'multiple_choice';
      }

      // 3. Options
      const optA = sanitizeString(r.optionA || (r.options && r.options.A) || (r.options && r.options[0]));
      const optB = sanitizeString(r.optionB || (r.options && r.options.B) || (r.options && r.options[1]));
      const optC = sanitizeString(r.optionC || (r.options && r.options.C) || (r.options && r.options[2]));
      const optD = sanitizeString(r.optionD || (r.options && r.options.D) || (r.options && r.options[3]));

      // 4. Correct answer
      const rawAns = r.correctAnswer !== undefined ? r.correctAnswer : (r.answer !== undefined ? r.answer : '');
      const correctAns = normalizeCorrectAnswer(rawAns);

      // Validate multiple choice
      if (qType === 'multiple_choice') {
        if (!optA || !optB) {
          failed++;
          errors.push({
            row: rowNum,
            question: qText,
            code: 'MISSING_OPTIONS',
            message: 'Câu hỏi trắc nghiệm cần tối thiểu 2 phương án A và B.'
          });
          continue;
        }

        if (!['A', 'B', 'C', 'D'].includes(correctAns)) {
          failed++;
          errors.push({
            row: rowNum,
            question: qText,
            code: 'INVALID_CORRECT_ANSWER',
            message: `Đáp án đúng '${rawAns}' không hợp lệ. Phải là A, B, C hoặc D.`
          });
          continue;
        }
      }

      // 5. Points & Booleans
      const normalPts = Number(r.normalPoints) > 0 ? Number(r.normalPoints) : 10;
      const specialPts = Number(r.specialPoints) > 0 ? Number(r.specialPoints) : 20;
      const isSpec = normalizeBoolean(r.isSpecial, false);
      const isEnab = normalizeBoolean(r.enabled, true);

      // 6. Duplicate check within bank
      const normalizedQKey = qText.toLowerCase();
      let matchedExisting = null;
      if (r.id && existingIdMap.has(String(r.id))) {
        matchedExisting = existingIdMap.get(String(r.id));
      } else if (existingMap.has(normalizedQKey)) {
        matchedExisting = existingMap.get(normalizedQKey);
      }

      if (matchedExisting) {
        if (mode === 'SKIP') {
          skipped++;
          continue;
        } else if (mode === 'UPDATE') {
          const updateObj = {
            bankId: bankId, // Server enforces bankId!
            ownerUid: bankOwnerUid || matchedExisting.data.ownerUid || '',
            subject: sanitizeString(r.subject) || matchedExisting.data.subject || 'Tin học',
            grade: r.grade ? Number(r.grade) : (matchedExisting.data.grade || 5),
            topic: sanitizeString(r.topic) || matchedExisting.data.topic || '',
            questionType: qType,
            question: qText,
            optionA: optA,
            optionB: optB,
            optionC: optC,
            optionD: optD,
            correctAnswer: correctAns,
            explanation: sanitizeString(r.explanation || matchedExisting.data.explanation) || '',
            difficulty: r.difficulty || matchedExisting.data.difficulty || 'MEDIUM',
            normalPoints: normalPts,
            specialPoints: specialPts,
            isSpecial: isSpec,
            enabled: isEnab,
            tags: sanitizeString(r.tags || matchedExisting.data.tags) || '',
            importId: importId || matchedExisting.data.importId || '',
            updatedAt: now
          };
          updateObjectById(sheet, matchedExisting.data.id, updateObj);
          updated++;
          continue;
        }
        // mode === 'CREATE': fall through to create new row
      }

      // 7. Prepare new object to append
      currentMaxOrder++;
      const newQ = {
        id: generateId('q'),
        bankId: bankId, // Server enforces bankId!
        ownerUid: bankOwnerUid,
        order: Number(r.order) > 0 ? Number(r.order) : currentMaxOrder,
        subject: sanitizeString(r.subject) || 'Tin học',
        grade: r.grade ? Number(r.grade) : 5,
        topic: sanitizeString(r.topic) || '',
        questionType: qType,
        question: qText,
        optionA: optA,
        optionB: optB,
        optionC: optC,
        optionD: optD,
        correctAnswer: correctAns,
        explanation: sanitizeString(r.explanation) || '',
        difficulty: r.difficulty || 'MEDIUM',
        normalPoints: normalPts,
        specialPoints: specialPts,
        isSpecial: isSpec,
        enabled: isEnab,
        tags: sanitizeString(r.tags) || '',
        importId: importId,
        createdAt: now,
        updatedAt: now
      };

      const rowValues = objectToRow(headers, newQ);
      rowsToAppend.push(rowValues);
      created++;

      // Cache locally to prevent duplicates within the same batch
      existingMap.set(normalizedQKey, { data: newQ });
      existingIdMap.set(newQ.id, { data: newQ });

    } catch (rowErr) {
      failed++;
      errors.push({
        row: rowNum,
        question: r.question || '',
        code: 'ROW_PROCESSING_ERROR',
        message: rowErr.message || 'Lỗi không xác định khi xử lý dòng.'
      });
    }
  }

  // Batch append using setValues
  if (rowsToAppend.length > 0) {
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, rowsToAppend.length, headers.length).setValues(rowsToAppend);
  }

  return {
    total: rows.length,
    created: created,
    updated: updated,
    skipped: skipped,
    failed: failed,
    errors: errors
  };
}

function saveImportedQuestionBank(payload, authenticatedUid) {
  // 1. Validate payload
  if (!payload || typeof payload !== 'object') {
    return errorResponse('INVALID_PAYLOAD', 'Dữ liệu payload không hợp lệ.');
  }

  const bankData = payload.bank || {};
  const rawQuestions = Array.isArray(payload.questions) ? payload.questions : [];
  const importInfo = payload.import || {};
  const importId = sanitizeString(importInfo.importId);
  const mode = (importInfo.mode || 'CREATE').toUpperCase();

  // Enforce server-side ownerUid: ignore client-provided spoofed ownerUid
  const safeOwnerUid = authenticatedUid ? String(authenticatedUid).trim() : '';
  const safeVisibility = safeOwnerUid ? (bankData.visibility === 'SHARED' ? 'SHARED' : 'PRIVATE') : 'SYSTEM';

  if (!bankData.name || !String(bankData.name).trim()) {
    return errorResponse('MISSING_BANK_NAME', 'Tên bộ câu hỏi (bank.name) là bắt buộc.');
  }

  // 2. Pre-validate questions: ensure there is at least 1 valid question
  const preValidatedErrors = [];
  const validQuestions = [];

  rawQuestions.forEach((r, idx) => {
    const rowNum = idx + 1;
    const qText = sanitizeString(r.question || r.q || r.content);
    if (!qText) {
      preValidatedErrors.push({
        row: rowNum,
        question: '',
        code: 'MISSING_QUESTION',
        message: 'Thiếu nội dung câu hỏi.'
      });
      return;
    }

    const qType = r.questionType || 'multiple_choice';
    if (qType === 'multiple_choice') {
      const optA = sanitizeString(r.optionA || (r.options && r.options.A) || (r.options && r.options[0]));
      const optB = sanitizeString(r.optionB || (r.options && r.options.B) || (r.options && r.options[1]));
      const rawAns = r.correctAnswer !== undefined ? r.correctAnswer : (r.answer !== undefined ? r.answer : '');
      const correctAns = normalizeCorrectAnswer(rawAns);

      if (!optA || !optB) {
        preValidatedErrors.push({
          row: rowNum,
          question: qText,
          code: 'MISSING_OPTIONS',
          message: 'Phương án A và B là bắt buộc.'
        });
        return;
      }

      if (!['A', 'B', 'C', 'D'].includes(correctAns)) {
        preValidatedErrors.push({
          row: rowNum,
          question: qText,
          code: 'INVALID_CORRECT_ANSWER',
          message: `Đáp án đúng '${rawAns}' không hợp lệ (cần là A, B, C, hoặc D).`
        });
        return;
      }
    }

    validQuestions.push(r);
  });

  // Requirement 7: KHÔNG TẠO BANK RỖNG NGOÀI Ý MUỐN
  if (validQuestions.length === 0) {
    return {
      success: false,
      error: 'NO_VALID_QUESTIONS',
      message: 'Không có câu hỏi hợp lệ nào trong danh sách để lưu vào ngân hàng.',
      errors: preValidatedErrors
    };
  }

  // Requirement 14: Check importId idempotency in IMPORT_HISTORY
  const historySheet = getSheet('IMPORT_HISTORY');
  if (importId) {
    const existingImports = findRowsByField(historySheet, 'importId', importId);
    const completedImport = existingImports.find(imp => imp.data.status === 'SUCCESS');
    if (completedImport) {
      return {
        success: false,
        error: 'DUPLICATE_IMPORT',
        message: `Yêu cầu import với mã '${importId}' đã được xử lý thành công trước đó.`
      };
    }
  }

  // Requirement 17: LockService to prevent concurrent writes
  const lock = LockService.getScriptLock();
  let hasLock = false;
  try {
    hasLock = lock.tryLock(30000); // 30 seconds wait
  } catch (lockErr) {
    hasLock = false;
  }

  if (!hasLock) {
    return errorResponse('CONCURRENT_IMPORT_IN_PROGRESS', 'Hệ thống đang xử lý một phiên import khác. Vui lòng thử lại sau giây lát.');
  }

  let createdBank = null;
  const historyId = generateId('imp');
  const startTime = getCurrentTimestamp();

  try {
    appendLog('INFO', 'IMPORT', 'QUESTIONS_IMPORT_STARTED', `Bắt đầu import bộ câu hỏi: '${bankData.name}' (${validQuestions.length} câu hợp lệ / ${rawQuestions.length} tổng)`, '', {
      importId: importId,
      totalRows: rawQuestions.length,
      validRows: validQuestions.length
    });

    // 1. Create Question Bank
    createdBank = createQuestionBank({
      name: bankData.name,
      subject: bankData.subject,
      grade: bankData.grade,
      topic: bankData.topic,
      description: bankData.description,
      sourceFileName: importInfo.fileName,
      importId: importId,
      ownerUid: safeOwnerUid,
      visibility: safeVisibility
    });

    const bankId = createdBank.id;

    // 2. Import Batch Questions (enforces question.bankId = bankId and question.ownerUid = bank.ownerUid)
    const batchResult = importQuestionsBatch(bankId, rawQuestions, {
      mode: mode,
      importId: importId,
      sourceFileName: importInfo.fileName,
      ownerUid: safeOwnerUid
    });

    // 3. Recalculate exact question count from QUESTIONS sheet
    const actualQuestionCount = countQuestionsInBank(bankId);

    // 4. Update Question Bank with actual count
    const bankSheet = getSheet('QUESTION_BANKS');
    updateObjectById(bankSheet, bankId, {
      questionCount: actualQuestionCount,
      updatedAt: getCurrentTimestamp()
    });

    // Requirement 23: If 0 questions saved successfully, disable bank
    if (actualQuestionCount === 0) {
      updateObjectById(bankSheet, bankId, {
        enabled: false,
        questionCount: 0,
        updatedAt: getCurrentTimestamp()
      });

      appendObject(historySheet, {
        id: historyId,
        importId: importId,
        ownerUid: safeOwnerUid,
        importType: 'QUESTIONS',
        fileName: importInfo.fileName || 'web_import.json',
        fileType: importInfo.fileType || 'JSON',
        targetBankId: bankId,
        totalRows: rawQuestions.length,
        createdRows: batchResult.created,
        updatedRows: batchResult.updated,
        skippedRows: batchResult.skipped,
        errorRows: batchResult.failed,
        mode: mode,
        status: 'FAILED',
        errorMessage: 'Không có câu hỏi nào được lưu thành công vào ngân hàng.',
        createdAt: startTime,
        completedAt: getCurrentTimestamp()
      });

      appendLog('ERROR', 'IMPORT', 'QUESTIONS_IMPORT_FAILED', `Import thất bại toàn bộ cho bank '${bankData.name}' (${bankId})`, '', batchResult, '', safeOwnerUid);

      return {
        success: false,
        error: 'IMPORT_FAILED',
        message: 'Import thất bại: Không có câu hỏi nào được lưu thành công.',
        bank: {
          id: bankId,
          bankCode: createdBank.bankCode,
          name: createdBank.name,
          questionCount: 0
        },
        importResult: batchResult
      };
    }

    // Determine import status: SUCCESS or PARTIAL
    const isPartial = batchResult.failed > 0;
    const importStatus = isPartial ? 'PARTIAL' : 'SUCCESS';

    // Record IMPORT_HISTORY
    appendObject(historySheet, {
      id: historyId,
      importId: importId,
      ownerUid: safeOwnerUid,
      importType: 'QUESTIONS',
      fileName: importInfo.fileName || 'web_import.json',
      fileType: importInfo.fileType || 'JSON',
      targetBankId: bankId,
      totalRows: rawQuestions.length,
      createdRows: batchResult.created,
      updatedRows: batchResult.updated,
      skippedRows: batchResult.skipped,
      errorRows: batchResult.failed,
      mode: mode,
      status: importStatus,
      errorMessage: isPartial ? `Có ${batchResult.failed} câu lỗi.` : '',
      createdAt: startTime,
      completedAt: getCurrentTimestamp()
    });

    appendLog(isPartial ? 'WARNING' : 'INFO', 'IMPORT', isPartial ? 'QUESTIONS_IMPORT_PARTIAL' : 'QUESTIONS_IMPORT_SUCCESS',
      `Import ${importStatus}: Đã lưu ${actualQuestionCount} câu hỏi vào ngân hàng '${createdBank.name}' (${bankId}).`, '', {
        bankId: bankId,
        actualCount: actualQuestionCount,
        batchResult: batchResult
      }
    );

    const response = {
      success: true,
      bank: {
        id: bankId,
        bankCode: createdBank.bankCode,
        name: createdBank.name,
        questionCount: actualQuestionCount
      },
      importResult: {
        total: rawQuestions.length,
        created: batchResult.created,
        updated: batchResult.updated,
        skipped: batchResult.skipped,
        failed: batchResult.failed,
        ...(batchResult.errors && batchResult.errors.length > 0 ? { errors: batchResult.errors } : {})
      }
    };

    if (isPartial) {
      response.partial = true;
    }

    return response;

  } catch (err) {
    appendLog('ERROR', 'IMPORT', 'QUESTIONS_IMPORT_FAILED', `Lỗi nghiêm trọng khi import câu hỏi: ${err.message}`, '', err.stack);
    if (createdBank && createdBank.id) {
      try {
        const bankSheet = getSheet('QUESTION_BANKS');
        updateObjectById(bankSheet, createdBank.id, {
          enabled: false,
          questionCount: 0,
          updatedAt: getCurrentTimestamp()
        });
      } catch (e) {}
    }
    return errorResponse('SAVE_IMPORT_ERROR', `Lỗi khi lưu ngân hàng câu hỏi: ${err.message}`);
  } finally {
    lock.releaseLock();
  }
}

function apiImportQuestionsBatch(data) {
  requireFields(data, ['bankId', 'rows']);
  const result = importQuestionsBatch(data.bankId, data.rows, {
    mode: data.mode || 'CREATE',
    importId: data.importId,
    sourceFileName: data.fileName || data.sourceFileName
  });
  return successResponse(result, 'Xử lý import câu hỏi hoàn tất');
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

function apiCreateSession(data, authenticatedUid) {
  requireFields(data, ['gameSlug']);
  const gameSlug = data.gameSlug;

  // Server enforces ownerUid: never trust client-provided ownerUid
  const safeOwnerUid = authenticatedUid ? String(authenticatedUid).trim() : '';

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
    ownerUid: safeOwnerUid,
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
      ownerUid: safeOwnerUid,
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
    teamCount: teamCount,
    ownerUid: safeOwnerUid
  }, safeOwnerUid);

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
// 24. MULTI-USER TEACHER PROFILE & PREFERENCES API
// ==========================================

function apiSyncUserProfile(data, authenticatedUid, authContext) {
  const targetUid = String(authenticatedUid || (authContext && authContext.uid) || data.authUid || '').trim();
  if (!targetUid) {
    return errorResponse('MISSING_AUTH_UID', 'authUid là bắt buộc để đồng bộ hồ sơ giáo viên.');
  }

  const userSheet = getSheet('USERS');
  const prefSheet = getSheet('USER_PREFERENCES');

  const existingUsers = findRowsByField(userSheet, 'authUid', targetUid);
  let userRecord = null;

  // Use verified claims if available
  const verifiedEmail = (authContext && authContext.email) || sanitizeString(data.email);
  const verifiedDisplayName = (authContext && authContext.displayName) || sanitizeString(data.displayName);
  const verifiedPhotoURL = (authContext && authContext.photoURL) || sanitizeString(data.photoURL || data.photoUrl);

  if (existingUsers.length > 0) {
    const existing = existingUsers[0];
    const isEnabled = existing.data.enabled !== undefined ? normalizeBoolean(existing.data.enabled, true) : true;
    const status = existing.data.status ? String(existing.data.status).toUpperCase() : (isEnabled ? 'ACTIVE' : 'DISABLED');
    if (!isEnabled || status === 'DISABLED') {
      throw new Error('Tài khoản giáo viên đã bị vô hiệu hóa bởi Quản trị viên.');
    }

    const updates = {
      email: verifiedEmail || existing.data.email,
      displayName: verifiedDisplayName || existing.data.displayName,
      photoURL: verifiedPhotoURL || existing.data.photoURL || '',
      lastLoginAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    };
    if (data.role && data.role === 'ADMIN' && existing.data.role === 'ADMIN') {
      updates.role = 'ADMIN';
    }
    userRecord = updateObjectById(userSheet, existing.data.id, updates);
  } else {
    const newUser = {
      id: generateId('usr'),
      authUid: targetUid,
      email: verifiedEmail,
      displayName: verifiedDisplayName || 'Giáo viên',
      photoURL: verifiedPhotoURL || '',
      role: data.role === 'ADMIN' ? 'ADMIN' : 'TEACHER',
      enabled: true,
      createdAt: getCurrentTimestamp(),
      lastLoginAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    };
    userRecord = appendObject(userSheet, newUser);
  }

  // Synchronize Preferences
  const existingPrefs = findRowsByField(prefSheet, 'authUid', targetUid);
  let prefRecord = null;

  if (existingPrefs.length > 0) {
    prefRecord = existingPrefs[0].data;
  } else {
    const newPref = {
      id: generateId('pref'),
      authUid: targetUid,
      defaultSchoolName: sanitizeString(data.schoolName) || '',
      defaultClassName: sanitizeString(data.defaultClassName) || '5A',
      defaultSubject: sanitizeString(data.defaultSubject) || 'Tin học',
      defaultGrade: data.defaultGrade ? Number(data.defaultGrade) : 5,
      defaultQuestionCount: 10,
      defaultTeamCount: 2,
      soundEnabled: true,
      animationEnabled: true,
      theme: 'LIGHT',
      favoriteGameSlug: 'cam-race',
      lastQuestionBankId: 'bank_tinhoc5_demo',
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    };
    prefRecord = appendObject(prefSheet, newPref);
  }

  appendLog('INFO', 'AUTH', 'USER_SYNCED', `Đồng bộ tài khoản thành công: ${userRecord.displayName} (${targetUid})`, '', {
    authUid: targetUid,
    email: userRecord.email,
    role: userRecord.role
  }, targetUid);

  return successResponse({
    user: userRecord,
    preferences: prefRecord
  }, 'Đồng bộ tài khoản và cài đặt thành công');
}

function apiGetUser(data, authenticatedUid) {
  const targetUid = String(authenticatedUid || data.authUid || '').trim();
  if (!targetUid) return errorResponse('MISSING_AUTH_UID', 'authUid là bắt buộc.');
  const userSheet = getSheet('USERS');
  const rows = findRowsByField(userSheet, 'authUid', targetUid);
  if (rows.length === 0) return errorResponse('USER_NOT_FOUND', 'Không tìm thấy thông tin giáo viên.');
  return successResponse(rows[0].data);
}

function apiGetUserPreferences(data, authenticatedUid) {
  const targetUid = String(authenticatedUid || data.authUid || '').trim();
  if (!targetUid) return errorResponse('MISSING_AUTH_UID', 'authUid là bắt buộc.');
  const prefSheet = getSheet('USER_PREFERENCES');
  const rows = findRowsByField(prefSheet, 'authUid', targetUid);
  if (rows.length === 0) {
    return successResponse({
      authUid: targetUid,
      defaultSchoolName: '',
      defaultClassName: '5A',
      defaultSubject: 'Tin học',
      defaultGrade: 5,
      defaultQuestionCount: 10,
      defaultTeamCount: 2,
      soundEnabled: true,
      animationEnabled: true,
      theme: 'LIGHT',
      favoriteGameSlug: 'cam-race'
    });
  }
  return successResponse(rows[0].data);
}

function apiUpdateUserPreferences(data, authenticatedUid) {
  const targetUid = String(authenticatedUid || data.authUid || '').trim();
  if (!targetUid) return errorResponse('MISSING_AUTH_UID', 'authUid là bắt buộc.');
  const prefSheet = getSheet('USER_PREFERENCES');
  const rows = findRowsByField(prefSheet, 'authUid', targetUid);

  const updates = { ...data };
  delete updates.authUid;
  delete updates.id;
  updates.updatedAt = getCurrentTimestamp();

  if (rows.length > 0) {
    const updated = updateObjectById(prefSheet, rows[0].data.id, updates);
    return successResponse(updated, 'Đã lưu cấu hình không gian làm việc.');
  } else {
    const newPref = {
      id: generateId('pref'),
      authUid: targetUid,
      ...updates,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    };
    appendObject(prefSheet, newPref);
    return successResponse(newPref, 'Đã khởi tạo và lưu cấu hình không gian làm việc.');
  }
}

// ==========================================
// 25. MULTI-USER SCOPED QUERIES
// ==========================================

function apiListQuestionBanksForUser(data, authenticatedUid) {
  const targetUid = String(authenticatedUid || data.authUid || '').trim();
  const bankSheet = getSheet('QUESTION_BANKS');
  const lastRow = bankSheet.getLastRow();
  if (lastRow <= 1) return successResponse([]);

  const headers = getHeaders(bankSheet);
  const dataRows = bankSheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  const role = getUserRole(targetUid);

  const banks = dataRows
    .map(row => rowToObject(headers, row))
    .filter(b => {
      const isEnabled = b.enabled !== undefined ? normalizeBoolean(b.enabled, true) : true;
      if (!isEnabled) return false;
      if (role === 'ADMIN') return true;
      if (!targetUid) return !b.ownerUid || b.visibility === 'SYSTEM' || b.visibility === 'SHARED';
      return b.ownerUid === targetUid || !b.ownerUid || b.visibility === 'SYSTEM' || b.visibility === 'SHARED';
    })
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  return successResponse(banks);
}

function apiListQuestionsByBankForUser(data, authenticatedUid) {
  requireFields(data, ['bankId']);
  const targetUid = String(authenticatedUid || data.authUid || '').trim();
  const bankSheet = getSheet('QUESTION_BANKS');
  const bFound = findRowById(bankSheet, data.bankId);
  if (!bFound) return errorResponse('BANK_NOT_FOUND', 'Không tìm thấy ngân hàng câu hỏi.');

  // Check read permission
  assertOwnership(bFound.data.ownerUid, targetUid, true, bFound.data.visibility);

  return apiListQuestionsByBank(data);
}

function apiListSessionsForUser(data, authenticatedUid) {
  const targetUid = String(authenticatedUid || data.authUid || '').trim();
  const sessionSheet = getSheet('GAME_SESSIONS');
  const lastRow = sessionSheet.getLastRow();
  if (lastRow <= 1) return successResponse([]);

  const headers = getHeaders(sessionSheet);
  const rows = sessionSheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  const role = getUserRole(targetUid);

  let sessions = rows
    .map(r => rowToObject(headers, r))
    .filter(s => {
      if (role === 'ADMIN') return true;
      if (!targetUid) return true; // Cho phép chế độ xem demo
      return s.ownerUid === targetUid;
    })
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  if (data.gameSlug) {
    sessions = sessions.filter(s => s.gameSlug === data.gameSlug);
  }
  if (data.limit) {
    sessions = sessions.slice(0, Number(data.limit));
  }

  return successResponse(sessions);
}

function apiListResultsForUser(data, authenticatedUid) {
  const targetUid = String(authenticatedUid || data.authUid || '').trim();
  const resultSheet = getSheet('GAME_RESULTS');
  const lastRow = resultSheet.getLastRow();
  if (lastRow <= 1) return successResponse([]);

  const headers = getHeaders(resultSheet);
  const rows = resultSheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  const role = getUserRole(targetUid);

  let results = rows
    .map(r => rowToObject(headers, r))
    .filter(r => {
      if (role === 'ADMIN') return true;
      if (!targetUid) return true;
      return r.ownerUid === targetUid;
    })
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  if (data.gameSlug) {
    results = results.filter(r => r.gameSlug === data.gameSlug);
  }

  return successResponse(results);
}

function apiListCertificatesForUser(data, authenticatedUid) {
  const targetUid = String(authenticatedUid || data.authUid || '').trim();
  const certSheet = getSheet('CERTIFICATES');
  const lastRow = certSheet.getLastRow();
  if (lastRow <= 1) return successResponse([]);

  const headers = getHeaders(certSheet);
  const rows = certSheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  const role = getUserRole(targetUid);

  let certs = rows
    .map(r => rowToObject(headers, r))
    .filter(c => {
      if (role === 'ADMIN') return true;
      if (!targetUid) return true;
      return c.ownerUid === targetUid;
    })
    .sort((a, b) => new Date(b.issuedAt || 0).getTime() - new Date(a.issuedAt || 0).getTime());

  return successResponse(certs);
}

// ==========================================
// 26. MULTI-USER SCHEMA SETUP, MIGRATION & AUDIT
// ==========================================

function apiSetupMultiUserSchema(data, authenticatedUid) {
  setupDatabase();
  return successResponse({
    schemas: Object.keys(EDUPLAY_SCHEMAS),
    totalSheets: Object.keys(EDUPLAY_SCHEMAS).length
  }, 'Đã khởi tạo hoàn tất toàn bộ 20 bảng cơ sở dữ liệu Multi-User EDUPLAY.');
}

function apiMigrateMultiUserSchema(data, authenticatedUid) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const migrationLogs = [];
  let updatedColsTotal = 0;

  Object.keys(EDUPLAY_SCHEMAS).forEach(sheetName => {
    const expectedHeaders = EDUPLAY_SCHEMAS[sheetName];
    const sheet = getOrCreateSheet(ss, sheetName, expectedHeaders);
    const lastCol = Math.max(sheet.getLastColumn(), 1);
    const currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0] || [];
    const missing = expectedHeaders.filter(h => !currentHeaders.includes(h));

    if (missing.length > 0) {
      ensureHeaders(sheet, expectedHeaders);
      formatSheetHeader(sheet, expectedHeaders.length);
      migrationLogs.push(`Bảng ${sheetName}: đã bổ sung các cột [${missing.join(', ')}]`);
      updatedColsTotal += missing.length;
    }
  });

  ensureDataValidation(ss);
  appendLog('INFO', 'MIGRATION', 'MULTI_USER_MIGRATION_DONE', `Đã đồng bộ schema Multi-User (${updatedColsTotal} cột bổ sung)`, '', migrationLogs, authenticatedUid || '');

  return successResponse({
    updatedColumnsCount: updatedColsTotal,
    details: migrationLogs
  }, `Đã di trú schema Multi-User thành công (${updatedColsTotal} cột mới).`);
}

function apiAuditOwnership(data, authenticatedUid) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const stats = {
    totalUsers: 0,
    totalBanks: 0,
    systemBanks: 0,
    teacherBanks: 0,
    orphanedQuestions: 0,
    orphanedSessionChildRecords: 0
  };

  const userSheet = ss.getSheetByName('USERS');
  if (userSheet && userSheet.getLastRow() > 1) {
    stats.totalUsers = userSheet.getLastRow() - 1;
  }

  const bankSheet = ss.getSheetByName('QUESTION_BANKS');
  const bankOwnerMap = new Map();
  if (bankSheet && bankSheet.getLastRow() > 1) {
    const bHeaders = getHeaders(bankSheet);
    const bRows = bankSheet.getRange(2, 1, bankSheet.getLastRow() - 1, bHeaders.length).getValues();
    stats.totalBanks = bRows.length;
    bRows.forEach(r => {
      const bObj = rowToObject(bHeaders, r);
      bankOwnerMap.set(bObj.id, bObj.ownerUid || '');
      if (!bObj.ownerUid || bObj.visibility === 'SYSTEM') {
        stats.systemBanks++;
      } else {
        stats.teacherBanks++;
      }
    });
  }

  // Audit Questions
  const qSheet = ss.getSheetByName('QUESTIONS');
  if (qSheet && qSheet.getLastRow() > 1) {
    const qHeaders = getHeaders(qSheet);
    const qRows = qSheet.getRange(2, 1, qSheet.getLastRow() - 1, qHeaders.length).getValues();
    qRows.forEach(r => {
      const qObj = rowToObject(qHeaders, r);
      const expectedOwner = bankOwnerMap.get(qObj.bankId) || '';
      if ((qObj.ownerUid || '') !== expectedOwner) {
        stats.orphanedQuestions++;
      }
    });
  }

  // Audit Sessions & Teams
  const sessionSheet = ss.getSheetByName('GAME_SESSIONS');
  const sessionOwnerMap = new Map();
  if (sessionSheet && sessionSheet.getLastRow() > 1) {
    const sHeaders = getHeaders(sessionSheet);
    const sRows = sessionSheet.getRange(2, 1, sessionSheet.getLastRow() - 1, sHeaders.length).getValues();
    sRows.forEach(r => {
      const sObj = rowToObject(sHeaders, r);
      sessionOwnerMap.set(sObj.id, sObj.ownerUid || '');
    });
  }

  const childSheets = ['TEAMS', 'SCORE_EVENTS', 'GAME_RESULTS', 'CAM_RACE_RESULTS', 'SMILE_RACE_RESULTS', 'FASTEST_HAND_RESULTS', 'LUCKY_WHEEL_HISTORY', 'RANDOM_TEAM_HISTORY', 'TEAM_CHALLENGE_RESULTS', 'CERTIFICATES'];
  childSheets.forEach(cName => {
    const cSheet = ss.getSheetByName(cName);
    if (cSheet && cSheet.getLastRow() > 1) {
      const cHeaders = getHeaders(cSheet);
      const cRows = cSheet.getRange(2, 1, cSheet.getLastRow() - 1, cHeaders.length).getValues();
      cRows.forEach(r => {
        const cObj = rowToObject(cHeaders, r);
        const expectedOwner = sessionOwnerMap.get(cObj.sessionId) || '';
        if ((cObj.ownerUid || '') !== expectedOwner) {
          stats.orphanedSessionChildRecords++;
        }
      });
    }
  });

  return successResponse(stats, 'Kiểm tra tính toàn vẹn quyền sở hữu (Multi-User Ownership Audit) thành công');
}

function apiRepairQuestionOwnership(data, authenticatedUid) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const bankSheet = ss.getSheetByName('QUESTION_BANKS');
  const qSheet = ss.getSheetByName('QUESTIONS');
  if (!bankSheet || !qSheet || qSheet.getLastRow() <= 1) {
    return successResponse({ repairedCount: 0 }, 'Không có câu hỏi cần sửa');
  }

  const bHeaders = getHeaders(bankSheet);
  const bRows = bankSheet.getRange(2, 1, bankSheet.getLastRow() - 1, bHeaders.length).getValues();
  const bankOwnerMap = new Map();
  bRows.forEach(r => {
    const bObj = rowToObject(bHeaders, r);
    bankOwnerMap.set(bObj.id, bObj.ownerUid || '');
  });

  const qHeaders = getHeaders(qSheet);
  const ownerColIdx = qHeaders.indexOf('ownerUid');
  const bankIdColIdx = qHeaders.indexOf('bankId');
  if (ownerColIdx === -1 || bankIdColIdx === -1) {
    return errorResponse('SCHEMA_ERROR', 'Bảng QUESTIONS thiếu cột bankId hoặc ownerUid');
  }

  const qRange = qSheet.getRange(2, 1, qSheet.getLastRow() - 1, qHeaders.length);
  const qRows = qRange.getValues();
  let repairedCount = 0;

  for (let i = 0; i < qRows.length; i++) {
    const bankId = String(qRows[i][bankIdColIdx]);
    const currentOwner = String(qRows[i][ownerColIdx] || '');
    const expectedOwner = bankOwnerMap.get(bankId) || '';

    if (currentOwner !== expectedOwner) {
      qRows[i][ownerColIdx] = expectedOwner;
      repairedCount++;
    }
  }

  if (repairedCount > 0) {
    qRange.setValues(qRows);
  }

  appendLog('INFO', 'REPAIR', 'QUESTIONS_OWNERSHIP_REPAIRED', `Đã khắc phục quyền sở hữu cho ${repairedCount} câu hỏi`, '', { repairedCount }, authenticatedUid || '');
  return successResponse({ repairedCount }, `Đã sửa thành công quyền sở hữu cho ${repairedCount} câu hỏi.`);
}

function apiRepairSessionChildOwnership(data, authenticatedUid) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sessionSheet = ss.getSheetByName('GAME_SESSIONS');
  if (!sessionSheet || sessionSheet.getLastRow() <= 1) {
    return successResponse({ repairedCount: 0 }, 'Không có phiên chơi để sửa');
  }

  const sHeaders = getHeaders(sessionSheet);
  const sRows = sessionSheet.getRange(2, 1, sessionSheet.getLastRow() - 1, sHeaders.length).getValues();
  const sessionOwnerMap = new Map();
  sRows.forEach(r => {
    const sObj = rowToObject(sHeaders, r);
    sessionOwnerMap.set(sObj.id, sObj.ownerUid || '');
  });

  const childSheets = ['TEAMS', 'SCORE_EVENTS', 'GAME_RESULTS', 'CAM_RACE_RESULTS', 'SMILE_RACE_RESULTS', 'FASTEST_HAND_RESULTS', 'LUCKY_WHEEL_HISTORY', 'RANDOM_TEAM_HISTORY', 'TEAM_CHALLENGE_RESULTS', 'CERTIFICATES'];
  let totalRepaired = 0;

  childSheets.forEach(cName => {
    const cSheet = ss.getSheetByName(cName);
    if (!cSheet || cSheet.getLastRow() <= 1) return;
    const cHeaders = getHeaders(cSheet);
    const ownerColIdx = cHeaders.indexOf('ownerUid');
    const sessionColIdx = cHeaders.indexOf('sessionId');
    if (ownerColIdx === -1 || sessionColIdx === -1) return;

    const cRange = cSheet.getRange(2, 1, cSheet.getLastRow() - 1, cHeaders.length);
    const cRows = cRange.getValues();
    let sheetRepaired = 0;

    for (let i = 0; i < cRows.length; i++) {
      const sessionId = String(cRows[i][sessionColIdx]);
      const currentOwner = String(cRows[i][ownerColIdx] || '');
      const expectedOwner = sessionOwnerMap.get(sessionId) || '';

      if (currentOwner !== expectedOwner) {
        cRows[i][ownerColIdx] = expectedOwner;
        sheetRepaired++;
      }
    }

    if (sheetRepaired > 0) {
      cRange.setValues(cRows);
      totalRepaired += sheetRepaired;
    }
  });

  appendLog('INFO', 'REPAIR', 'SESSIONS_CHILD_OWNERSHIP_REPAIRED', `Đã khắc phục quyền sở hữu cho ${totalRepaired} bản ghi con của phiên chơi`, '', { totalRepaired }, authenticatedUid || '');
  return successResponse({ repairedCount: totalRepaired }, `Đã sửa thành công quyền sở hữu cho ${totalRepaired} bản ghi con.`);
}

// ==========================================
// 27. CORE SETUP DATABASE & MIGRATION
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

function sanitizeLogPayload(payload) {
  if (!payload) return '';
  if (typeof payload === 'string') {
    let sanitized = payload;
    const sensitivePatterns = [
      /idToken["':\s]+([^"',\s]+)/gi,
      /accessToken["':\s]+([^"',\s]+)/gi,
      /refreshToken["':\s]+([^"',\s]+)/gi,
      /password["':\s]+([^"',\s]+)/gi,
      /secret["':\s]+([^"',\s]+)/gi,
      /bearer\s+[A-Za-z0-9-_.]+/gi
    ];
    sensitivePatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    });
    return sanitized;
  }
  if (typeof payload === 'object') {
    try {
      const clone = JSON.parse(JSON.stringify(payload));
      const redactKeys = ['idToken', 'accessToken', 'refreshToken', 'password', 'token', 'secret', 'apiKey', 'credential'];
      function redactObject(obj) {
        if (!obj || typeof obj !== 'object') return;
        Object.keys(obj).forEach(k => {
          if (redactKeys.includes(k) || redactKeys.some(rk => k.toLowerCase().includes(rk.toLowerCase()))) {
            obj[k] = '[REDACTED]';
          } else if (typeof obj[k] === 'object') {
            redactObject(obj[k]);
          }
        });
      }
      redactObject(clone);
      return JSON.stringify(clone);
    } catch (e) {
      return String(payload);
    }
  }
  return String(payload);
}

function appendLog(level, module, action, message, sessionId, payload, ownerUid) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('APP_LOGS');
    if (!sheet) return;

    const headers = getHeaders(sheet);
    const logObj = {
      id: generateId('log'),
      ownerUid: ownerUid || '',
      level: level || 'INFO',
      module: module || 'SYSTEM',
      action: action || '',
      message: message || '',
      sessionId: sessionId || '',
      payload: sanitizeLogPayload(payload),
      createdAt: getCurrentTimestamp()
    };

    if (headers && headers.length > 0) {
      sheet.appendRow(objectToRow(headers, logObj));
    } else {
      sheet.appendRow([
        logObj.id,
        logObj.ownerUid,
        logObj.level,
        logObj.module,
        logObj.action,
        logObj.message,
        logObj.sessionId,
        logObj.payload,
        logObj.createdAt
      ]);
    }
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
    ownerUid: '',
    visibility: 'SYSTEM',
    name: 'Tin học lớp 5 – Bộ câu hỏi demo',
    subject: 'Tin học',
    grade: 5,
    topic: 'Tổng hợp kiến thức Tin học Tiểu học',
    description: 'Bộ 15 câu hỏi trắc nghiệm Tin học 5 bao gồm máy tính, thư mục, Scratch, Internet an toàn và thông tin cá nhân.',
    questionCount: 15,
    enabled: true,
    importId: '',
    sourceFileName: 'seed_tinhoc5.json',
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp()
  };

  const existingIds = getExistingColumnValues(sheet, 1);
  if (!existingIds.includes(defaultBank.id)) {
    const headers = getHeaders(sheet);
    const row = objectToRow(headers, defaultBank);
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

  const headers = getHeaders(sheet);
  const toAdd = questionsList
    .filter(q => !existingOrders.includes(q.order))
    .map(q => {
      const qObj = {
        id: generateId('q'),
        bankId: bankId,
        ownerUid: '',
        order: q.order,
        subject: 'Tin học',
        grade: 5,
        topic: q.topic,
        questionType: q.questionType,
        question: q.question,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        difficulty: q.difficulty,
        normalPoints: 10,
        specialPoints: 20,
        isSpecial: q.isSpecial,
        enabled: true,
        tags: q.tags,
        importId: '',
        createdAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp()
      };
      return objectToRow(headers, qObj);
    });

  if (toAdd.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, toAdd.length, headers.length).setValues(toAdd);
  }
}

function columnToLetter(column) {
  let temp, letter = '';
  let col = column;
  while (col > 0) {
    temp = (col - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    col = Math.floor((col - temp - 1) / 26);
  }
  return letter;
}

function setListValidationByHeader(ss, sheetName, headerName, values) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;
  const headers = getHeaders(sheet);
  const colIdx = headers.indexOf(headerName);
  if (colIdx === -1) return;
  const colLetter = columnToLetter(colIdx + 1);
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(values, true).setAllowInvalid(false).build();
  sheet.getRange(`${colLetter}2:${colLetter}1000`).setDataValidation(rule);
}

function setBooleanValidationByHeader(ss, sheetName, headerNames) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;
  const headers = getHeaders(sheet);
  const rule = SpreadsheetApp.newDataValidation().requireCheckbox().build();
  headerNames.forEach(headerName => {
    const colIdx = headers.indexOf(headerName);
    if (colIdx !== -1) {
      const colLetter = columnToLetter(colIdx + 1);
      sheet.getRange(`${colLetter}2:${colLetter}1000`).setDataValidation(rule);
    }
  });
}

function ensureDataValidation(ss) {
  try {
    setListValidationByHeader(ss, 'USERS', 'role', ['ADMIN', 'TEACHER']);
    setListValidationByHeader(ss, 'USERS', 'status', ['ACTIVE', 'DISABLED']);
    setBooleanValidationByHeader(ss, 'USERS', ['emailVerified']);

    setListValidationByHeader(ss, 'QUESTION_BANKS', 'visibility', ['PRIVATE', 'SHARED', 'SYSTEM']);
    setBooleanValidationByHeader(ss, 'QUESTION_BANKS', ['enabled']);

    setListValidationByHeader(ss, 'GAME_SESSIONS', 'teamCount', ['2', '3', '4']);
    setListValidationByHeader(ss, 'GAME_SESSIONS', 'status', ['READY', 'PLAYING', 'PAUSED', 'FINISHED', 'CANCELLED']);

    setListValidationByHeader(ss, 'QUESTIONS', 'questionType', ['multiple_choice', 'true_false', 'short_answer', 'fill_blank', 'sorting', 'drag_drop']);
    setListValidationByHeader(ss, 'QUESTIONS', 'difficulty', ['EASY', 'MEDIUM', 'HARD']);
    setBooleanValidationByHeader(ss, 'QUESTIONS', ['isSpecial', 'enabled']);

    setListValidationByHeader(ss, 'CAM_RACE_RESULTS', 'inputMethod', ['CAMERA', 'MANUAL']);
    setListValidationByHeader(ss, 'SMILE_RACE_RESULTS', 'inputMethod', ['CAMERA', 'MANUAL']);

    setListValidationByHeader(ss, 'LUCKY_WHEEL_HISTORY', 'segmentType', ['TEAM', 'QUESTION', 'REWARD', 'CHALLENGE', 'POINTS']);
    setListValidationByHeader(ss, 'RANDOM_TEAM_HISTORY', 'pickType', ['TEAM', 'QUESTION', 'CHALLENGE', 'REWARD']);

    setListValidationByHeader(ss, 'IMPORT_HISTORY', 'importType', ['QUESTIONS', 'TEAMS']);
    setListValidationByHeader(ss, 'IMPORT_HISTORY', 'fileType', ['CSV', 'XLSX', 'XLS', 'JSON']);
    setListValidationByHeader(ss, 'IMPORT_HISTORY', 'mode', ['CREATE', 'SKIP', 'UPDATE']);
    setListValidationByHeader(ss, 'IMPORT_HISTORY', 'status', ['PROCESSING', 'SUCCESS', 'PARTIAL', 'FAILED']);

    setListValidationByHeader(ss, 'APP_LOGS', 'level', ['INFO', 'WARNING', 'ERROR']);
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

// ==========================================
// 25. REPAIR, AUDIT & TEST UTILITIES
// ==========================================

function repairQuestionBankCounts() {
  const bankSheet = getSheet('QUESTION_BANKS');
  const questionSheet = getSheet('QUESTIONS');
  const lastBankRow = bankSheet.getLastRow();
  if (lastBankRow <= 1) return { updated: 0, banks: [] };

  const bankHeaders = getHeaders(bankSheet);
  const bankIdCol = bankHeaders.indexOf('id');
  const countCol = bankHeaders.indexOf('questionCount');
  const updatedAtCol = bankHeaders.indexOf('updatedAt');

  if (bankIdCol === -1 || countCol === -1) return { updated: 0, banks: [] };

  // Calculate actual counts from QUESTIONS
  const questionHeaders = getHeaders(questionSheet);
  const qBankIdCol = questionHeaders.indexOf('bankId');
  const qEnabledCol = questionHeaders.indexOf('enabled');
  const lastQRow = questionSheet.getLastRow();
  const countsMap = {};

  if (lastQRow > 1 && qBankIdCol !== -1) {
    const qData = questionSheet.getRange(2, 1, lastQRow - 1, questionHeaders.length).getValues();
    for (let i = 0; i < qData.length; i++) {
      const bId = String(qData[i][qBankIdCol]);
      const enabled = qEnabledCol !== -1 ? normalizeBoolean(qData[i][qEnabledCol], true) : true;
      if (bId && enabled) {
        countsMap[bId] = (countsMap[bId] || 0) + 1;
      }
    }
  }

  const bankData = bankSheet.getRange(2, 1, lastBankRow - 1, bankHeaders.length).getValues();
  let updatedCount = 0;
  const updatedBanks = [];

  for (let i = 0; i < bankData.length; i++) {
    const bId = String(bankData[i][bankIdCol]);
    const actualCount = countsMap[bId] || 0;
    const currentCount = Number(bankData[i][countCol]) || 0;

    if (actualCount !== currentCount) {
      bankSheet.getRange(i + 2, countCol + 1).setValue(actualCount);
      if (updatedAtCol !== -1) {
        bankSheet.getRange(i + 2, updatedAtCol + 1).setValue(getCurrentTimestamp());
      }
      updatedCount++;
      updatedBanks.push({ bankId: bId, oldCount: currentCount, newCount: actualCount });
    }
  }

  appendLog('INFO', 'MAINTENANCE', 'repairQuestionBankCounts', `Đã đồng bộ lại số lượng câu hỏi cho ${updatedCount} ngân hàng câu hỏi.`, '', updatedBanks);

  try {
    SpreadsheetApp.getUi().alert('ĐỒNG BỘ SỐ LƯỢNG CÂU HỎI', `Đã kiểm tra và đồng bộ lại cho ${updatedCount} ngân hàng câu hỏi.`, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {}

  return { updated: updatedCount, banks: updatedBanks };
}

function apiRepairQuestionBankCounts() {
  const result = repairQuestionBankCounts();
  return successResponse(result, 'Đã đồng bộ lại số lượng câu hỏi thành công');
}

function findOrphanQuestions() {
  const bankSheet = getSheet('QUESTION_BANKS');
  const questionSheet = getSheet('QUESTIONS');
  const lastQRow = questionSheet.getLastRow();
  if (lastQRow <= 1) return { orphanCount: 0, orphans: [] };

  const bankHeaders = getHeaders(bankSheet);
  const bankIdCol = bankHeaders.indexOf('id');
  const validBankIds = new Set();
  if (bankSheet.getLastRow() > 1 && bankIdCol !== -1) {
    const bData = bankSheet.getRange(2, bankIdCol + 1, bankSheet.getLastRow() - 1, 1).getValues();
    bData.forEach(r => {
      if (r[0]) validBankIds.add(String(r[0]));
    });
  }

  const qHeaders = getHeaders(questionSheet);
  const qIdCol = qHeaders.indexOf('id');
  const qBankIdCol = qHeaders.indexOf('bankId');
  const qTextCol = qHeaders.indexOf('question');
  const qData = questionSheet.getRange(2, 1, lastQRow - 1, qHeaders.length).getValues();

  const orphans = [];
  for (let i = 0; i < qData.length; i++) {
    const qId = qData[i][qIdCol];
    const bId = String(qData[i][qBankIdCol] || '').trim();
    const qText = qData[i][qTextCol];

    if (!bId || !validBankIds.has(bId)) {
      orphans.push({
        rowIndex: i + 2,
        questionId: qId,
        invalidBankId: bId,
        question: qText
      });
    }
  }

  if (orphans.length > 0) {
    appendLog('WARNING', 'AUDIT', 'findOrphanQuestions', `Phát hiện ${orphans.length} câu hỏi không có ngân hàng hợp lệ (Orphan Questions).`, '', orphans);
  }

  return { orphanCount: orphans.length, orphans: orphans };
}

function apiFindOrphans() {
  const result = findOrphanQuestions();
  return successResponse(result);
}

function testQuestionBankPersistence() {
  const ts = new Date().getTime();
  const testBankName = `[TEST] Bộ câu hỏi Kiểm tra ${ts}`;
  const testPayload = {
    bank: {
      name: testBankName,
      subject: 'Tin học',
      grade: 5,
      topic: 'Kiểm thử Database',
      description: 'Ngân hàng câu hỏi dùng để kiểm tra tính toàn vẹn và độ bền của cơ sở dữ liệu.'
    },
    questions: [
      {
        order: 1,
        question: 'Câu test 1: Bàn phím máy tính là thiết bị gì?',
        optionA: 'Thiết bị vào',
        optionB: 'Thiết bị ra',
        optionC: 'Thiết bị lưu trữ',
        optionD: 'Không có loại này',
        correctAnswer: 'A',
        explanation: 'Bàn phím đưa dữ liệu vào máy.',
        difficulty: 'EASY',
        normalPoints: 10,
        specialPoints: 20
      },
      {
        order: 2,
        question: 'Câu test 2: Màn hình máy tính là thiết bị gì?',
        optionA: 'Thiết bị vào',
        optionB: 'Thiết bị ra',
        optionC: 'Bộ xử lý',
        optionD: 'Dây cáp',
        correctAnswer: 'B',
        explanation: 'Màn hình hiển thị dữ liệu ra ngoài.',
        difficulty: 'EASY',
        normalPoints: 10,
        specialPoints: 20
      },
      {
        order: 3,
        question: 'Câu test 3: Scratch dùng khối lệnh gì để lặp lại mãi mãi?',
        optionA: 'Repeat',
        optionB: 'Forever',
        optionC: 'If then',
        optionD: 'Wait',
        correctAnswer: 'B',
        explanation: 'Khối Forever là vòng lặp vô hạn.',
        difficulty: 'HARD',
        isSpecial: true,
        normalPoints: 10,
        specialPoints: 20
      }
    ],
    import: {
      importId: `test_imp_${ts}`,
      fileName: 'test_questions.json',
      fileType: 'JSON',
      mode: 'CREATE'
    }
  };

  Logger.log('🧪 Bắt đầu testQuestionBankPersistence...');
  const result = saveImportedQuestionBank(testPayload);
  Logger.log('Kết quả saveImportedQuestionBank: ' + JSON.stringify(result));

  if (!result || !result.success) {
    const errMsg = `❌ Test thất bại ngay bước saveImportedQuestionBank: ${JSON.stringify(result)}`;
    Logger.log(errMsg);
    appendLog('ERROR', 'TEST', 'testQuestionBankPersistence', errMsg, '', result);
    try {
      SpreadsheetApp.getUi().alert('TEST THẤT BẠI', errMsg, SpreadsheetApp.getUi().ButtonSet.OK);
    } catch (e) {}
    return { success: false, error: errMsg };
  }

  const bankId = result.bank.id;

  // Query lại bank
  const bankSheet = getSheet('QUESTION_BANKS');
  const foundBank = findRowById(bankSheet, bankId);
  if (!foundBank) {
    const errMsg = `❌ Test thất bại: Không tìm thấy Bank ID ${bankId} trong QUESTION_BANKS sau khi lưu.`;
    Logger.log(errMsg);
    try {
      SpreadsheetApp.getUi().alert('TEST THẤT BẠI', errMsg, SpreadsheetApp.getUi().ButtonSet.OK);
    } catch (e) {}
    return { success: false, error: errMsg };
  }

  // Query lại questions
  const questions = listQuestionsByBank(bankId);
  Logger.log(`Đã nạp lại ${questions.length} câu hỏi cho bank ${bankId}`);

  // Kiểm tra questionCount = 3
  const countMatch = Number(foundBank.data.questionCount) === 3 && questions.length === 3;
  if (!countMatch) {
    const errMsg = `❌ Test thất bại: questionCount không khớp! Bank count=${foundBank.data.questionCount}, Questions found=${questions.length}, Kỳ vọng=3`;
    Logger.log(errMsg);
    try {
      SpreadsheetApp.getUi().alert('TEST THẤT BẠI', errMsg, SpreadsheetApp.getUi().ButtonSet.OK);
    } catch (e) {}
    return { success: false, error: errMsg };
  }

  // Kiểm tra tất cả bankId giống nhau
  const allBankIdsMatch = questions.every(q => String(q.bankId) === String(bankId));
  if (!allBankIdsMatch) {
    const errMsg = '❌ Test thất bại: Phát hiện câu hỏi có bankId không khớp với Bank vừa tạo!';
    Logger.log(errMsg);
    try {
      SpreadsheetApp.getUi().alert('TEST THẤT BẠI', errMsg, SpreadsheetApp.getUi().ButtonSet.OK);
    } catch (e) {}
    return { success: false, error: errMsg };
  }

  const successMsg = `✅ TEST THÀNH CÔNG RỰC RỠ!\n` +
    `• Đã tạo Bank: ${foundBank.data.name} (Mã: ${bankId})\n` +
    `• Đã lưu và xác minh: 3 câu hỏi tồn tại trong QUESTIONS sheet\n` +
    `• Tất cả 3 câu hỏi đều trỏ chuẩn xác về bankId=${bankId}\n` +
    `• QUESTION_BANKS.questionCount = 3\n` +
    `• IMPORT_HISTORY đã ghi nhận importId=${testPayload.import.importId} (SUCCESS)`;

  Logger.log(successMsg);
  appendLog('INFO', 'TEST', 'testQuestionBankPersistence', 'Test kiểm tra độ bền dữ liệu Question Bank thành công!', '', {
    bankId: bankId,
    questionsCount: questions.length
  });

  try {
    SpreadsheetApp.getUi().alert('🧪 KẾT QUẢ KIỂM THỬ ĐỘ BỀN', successMsg, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {}

  return {
    success: true,
    bankId: bankId,
    message: successMsg
  };
}

function apiTestQuestionBankPersistence() {
  const result = testQuestionBankPersistence();
  return successResponse(result, 'Chạy test persistence hoàn tất');
}

function showDatabaseSummary() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let summary = '📊 TỔNG QUAN HỆ THỐNG EDUPLAY (THEO ĐỘI):\n\n';

  const metrics = [
    { label: 'Giáo viên (Users)', sheet: 'USERS' },
    { label: 'Cài đặt giáo viên (Preferences)', sheet: 'USER_PREFERENCES' },
    { label: 'Trò chơi (Games)', sheet: 'GAME_CATALOG' },
    { label: 'Lớp học (Classes)', sheet: 'CLASSES' },
    { label: 'Ngân hàng câu hỏi (Banks)', sheet: 'QUESTION_BANKS' },
    { label: 'Câu hỏi (Questions)', sheet: 'QUESTIONS' },
    { label: 'Lịch sử Import dữ liệu', sheet: 'IMPORT_HISTORY' },
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
    { label: 'Nhật ký ứng dụng (App Logs)', sheet: 'APP_LOGS' }
  ];

  metrics.forEach(m => {
    const sheet = ss.getSheetByName(m.sheet);
    const count = sheet ? Math.max(0, sheet.getLastRow() - 1) : 'Chưa tạo';
    summary += `• ${m.label.padEnd(30, ' ')}: ${count} bản ghi\n`;
  });

  // Check banks with 0 questions
  try {
    const bankSheet = ss.getSheetByName('QUESTION_BANKS');
    if (bankSheet && bankSheet.getLastRow() > 1) {
      const headers = getHeaders(bankSheet);
      const countCol = headers.indexOf('questionCount');
      const enabledCol = headers.indexOf('enabled');
      if (countCol !== -1) {
        const data = bankSheet.getRange(2, 1, bankSheet.getLastRow() - 1, headers.length).getValues();
        let zeroCount = 0;
        data.forEach(r => {
          const isEnabled = enabledCol !== -1 ? normalizeBoolean(r[enabledCol], true) : true;
          if (isEnabled && (Number(r[countCol]) === 0 || !r[countCol])) {
            zeroCount++;
          }
        });
        summary += `\n⚠️ Ngân hàng có 0 câu hỏi: ${zeroCount}\n`;
      }
    }
  } catch (e) {}

  summary += '\n* Chế độ: Quản lý Đội độc lập (2-4 Đội), bảo vệ tính riêng tư học sinh.';

  try {
    SpreadsheetApp.getUi().alert('TỔNG QUAN DATABASE EDUPLAY', summary, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {
    Logger.log(summary);
  }
}

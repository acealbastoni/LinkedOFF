// ██████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████

/*****  CONFIG  *****/
const SPREADSHEET_ID = '12DOdU_mhknF4v4c6I5Q0w779zrCbiuLwzb_B3EaSFOg';
const SHEET_NAME     = 'AceAlBastoni';
const API_SECRET_KEY = '447e152f-143f-4195-80fd-42b87d40af46-1764452322847';

// ✅ الأعمدة المطلوبة (يمكن تعديلها حسب أسماء الأعمدة في الشيت)
const REQUIRED_HEADERS = {
  plainText: 'PlainText Job Description',
  emails: 'Attached Emails',
  source: 'Source',
  scrapDate: 'Scrapped Date',
  dkey: 'DKEY'
};

// ✅ الأعمدة الاختيارية (لو مش موجودة مش مشكلة)
const OPTIONAL_HEADERS = {
  profileId: 'Profile ID'
};

/*****  Helpers لعمل JSON  *****/
function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function ok_(data) {
  return jsonResponse_(Object.assign({ ok: true }, data));
}

function error_(code, message) {
  return jsonResponse_({
    ok: false,
    error: code,
    message: String(message || '')
  });
}

/*****  API ENTRY  *****/
function doGet(e) {
  
  try {
    // ✅ 1. التحقق من الـ API Key
    const key = e.parameter.key;
    if (key !== API_SECRET_KEY) {
      return error_('UNAUTHORIZED', 'Invalid API key');
    }

    // ✅ 2. قراءة الـ Parameters
    const page = parseInt(e.parameter.page || "1");
    const pageSize = parseInt(e.parameter.pageSize || "10");

    // ✅ 3. جلب البيانات من الشيت
    const result = listJobs_(page, pageSize);

    // ✅ 4. إرجاع النتيجة
    return ok_(result);

  } catch (err) {
    Logger.log('Error in doGet: ' + err.toString());
    Logger.log('Stack: ' + err.stack);
    return error_('SERVER_ERROR', err.toString());
  }
}

/*****  قراءة الشيت مع Pagination  *****/
function listJobs_(page, pageSize) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    throw new Error('Sheet not found: ' + SHEET_NAME);
  }

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  
  // لو الشيت فاضي أو فيه بس الـ headers
  if (lastRow < 2 || lastCol < 1) {
    return { 
      page: 1, 
      totalPages: 1, 
      totalRows: 0, 
      data: [] 
    };
  }

  // ✅ قراءة الـ Headers
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  
  // ✅ بناء خريطة الأعمدة (Required + Optional)
  const allHeaders = Object.assign({}, REQUIRED_HEADERS, OPTIONAL_HEADERS);
  const headerMap = {};
  
  for (const [key, headerName] of Object.entries(allHeaders)) {
    const index = headers.indexOf(headerName);
    headerMap[key] = index;
  }

  // ✅ التحقق من وجود الأعمدة المطلوبة فقط
  const missingRequired = [];
  for (const [key, headerName] of Object.entries(REQUIRED_HEADERS)) {
    if (headerMap[key] === -1) {
      missingRequired.push(headerName);
    }
  }
  
  if (missingRequired.length > 0) {
    throw new Error('Missing required headers: ' + missingRequired.join(', ') + 
                    '. Available headers: ' + headers.join(', '));
  }

  // ✅ حساب الـ Pagination
  const totalDataRows = lastRow - 1;
  const totalPages = Math.max(1, Math.ceil(totalDataRows / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const startRow = 2 + (safePage - 1) * pageSize;
  const endRow = Math.min(lastRow, startRow + pageSize - 1);
  const numRows = Math.max(0, endRow - startRow + 1);

  // ✅ لو الصفحة فاضية
  if (numRows <= 0) {
    return { 
      page: safePage, 
      totalPages, 
      totalRows: totalDataRows, 
      data: [] 
    };
  }

  // ✅ قراءة البيانات
  const values = sheet.getRange(startRow, 1, numRows, lastCol).getValues();

  // ✅ دالة مساعدة لقراءة القيمة
  function getCell(row, key) {
    const colIndex = headerMap[key];
    if (colIndex === -1) return '';
    const val = row[colIndex];
    
    // تحويل التاريخ لـ ISO string
    if (val instanceof Date) {
      return val.toISOString();
    }
    
    return val || '';
  }

  // ✅ تحويل البيانات إلى JSON
  const data = values.map((row, idx) => ({
    rowNumber: startRow + idx,
    dkey: getCell(row, 'dkey'),
    plainTextJobDescription: getCell(row, 'plainText'),
    attachedEmails: getCell(row, 'emails'),
    profileId: getCell(row, 'profileId'),
    source: getCell(row, 'source'),
    scrappedDate: getCell(row, 'scrapDate')
  }));

  return {
    page: safePage,
    totalPages,
    totalRows: totalDataRows,
    data
  };
}

/*****  دالة لطباعة أسماء الأعمدة الموجودة (للتشخيص)  *****/
function debugHeaders() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  
  Logger.log('Available headers in sheet:');
  headers.forEach((h, i) => {
    Logger.log(`  [${i}] "${h}"`);
  });
}

/*****  للاختبار فقط  *****/
function testListJobs() {
  const result = listJobs_(1, 10);
  Logger.log(JSON.stringify(result, null, 2));
}
// ██████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████

/**
 * ==============================================================================
 * 🎓 EDUPLAY - VERCEL SERVERLESS API PROXY: /api/apps-script
 * Solves Google Apps Script CORS restrictions by proxying requests server-side.
 * ==============================================================================
 */

export default async function handler(req: any, res: any) {
  // 1. CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-apps-script-url');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 2. Resolve Google Apps Script Web App URL from server environment
  const targetUrl =
    process.env.APPS_SCRIPT_API_URL ||
    process.env.VITE_APPS_SCRIPT_API_URL ||
    (req.headers['x-apps-script-url'] as string) ||
    '';

  if (!targetUrl || !targetUrl.trim()) {
    return res.status(500).json({
      success: false,
      error: 'NO_APPS_SCRIPT_URL',
      message:
        'Chưa cấu hình biến môi trường APPS_SCRIPT_API_URL trên Vercel. Vui lòng vào Vercel Project -> Settings -> Environment Variables, thêm biến APPS_SCRIPT_API_URL (hoặc VITE_APPS_SCRIPT_API_URL) với giá trị URL Web App Google Apps Script kết thúc bằng /exec.',
    });
  }

  const cleanTargetUrl = targetUrl.trim();

  try {
    let response: any;

    if (req.method === 'GET') {
      const urlObj = new URL(cleanTargetUrl);
      if (req.query) {
        for (const [key, val] of Object.entries(req.query)) {
          if (val !== undefined && val !== null) {
            urlObj.searchParams.set(key, String(val));
          }
        }
      }

      response = await fetch(urlObj.toString(), {
        method: 'GET',
        headers: {
          Accept: 'application/json, text/plain, */*',
        },
        redirect: 'follow',
      });
    } else {
      // POST Request
      let bodyData: any = req.body;
      if (typeof bodyData === 'object' && bodyData !== null) {
        bodyData = JSON.stringify(bodyData);
      } else if (!bodyData) {
        // Read raw stream if body was not pre-parsed
        bodyData = await new Promise<string>((resolve) => {
          let chunks = '';
          req.on('data', (c: any) => {
            chunks += c;
          });
          req.on('end', () => resolve(chunks));
          req.on('error', () => resolve(''));
        });
      }

      response = await fetch(cleanTargetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: bodyData,
        redirect: 'follow',
      });
    }

    // Handle manual redirects if not followed automatically
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const redirectLocation = response.headers.get('location');
      if (redirectLocation) {
        response = await fetch(redirectLocation, {
          method: 'GET',
          headers: {
            Accept: 'application/json, text/plain, */*',
          },
          redirect: 'follow',
        });
      }
    }

    const text = await response.text();
    res.setHeader('Content-Type', 'application/json;charset=utf-8');

    try {
      const json = JSON.parse(text);
      return res.status(200).json(json);
    } catch {
      return res.status(response.status || 200).json({
        success: response.ok,
        raw: text,
        error: !response.ok ? `HTTP_${response.status}` : undefined,
      });
    }
  } catch (err: any) {
    console.error('Apps Script Proxy Error:', err);
    return res.status(502).json({
      success: false,
      error: 'APPS_SCRIPT_GATEWAY_ERROR',
      message: `Không thể kết nối đến Google Apps Script từ máy chủ proxy: ${err?.message || 'Lỗi mạng hoặc URL không hợp lệ'}`,
    });
  }
}

import { detectInAppBrowser } from '../src/utils/inAppBrowser';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error('FALLÓ: ' + msg);
  console.log('OK:', msg);
}

const REAL_USER_AGENTS: { ua: string; expectedApp: string }[] = [
  {
    ua: 'Mozilla/5.0 (Linux; Android 10; SM-G960F) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/91.0.4472.114 Mobile Safari/537.36 WhatsApp/2.21.15.15',
    expectedApp: 'WhatsApp',
  },
  {
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 169.3.0.31.135 (iPhone11,8; iOS 14_0; en_US; en-US; scale=2.00; 828x1792; 265545731)',
    expectedApp: 'Instagram',
  },
  {
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/246.0.0.44.120;FBBV/318108551;FBDV/iPhone12,1;FBMD/iPhone;FBSN/iOS;FBSV/13.5;FBSS/2;FBID/phone;FBLC/en_US]',
    expectedApp: 'Facebook',
  },
  { ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 Line/11.0.0', expectedApp: 'LINE' },
  { ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_0 like Mac OS X) AppleWebKit/605.1.15 MicroMessenger/7.0.4', expectedApp: 'WeChat' },
  { ua: 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 com.zhiliaoapp.musically/2021 BytedanceWebview/d8a21c6', expectedApp: 'TikTok' },
  { ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_0 like Mac OS X) Snapchat/10.68.5.0', expectedApp: 'Snapchat' },
  { ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_0 like Mac OS X) LinkedInApp/9.15.0', expectedApp: 'LinkedIn' },
  { ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_0 like Mac OS X) Twitter for iPhone', expectedApp: 'Twitter/X' },
];

for (const { ua, expectedApp } of REAL_USER_AGENTS) {
  const result = detectInAppBrowser(ua);
  assert(result.detected === true, `${expectedApp}: se detecta como navegador embebido`);
  assert(result.appName === expectedApp, `${expectedApp}: identifica el nombre correcto (dio "${result.appName}")`);
}

// --- Negativos: navegadores normales NO deben marcarse como embebidos ---
const NORMAL_USER_AGENTS = [
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
];

for (const ua of NORMAL_USER_AGENTS) {
  const result = detectInAppBrowser(ua);
  assert(result.detected === false, `Navegador normal (${ua.slice(0, 40)}...) NO se marca como embebido`);
  assert(result.appName === null, 'Navegador normal: appName es null');
}

console.log('\nTodos los tests del detector de navegadores embebidos pasaron correctamente.');

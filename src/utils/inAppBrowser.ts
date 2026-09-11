// Detecta si la app se está corriendo adentro del navegador "de prestado"
// de otra app (WhatsApp, Instagram, Facebook, etc.) — esos navegadores
// embebidos suelen bloquear o romper el login de Google por temas de
// seguridad propios de Google, no nuestros. La firma exacta de cada uno
// varía según versión y plataforma, así que esto es un mejor esfuerzo
// (cubre los casos más comunes), no una detección 100% infalible — en
// particular, WhatsApp en iOS no siempre se identifica de forma
// consistente en el user-agent, así que ese caso puntual puede no
// detectarse siempre.
export interface InAppBrowserInfo {
  detected: boolean;
  appName: string | null;
}

const SIGNATURES: { pattern: RegExp; name: string }[] = [
  { pattern: /\bInstagram\b/i, name: 'Instagram' },
  { pattern: /\bFBAN\b|\bFBAV\b|\bFB_IAB\b/i, name: 'Facebook' },
  { pattern: /\bMessenger\b/i, name: 'Messenger' },
  { pattern: /\bWhatsApp\b/i, name: 'WhatsApp' },
  { pattern: /\bLine\//i, name: 'LINE' },
  { pattern: /\bMicroMessenger\b/i, name: 'WeChat' },
  { pattern: /\bTikTok\b|\bmusical_ly\b|\bBytedanceWebview\b/i, name: 'TikTok' },
  { pattern: /\bSnapchat\b/i, name: 'Snapchat' },
  { pattern: /\bLinkedInApp\b/i, name: 'LinkedIn' },
  { pattern: /\bTwitter\b/i, name: 'Twitter/X' },
];

export function detectInAppBrowser(userAgent: string = navigator.userAgent): InAppBrowserInfo {
  for (const { pattern, name } of SIGNATURES) {
    if (pattern.test(userAgent)) {
      return { detected: true, appName: name };
    }
  }
  return { detected: false, appName: null };
}

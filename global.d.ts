export {};

declare global {
  interface Window {
    electron: {
      // 1. الوظائف الأساسية
      openExternal: (url: string) => Promise<void>;
      getAppVersion: () => Promise<string>;

      // 2. وظائف تسجيل الدخول (Google OAuth)
      startGoogleLogin: (payload: { 
          clientId: string; 
          redirectUri: string; 
          scopes?: string[]; 
          state?: string 
      }) => Promise<{ ok: boolean; state: string }>;

      cancelGoogleLogin: () => Promise<{ ok: boolean }>;

      // 3. المستمعات (Listeners)
      onGoogleAuthCode: (callback: (data: { code: string; state: string; url: string }) => void) => () => void;
      
      onGoogleAuthError: (callback: (data: { error: string; url?: string }) => void) => () => void;
      
      onDeepLink: (callback: (url: string) => void) => () => void;
    };
  }
}

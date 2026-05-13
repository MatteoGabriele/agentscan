declare module "#auth-utils" {
  interface SecureSessionData {
    apiToken?: {
      access_token: string;
      [key: string]: any;
    };
  }
}

import { api } from './api';

// Base64URL デコード/エンコード ユーティリティ
function base64urlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    view[i] = binary.charCodeAt(i);
  }
  return buffer;
}

function bufferToBase64url(buffer: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(buffer));
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// WebAuthn 型定義
interface WebAuthnRegistrationOptions {
  challenge: string;
  rp: { name: string; id: string };
  user: { id: string; name: string; displayName: string };
  pubKeyCredParams: Array<{ type: string; alg: number }>;
  authenticatorSelection?: {
    authenticatorAttachment?: string;
    userVerification?: string;
    residentKey?: string;
  };
}

interface WebAuthnAuthenticationOptions {
  challenge: string;
  allowCredentials?: Array<{ type: string; id: string }>;
  userVerification?: string;
}

// 認証 API クライアント
export class AuthAPI {
  // WebAuthn 登録開始
  static async startRegistration(username: string) {
    console.log('Making request to registration start endpoint');
    const response = await api.post('/api/auth/register/start', {
      username,
    });
    
    console.log('Response status:', response.status);
    console.log('Response URL:', response.url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('Error response:', errorText);
      throw new Error(`Registration start failed: ${response.status} - ${errorText}`);
    }
    
    return response.json();
  }

  // WebAuthn 登録完了
  static async completeRegistration(
    credential: PublicKeyCredential,
    userId: string
  ) {
    const credResponse = credential.response as AuthenticatorAttestationResponse;
    
    const registrationData = {
      credential_id: bufferToBase64url(credential.rawId),
      attestation_object: bufferToBase64url(credResponse.attestationObject),
      client_data_json: bufferToBase64url(credResponse.clientDataJSON),
      user_id: userId,
    };

    const response = await api.post('/api/auth/register/complete', registrationData);
    
    if (!response.ok) {
      throw new Error(`Registration complete failed: ${response.status}`);
    }
    
    return response.json();
  }

  // WebAuthn 認証開始
  static async startAuthentication(username?: string) {
    console.log('Making request to authentication start endpoint');
    const response = await api.post('/api/auth/login/start', {
      username,
    });
    
    console.log('Auth start response status:', response.status);
    console.log('Auth start response URL:', response.url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('Auth start error response:', errorText);
      throw new Error(`Authentication start failed: ${response.status} - ${errorText}`);
    }
    
    return response.json();
  }

  // WebAuthn 認証完了
  static async completeAuthentication(credential: PublicKeyCredential) {
    const credResponse = credential.response as AuthenticatorAssertionResponse;
    
    const authData = {
      credential_id: bufferToBase64url(credential.rawId),
      authenticator_data: bufferToBase64url(credResponse.authenticatorData),
      client_data_json: bufferToBase64url(credResponse.clientDataJSON),
      signature: bufferToBase64url(credResponse.signature),
    };

    console.log('Making request to authentication complete endpoint');
    console.log('Auth data:', authData);
    
    const response = await api.post('/api/auth/login/complete', authData);
    
    console.log('Auth complete response status:', response.status);
    console.log('Auth complete response URL:', response.url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('Auth complete error response:', errorText);
      throw new Error(`Authentication complete failed: ${response.status} - ${errorText}`);
    }
    
    return response.json();
  }

  // ログアウト
  static async logout() {
    const response = await api.post('/api/auth/logout');
    
    if (!response.ok) {
      throw new Error(`Logout failed: ${response.status}`);
    }
    
    return response.json();
  }

  // 現在のユーザー取得
  static async getCurrentUser() {
    const response = await api.get('/api/auth/me');
    
    if (!response.ok) {
      throw new Error(`Get current user failed: ${response.status}`);
    }
    
    return response.json();
  }

  // プロフィール更新
  static async updateProfile(data: { display_name?: string }) {
    const response = await api.put('/api/auth/profile', data);
    
    if (!response.ok) {
      throw new Error(`Update profile failed: ${response.status}`);
    }
    
    return response.json();
  }

  // 登録デバイス一覧取得
  static async getDevices() {
    const response = await api.get('/api/auth/devices');
    
    if (!response.ok) {
      throw new Error(`Get devices failed: ${response.status}`);
    }
    
    return response.json();
  }

  // デバイス削除
  static async deleteDevice(deviceId: string) {
    const response = await api.delete(`/api/auth/devices/${deviceId}`);
    
    if (!response.ok) {
      throw new Error(`Delete device failed: ${response.status}`);
    }
    
    return response.json();
  }

  // デバイス名更新
  static async updateDevice(deviceId: string, data: { device_name?: string }) {
    const response = await api.put(`/api/auth/devices/${deviceId}`, data);
    
    if (!response.ok) {
      throw new Error(`Update device failed: ${response.status}`);
    }
    
    return response.json();
  }
}

// WebAuthn 登録フロー
export async function registerWithWebAuthn(username: string) {
  try {
    // WebAuthn がサポートされているかチェック
    if (!window.PublicKeyCredential) {
      throw new Error('WebAuthn is not supported in this browser');
    }

    // 1. 登録開始
    const startResponse = await AuthAPI.startRegistration(username);
    const options: WebAuthnRegistrationOptions = startResponse.options;

    // 2. 認証情報作成オプション設定
    const createOptions: CredentialCreationOptions = {
      publicKey: {
        challenge: base64urlToBuffer(options.challenge),
        rp: {
          name: options.rp.name,
          id: options.rp.id,
        },
        user: {
          id: base64urlToBuffer(options.user.id),
          name: options.user.name,
          displayName: options.user.displayName,
        },
        pubKeyCredParams: options.pubKeyCredParams.map((param) => ({
          type: param.type as PublicKeyCredentialType,
          alg: param.alg,
        })),
        authenticatorSelection: {
          authenticatorAttachment: options.authenticatorSelection?.authenticatorAttachment as AuthenticatorAttachment,
          userVerification: options.authenticatorSelection?.userVerification as UserVerificationRequirement,
          residentKey: options.authenticatorSelection?.residentKey as ResidentKeyRequirement,
        },
        timeout: 60000,
        attestation: 'direct' as AttestationConveyancePreference,
      },
    };

    // 3. 認証情報作成
    const credential = await navigator.credentials.create(createOptions) as PublicKeyCredential;
    if (!credential) {
      throw new Error('Failed to create credential');
    }

    // 4. 登録完了
    const completeResponse = await AuthAPI.completeRegistration(
      credential,
      startResponse.user_id
    );

    return {
      success: true,
      message: 'Registration completed successfully',
      user: completeResponse,
    };
  } catch (error) {
    console.error('WebAuthn registration failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Registration failed',
    };
  }
}

// WebAuthn 認証フロー
export async function authenticateWithWebAuthn(username?: string) {
  try {
    // WebAuthn がサポートされているかチェック
    if (!window.PublicKeyCredential) {
      throw new Error('WebAuthn is not supported in this browser');
    }

    // 1. 認証開始
    const startResponse = await AuthAPI.startAuthentication(username);
    const options: WebAuthnAuthenticationOptions = startResponse.options;

    // 2. 認証オプション設定
    const getOptions: CredentialRequestOptions = {
      publicKey: {
        challenge: base64urlToBuffer(options.challenge),
        allowCredentials: options.allowCredentials?.map((cred) => ({
          type: cred.type as PublicKeyCredentialType,
          id: base64urlToBuffer(cred.id),
        })),
        userVerification: options.userVerification as UserVerificationRequirement,
        timeout: 60000,
      },
    };

    // 3. 認証実行
    const credential = await navigator.credentials.get(getOptions) as PublicKeyCredential;
    if (!credential) {
      throw new Error('Failed to get credential');
    }

    // 4. 認証完了
    const completeResponse = await AuthAPI.completeAuthentication(credential);

    return {
      success: true,
      message: 'Authentication successful',
      user: completeResponse.user,
      token: completeResponse.access_token,
    };
  } catch (error) {
    console.error('WebAuthn authentication failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Authentication failed',
    };
  }
}

// WebAuthn 利用可能性チェック
export function isWebAuthnSupported(): boolean {
  return typeof window !== 'undefined' && 
         window.PublicKeyCredential !== undefined && 
         typeof window.PublicKeyCredential === 'function';
}

// 認証状態管理フック用の型
export interface User {
  id: string;
  username: string;
  display_name?: string;
  email?: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  last_login?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
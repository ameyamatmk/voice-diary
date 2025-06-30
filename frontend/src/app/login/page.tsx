'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { isWebAuthnSupported } from '@/lib/auth';
import { Key, UserPlus, LogIn, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | null>(null);
  
  const { login, register, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  // 認証済みの場合はホームページにリダイレクト
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setMessageType(null);

    if (!isWebAuthnSupported()) {
      setMessage('WebAuthn is not supported in this browser');
      setMessageType('error');
      return;
    }

    if (mode === 'register') {
      if (!username.trim()) {
        setMessage('Username is required');
        setMessageType('error');
        return;
      }

      const result = await register(
        username.trim(),
        displayName.trim() || undefined,
        deviceName.trim() || undefined
      );

      setMessage(result.message);
      setMessageType(result.success ? 'success' : 'error');

      if (result.success) {
        // 登録成功後、ログインモードに切り替え
        setTimeout(() => {
          setMode('login');
          setMessage('Registration successful! Please log in.');
          setMessageType('success');
        }, 2000);
      }
    } else {
      const result = await login(username.trim() || undefined);
      
      setMessage(result.message);
      setMessageType(result.success ? 'success' : 'error');

      if (result.success) {
        // ログイン成功後は自動的にリダイレクトされる
      }
    }
  };

  const resetForm = () => {
    setUsername('');
    setDisplayName('');
    setDeviceName('');
    setMessage('');
    setMessageType(null);
  };

  const switchMode = (newMode: 'login' | 'register') => {
    setMode(newMode);
    resetForm();
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Voice Diary</h1>
          <p className="text-text-secondary">音声で記録する日記アプリケーション</p>
        </div>

        {/* メインカード */}
        <div className="bg-bg-secondary rounded-xl p-6 shadow-lg border border-border">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-text-primary">
              {mode === 'login' ? 'ログイン' : 'アカウント登録'}
            </h2>
          </div>

          {/* WebAuthn サポートチェック */}
          {!isWebAuthnSupported() && (
            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-2" />
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  このブラウザではWebAuthnがサポートされていません。
                </p>
              </div>
            </div>
          )}

          {/* メッセージ */}
          {message && (
            <div className={`mb-4 p-3 rounded-md flex items-center ${
              messageType === 'success' 
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}>
              {messageType === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
              )}
              <p className={`text-sm ${
                messageType === 'success' 
                  ? 'text-green-800 dark:text-green-200' 
                  : 'text-red-800 dark:text-red-200'
              }`}>
                {message}
              </p>
            </div>
          )}

          {/* フォーム */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-text-primary mb-2">
                    ユーザー名 *
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent-primary bg-bg-primary text-text-primary"
                    placeholder="ユーザー名を入力"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="displayName" className="block text-sm font-medium text-text-primary mb-2">
                    表示名
                  </label>
                  <input
                    type="text"
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent-primary bg-bg-primary text-text-primary"
                    placeholder="表示名を入力（オプション）"
                  />
                </div>

                <div>
                  <label htmlFor="deviceName" className="block text-sm font-medium text-text-primary mb-2">
                    デバイス名
                  </label>
                  <input
                    type="text"
                    id="deviceName"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent-primary bg-bg-primary text-text-primary"
                    placeholder="デバイス名を入力（オプション）"
                  />
                </div>
              </>
            )}

            {mode === 'login' && (
              <div>
                <label htmlFor="loginUsername" className="block text-sm font-medium text-text-primary mb-2">
                  ユーザー名（オプション）
                </label>
                <input
                  type="text"
                  id="loginUsername"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent-primary bg-bg-primary text-text-primary"
                  placeholder="ユーザー名を入力（省略可）"
                />
                <p className="text-xs text-text-muted mt-1">
                  ユーザー名を省略すると、登録済みの認証情報から選択できます。
                </p>
              </div>
            )}

            {/* WebAuthn説明 */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
              <div className="flex items-center mb-2">
                <Key className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
                <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  WebAuthn（パスキー）認証
                </h3>
              </div>
              <p className="text-xs text-blue-800 dark:text-blue-200">
                {mode === 'register' 
                  ? 'このデバイスの生体認証やPINを使用してアカウントを登録します。'
                  : 'このデバイスの生体認証やPINを使用してログインします。'
                }
              </p>
            </div>

            {/* ボタン */}
            <button
              type="submit"
              disabled={isLoading || !isWebAuthnSupported()}
              className="w-full flex items-center justify-center px-4 py-3 bg-accent-primary text-white rounded-md hover:bg-accent-secondary focus:outline-none focus:ring-2 focus:ring-accent-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              ) : mode === 'register' ? (
                <UserPlus className="h-5 w-5 mr-2" />
              ) : (
                <LogIn className="h-5 w-5 mr-2" />
              )}
              {isLoading ? '処理中...' : mode === 'register' ? '登録' : 'ログイン'}
            </button>
          </form>

          {/* モード切り替え */}
          <div className="mt-6 text-center">
            <p className="text-sm text-text-secondary">
              {mode === 'login' ? 'アカウントをお持ちでない方は' : 'すでにアカウントをお持ちの方は'}
              <button
                type="button"
                onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                className="ml-1 text-accent-primary hover:text-accent-secondary font-medium transition-colors"
              >
                {mode === 'login' ? 'こちらから登録' : 'こちらからログイン'}
              </button>
            </p>
          </div>
        </div>

        {/* フッター */}
        <div className="text-center mt-8">
          <p className="text-xs text-text-muted">
            © 2025 Voice Diary
          </p>
        </div>
      </div>
    </div>
  );
}
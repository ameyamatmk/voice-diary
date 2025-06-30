'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { isWebAuthnSupported } from '@/lib/auth';
import { Key, UserPlus, LogIn, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
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
        setMessage('識別名を入力してください');
        setMessageType('error');
        return;
      }

      const result = await register(
        username.trim()
      );

      setMessage(result.message);
      setMessageType(result.success ? 'success' : 'error');

      if (result.success) {
        // デバイス登録成功後、ログインモードに切り替え
        setTimeout(() => {
          setMode('login');
          setMessage('デバイス登録が完了しました。ログインしてください。');
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
              {mode === 'login' ? 'ログイン' : 'デバイス登録'}
            </h2>
          </div>

          {/* WebAuthn サポートチェック */}
          {!isWebAuthnSupported() && (
            <div className="mb-4 p-3 bg-warning-light border border-warning rounded-md">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-warning mr-2" />
                <p className="text-sm text-warning">
                  このブラウザではWebAuthnがサポートされていません。
                </p>
              </div>
            </div>
          )}

          {/* メッセージ */}
          {message && (
            <div className={`mb-4 p-3 rounded-md flex items-center ${
              messageType === 'success' 
                ? 'bg-success-light border border-success' 
                : 'bg-error-light border border-error'
            }`}>
              {messageType === 'success' ? (
                <CheckCircle className="h-5 w-5 text-success mr-2" />
              ) : (
                <AlertCircle className="h-5 w-5 text-error mr-2" />
              )}
              <p className={`text-sm ${
                messageType === 'success' 
                  ? 'text-success' 
                  : 'text-error'
              }`}>
                {message}
              </p>
            </div>
          )}

          {/* フォーム */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-text-primary mb-2">
                  識別名 *
                </label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent-primary bg-bg-primary text-text-primary"
                  placeholder="識別名を入力（例: あなたの名前）"
                  required
                />
                <p className="text-xs text-text-muted mt-1">
                  表示名やデバイス名は、ログイン後の設定画面で変更できます。
                </p>
              </div>
            )}

            {mode === 'login' && (
              <div>
                <label htmlFor="loginUsername" className="block text-sm font-medium text-text-primary mb-2">
                  識別名（オプション）
                </label>
                <input
                  type="text"
                  id="loginUsername"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent-primary bg-bg-primary text-text-primary"
                  placeholder="識別名を入力（省略可）"
                />
                <p className="text-xs text-text-muted mt-1">
                  識別名を省略すると、このデバイスに登録済みの認証情報から選択できます。
                </p>
              </div>
            )}

            {/* WebAuthn説明 */}
            <div className="bg-info-light p-3 rounded-md">
              <div className="flex items-center mb-2">
                <Key className="h-5 w-5 text-info mr-2" />
                <h3 className="text-sm font-medium text-info">
                  WebAuthn（パスキー）認証
                </h3>
              </div>
              <p className="text-xs text-info">
                {mode === 'register' 
                  ? 'このデバイスの生体認証やPINを使用してログイン設定を行います。'
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
              {isLoading ? '処理中...' : mode === 'register' ? 'デバイス登録' : 'ログイン'}
            </button>
          </form>

          {/* モード切り替え */}
          <div className="mt-6 text-center">
            <p className="text-sm text-text-secondary">
              {mode === 'login' ? '初回利用の場合は' : 'すでに設定済みの場合は'}
              <button
                type="button"
                onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                className="ml-1 text-accent-primary hover:text-accent-secondary font-medium transition-colors"
              >
                {mode === 'login' ? 'デバイス登録' : 'ログイン'}
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
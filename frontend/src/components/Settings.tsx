'use client';

import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, RefreshCw, ChevronDown, User, Smartphone, Trash2, Edit2 } from 'lucide-react';
import { api } from '@/lib/api';
import { AuthAPI } from '@/lib/auth';
import { useAuth } from '@/hooks/useAuth';

interface SettingsConfig {
  transcribe_api: string;
  transcribe_model: string;
  summary_api: string;
  summary_model: string;
  enable_realtime_transcription: boolean;
}

const TRANSCRIBE_OPTIONS = [
  { value: 'mock', label: 'モック（開発用）', description: '開発用のダミーデータ' },
  { value: 'openai', label: 'OpenAI Whisper', description: '高精度・多言語対応' },
  { value: 'google', label: 'Google Cloud Speech', description: '日本語特化・高精度' }
];

const SUMMARY_OPTIONS = [
  { value: 'mock', label: 'モック（開発用）', description: '開発用のダミーデータ' },
  { value: 'openai', label: 'OpenAI GPT', description: '高品質・汎用性' },
  { value: 'claude', label: 'Claude', description: '自然な文章・洞察力' }
];

const TRANSCRIBE_MODELS = {
  openai: [{ value: 'whisper-1', label: 'Whisper-1', description: '標準モデル' }],
  google: [{ value: 'latest_long', label: 'Latest Long', description: '長時間音声用' }],
  mock: [{ value: 'mock-whisper-v1', label: 'Mock Whisper', description: 'モック用' }]
};

const SUMMARY_MODELS = {
  openai: [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini', description: '高コスパ・高品質' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: '高速・標準品質' },
    { value: 'gpt-4o', label: 'GPT-4o', description: '最高品質・高コスト' }
  ],
  claude: [
    { value: 'claude-3-haiku', label: 'Claude 3 Haiku', description: '高速・低コスト' },
    { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet', description: 'バランス型' },
    { value: 'claude-3-opus', label: 'Claude 3 Opus', description: '最高品質' }
  ],
  mock: [{ value: 'mock-gpt-4o-mini', label: 'Mock GPT', description: 'モック用' }]
};

interface Device {
  id: string;
  device_name: string;
  device_type: string;
  user_name: string;
  created_at: string;
  last_used?: string;
}

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'ai' | 'profile' | 'devices'>('ai');
  
  // AI設定
  const [config, setConfig] = useState<SettingsConfig>({
    transcribe_api: 'mock',
    transcribe_model: 'mock-whisper-v1',
    summary_api: 'mock',
    summary_model: 'mock-gpt-4o-mini',
    enable_realtime_transcription: true
  });
  
  // プロフィール設定
  const [displayName, setDisplayName] = useState('');
  
  // デバイス管理
  const [devices, setDevices] = useState<Device[]>([]);
  const [editingDevice, setEditingDevice] = useState<string | null>(null);
  const [newDeviceName, setNewDeviceName] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // 初期化
  useEffect(() => {
    fetchSettings();
    fetchDevices();
    if (user?.display_name) {
      setDisplayName(user.display_name);
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      const data = await api.getSettings();
      setConfig(data);
    } catch (error) {
      console.error('設定の読み込みに失敗:', error);
    }
  };

  const fetchDevices = async () => {
    try {
      const data = await AuthAPI.getDevices();
      setDevices(data);
    } catch (error) {
      console.error('デバイス一覧の取得に失敗:', error);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    setMessage('');

    try {
      await api.saveSettings(config);
      setMessage('設定を保存しました');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('エラー: 設定の保存に失敗しました');
      console.error('設定保存エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (key: keyof SettingsConfig, value: string | boolean) => {
    const newConfig = { ...config, [key]: value };
    
    // API変更時にモデルもデフォルトに変更
    if (key === 'transcribe_api' && typeof value === 'string') {
      const models = TRANSCRIBE_MODELS[value as keyof typeof TRANSCRIBE_MODELS] || [];
      if (models.length > 0) {
        newConfig.transcribe_model = models[0].value;
      }
    } else if (key === 'summary_api' && typeof value === 'string') {
      const models = SUMMARY_MODELS[value as keyof typeof SUMMARY_MODELS] || [];
      if (models.length > 0) {
        newConfig.summary_model = models[0].value;
      }
    }
    
    setConfig(newConfig);
  };

  const getAvailableModels = (api: string, type: 'transcribe' | 'summary') => {
    if (type === 'transcribe') {
      return TRANSCRIBE_MODELS[api as keyof typeof TRANSCRIBE_MODELS] || [];
    } else {
      return SUMMARY_MODELS[api as keyof typeof SUMMARY_MODELS] || [];
    }
  };

  // プロフィール保存
  const saveProfile = async () => {
    setLoading(true);
    setMessage('');

    try {
      await AuthAPI.updateProfile({ display_name: displayName });
      await refreshUser();
      setMessage('プロフィールを保存しました');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('エラー: プロフィールの保存に失敗しました');
      console.error('プロフィール保存エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  // デバイス削除
  const deleteDevice = async (deviceId: string) => {
    if (!confirm('このデバイスを削除しますか？削除後はこのデバイスからログインできなくなります。')) {
      return;
    }

    try {
      await AuthAPI.deleteDevice(deviceId);
      await fetchDevices();
      setMessage('デバイスを削除しました');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('エラー: デバイスの削除に失敗しました');
      console.error('デバイス削除エラー:', error);
    }
  };

  // デバイス名更新
  const updateDeviceName = async (deviceId: string) => {
    if (!newDeviceName.trim()) {
      setMessage('デバイス名を入力してください');
      return;
    }

    try {
      await AuthAPI.updateDevice(deviceId, { device_name: newDeviceName });
      await fetchDevices();
      setEditingDevice(null);
      setNewDeviceName('');
      setMessage('デバイス名を更新しました');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('エラー: デバイス名の更新に失敗しました');
      console.error('デバイス名更新エラー:', error);
    }
  };

  const startEditDevice = (device: Device) => {
    setEditingDevice(device.id);
    setNewDeviceName(device.device_name);
  };

  const cancelEditDevice = () => {
    setEditingDevice(null);
    setNewDeviceName('');
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-bg-secondary rounded-xl shadow-md border border-border">
        {/* ヘッダー */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-6 h-6 text-accent-primary" />
            <h2 className="text-2xl font-semibold text-text-primary">設定</h2>
          </div>
          <p className="text-text-secondary mt-2">
            アプリケーションの設定を管理します
          </p>
        </div>

        {/* タブナビゲーション */}
        <div className="border-b border-border">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('ai')}
              className={`px-6 py-4 text-sm font-medium ${
                activeTab === 'ai'
                  ? 'text-accent-primary border-b-2 border-accent-primary'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              🤖 AI設定
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-6 py-4 text-sm font-medium ${
                activeTab === 'profile'
                  ? 'text-accent-primary border-b-2 border-accent-primary'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <User className="w-4 h-4 inline mr-2" />
              プロフィール
            </button>
            <button
              onClick={() => setActiveTab('devices')}
              className={`px-6 py-4 text-sm font-medium ${
                activeTab === 'devices'
                  ? 'text-accent-primary border-b-2 border-accent-primary'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <Smartphone className="w-4 h-4 inline mr-2" />
              デバイス管理
            </button>
          </nav>
        </div>

        {/* タブコンテンツ */}
        <div className="p-6">
          {/* AI設定タブ */}
          {activeTab === 'ai' && (
            <div className="space-y-8">
              {/* 文字起こし設定 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-text-900 flex items-center gap-2">
                  🎤 文字起こし設定
                </h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-700 mb-2">
                      APIプロバイダー
                    </label>
                    <div className="relative">
                      <select
                        value={config.transcribe_api}
                        onChange={(e) => handleConfigChange('transcribe_api', e.target.value)}
                        className="w-full px-3 py-2 pr-10 bg-bg-surface text-text-900 border border-border rounded-lg focus:ring-2 focus:ring-accent-primary focus:border-accent-primary appearance-none"
                      >
                        {TRANSCRIBE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value} className="bg-bg-surface text-text-900">
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-400 pointer-events-none" />
                    </div>
                    <p className="text-sm text-text-500 mt-1">
                      {TRANSCRIBE_OPTIONS.find(opt => opt.value === config.transcribe_api)?.description}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-700 mb-2">
                      モデル
                    </label>
                    <div className="relative">
                      <select
                        value={config.transcribe_model}
                        onChange={(e) => handleConfigChange('transcribe_model', e.target.value)}
                        className="w-full px-3 py-2 pr-10 bg-bg-surface text-text-900 border border-border rounded-lg focus:ring-2 focus:ring-accent-primary focus:border-accent-primary appearance-none"
                      >
                        {getAvailableModels(config.transcribe_api, 'transcribe').map((model) => (
                          <option key={model.value} value={model.value} className="bg-bg-surface text-text-900">
                            {model.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-400 pointer-events-none" />
                    </div>
                    <p className="text-sm text-text-500 mt-1">
                      {getAvailableModels(config.transcribe_api, 'transcribe')
                        .find(model => model.value === config.transcribe_model)?.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* 要約設定 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-text-900 flex items-center gap-2">
                  📝 要約設定
                </h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-700 mb-2">
                      APIプロバイダー
                    </label>
                    <div className="relative">
                      <select
                        value={config.summary_api}
                        onChange={(e) => handleConfigChange('summary_api', e.target.value)}
                        className="w-full px-3 py-2 pr-10 bg-bg-surface text-text-900 border border-border rounded-lg focus:ring-2 focus:ring-accent-primary focus:border-accent-primary appearance-none"
                      >
                        {SUMMARY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value} className="bg-bg-surface text-text-900">
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-400 pointer-events-none" />
                    </div>
                    <p className="text-sm text-text-500 mt-1">
                      {SUMMARY_OPTIONS.find(opt => opt.value === config.summary_api)?.description}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-700 mb-2">
                      モデル
                    </label>
                    <div className="relative">
                      <select
                        value={config.summary_model}
                        onChange={(e) => handleConfigChange('summary_model', e.target.value)}
                        className="w-full px-3 py-2 pr-10 bg-bg-surface text-text-900 border border-border rounded-lg focus:ring-2 focus:ring-accent-primary focus:border-accent-primary appearance-none"
                      >
                        {getAvailableModels(config.summary_api, 'summary').map((model) => (
                          <option key={model.value} value={model.value} className="bg-bg-surface text-text-900">
                            {model.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-400 pointer-events-none" />
                    </div>
                    <p className="text-sm text-text-500 mt-1">
                      {getAvailableModels(config.summary_api, 'summary')
                        .find(model => model.value === config.summary_model)?.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* リアルタイム文字起こし設定 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-text-900 flex items-center gap-2">
                  ⚡ リアルタイム文字起こし設定
                </h3>
                
                <div className="bg-warning-light border border-warning rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.enable_realtime_transcription}
                          onChange={(e) => handleConfigChange('enable_realtime_transcription', e.target.checked)}
                          className="w-4 h-4 text-accent-primary bg-bg-tertiary border-border rounded focus:ring-accent-primary focus:ring-2"
                        />
                        <div>
                          <span className="text-sm font-medium text-text-900">
                            録音中のリアルタイム文字起こしを有効にする
                          </span>
                          <p className="text-xs text-text-600 mt-1">
                            Web Speech API を使用して録音中にリアルタイムで文字起こしを表示します（参考用・無料）
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* コスト目安 */}
              <div className="bg-info-light border border-info rounded-lg p-4">
                <h4 className="font-semibold text-info mb-2">💰 コスト目安（月間100分想定）</h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong className="text-info">文字起こし:</strong>
                    <ul className="mt-1 text-info">
                      <li>• Mock: 無料</li>
                      <li>• OpenAI Whisper: ~$0.6</li>
                      <li>• Google Cloud: ~$2.4</li>
                    </ul>
                  </div>
                  <div>
                    <strong className="text-info">要約:</strong>
                    <ul className="mt-1 text-info">
                      <li>• Mock: 無料</li>
                      <li>• GPT-4o Mini: ~$0.015</li>
                      <li>• Claude 3 Haiku: ~$0.04</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* AI設定保存ボタン */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  {message && (
                    <span className={`text-sm ${message.includes('エラー') ? 'text-error' : 'text-success'}`}>
                      {message}
                    </span>
                  )}
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={fetchSettings}
                    className="px-4 py-2 text-text-600 hover:text-text-800 transition-colors flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    リセット
                  </button>
                  
                  <button
                    onClick={saveSettings}
                    disabled={loading}
                    className="px-6 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    保存
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* プロフィール設定タブ */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-4">プロフィール設定</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      識別名
                    </label>
                    <input
                      type="text"
                      value={user?.username || ''}
                      disabled
                      className="w-full px-3 py-2 bg-bg-tertiary text-text-muted border border-border rounded-lg cursor-not-allowed"
                    />
                    <p className="text-xs text-text-muted mt-1">
                      識別名は変更できません
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      表示名
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="表示名を入力してください"
                      className="w-full px-3 py-2 bg-bg-primary text-text-primary border border-border rounded-lg focus:ring-2 focus:ring-accent-primary focus:border-accent-primary"
                    />
                    <p className="text-xs text-text-muted mt-1">
                      アプリ内で表示される名前です
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-border mt-6">
                  <div className="flex items-center gap-2">
                    {message && (
                      <span className={`text-sm ${message.includes('エラー') ? 'text-error' : 'text-success'}`}>
                        {message}
                      </span>
                    )}
                  </div>
                  
                  <button
                    onClick={saveProfile}
                    disabled={loading}
                    className="px-6 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    保存
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* デバイス管理タブ */}
          {activeTab === 'devices' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-4">登録デバイス管理</h3>
                <p className="text-text-secondary mb-6">
                  すべての登録済みデバイスを管理します。識別名（メイン表示）ごとにデバイス名を設定できます。異なるデバイス（PC、スマホ等）から同じ日記にアクセスできます。
                </p>

                <div className="space-y-4">
                  {devices.map((device) => (
                    <div
                      key={device.id}
                      className="bg-bg-tertiary border border-border rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Smartphone className="w-5 h-5 text-text-muted" />
                          <div>
                            {editingDevice === device.id ? (
                              <div>
                                <h4 className="font-medium text-text-primary mb-2">{device.user_name}</h4>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-text-muted">デバイス名:</span>
                                  <input
                                    type="text"
                                    value={newDeviceName}
                                    onChange={(e) => setNewDeviceName(e.target.value)}
                                    placeholder="デバイス名を入力"
                                    className="px-2 py-1 bg-bg-primary text-text-primary border border-border rounded text-sm focus:ring-2 focus:ring-accent-primary"
                                  />
                                  <button
                                    onClick={() => updateDeviceName(device.id)}
                                    className="text-success hover:text-success"
                                  >
                                    <Save className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={cancelEditDevice}
                                    className="text-text-muted hover:text-text-secondary"
                                  >
                                    ×
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <h4 className="font-medium text-text-primary">{device.user_name}</h4>
                                <p className="text-sm text-text-muted">
                                  デバイス: {device.device_name} • 
                                  登録日時: {new Date(device.created_at).toLocaleDateString('ja-JP')}
                                  {device.last_used && (
                                    <span className="ml-2">
                                      • 最終利用: {new Date(device.last_used).toLocaleDateString('ja-JP')}
                                    </span>
                                  )}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {editingDevice !== device.id && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => startEditDevice(device)}
                              className="text-accent-primary hover:text-accent-secondary p-1"
                              title="デバイス名を編集"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteDevice(device.id)}
                              disabled={devices.length <= 1}
                              className="text-error hover:text-error disabled:text-text-muted disabled:cursor-not-allowed p-1"
                              title={devices.length <= 1 ? "最後の登録デバイスは削除できません" : "この登録デバイスを削除"}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {message && (
                  <div className="mt-4">
                    <span className={`text-sm ${message.includes('エラー') ? 'text-error' : 'text-success'}`}>
                      {message}
                    </span>
                  </div>
                )}

                <div className="bg-warning-light border border-warning rounded-lg p-4 mt-6">
                  <h4 className="font-medium text-warning mb-2">⚠️ 注意事項</h4>
                  <ul className="text-sm text-warning space-y-1">
                    <li>• 識別名（太字）がメイン表示で、デバイス名は補助情報です</li>
                    <li>• 登録デバイスを削除すると、その識別名でログインできなくなります</li>
                    <li>• 新しいデバイスを追加するには、ログアウト後にデバイス登録を行ってください</li>
                    <li>• 最低1つの登録デバイスは残す必要があります</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
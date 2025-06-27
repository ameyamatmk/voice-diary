'use client';

import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, RefreshCw, ChevronDown } from 'lucide-react';
import { api } from '@/lib/api';

interface SettingsConfig {
  transcribe_api: string;
  transcribe_model: string;
  summary_api: string;
  summary_model: string;
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

export default function Settings() {
  const [config, setConfig] = useState<SettingsConfig>({
    transcribe_api: 'mock',
    transcribe_model: 'mock-whisper-v1',
    summary_api: 'mock',
    summary_model: 'mock-gpt-4o-mini'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // 設定を読み込み
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await api.getSettings();
      setConfig(data);
    } catch (error) {
      console.error('設定の読み込みに失敗:', error);
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

  const handleConfigChange = (key: keyof SettingsConfig, value: string) => {
    const newConfig = { ...config, [key]: value };
    
    // API変更時にモデルもデフォルトに変更
    if (key === 'transcribe_api') {
      const models = TRANSCRIBE_MODELS[value as keyof typeof TRANSCRIBE_MODELS] || [];
      if (models.length > 0) {
        newConfig.transcribe_model = models[0].value;
      }
    } else if (key === 'summary_api') {
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

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-md border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-semibold text-gray-900">AI設定</h2>
          </div>
          <p className="text-gray-600 mt-2">
            文字起こしと要約に使用するAIモデルを設定できます
          </p>
        </div>

        <div className="p-6 space-y-8">
          {/* 文字起こし設定 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              🎤 文字起こし設定
            </h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  APIプロバイダー
                </label>
                <div className="relative">
                  <select
                    value={config.transcribe_api}
                    onChange={(e) => handleConfigChange('transcribe_api', e.target.value)}
                    className="w-full px-3 py-2 pr-10 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                  >
                    {TRANSCRIBE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value} className="bg-white text-gray-900">
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {TRANSCRIBE_OPTIONS.find(opt => opt.value === config.transcribe_api)?.description}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  モデル
                </label>
                <div className="relative">
                  <select
                    value={config.transcribe_model}
                    onChange={(e) => handleConfigChange('transcribe_model', e.target.value)}
                    className="w-full px-3 py-2 pr-10 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                  >
                    {getAvailableModels(config.transcribe_api, 'transcribe').map((model) => (
                      <option key={model.value} value={model.value} className="bg-white text-gray-900">
                        {model.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {getAvailableModels(config.transcribe_api, 'transcribe')
                    .find(model => model.value === config.transcribe_model)?.description}
                </p>
              </div>
            </div>
          </div>

          {/* 要約設定 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              📝 要約設定
            </h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  APIプロバイダー
                </label>
                <div className="relative">
                  <select
                    value={config.summary_api}
                    onChange={(e) => handleConfigChange('summary_api', e.target.value)}
                    className="w-full px-3 py-2 pr-10 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                  >
                    {SUMMARY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value} className="bg-white text-gray-900">
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {SUMMARY_OPTIONS.find(opt => opt.value === config.summary_api)?.description}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  モデル
                </label>
                <div className="relative">
                  <select
                    value={config.summary_model}
                    onChange={(e) => handleConfigChange('summary_model', e.target.value)}
                    className="w-full px-3 py-2 pr-10 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                  >
                    {getAvailableModels(config.summary_api, 'summary').map((model) => (
                      <option key={model.value} value={model.value} className="bg-white text-gray-900">
                        {model.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {getAvailableModels(config.summary_api, 'summary')
                    .find(model => model.value === config.summary_model)?.description}
                </p>
              </div>
            </div>
          </div>

          {/* コスト目安 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">💰 コスト目安（月間100分想定）</h4>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong className="text-blue-800">文字起こし:</strong>
                <ul className="mt-1 text-blue-700">
                  <li>• Mock: 無料</li>
                  <li>• OpenAI Whisper: ~$0.6</li>
                  <li>• Google Cloud: ~$2.4</li>
                </ul>
              </div>
              <div>
                <strong className="text-blue-800">要約:</strong>
                <ul className="mt-1 text-blue-700">
                  <li>• Mock: 無料</li>
                  <li>• GPT-4o Mini: ~$0.015</li>
                  <li>• Claude 3 Haiku: ~$0.04</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 保存ボタン */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              {message && (
                <span className={`text-sm ${message.includes('エラー') ? 'text-red-600' : 'text-green-600'}`}>
                  {message}
                </span>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={fetchSettings}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                リセット
              </button>
              
              <button
                onClick={saveSettings}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
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
      </div>
    </div>
  );
}
import { Metadata } from 'next';
import Settings from '@/components/Settings';

export const metadata: Metadata = {
  title: '設定 - 音声日記',
  description: 'AI設定とシステム設定',
};

export default function SettingsPage() {
  return <Settings />;
}
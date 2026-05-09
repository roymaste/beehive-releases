import React from 'react';
import { RiTimerLine } from 'react-icons/ri';

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title, description }) => (
  <div style={{ padding: '40px 24px', height: '100%' }}>
    <div style={{ maxWidth: 640 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1c1917', margin: '0 0 4px', letterSpacing: '-0.3px' }}>
        {title}
      </h1>
      <p style={{ fontSize: 13, color: '#78716c', margin: '0 0 32px' }}>
        {description || '该功能即将上线，敬请期待。'}
      </p>
      <div
        className="apple-card"
        style={{
          padding: 60,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <RiTimerLine size={48} style={{ color: '#d6d3d1' }} />
        <p style={{ fontSize: 15, color: '#78716c', margin: 0 }}>正在开发中</p>
      </div>
    </div>
  </div>
);

export default PlaceholderPage;

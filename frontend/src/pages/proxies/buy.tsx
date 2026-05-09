import React from 'react';

const BuyIPPage: React.FC = () => {
  const containerStyle: React.CSSProperties = {
    maxWidth: 800,
    margin: '0 auto',
    padding: '40px 24px',
  };

  const cardStyle: React.CSSProperties = {
    background: '#1e1e1e',
    borderRadius: 16,
    padding: 40,
    textAlign: 'center',
  };

  const badgeStyle: React.CSSProperties = {
    display: 'inline-block',
    background: '#FFC107',
    color: '#121212',
    padding: '4px 14px',
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 16,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 24,
    fontWeight: 700,
    color: '#ffffff',
    marginBottom: 8,
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: 14,
    color: '#9e9e9e',
    marginBottom: 32,
    lineHeight: 1.6,
  };

  const ctaStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    padding: '14px 48px',
    background: '#FFC107',
    color: '#121212',
    borderRadius: 10,
    fontWeight: 700,
    fontSize: 16,
    textDecoration: 'none',
    marginBottom: 16,
  };

  const noteStyle: React.CSSProperties = {
    fontSize: 12,
    color: '#666',
    lineHeight: 1.6,
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={badgeStyle}>蜂巢推荐</div>
        <h1 style={titleStyle}>住宅代理IP</h1>
        <p style={subtitleStyle}>
          真实住宅IP · 纯净干净 · 注册即用<br />
          TikTok / Twitter / Instagram 多平台适用
        </p>

        <a
          href="https://www.miyaip.com/?invitecode=5808117"
          target="_blank"
          rel="noopener noreferrer"
          style={ctaStyle}
        >
          立即购买 →
        </a>

        <p style={noteStyle}>
          全网最低价，点击即享蜂巢专属优惠<br />
          购买过程中如有疑问，可联系蜂巢客服协助
        </p>
      </div>
    </div>
  );
};

export default BuyIPPage;

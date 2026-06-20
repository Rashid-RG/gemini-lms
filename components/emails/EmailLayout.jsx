import React from 'react'

/**
 * Professional Email Layout Component
 * Provides premium branding and structure for all emails
 * Uses Tailwind-like inline CSS for email compatibility
 */
export const EmailLayout = ({ 
  children, 
  preheader = '',
  showFooter = true,
  logoUrl = null,
  brandColor = '#4f46e5' // Premium Indigo
}) => {
  return (
    <div style={{ 
      fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', 
      backgroundColor: '#f8fafc',
      padding: '40px 20px',
      margin: 0
    }}>
      {/* Google Fonts import inside a style block (processed by @react-email/render) */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        body, table, td, a, p, span, h1, h2, h3, h4, h5, h6 {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        }
        .email-button:hover {
          opacity: 0.95 !important;
          transform: translateY(-1px) !important;
        }
      `}} />

      {/* Preheader text (hidden, used for preview) */}
      {preheader && (
        <div style={{ display: 'none', fontSize: 0, lineHeight: 0, maxHeight: 0, maxWidth: 0, opacity: 0, overflow: 'hidden' }}>
          {preheader}
        </div>
      )}

      {/* Main container */}
      <div style={{ 
        maxWidth: '600px', 
        margin: '0 auto', 
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.02), 0 8px 10px -6px rgba(0, 0, 0, 0.03)',
        border: '1px solid #f1f5f9',
        overflow: 'hidden'
      }}>
        {/* Header with logo and gradient */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311042 100%)',
          padding: '35px 24px',
          textAlign: 'center'
        }}>
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt="Gemini LMS" 
              style={{ maxHeight: '44px', marginBottom: '10px' }}
            />
          ) : (
            <div style={{
              fontSize: '26px',
              fontWeight: '700',
              letterSpacing: '-0.5px',
              color: '#ffffff'
            }}>
              <span style={{ color: '#a78bfa', fontWeight: '800' }}>Gemini</span>
              <span style={{ color: '#ffffff', fontWeight: '300' }}> LMS</span>
              <span style={{ color: '#a78bfa', marginLeft: '4px' }}>✨</span>
            </div>
          )}
        </div>

        {/* Content area */}
        <div style={{ padding: '40px 32px' }}>
          {children}
        </div>

        {/* Footer */}
        {showFooter && (
          <div style={{
            borderTop: '1px solid #f1f5f9',
            padding: '30px 24px',
            backgroundColor: '#f8fafc',
            textAlign: 'center',
            fontSize: '13px',
            color: '#64748b',
            lineHeight: '1.6'
          }}>
            <p style={{ margin: '8px 0', fontWeight: '500' }}>
              <a href="mailto:support@geminilms.com" style={{ color: brandColor, textDecoration: 'none' }}>
                Contact Support
              </a>
              {' '} • {' '}
              <a href="#" style={{ color: brandColor, textDecoration: 'none' }}>
                Privacy Policy
              </a>
              {' '} • {' '}
              <a href="#" style={{ color: brandColor, textDecoration: 'none' }}>
                Unsubscribe
              </a>
            </p>
            <p style={{ margin: '8px 0' }}>
              © {new Date().getFullYear()} Gemini LMS. All rights reserved.
            </p>
            <p style={{ margin: '8px 0', fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
              This is an automated learning environment email. Please do not reply directly to this message.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Reusable section component for email content
 */
export const EmailSection = ({ 
  title, 
  icon = '',
  children,
  backgroundColor = '#ffffff',
  borderColor = '#6366f1' // Defaults to indigo
}) => {
  // If the background is default white but we have custom border, use a subtle tinted border-left card
  const isDefaultBackground = backgroundColor === '#ffffff';
  const finalBg = isDefaultBackground ? '#f8fafc' : backgroundColor;
  const finalBorder = isDefaultBackground ? '#e2e8f0' : borderColor;

  return (
    <div style={{
      margin: '20px 0',
      padding: '24px',
      backgroundColor: finalBg,
      border: `1px solid ${finalBorder}`,
      borderLeft: `4px solid ${borderColor}`,
      borderRadius: '12px',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.01)'
    }}>
      {title && (
        <h3 style={{
          margin: '0 0 14px 0',
          fontSize: '15px',
          fontWeight: '700',
          color: '#0f172a',
          letterSpacing: '-0.2px',
          display: 'flex',
          alignItems: 'center'
        }}>
          {icon && <span style={{ marginRight: '8px', fontSize: '18px' }}>{icon}</span>}
          {title}
        </h3>
      )}
      <div style={{ fontSize: '14px', color: '#334155', lineHeight: '1.6' }}>
        {children}
      </div>
    </div>
  )
}

/**
 * Button component for emails
 */
export const EmailButton = ({ 
  href, 
  text, 
  variant = 'primary',
  brandColor = '#4f46e5'
}) => {
  const styles = {
    primary: {
      background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
      color: '#ffffff',
      boxShadow: '0 4px 12px rgba(79, 70, 229, 0.15)',
      border: 'none'
    },
    secondary: {
      backgroundColor: '#f1f5f9',
      color: '#475569',
      border: '1px solid #e2e8f0'
    },
    danger: {
      backgroundColor: '#ef4444',
      color: '#ffffff',
      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)'
    }
  }

  return (
    <a 
      href={href} 
      className="email-button"
      style={{
        display: 'inline-block',
        padding: '14px 28px',
        borderRadius: '10px',
        textDecoration: 'none',
        fontWeight: '600',
        fontSize: '14px',
        margin: '12px 0',
        textAlign: 'center',
        transition: 'all 0.2s ease',
        ...styles[variant]
      }}
    >
      {text}
    </a>
  )
}

/**
 * Stat card component for displaying metrics
 */
export const StatCard = ({ 
  label, 
  value, 
  icon = '',
  color = '#4f46e5'
}) => {
  return (
    <td style={{
      padding: '22px 16px',
      backgroundColor: `${color}08`, // 5% opacity tint
      borderRadius: '12px',
      textAlign: 'center',
      border: `1px solid ${color}15`,
      width: '33.33%'
    }}>
      {icon && (
        <div style={{ fontSize: '26px', marginBottom: '10px' }}>
          {icon}
        </div>
      )}
      <div style={{
        fontSize: '28px',
        fontWeight: '800',
        color: color,
        margin: '4px 0',
        letterSpacing: '-1px',
        lineHeight: '1.2'
      }}>
        {value}
      </div>
      <div style={{
        fontSize: '11px',
        color: '#64748b',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginTop: '6px'
      }}>
        {label}
      </div>
    </td>
  )
}

/**
 * Stats row component - displays multiple stats in a row using tables
 */
export const StatsRow = ({ children }) => {
  return (
    <table style={{
      width: '100%',
      borderCollapse: 'separate',
      borderSpacing: '12px 0',
      margin: '20px 0'
    }}>
      <tbody>
        <tr>
          {children}
        </tr>
      </tbody>
    </table>
  )
}

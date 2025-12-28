import React from 'react'

/**
 * Professional Email Layout Component
 * Provides consistent branding and structure for all emails
 * Uses Tailwind-like inline CSS for email compatibility
 */
export const EmailLayout = ({ 
  children, 
  preheader = '',
  showFooter = true,
  logoUrl = null,
  brandColor = '#667eea' // Primary brand color
}) => {
  return (
    <div style={{ fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", sans-serif', backgroundColor: '#f9fafb' }}>
      {/* Preheader text (hidden, used for preview) */}
      {preheader && (
        <div style={{ display: 'none', fontSize: 0, lineHeight: 0, maxHeight: 0, maxWidth: 0 }}>
          {preheader}
        </div>
      )}

      {/* Main container */}
      <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff' }}>
        {/* Header with logo */}
        <div style={{
          backgroundColor: brandColor,
          padding: '30px 20px',
          textAlign: 'center',
          borderBottom: `4px solid ${brandColor}`
        }}>
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt="Gemini LMS" 
              style={{ maxHeight: '40px', marginBottom: '10px' }}
            />
          ) : (
            <div style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#ffffff',
              letterSpacing: '1px'
            }}>
              ✨ Gemini LMS
            </div>
          )}
        </div>

        {/* Content area */}
        <div style={{ padding: '30px 20px' }}>
          {children}
        </div>

        {/* Footer */}
        {showFooter && (
          <div style={{
            borderTop: '1px solid #e5e7eb',
            padding: '20px',
            backgroundColor: '#f9fafb',
            textAlign: 'center',
            fontSize: '12px',
            color: '#6b7280'
          }}>
            <p style={{ margin: '8px 0' }}>
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
            <p style={{ margin: '8px 0', fontStyle: 'italic' }}>
              This is an automated email. Please don't reply directly.
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
  borderColor = '#667eea'
}) => {
  return (
    <div style={{
      margin: '15px 0',
      padding: '20px',
      backgroundColor: backgroundColor,
      border: `1px solid ${borderColor}`,
      borderLeft: `4px solid ${borderColor}`,
      borderRadius: '6px'
    }}>
      {title && (
        <h3 style={{
          margin: '0 0 12px 0',
          fontSize: '16px',
          fontWeight: '600',
          color: '#1f2937'
        }}>
          {icon && <span style={{ marginRight: '8px' }}>{icon}</span>}
          {title}
        </h3>
      )}
      {children}
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
  brandColor = '#667eea'
}) => {
  const styles = {
    primary: {
      backgroundColor: brandColor,
      color: '#ffffff'
    },
    secondary: {
      backgroundColor: '#e5e7eb',
      color: '#1f2937'
    },
    danger: {
      backgroundColor: '#ef4444',
      color: '#ffffff'
    }
  }

  return (
    <a href={href} style={{
      display: 'inline-block',
      padding: '12px 24px',
      borderRadius: '6px',
      textDecoration: 'none',
      fontWeight: '600',
      fontSize: '14px',
      margin: '10px 0',
      ...styles[variant]
    }}>
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
  color = '#667eea'
}) => {
  return (
    <div style={{
      padding: '15px',
      backgroundColor: `${color}15`,
      borderRadius: '6px',
      textAlign: 'center',
      flex: 1
    }}>
      {icon && (
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>
          {icon}
        </div>
      )}
      <div style={{
        fontSize: '24px',
        fontWeight: 'bold',
        color: color,
        margin: '8px 0'
      }}>
        {value}
      </div>
      <div style={{
        fontSize: '12px',
        color: '#6b7280',
        fontWeight: '500'
      }}>
        {label}
      </div>
    </div>
  )
}

/**
 * Stats row component - displays multiple stats in a row
 */
export const StatsRow = ({ children }) => {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '12px',
      margin: '15px 0'
    }}>
      {children}
    </div>
  )
}

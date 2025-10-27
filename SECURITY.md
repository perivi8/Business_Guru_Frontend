# Security Implementation Guide

## Overview
This document outlines the security measures implemented in the TMIS Business Guru frontend application.

## Implemented Security Features

### 1. Content Security Policy (CSP)
**Location:** `src/index.html`

The application implements a Content Security Policy to prevent XSS attacks and unauthorized code execution.

**Policy Details:**
- `default-src 'self'` - Only allow resources from same origin
- `script-src` - Scripts from self and trusted CDNs only
- `style-src` - Styles from self and Google Fonts
- `frame-ancestors 'none'` - Prevent clickjacking by disabling iframe embedding
- `connect-src` - API connections restricted to backend and localhost

### 2. Security Headers
**Location:** `src/index.html`

- **X-Frame-Options: DENY** - Prevents clickjacking attacks
- **X-Content-Type-Options: nosniff** - Prevents MIME type sniffing
- **Referrer Policy** - Controls referrer information

### 3. Production-Safe Logging
**Location:** `src/app/services/logger.service.ts`

A centralized logging service that:
- Automatically disables debug logs in production
- Prevents sensitive data exposure in console
- Maintains error logging for monitoring

**Usage:**
```typescript
constructor(private logger: LoggerService) {}

// Development only
this.logger.debug('Debug info', data);
this.logger.log('Info message');

// Always logged
this.logger.error('Error occurred', error);
this.logger.warn('Warning message');
```

### 4. JWT Token Validation
**Location:** `src/app/guards/auth.guard.ts`, `src/app/guards/admin.guard.ts`

Both guards now validate:
- Token existence
- Token expiration
- User authentication status

Expired tokens automatically trigger logout and redirect to login page.

### 5. Build Configuration
**Location:** `angular.json`

**Production Build:**
- Source maps disabled (`sourceMap: false`)
- Code optimization enabled
- Build optimizer enabled
- Output hashing for cache busting

**Development Build:**
- Source maps enabled for debugging
- No optimization for faster builds

### 6. Environment Configuration
**Location:** `src/environments/`

- `environment.ts` - Development configuration
- `environment.prod.ts` - Production configuration with `enableDebugMode: false`

## Authentication Security

### Token Storage
**Current Implementation:** localStorage (Client-side accessible)

⚠️ **IMPORTANT SECURITY NOTE:**
The application currently stores JWT tokens in localStorage. While this implementation includes multiple security layers, for maximum security in production, consider migrating to HttpOnly cookies.

**Recommended Migration Path:**
1. Backend: Set JWT in HttpOnly, Secure, SameSite=Strict cookies
2. Frontend: Remove localStorage token storage
3. Backend: Handle token refresh automatically
4. Frontend: Rely on automatic cookie transmission

### Session Management
- Automatic token expiration validation
- User status monitoring (checks for deleted accounts)
- Automatic logout on 401 errors
- Session restoration on page reload

## API Security

### HTTPS Enforcement
- Production environment uses HTTPS (`https://business-guru-backend.onrender.com`)
- Development uses HTTP for local testing only

### Request Interceptor
**Location:** `src/app/interceptors/auth.interceptor.ts`

- Automatically adds Bearer token to authorized requests
- Handles 401 errors with automatic logout
- Excludes token from login/register requests

## Input Validation

### Angular Built-in Protection
- Automatic XSS sanitization in templates
- No `innerHTML` usage without sanitization
- Reactive forms with validators

### Form Validation
All forms implement:
- Required field validation
- Email format validation
- Custom validators where needed
- Backend validation mirroring

## Dependency Security

### Regular Audits
Run security audits regularly:
```bash
npm audit
npm audit fix
```

### CDN Dependencies
External scripts in `index.html`:
- Chart.js from jsDelivr
- Socket.io from CDN

⚠️ **Recommendation:** Consider migrating to npm packages for better security control.

## Production Deployment Checklist

### Pre-Deployment
- [ ] Run `npm audit` and fix vulnerabilities
- [ ] Verify `environment.prod.ts` has `enableDebugMode: false`
- [ ] Test with production build: `npm run build`
- [ ] Verify no console.log output in production
- [ ] Check source maps are disabled in dist folder

### Deployment
- [ ] Use HTTPS only
- [ ] Configure server-side security headers (if not using meta tags)
- [ ] Set up CORS properly on backend
- [ ] Enable HSTS header on server
- [ ] Configure rate limiting on backend

### Post-Deployment
- [ ] Verify CSP is working (check browser console)
- [ ] Test authentication flow
- [ ] Verify token expiration handling
- [ ] Check for any console errors
- [ ] Run penetration testing

## Security Best Practices

### For Developers

1. **Never commit sensitive data**
   - API keys
   - Passwords
   - Tokens
   - Private keys

2. **Use the Logger Service**
   ```typescript
   // ❌ Don't use console.log directly
   console.log('User data:', userData);
   
   // ✅ Use logger service
   this.logger.debug('User data:', userData);
   ```

3. **Validate all inputs**
   - Frontend validation for UX
   - Backend validation for security
   - Never trust client-side data

4. **Handle errors securely**
   - Don't expose stack traces to users
   - Log errors server-side
   - Show generic error messages to users

5. **Keep dependencies updated**
   ```bash
   npm outdated
   npm update
   ```

## Incident Response

### If a Security Issue is Discovered

1. **Assess the severity**
   - Critical: Immediate action required
   - High: Fix within 24 hours
   - Medium: Fix within 1 week
   - Low: Fix in next release

2. **Contain the issue**
   - Disable affected features if necessary
   - Revoke compromised tokens
   - Notify affected users if data breach

3. **Fix and deploy**
   - Create hotfix branch
   - Test thoroughly
   - Deploy to production
   - Monitor for issues

4. **Post-mortem**
   - Document what happened
   - Update security measures
   - Train team on prevention

## Security Contacts

For security issues, contact:
- Development Team Lead
- Security Officer
- DevOps Team

**Do not disclose security vulnerabilities publicly.**

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Angular Security Guide](https://angular.io/guide/security)
- [Content Security Policy Reference](https://content-security-policy.com/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

## Version History

- **v1.0** (2025-10-27) - Initial security implementation
  - Added CSP and security headers
  - Implemented logger service
  - Added JWT expiration validation
  - Disabled source maps in production
  - Added comprehensive documentation

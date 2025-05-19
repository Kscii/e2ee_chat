# Secure Password Transmission Implementation (INFO2222-group Project)

---

## 1. Backend (Flask + Nginx)

### 1.1 Certificate Configuration  
`/etc/nginx/sites-available/chat-app` (Nginx config)  
* **Certificate Path**: Managed by Let's Encrypt at `/etc/letsencrypt/live/kang-mi.com/`, including:
  * `fullchain.pem` – server + intermediate cert chain
  * `privkey.pem` – private key  
* **TLS Configuration**: TLS 1.2 and 1.3 enabled, older versions disabled. Secure cipher suites configured (ECDHE-ECDSA and ECDHE-RSA), session caching and timeout configured, session tickets disabled, HSTS header enabled (`max-age=63072000` seconds).

### 1.2 HTTPS Enforcement  
* All HTTP requests are permanently redirected (301) to HTTPS via a separate server block listening on port 80
* All login and API endpoints are served over `https://kang-mi.com/api`
* TLS 1.2 and 1.3 are enabled; older versions are disabled
* HSTS header is configured (`max-age=63072000; includeSubDomains; preload`) to enforce HTTPS in future requests

### 1.3 TLS Security Controls

#### a. Cipher Suites  
* TLS is configured to use secure ciphers:
  * ECDHE-ECDSA-AES256-GCM-SHA384
  * ECDHE-RSA-AES256-GCM-SHA384
  * ECDHE-ECDSA-CHACHA20-POLY1305
  * ECDHE-RSA-CHACHA20-POLY1305
  * DHE-RSA-AES256-GCM-SHA384
* TLS session tickets are disabled for forward secrecy
* OCSP stapling is enabled to validate certificate status

#### b. Private Key Protection  
* Private keys are readable only by `root`, with `chmod 600`
* Key types: RSA-2048 or ECDSA P-256 depending on configuration

#### c. Security Headers
* Strict-Transport-Security: `max-age=63072000; includeSubDomains; preload` (HSTS with subdomains and preload list)
* X-Content-Type-Options: `nosniff` (prevents MIME type sniffing)
* Referrer-Policy: `strict-origin-when-cross-origin` (controls referrer information leakage)
* All headers configured with `always` parameter to ensure they're sent with all responses

---

## 2. Frontend (React + TypeScript)

### 2.1 Certificate Verification Utility  
`frontend/src/utils/certificateValidator.ts`

| Feature              | Function                           | Input                              | Output             |
|----------------------|------------------------------------|------------------------------------|--------------------|
| Certificate Verify   | `verifyCertificate()`              | Optional fingerprint & key hash    | Boolean            |
| Domain Match         | `validateServerDomain()`           | –                                  | Boolean            |
| Trusted Domain Fetch | `getTrustedDomain()`               | –                                  | Trusted domain     |
| Connection Security  | `isConnectionSecure()`             | –                                  | Boolean            |
| Force HTTPS          | `enforceSecureConnection()`        | –                                  | Void (redirects)   |

### 2.2 Password Hashing & Transmission  
`frontend/src/utils/crypto.ts > CryptoService`, `frontend/src/api/auth.ts`

#### a. Password Hashing  
* Password is never transmitted in plaintext
* Client-side SHA-256 hashing via `generateHash1(password, salt)`
* Result is Base64-encoded and sent with flag `is_hashed: true`

#### b. Login Flow  
1. User enters credentials
2. `login()` fetches user's stored salt from server
3. `CryptoService.generateHash1(password, salt)` generates hash1
4. API request includes `{username, password: hash1, is_hashed: true}`
5. All transmitted over TLS-secured HTTPS connection

### 2.3 Transport Layer Security  
`frontend/src/api/client.ts`

#### a. API Client Security  
* All credentials and authentication data pass through `apiClient`, which attaches `Authorization` headers
* All requests pass through a pre-flight certificate validation (`verifyCertificate()`)
* If certificate verification fails, no credential is sent
* Axios client configured with `withCredentials: true` for secure cookie handling

#### b. Security Enforcements  
* `enforceSecureConnection()` is called on application initialization (`main.tsx`)
* Automatically redirects HTTP to HTTPS in production
* Validates domain name against trusted domain (`kang-mi.com`)
* Warns users if connection is not secure

---

## 3. TLS Process Overview

### 3.1 Server TLS Configuration

1. **Certificate Management**  
   * Let's Encrypt provides trusted certificates with 90-day validity
   * Auto-renewal via cron job every 12 hours
   * Nginx reload hook ensures seamless renewal without downtime

2. **Cipher Selection**  
   * Strong cipher suites with Perfect Forward Secrecy (PFS)
   * Preference for ECDHE over DHE for performance
   * ChaCha20-Poly1305 fallback for devices without AES hardware acceleration

3. **Security Headers**  
   * HSTS with long max-age (63072000 seconds = 2 years) with includeSubDomains and preload options
   * X-Content-Type-Options to prevent MIME type sniffing attacks
   * Strict Referrer Policy to control information leakage
   * OCSP stapling for certificate validity checks
   * Session cache configured, session tickets disabled

### 3.2 Client Security Enforcement

1. **Certificate Verification**  
   * Browser's built-in certificate validation
   * Additional domain verification via `validateServerDomain()`
   * Certificate pinning via hardcoded or environment-injected fingerprints

2. **HTTP-to-HTTPS Redirection**  
   * Server-side: 301 redirect from HTTP to HTTPS
   * Client-side: `enforceSecureConnection()` as secondary protection
   * HSTS header for browser-enforced HTTPS-only access

3. **Password Protection**  
   * Password hashed (SHA-256) before transmission
   * Hash transmitted over HTTPS only
   * Salt fetched from server over HTTPS connection

---

## 4. Q&A: Why Password Transmission Is Secure (10 marks)

### 4.1 Security Measures

* **TLS 1.2+**: All traffic encrypted using modern TLS protocols with strong cipher suites
* **Client-side hashing**: Passwords are never transmitted in plaintext, but pre-hashed with SHA-256
* **Secure headers**: HSTS enforces HTTPS for all future connections, preventing downgrade attacks
* **Certificate validation**: Pre-flight verification ensures connection to legitimate server
* **Perfect Forward Secrecy**: Compromise of server key doesn't expose previously captured traffic
* **Separate authorization**: JWT tokens used post-authentication, limiting password transmission frequency

### 4.2 Threat Mitigation

| Threat                   | Mitigation                                                |
| ------------------------ | --------------------------------------------------------- |
| Man-in-the-middle (MITM) | TLS + cert validation + HTTPS-only + certificate pinning  |
| Plaintext interception   | Pre-transmission SHA-256 hashing                          |
| Downgrade attack         | HSTS + client-side HTTPS enforcement                      |
| Replay attacks           | Server-side salt + JWT with expiration                    |
| Impersonation            | Certificate validation against trusted domain             |
| Weak ciphers             | Strong cipher suite configuration                         |

### 4.3 Multi-layered Protection

Our password transmission implements defense in depth with multiple protective layers:

1. **Transport Layer**: TLS 1.2/1.3 with PFS ciphers
2. **Application Layer**: SHA-256 hashing before transmission
3. **Policy Layer**: HSTS, certificate validation, API client security checks
4. **Authentication Design**: Password only sent during login, JWT used thereafter

Even if an attacker could somehow break one layer (e.g., compromising TLS), they would still only obtain a hash, not the original password. This multi-layered approach ensures that passwords are always transmitted securely, in compliance with modern security requirements.

---

## 5. Sequence Diagram: Secure Login Transmission

```
Browser:
  User enters password
  ↓
Frontend:
  Salt = getUserEncryptionSalt(username)
  hash1 = CryptoService.generateHash1(password, salt)
  ↓
verifyCertificate():
  Check TLS, domain, fingerprint
  ↓
HTTPS:
  POST /api/auth/login
  Body: { username, password: hash1, is_hashed: true }
  ↓
Server:
  Compare hash1 → authenticate → return JWT
```

---

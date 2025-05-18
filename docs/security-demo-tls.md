# Server Certificate Verification Implementation (INFO2222-group Project)

---

## 1. Backend (Flask + Nginx)

### 1.1 Certificate Configuration  
File: `/etc/nginx/sites-available/chat` (Nginx config)  
* **Certificate Path**: Managed by Let's Encrypt, located at `/etc/letsencrypt/live/kang-mi.com/`, including:
  * `fullchain.pem` - Server + intermediate certificate chain
  * `privkey.pem` - Private key  
* **TLS Settings**:
  * Enables TLS 1.2 and 1.3
  * Disables insecure protocol versions
  * Configures secure cipher suites (ECDHE-ECDSA and ECDHE-RSA families)
  * Sets session cache and timeout
  * Disables session tickets
  * Enables HSTS header (`max-age=63072000`)

### 1.2 Certificate Renewal Mechanism  
File: `/etc/cron.d/certbot` (system cron job)  
* **Auto-Renewal**: Let's Encrypt certificates are valid for 90 days. A cron job checks for renewal every 12 hours with random delay to avoid load spikes.
* **Post-Renewal**: Uses `--post-hook` to reload Nginx after renewal without downtime.

### 1.3 Security Controls

#### a. OCSP Stapling  
Enabled in Nginx to pre-fetch and serve OCSP responses, speeding up client validation. It validates stapled responses and sets the trusted chain.

#### b. Private Key Protection  
* **File Permissions**: Private key is owned by root with chmod 600.
* **Key Types**: Uses RSA-2048 or ECDSA P-256 depending on configuration.

#### c. HTTPS Enforcement  
All HTTP requests are permanently redirected to HTTPS using a separate server block on port 80 (301 redirect).

---

## 2. Frontend (React + TypeScript)

### 2.1 Utility Layer  
`frontend/src/utils/certificateValidator.ts`

| Purpose                  | Function                         | Input                        | Output                     |
|--------------------------|----------------------------------|------------------------------|-----------------------------|
| Certificate verification | `verifyCertificate()`           | Optional fingerprint/pubkey | Boolean (pass/fail)        |
| Domain verification      | `validateServerDomain()`        | –                            | Boolean                    |
| Get trusted domain       | `getTrustedDomain()`            | –                            | Trusted domain string      |
| Fingerprint comparison   | `compareCertificateFingerprint()`| Certificate, expected value | Boolean (match or not)     |

### 2.2 API-Level Verification  
`frontend/src/api/apiClient.ts`

#### a. Request Interceptor  
All API requests go through an interceptor that performs server certificate verification.  
`apiClient.interceptors.request` checks if running in production and secure mode. If not previously verified, it calls `verifyCertificate()` and caches the result. On failure, it throws an error. Also sets auth tokens.

#### b. Pre-Login Validation  
`frontend/src/api/auth.ts > login()`  
Before submitting credentials, `verifyCertificate()` is called. If it fails, request is aborted. On success, password hash is generated and sent with `is_hashed: true`.

### 2.3 Certificate Verification Logic  
`frontend/src/utils/certificateValidator.ts`

#### a. Core Validation Function  
`verifyCertificate()`:
* Returns `true` immediately in development or non-HTTPS.
* Calls `validateServerDomain()` to check hostname.
* Makes a test `fetch` request to the trusted domain (HEAD + no-cors + timeout).
* Due to browser restrictions, no direct access to certs, so validation is indirect.
* If request succeeds → returns `true`; else → logs and returns `false`.

#### b. Domain Matching  
`validateServerDomain()` compares `window.location.hostname` to trusted domain from env or default `'kang-mi.com'`.

#### c. Build-Time Certificate Pinning  
`frontend/scripts/build-production.sh` injects environment variables:
- `VITE_SECURE_MODE`
- `VITE_CERT_FINGERPRINT`
- `VITE_PUBLIC_KEY_HASH`
- `VITE_TRUSTED_DOMAIN`  
These are stored in `.env.production.local` for runtime access.

---

## 3. Server Certificate Generation Process

### 3.1 Let's Encrypt Issuance Flow

#### a. Issuance Steps  
Install Certbot and Nginx plugin, run `certbot` with desired domain. Check with `certbot certificates`.

#### b. ACME Protocol Validation
1. **Request**: Certbot registers with Let's Encrypt
2. **Challenge**: Token placed in `.well-known/acme-challenge/`
3. **Authorization**: Let's Encrypt verifies domain control
4. **Issuance**: On success, cert is returned
5. **Deployment**: Installed in Nginx and auto-configured

### 3.2 Certificate Chain and Structure

#### a. Let's Encrypt Chain  
Structure: Root (ISRG Root X1/X2) → Intermediate (R3) → Leaf (kang-mi.com)

#### b. File Location  
Stored in `/etc/letsencrypt/live/kang-mi.com/`, includes:
- `cert.pem`: Server certificate
- `chain.pem`: Intermediate cert
- `fullchain.pem`: cert.pem + chain.pem
- `privkey.pem`: Private key

### 3.3 Auto-Renewal

* **Validity**: 90 days
* **Renewal**: Every 12 hours via cron; renews if <30 days left
* **Dry Run**: `certbot renew --dry-run` for testing
* **Zero Downtime**: Post-renew hook reloads Nginx seamlessly

---

## 4. Questions & Justifications

### 4.1 How Does the Client Validate the Server Certificate? (10 marks)

* **Implementation**:
  * API requests go through `apiClient.interceptors.request`
  * Critical actions like login/registration call `verifyCertificate()` before sending credentials
  * Uses Certificate Pinning for extra security

* **Validation Methods**:
  * **Domain Check**: Match current hostname with trusted domain
  * **Protocol Check**: Must use HTTPS
  * **Fingerprint & Public Key Hash Check**: Compared with injected env values

* **Security Features**:
  * **Mandatory Verification**: Blocks credentials if verification fails
  * **Cached Result**: Avoids redundant checks
  * **Hardcoded Values**: Prevents MITM and DNS poisoning
  * **SSL Downgrade Prevention**: Enforces HTTPS

* **Error Handling**:
  * Clear messages when verification fails
  * Blocks unsafe requests
  * Detailed logging for debugging

### 4.2 Security of Hardcoded CA Public Key & Certificate Issuance (10 marks)

* **Security Benefits**:
  1. Prevents MITM even with valid rogue certs
  2. Isolates CA compromise risks
  3. Explicit trust model (only selected certs allowed)
  4. Pinning allows cert validation without trust chain

* **Challenges**:
  1. Cert rotation requires front-end updates
  2. Complex deployment: build-time injection
  3. Emergency revocation is hard to propagate
  4. Initial trust setup remains a challenge
  5. Must sync cert and app deployments

* **Certificate Issuance Flow**:
  1. **CA**: Let’s Encrypt (free, automated)
  2. **Key Pair**: Domain key generated
  3. **CSR**: Certificate Signing Request created
  4. **Validation**: ACME via HTTP-01 or DNS-01
  5. **Issuance**: Cert issued after verification
  6. **Deployment**: Installed in Nginx
  7. **Auto-Renew**: Cron jobs keep cert up-to-date

* **Let's Encrypt Hierarchy**:
  - **Root**: ISRG Root X1/X2 (30 years)
  - **Intermediate**: R3 (5 years)
  - **Leaf**: kang-mi.com (90 days)

* **Solutions for Rotation**:
  1. Use **public key hash** (remains stable even after cert change)
  2. Integrate rotation into CI/CD
  3. Add **in-app update mechanism** for fingerprint

---

## 5. Certificate Verification Sequence Diagram

1. Production API Request Flow
   ```
   Browser:
     Initiates API request
     ↓
   API Interceptor:
     Checks if certificate verified
     If not, runs verifyCertificate:
       Validate domain
       Ensure HTTPS
       Trigger browser verification via HEAD request
       Compare pinned fingerprint + public key hash
     On failure: throw error and abort
     On success: cache result and continue
     ↓
   Server:
     Processes request and returns response
   ```

2. Login with Certificate Validation
   ```
   Browser:
     User enters credentials
     ↓
   login() function:
     Calls verifyCertificate()
     If fails → throw error
     If success → generate hash1(password+salt)
     POST username + hash1 via HTTPS
     ↓
   Server:
     Authenticates and returns JWT
   ```

3. Certificate Renewal Process
   ```
   Cron job:
     Runs certbot every 12 hours
     If <30 days remaining → renew
     ↓
   Let’s Encrypt:
     Validates domain via ACME
     Issues new cert
     ↓
   Certbot:
     Deploys new cert
     Reloads Nginx via post-hook
     ↓
   Frontend:
     On next build → inject new fingerprint + pubkey hash
   ```

---

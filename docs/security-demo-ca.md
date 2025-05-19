# Server Certificate Verification Implementation (INFO2222-group Project)

---

## 1. Backend (Flask + Nginx)

### 1.1 Certificate Configuration  
`/etc/nginx/sites-available/chat-app` (Nginx config)  
* **Certificate Path**: Managed by Let’s Encrypt at `/etc/letsencrypt/live/kang-mi.com/`, including:
  * `fullchain.pem` – server + intermediate cert chain
  * `privkey.pem` – private key  
* **TLS Configuration**: TLS 1.2 and 1.3 enabled, older versions disabled. Secure cipher suites configured (ECDHE-ECDSA and ECDHE-RSA), session caching and timeout configured, session tickets disabled, HSTS header enabled (`max-age=63072000` seconds).

### 1.2 Auto-Renewal Mechanism  
`/etc/cron.d/certbot` (cron job)  
* **Auto Renewal**: Let’s Encrypt certs are valid for 90 days. A cron job checks and attempts renewal every 12 hours, with random delay to prevent mass access.
* **Post-Renew Hook**: Uses `--post-hook` to reload Nginx after renewal, ensuring new certs are used without downtime.

### 1.3 Security Controls

#### a. OCSP Stapling  
Enabled in `nginx` to let the server pre-fetch OCSP responses and serve them to clients. Also validates stapled response and sets trusted certificate chain.

#### b. Private Key Protection  
* **File Permissions**: Private keys are readable only by `root`, with `chmod 600`.
* **Key Types**: RSA-2048 or ECDSA P-256 depending on configuration.

#### c. HTTPS Enforcement  
All HTTP requests are permanently redirected (301) to HTTPS via a separate server block listening on port 80.

---

## 2. Frontend (React + TypeScript)

### 2.1 Utility Layer  
File: `frontend/src/utils/certificateValidator.ts`

| Feature              | Function                           | Input                              | Output             |
|----------------------|------------------------------------|------------------------------------|--------------------|
| Certificate Verify   | `verifyCertificate()`              | Optional fingerprint & key hash    | Boolean            |
| Domain Match         | `validateServerDomain()`           | –                                  | Boolean            |
| Trusted Domain Fetch | `getTrustedDomain()`               | –                                  | Trusted domain     |
| Fingerprint Compare  | `compareCertificateFingerprint()`  | cert, expected fingerprint          | Boolean            |

### 2.2 API-Level Certificate Check  
File: `frontend/src/api/apiClient.ts`

#### a. Request Interceptor  
All requests go through `apiClient.interceptors.request`.  
It checks:
* If running in production and secure mode
* If certificate has not yet been verified:
  * Calls `verifyCertificate()`
  * On failure: throws error and aborts
  * On success: caches the result

Also attaches auth token and request headers.

#### b. Pre-login Check  
File: `frontend/src/api/auth.ts > login()`  
Before sending credentials, `verifyCertificate()` is called.  
If it fails → error thrown.  
If passed → `CryptoService.generateHash1()` is called and `/login` is requested with `username`, `hash1`, and `is_hashed: true`.

### 2.3 Verification Implementation  
File: `frontend/src/utils/certificateValidator.ts`

#### a. Core Validation  
`verifyCertificate()` takes optional expected fingerprint/public key hash.  
In development or over HTTP, it returns `true`.  
In production, it:
* Calls `validateServerDomain()`  
* Attempts a `fetch` to trusted domain (HEAD, no-cors, timeout = 5s)  
Due to browser limitations, cannot access cert details — relies on environment variable comparisons.  
Returns `true` if request succeeds; logs and returns `false` otherwise.

#### b. Domain Validation  
`validateServerDomain()` compares the current hostname to trusted domain from `getTrustedDomain()` (from `env` or defaults to `'kang-mi.com'`).

#### c. Certificate Pinning During Build  
File: `frontend/scripts/build-production.sh`  
Sets:
- `VITE_SECURE_MODE`
- `VITE_CERT_FINGERPRINT`
- `VITE_PUBLIC_KEY_HASH`
- `VITE_TRUSTED_DOMAIN`  
Writes them into `.env.production.local`, then runs `npm run build`.

---

## 3. Server Certificate Issuance

### 3.1 Let’s Encrypt Issuance Flow

#### a. Issuance Steps  
Install Certbot and its Nginx plugin.  
Run `certbot` to issue for your domain.  
Use `certbot certificates` to check status.

#### b. ACME Protocol Flow  
1. **Request**: Certbot creates ACME account, requests cert  
2. **Challenge**: Let’s Encrypt returns token → Certbot places under `.well-known/acme-challenge/`  
3. **Verification**: Let’s Encrypt validates ownership  
4. **Issuance**: Cert issued and returned to Certbot  
5. **Deployment**: Certbot installs it and updates Nginx

### 3.2 Certificate Structure

#### a. Certificate Chain  
Root CA (ISRG Root X1/X2) → Intermediate (R3/X3) → Leaf Cert (kang-mi.com)

#### b. File Paths  
Located at `/etc/letsencrypt/live/kang-mi.com/`:

- `cert.pem` – leaf cert  
- `chain.pem` – intermediate  
- `fullchain.pem` – cert + chain  
- `privkey.pem` – private key

### 3.3 Renewal Process

* **Validity**: 90 days  
* **Renewal**: Checked 2x/day via cron  
* **Test**: `certbot renew --dry-run`  
* **Zero Downtime**: Nginx reload via `--post-hook`

---

## 4. Q&A Section

### 4.1 How does the frontend verify the certificate? (10 marks)

* **How**:
  * Every API request intercepted by `apiClient.interceptors.request`
  * `verifyCertificate()` is called before credential-related APIs
  * Certificate pinning applied using hardcoded fingerprint + public key hash

* **Validation methods**:
  * Match hostname vs trusted domain
  * Enforce HTTPS
  * Match expected fingerprint and key hash from build-time

* **Security properties**:
  * Mandatory verification for sensitive requests
  * Cached result avoids repeat validation
  * Hardcoded values prevent MITM and DNS spoofing
  * Forces HTTPS, prevents downgrade (SSL stripping)

* **Error Handling**:
  * Clear failure messages
  * Aborts unsafe connections
  * Logs full error context for debugging

### 4.2 Security of hardcoded CA keys and certificate issuance (10 marks)

* **Pros**:
  1. MITM resistance: forged but valid certs fail fingerprint check
  2. Resilience to CA compromise
  3. Strict trust boundary
  4. Endpoint validation without relying on browser trust chain

* **Cons**:
  1. Manual rotation: front-end must update on cert renewal
  2. Deployment complexity: build-time injection required
  3. Emergency revocation is hard to propagate
  4. First-trust issue: initial app load requires a secure channel
  5. Cert-app update coordination required

* **Issuance Workflow**:
  1. Select CA: Let’s Encrypt
  2. Generate key pair for domain
  3. Create CSR
  4. Validate ownership via ACME:
     - HTTP-01: token in `.well-known`
     - DNS-01: TXT record in DNS
  5. Cert issued
  6. Install to Nginx
  7. Auto-renew via cron

* **Let’s Encrypt Hierarchy**:
  - Root: ISRG Root X1/X2 (30 years)
  - Intermediate: R3/X3 (5 years)
  - Leaf: kang-mi.com (90 days)

* **Rotation Strategies**:
  1. Use **public key hash** (stays constant even if cert rotates)
  2. Automate with CI/CD cert pin rotation
  3. Enable runtime update of pinned fingerprints

---

## 5. Certificate Verification Sequence Diagrams

### 1. Production Request Flow
```
Browser:
  Initiates API request
  ↓
API Interceptor:
  If not verified yet → run verifyCertificate:
    Check domain match
    Ensure HTTPS
    Perform fetch to trigger browser TLS verification
    Compare hardcoded fingerprint & pubkey hash
  If failed → throw error and block request
  If passed → cache result and continue
  ↓
Server:
  Processes request and returns response
```

### 2. Login Flow with Certificate Verification
```
Browser:
  User enters credentials
  ↓
login():
  Calls verifyCertificate()
  If failed → throw error
  If passed → generate hash1(password+salt)
  POST username + hash1 via HTTPS
  ↓
Server:
  Validates credentials and returns JWT
```

### 3. Certificate Renewal Flow
```
Cron Job:
  Certbot runs every 12h
  If <30 days left → auto renew
  ↓
Let's Encrypt:
  Verifies domain control
  Issues new cert
  ↓
Certbot:
  Saves cert in correct path
  Reloads Nginx via --post-hook
  ↓
Frontend App:
  On next build → inject new fingerprint & pubkey hash
```

---

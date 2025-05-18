# Password Storage and Verification Implementation (INFO2222-group Project)

---

## 1. Backend (Flask)

### 1.1 Configuration Constants  
`backend/config.py`  
* **PEPPER**: Environment variable `SECRET_PEPPER`, default value `random-pepper-value-for-password-hashing`. This is a fixed "pepper" that is never stored in the database.  
* **SECRET_KEY**: Used for JWT.  
* **DATABASE_PATH**: Path to SQLite file.

### 1.2 Database Schema  
`backend/models.py > DatabaseManager.init_db`  
* Creates table `users` with fields:
  * `password_hash`: stores the final bcrypt string  
  * `encryption_salt`: used to encrypt the user's private key  
* All SQL uses `?` placeholders to naturally prevent SQL injection.

### 1.3 Core Algorithm Flow

#### a. Preprocessing  
`backend/models.py > UserModel._preprocess_password`  
* Concatenates `hash1 + PEPPER` and hashes it again with **SHA-256**, resulting in a 64-character hex string, ensuring it's under bcrypt’s 72-byte limit.  
* Input: `password_with_pepper` (string)  
* Output: processed hex string

#### b. Registration  
`backend/models.py > UserModel.create_user`  
1. Receives **hash1** (SHA-256 + salt result) and `is_hashed=True` from frontend  
2. Concatenates `hash1 + PEPPER` → `_preprocess_password()` → `preprocessed_pwd`  
3. Calls `bcrypt.gensalt()` (default cost=12, random salt per user) → `bcrypt.hashpw()` → final **hash2**  
4. Stores `password_hash=hash2` and a randomly generated `encryption_salt = secrets.token_hex(16)`  
5. Upon success, returns a JWT

#### c. Login  
`backend/models.py > UserModel.authenticate_user`  
1. Takes **hash1**, concatenates PEPPER, applies SHA-256 again  
2. Compares with stored `password_hash` using `bcrypt.checkpw()`  
   * `checkpw()` is constant-time, resistant to timing attacks  
3. On success, updates `last_login` and returns user info (excluding `password_hash`)  
4. **Error handling**: Logs detailed errors and tries both:
   * Standard verification: preprocessed hash1 vs stored bcrypt hash  
   * Fallback: raw comparison (for legacy users), if matched, user is warned

#### d. Password Change  
`backend/models.py > UserModel.change_password`  
* Requires old password + PEPPER to pass `bcrypt.checkpw()` before generating new hash2  
* This fallback path does not use hash1, but still relies on bcrypt securely

#### e. Salt Management  
`backend/app.py > get_user_encryption_salt`  
* **Auto-repair mechanism**: If user exists but lacks salt, a new one is generated  
* Uses `secrets.token_hex(16)` and saves to DB  
* Error handling covers both salt creation and retrieval

---

## 2. Frontend (React + TypeScript)

### 2.1 Utility Layer  
`frontend/src/utils/crypto.ts > CryptoService`

| Purpose                  | Function                          | Input                  | Output                          |
|--------------------------|-----------------------------------|------------------------|----------------------------------|
| Generate random salt     | `generateSalt()`                  | –                      | 16-byte hex string              |
| Serialize password       | `serializePassword()`             | password, salt         | Uint8Array                      |
| Generate **hash1**       | `generateHash1()`                 | password, salt         | Base64-encoded SHA-256          |
| Derive encryption key    | `generateEncryptionKey()`         | password, salt         | 32-byte Uint8Array              |
| Encrypt / Decrypt key    | `encryptPrivateKey()` / `decryptPrivateKey()` | privateKey / blob | encrypted blob / original key   |

### 2.2 API Layer  
`frontend/src/api/auth.ts`

#### a. register()  
1. Call `generateSalt()` → store `salt`  
2. `generateHash1(password, salt)` → `hash1`  
3. Generate E2EE keypair, encrypt private key with `encryptionKey`  
4. POST to `/register` with `{ password: hash1, is_hashed: true }`  
5. After receiving JWT, POST `publicKey`, `encryptedPrivateKey`, and `salt` to relevant APIs

#### b. login()  
1. GET `/api/user/encryption-salt/<username>` → get `salt`  
2. `generateHash1(password, salt)` → `hash1`  
3. POST to `/login` with `is_hashed: true`  
4. After JWT is returned, fetch and decrypt encrypted private key using `decryptPrivateKey()`  
5. **Auto-decrypt**: Upon login, decrypted keypair is stored in memory for secure messaging

> So the frontend never sends raw passwords — only **hash1**.

### 2.3 Message Encryption and Self-Copy
`frontend/src/pages/chat/index.tsx > handleSend`

1. **Self-copy mechanism**:  
   * Encrypt message with recipient's public key  
   * Also encrypt with sender’s public key (for backup)  
   * Send both messages using `sendEncryptedMessage()`  
   * Ensures sender can view their sent messages even from other devices

2. **Error Handling**:  
   * If self-copy fails, log error but allow main message to send

---

## 3. Flow of Key Variables in the System

1. **password (plaintext)**  
   Stays in browser memory only, discarded immediately

2. **salt**  
   * Generated: `generateSalt()` (16-byte hex)  
   * Stored: `users.encryption_salt` (backend) and cached in localStorage  
   * **Auto-recovery**: If missing, server generates and fills it

3. **hash1**  
   * Generated: SHA-256(password + salt)  
   * Sent via HTTPS in `/register` or `/login`  
   * Never stored in DB or browser

4. **PEPPER**  
   * Stored only in server memory and env vars — never sent or stored externally

5. **hash2 (password_hash)**  
   * Created: `bcrypt(hash1 + PEPPER)`  
   * Stored in `users.password_hash`, format: `$2b$12$...`

6. **Private / Public Key**  
   * Generated by `generateKeyPair()` (libsodium)  
   * Private key encrypted with `encryptionKey + nonce`  
   * Stored using `/api/keys` into `user_keys` table

7. **encryptionKey**  
   * Derived from SHA-256(password + salt), first 32 bytes  
   * Lives in browser memory only — never stored

---

## 4. Questions & Justifications

### 4.1 Why bcrypt? (10 marks)

* **Algorithm**: bcrypt (`hashpw` + `checkpw`)  
* **Security**:
  - Slow, CPU-bound, tunable cost (default 12)
  - Random salt built-in
  - `checkpw()` is constant-time
* **Reasons for selection**:
  - Stronger than MD5/SHA-1, non-reversible
  - Mature native Python support
  - No GPU/memory dependency (vs Argon2)
* **Config**:
  - `bcrypt.gensalt()` used without params = cost=12
  - Use `gensalt(rounds=N)` for tuning
  - Acceptable latency: 250–500ms (raise to 13–14 for more security if needed)
* **Modern attack defense**:
  - Rainbow tables ineffective due to salt + pepper
  - Slow hashing thwarts brute force & GPU

### 4.2 Salting Approach (10 marks)

* **Salt generation**:
  - `bcrypt.gensalt()` uses `os.urandom()`
  - Also uses `secrets.token_hex(16)` for private key encryption
* **Uniqueness**: each user gets a new salt; embedded in `password_hash`  
* **Length**: bcrypt salt is 16 bytes; `encryption_salt` is 32-char hex (16 raw bytes)  
* **Rainbow table resistance**: random salt + hash1 + pepper = strong  
* **Security Enhancements**:
  - Uses `checkpw()` (constant-time)
  - Pepper hidden in env vars
* **Extra**:
  - Frontend never sends plaintext
  - SQL is parameterized to prevent hash theft

### 4.3 Implementation Challenges & Tradeoffs

* **72-byte bcrypt limit**: handled via `_preprocess_password()`  
* **Client Compatibility**:
  - Legacy clients send plaintext, new ones send hash1
  - Dual path logic in `authenticate_user()` based on `is_hashed`
  - Logs both attempts for transparency
* **Performance vs Security**:
  - Cost=12 offers good balance
  - Added pepper & SHA layer slightly increase complexity, but negligible delay

---

## 5. Full Register / Login Sequence

1. Registration  
   ```
   Browser:
     password → generateSalt() → salt
     password+salt → SHA-256 → hash1
     POST /register(hash1, is_hashed)
   Server:
     hash1+PEPPER → SHA-256 → bcrypt(gensalt) → hash2
     INSERT users(password_hash=hash2, encryption_salt=salt)
     return JWT
   ```

2. Login  
   ```
   Browser:
     GET /user/encryption-salt → salt (auto-created if missing)
     password+salt → SHA-256 → hash1
     POST /login(hash1, is_hashed)
   Server:
     hash1+PEPPER → SHA-256 → check against hash2
     return JWT
   Browser:
     use JWT to fetch and decrypt encrypted private key
     decrypted key pair saved in memory
   ```

3. Message Sending (E2EE)  
   ```
   Browser:
     fetch recipient's public key
     fetch sender's own public key
     encrypt message → encryptedContent
     encrypt copy for self → selfEncryptedContent
     POST /messages to recipient
     POST /messages to self
   ```

---

## 6. Additional Notes

* All private key encryption, decryption, and messaging use `libsodium` (`tweetnacl`)  
* Password validation currently only enforces minimum length — regex can be added for stricter policy  
* **Salt auto-repair mechanism** improves system resilience under migration/failure  
* **Self-copy mechanism** ensures E2EE users can view their own sent messages on any device

---
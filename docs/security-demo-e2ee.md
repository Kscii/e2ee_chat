# End-to-End Encrypted Communication Implementation (INFO2222-group Project)

---

## 1. Backend (Flask)

### 1.1 Configuration and DB Schema  
`backend/models.py > DatabaseManager.init_db`  
* **Key Storage**: Table `user_keys` holds:
  * `public_key`: User's public key (stored in plaintext)
  * `encrypted_private_key`: Private key encrypted with a key derived from user password (server cannot decrypt)
* **Message Tables**:
  * `messages` and `group_encrypted_messages` store encrypted messages
  * All message content is stored encrypted; server cannot access plaintext
  * Private and group messages are separated but structurally similar

### 1.2 User Key APIs  
`backend/app.py`

#### a. Public Key  
* **Store**: `/api/keys/public` (JWT-protected)  
* **Get**: `/api/keys/public/<username>` – public keys are public  
* **Use**: Enables others to encrypt messages to this user

#### b. Encrypted Private Key  
* **Store**: `/api/keys/private` (JWT-protected)  
* **Get**: `/api/keys/private` – self-only access  
* **Security**: Encrypted on client side using key derived from password; server never sees plaintext

### 1.3 Message Transfer APIs

#### a. Private Messages  
`/api/messages`  
* **POST**: Send encrypted message (`receiver`, `content`, `is_encrypted`)  
* **GET**: List messages by sender/receiver (encrypted)  
* Server is blind – only stores and forwards

#### b. Group Messages  
`/api/group/encrypted-messages`  
* **POST**: One message → multiple encrypted copies (one per recipient)  
* **GET**: Fetch only decryptable messages for the current user  
* Each recipient gets their own copy encrypted with their key

---

## 2. Frontend (React + TypeScript)

### 2.1 Key Generation & Management  
`frontend/src/utils/crypto.ts > CryptoService`

| Purpose           | Function               | Input                     | Output                     |
|-------------------|------------------------|----------------------------|-----------------------------|
| Generate Key Pair | `generateKeyPair()`    | –                          | X25519 key pair             |
| Serialize Keys    | `keyPairToString()`    | Binary keys                | Base64 strings              |
| Encrypt Key       | `encryptPrivateKey()`  | Private key + password     | JSON encrypted blob         |
| Decrypt Key       | `decryptPrivateKey()`  | Encrypted blob + password  | Private key (Base64)        |
| Init Keys         | `initializeKeyPair()`  | Password                   | Full key pair               |

### 2.2 Message Encryption  
Functions: `encryptMessage()` & `decryptMessage()`

#### a. Encryption  
1. Input: plaintext, recipient pubkey, sender privkey  
2. Generate 24-byte nonce  
3. Use TweetNaCl `box()` to encrypt  
4. Output: nonce + ciphertext (Base64)

#### b. Decryption  
1. Input: Base64 message, sender pubkey, receiver privkey  
2. Extract nonce + ciphertext  
3. Use `box.open()`  
4. Return plaintext or `null` on failure

### 2.3 Key Recovery  
`frontend/src/contexts/CryptoContext.tsx`

#### a. Local-First Strategy  
On login:
1. Check `localStorage`  
2. If not found → fetch encrypted private key from server  
3. Decrypt with password → get key pair  
4. Fallback: generate new key pair if recovery fails

#### b. Auto-Recovery Use Cases  
* Switching devices  
* Clearing cache  
* Account switching in same browser  
* Multi-browser login support

### 2.4 Self-Copy Mechanism  
`frontend/src/pages/chat/index.tsx`

#### a. Dual-Encrypted Private Messages  
1. Encrypt for recipient using their pubkey  
2. Encrypt for self using own pubkey  
3. Send both copies via `sendEncryptedMessage()`

#### b. Multi-Encrypted Group Messages  
1. Fetch all group members' public keys  
2. Encrypt same message for each member  
3. Send all encrypted copies  
4. Only target member can decrypt their copy

---

## 3. E2EE Process Overview

### 3.1 Key Lifecycle

1. **Generation**  
   * On signup/login → generate X25519 key pair (TweetNaCl)  
   * Encrypt private key with password-derived key (XSalsa20-Poly1305)

2. **Storage**  
   * **Browser**: cached in `localStorage`  
   * **Server**:
     - `user_keys.public_key` (plaintext)
     - `user_keys.encrypted_private_key` (encrypted JSON blob)

3. **Recovery**  
   * Check `localStorage`  
   * If missing: fetch from server and decrypt using password  
   * If failed: generate new key pair

### 3.2 Message Encryption Flow

1. **Private Message**  
   * Encrypt message using NaCl `box()`  
   * Sender privkey + recipient pubkey → shared key  
   * Self-copy encrypted using sender pubkey

2. **Group Message**  
   * Encrypt for each member with their pubkey  
   * Batch send all encrypted messages

3. **Authentication & Integrity**  
   * XSalsa20-Poly1305 provides MAC  
   * MAC checked during decryption – tampered messages are rejected

---

## 4. Q&A

### 4.1 Proof of E2EE Implementation (10 marks)

* **E2EE Guarantees**:
  - Keys generated only in browser
  - Private key encrypted with password-derived key before storage
  - Server cannot read message content
  - Shared key (X25519) known only to sender & recipient
  - Each group member gets a uniquely encrypted copy

* **Strengths**:
  - Forward secrecy via random nonce
  - Scalable to any number of chats/groups
  - Multi-device support
  - Seamless UX with automatic key recovery
  - Strong authentication via MAC

* **Weaknesses**:
  - Depends on password strength
  - No perfect forward secrecy across messages
  - Metadata (sender, receiver, timestamp) is visible
  - Relies on server to route messages
  - Trusts server not to tamper with key pairs

* **Future Improvements**:
  - Implement Double Ratchet (Perfect Forward Secrecy)
  - Encrypt metadata
  - Use Zero-Knowledge Proofs for authentication

### 4.2 Design Tradeoffs in Key Recovery

* **UX Considerations**:
  - Users often switch devices / clear cache
  - Losing private key = lost messages
  - Manual backup is not user-friendly
  - Needed balance between security and usability

* **Chosen Design**:
  - Started with manual export/import → error-prone
  - Final: store encrypted private key on server (only decryptable with password)
  - Server cannot decrypt, but client can recover across devices

* **Use Cases**:
  - Multi-device, multi-browser
  - Cache cleared: still recoverable
  - Password change: re-encrypt private key

* **Backup Tradeoff**:
  - Removed download-backup feature after testing
  - Too complex and error-prone for most users
  - Login-based automatic recovery chosen
  - Manual backup option still available for advanced users

* **Security Safeguards**:
  - Private key always encrypted in transit/storage
  - Strong password requirements
  - Regular password update reminders
  - Uses XSalsa20-Poly1305 for authenticated encryption

---

## 5. Full E2EE Sequence Diagram

### 1. Key Generation
```
Browser:
  Signup → generateKeyPair()
  Derive encryptionKey from password + salt
  Encrypt privateKey with encryptionKey
  ↓
HTTPS:
  POST /api/keys/public
  POST /api/keys/private
  ↓
Server:
  Store public key
  Store encrypted private key
```

### 2. Key Recovery
```
Browser:
  After login → check localStorage
  If missing → initializeKeyPair()
  ↓
HTTPS:
  GET /api/keys/private
  GET /api/keys/public/username
  ↓
Browser:
  Derive encryptionKey from password
  Decrypt privateKey → build key pair
  Cache in localStorage
```

### 3. Private Message Encryption
```
Browser:
  compose → handleSend()
  Get recipient pubkey, own privkey
  Encrypt for recipient
  Encrypt self-copy
  ↓
HTTPS:
  POST /api/messages (to recipient)
  POST /api/messages (to self)
  ↓
Server:
  Stores encrypted messages
  Recipient can fetch/decrypt their copy
```

### 4. Group Message Encryption
```
Browser:
  compose → sendEncryptedGroupMessage()
  Get all member public keys
  Encrypt for each member (incl. self)
  ↓
HTTPS:
  POST /api/group/encrypted-messages
  ↓
Server:
  Stores one encrypted copy per member
  ↓
Clients:
  Fetch only decryptable messages
  Use own private key to decrypt
```

---

# INFO2222-Group

> A secure, modern and customizable web chat platform built with React, TypeScript, and Flask.


## Project Stack

<div align="center">
<img src="https://img.shields.io/badge/node-18.x-brightgreen" />
<img src="https://img.shields.io/badge/python-3.12-blue" />
<img src="https://img.shields.io/badge/Flask-2.2-lightgrey" />
<img src="https://img.shields.io/badge/Database-SQLite-lightblue" />
<img src="https://img.shields.io/badge/TypeScript-4.9%2B-blue" />
<img src="https://img.shields.io/badge/Vite-6.x-yellow" />
<img src="https://img.shields.io/badge/Ant%20Design-5.x-blueviolet" />
<img src="https://img.shields.io/badge/OpenAI-GPT--4o-ff69b4" />
<img src="https://img.shields.io/badge/Encryption-End--to--End-green" />
<img src="https://img.shields.io/badge/Password-bcrypt%20%2B%20pepper-informational" />
<img src="https://img.shields.io/badge/Auth-JWT-yellowgreen" />
<img src="https://img.shields.io/badge/HTTPS-enabled-brightgreen" />
<img src="https://img.shields.io/badge/TLS-1.3-blue" />
<img src="https://img.shields.io/badge/deploy-AWS%20EC2-orange" />
<img src="https://img.shields.io/badge/i18n-20%2B%20Languages-blue" />
</div>


## Project Overview

This is a secure, modern, and highly customizable web chat platform built with **React 18**, **TypeScript**, and a lightweight **Flask** backend.
It integrates AI assistance, end-to-end encryption, multi-service text-to-speech, rich-text messaging, and extensive internationalization support.
This README serves as the homepage of the GitHub repository and provides new contributors and users with a comprehensive understanding of the codebase.

Check out the **[kang-mi.com](https://kang-mi.com)**  
![Uptime](https://img.shields.io/uptimerobot/status/mg0jcmvKCH8)


## Key Features

1. **AI Assistant (OpenAI GPT-4o)** – Contextual replies, multilingual responses, and configurable API keys.
2. **End-to-End Encryption (E2EE)** – X25519 key exchange, XSalsa20 + Poly1305 authenticated encryption, with client-side key generation.
3. **Password Hardening** – Double hashing (SHA-256 on client ➜ bcrypt + pepper on server), per-user salt, no plaintext password storage.
4. **Group / Server System** – Discord-style servers and channels with user management APIs.
5. **Rich Text & File Sharing** – Markdown (Tiptap), syntax highlighting, image preview, and PDF/Office attachments under 10MB.
6. **Text-to-Speech (TTS)** – Native browser, Azure, Google Cloud, and **GPT-SoVITS** support with auto language detection and custom voices.
7. **Internationalization** – Supports 20+ languages (including Chinese, Japanese, French, Korean, Arabic, etc.) via i18next.
8. **Responsive UI** – Built with Ant Design 5 components, dark/light theme support, and mobile-first layout.
9. **Avatar & Profile Management** – Secure avatar upload API, editable profile, and real-time avatar refresh.
10. **Live2D Integration** – Interactive animated character models supporting Cubism 2/3/4 via [Live2dOnWeb](https://github.com/Konata09/Live2dOnWeb).
11. **Extensible Architecture** – Clear React Context-based state, RESTful Flask APIs (WebSocket support coming), and modular deployment scripts.

## Tech Stack

### Frontend

* React 18 + TypeScript + Vite 6
* Ant Design 5 UI component library
* React Router 6 and React Context for state management
* Encryption: tweetnacl / tweetnacl-util
* Rich text editor: **Tiptap** + lowlight/highlight.js
* HTTP: Axios (polling-based updates), with Socket.IO client included for future real-time support
* Internationalization: i18next + lazy-loaded JSON translations
* Code quality tools: ESLint 9 + typescript-eslint

### Backend

* Flask 2.2 with flask-cors
* SQLite (`sqlite3`) – no external dependencies
* Authentication: **JWT + bcrypt**
* Secure file uploads (Werkzeug), 5 MB size limit
* Configurable via `.env` and `backend/config.py`

### Deployment

* Production instance deployed on AWS EC2 ([kang-mi.com](https://kang-mi.com/))
* Nginx web server with HTTP/2 support
* SSL/TLS certificates provided by Let’s Encrypt with auto-renewal via Certbot
* Custom deployment scripts supporting CI/CD pipelines

## Repository Structure (Top-level)

```
INFO2222-group/
├── frontend/      # React application (see frontend/README.md for details)
├── backend/       # Flask API server
├── docs/          # Design and security documentation
└── README.md      # This file
```

## Security Design (Summary)

* **Double-hash Passwords**:
  `hash1 = SHA256(password+salt)` (client)
  `hash2 = bcrypt(hash1+pepper)` (server)
  Even if the database leaks, original passwords or private keys cannot be recovered.

* **Key Management**:
  Public keys are stored in `user_keys`; private keys are encrypted client-side using `hash1` before upload (optional cloud backup).

* **Message Flow**:

  1. Client fetches the recipient’s public key
  2. Generates X25519 shared key → encrypts message with XSalsa20/Poly1305
  3. Sends ciphertext via `/api/messages` (private) or `/api/group/encrypted-messages` (group)
  4. Recipient decrypts locally; the server never sees plaintext.

* **TLS Security**:

  1. Uses modern ciphers (ECDHE + AES-GCM / ChaCha20-Poly1305)
  2. Perfect forward secrecy via ephemeral key exchange
  3. HSTS enabled to prevent downgrade attacks
  4. HTTP/2 for efficient binary transmission

* **Certificate Management**:

  1. Server certificates issued by Let’s Encrypt (trusted CA)
  2. Client validates the server certificate chain before sending credentials
  3. Certificates auto-renew every 90 days via Certbot
  4. OCSP Stapling enabled for faster revocation checks

* See `docs/security-demo-e2ee.md` for a step-by-step walkthrough.

## Screenshots

![Login UI](https://i.imgur.com/yAOG1FN.png)

![Chat UI](https://i.imgur.com/DtSprxu.png)

## Installation & Setup

The following instructions are aligned with the current codebase. Frontend and backend can be launched separately or together via helper scripts.

### 1. Clone the repository

```bash
git clone https://github.sydney.edu.au/cran0556/INFO2222-group.git
cd INFO2222-group
```

### 2. Launch Frontend

```bash
cd frontend
npm install
npm run dev   # => http://localhost:5173
# For production: ./deploy.sh
```

(Optional) Configure API keys in `frontend/.env` or via the UI settings panel.

### 3. Launch Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
./restart.sh dev
# For production: ./restart.sh prod
```

Default API URL: `http://localhost:8000`

> For detailed deployment and CI setup, see `frontend/deploy.sh` and `docs/server_environment.md`.

## API Quick Reference

| Endpoint                        | Method   | Auth   | Description                            |
| ------------------------------- | -------- | ------ | -------------------------------------- |
| `/api/register`                 | POST     | –      | Create account (with double-hashing)   |
| `/api/login`                    | POST     | –      | Obtain JWT                             |
| `/api/user`                     | GET/PUT  | Bearer | Fetch or update user profile           |
| `/api/messages`                 | POST     | Bearer | Send encrypted private message         |
| `/api/messages/<username>`      | GET      | Bearer | Get conversation messages (paginated)  |
| `/api/group/encrypted-messages` | GET/POST | Bearer | Group chat operations                  |
| `/api/servers`                  | GET/POST | Bearer | Create, retrieve, or update server     |
| More…                           | –        | –      | See `backend/app.py` for all endpoints |

## Contributing

Pull requests are welcome!
Please read the `docs/security-demo-*` series before making changes to any cryptographic logic.

Before submitting:

1. Run `npm run lint` to ensure frontend code quality
2. Use clear, descriptive commit messages
3. Update i18n translation files if your changes affect UI text

## License

MIT © 2025 INFO2222 Group. See [LICENSE](./LICENSE) for details.

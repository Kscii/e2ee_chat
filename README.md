# E2EE Chat

> A secure full-stack chat platform with end-to-end encrypted messaging, hardened authentication, and deployable React + Flask architecture.

<div align="center">

![React](https://img.shields.io/badge/React-18-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6)
![Vite](https://img.shields.io/badge/Vite-6.x-646cff)
![Flask](https://img.shields.io/badge/Flask-2.2-lightgrey)
![SQLite](https://img.shields.io/badge/SQLite-embedded-003b57)
![JWT](https://img.shields.io/badge/Auth-JWT-yellowgreen)
![E2EE](https://img.shields.io/badge/Encryption-E2EE-green)
![TLS](https://img.shields.io/badge/TLS-1.2%2B-blue)
![License](https://img.shields.io/badge/License-MIT-blue)

</div>

E2EE Chat is a web-based communication system designed around privacy, secure authentication, and practical deployment. It combines a React/TypeScript frontend with a Flask backend, SQLite persistence, client-side cryptography, password hardening, TLS deployment notes, internationalization, and optional AI/TTS/Live2D enhancements.

The project was originally developed as a USyd INFO2222 group project. This public portfolio fork is maintained by **Xuejian Fang / Kscii** and is presented as an open-source codebase for security-focused full-stack collaboration software.

## Highlights

- **End-to-end encrypted messaging**: private and group messages are encrypted on the client using TweetNaCl X25519 public-key cryptography and XSalsa20-Poly1305 authenticated encryption.
- **Client-side key lifecycle**: users generate key pairs in the browser; public keys are stored server-side, while private keys are encrypted before upload for multi-device recovery.
- **Hardened password flow**: the browser sends a salted SHA-256-derived value, and the backend applies peppered SHA-256 preprocessing plus bcrypt storage.
- **JWT authentication**: protected Flask APIs use bearer tokens with expiry.
- **TLS and certificate checks**: production deployment documentation covers HTTPS, HSTS, Let's Encrypt certificates, Nginx reverse proxying, and frontend certificate/domain validation.
- **Discord-style collaboration model**: servers, channels, direct messages, group messages, avatars, file sharing, Markdown rendering, and responsive layouts.
- **Internationalized UI**: i18next locale files cover 16+ languages.
- **Optional AI and voice features**: OpenAI-assisted chat, multi-service text-to-speech configuration, and Live2D character integration are included as secondary experience layers.

## Architecture

```text
e2ee_chat/
├── frontend/      # React 18 + TypeScript + Vite application
├── backend/       # Flask API server, SQLite models, auth, messaging APIs
├── docs/          # Security walkthroughs, deployment notes, project reports
└── README.md
```

### Frontend

- React 18, TypeScript, Vite 6, React Router, Ant Design 5.
- State is organized through React Context providers for auth, crypto, API configuration, language, theme, AI, TTS, avatars, and server/channel state.
- `frontend/src/utils/crypto.ts` contains key generation, password-derived hashing, private-key encryption, and message encryption helpers.
- `frontend/src/utils/certificateValidator.ts` contains production connection checks used before sensitive API requests.

### Backend

- Flask 2.2 with `flask-cors`, PyJWT, bcrypt, and SQLite.
- `backend/models.py` defines users, messages, conversations, servers, groups, group members, user keys, and encrypted group message storage.
- `backend/app.py` exposes REST endpoints for registration, login, profile management, key storage/recovery, direct messages, group messages, server/channel operations, avatars, and uploads.
- Gunicorn + Nginx deployment notes are documented in `docs/server_environment.md`.

### Security Flow

1. During registration, the frontend generates a user-specific salt, derives a client-side password hash, creates an X25519 key pair, and encrypts the private key before upload.
2. The backend stores the peppered/bcrypted password verifier, public key, encrypted private key blob, profile data, and routing metadata.
3. When sending a message, the client fetches the recipient public key, encrypts locally, and sends ciphertext to the Flask API.
4. The server stores and forwards ciphertext; plaintext message content is only available on clients with the correct private key.

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+
- Python 3.12+

### Clone

```bash
git clone https://github.com/Kscii/e2ee_chat.git
cd e2ee_chat
```

### Frontend

```bash
cd frontend
npm install
cp src/config/apiConfig.ts.example src/config/apiConfig.ts
npm run dev
```

The frontend development server runs at `http://localhost:5173` by default.

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
./restart.sh dev
```

The backend API runs at `http://localhost:8000` by default.

## API Overview

| Endpoint | Method | Auth | Purpose |
| --- | --- | --- | --- |
| `/api/register` | POST | No | Create a user and return a JWT |
| `/api/login` | POST | No | Authenticate and return a JWT |
| `/api/user` | GET/PUT | Bearer | Fetch or update the current profile |
| `/api/user/encryption-salt/<username>` | GET/POST | Mixed | Fetch or set password/key derivation salt |
| `/api/keys/public` | GET/POST | Bearer | Manage the current user's public key |
| `/api/keys/public/<username>` | GET | No | Fetch another user's public key |
| `/api/keys/private` | GET/POST | Bearer | Store or recover encrypted private key blobs |
| `/api/messages` | GET/POST | Bearer | Send and fetch encrypted direct messages |
| `/api/group/encrypted-messages` | GET/POST | Bearer | Send and fetch per-recipient encrypted group messages |
| `/api/servers` | GET/POST | Bearer | Manage collaboration servers |

See `backend/app.py` for the complete route list.

## Documentation

- [End-to-end encryption walkthrough](docs/security-demo-e2ee.md)
- [Password storage and verification](docs/security-demo-password.md)
- [Secure password transmission and TLS](docs/security-demo-tls.md)
- [Certificate verification and CA discussion](docs/security-demo-ca.md)
- [Production server environment](docs/server_environment.md)
- [Phase 1 project report](docs/INFO2222_Group_Project_Part_1.pdf)
- [Phase 2 project report](docs/INFO2222_Group_Part_2.pdf)

## Screenshots

![Login UI](https://i.imgur.com/yAOG1FN.png)

![Chat UI](https://i.imgur.com/DtSprxu.png)

## Development Notes

- The frontend currently uses HTTP polling and REST endpoints for message updates. Socket.IO client dependencies exist for future realtime work, but realtime WebSocket delivery should be treated as a roadmap item unless implemented in the backend.
- The cryptographic design is suitable for demonstrating client-side encryption and secure storage tradeoffs. It does not yet implement Double Ratchet, metadata encryption, or cryptographic identity verification.
- The production examples reference the original demo deployment domain used during development. Configure your own domain, certificates, and trusted host values before deploying.

## Contributing

Issues and pull requests are welcome.

Before changing security-sensitive code, please read the E2EE, password, TLS, and certificate documentation in `docs/`. Changes to cryptographic flows should include a short design note explaining the threat model, migration impact, and manual test steps.

Suggested checks before opening a PR:

```bash
cd frontend && npm run lint
cd frontend && npm run build
python -m py_compile backend/*.py
```

## Attribution

E2EE Chat was originally developed as a USyd INFO2222 group project by the authors listed in the MIT license. This public portfolio fork is maintained by **Xuejian Fang / Kscii** and keeps collaborator attribution intact while documenting the project as an open-source secure communication system.

## License

MIT. See [LICENSE](./LICENSE) for details.

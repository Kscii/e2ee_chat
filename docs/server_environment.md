# Server Environment Documentation

## Basic Information

- **Operating System**: Ubuntu 24.04.2 LTS (Noble)
- **Kernel Version**: Linux 6.8.0-1024-aws #26-Ubuntu SMP
- **Architecture**: x86_64 (64-bit)

## Hardware Information

- **CPU**: Intel(R) Xeon(R) Platinum 8259CL CPU @ 2.50GHz
- **Memory**: Total 7.6GB, Available 5.3GB
- **Storage**:
  - Root Partition (/): 29GB total, 4.3GB used (16%)
  - Boot Partition (/boot): 881MB total, 137MB used (17%)
  - EFI Partition (/boot/efi): 105MB total, 6.1MB used (6%)

## Network Configuration

- **Primary Network Interface**: ens5 (IP: 172.31.14.84/20)
- **Listening Ports**:
  - 22 (SSH)
  - 80 (HTTP)
  - 443 (HTTPS)
  - 8000 (Gunicorn / Backend Application)
  - 53 (DNS)

## Software Environment

- **Python Version**: 3.12.3
- **Node.js Version**: v18.19.1
- **Nginx Version**: 1.24.0
- **Web Server**: Nginx (used as reverse proxy)
- **Application Server**: Gunicorn (4 worker processes)

## Application Deployment

### Backend

- **Framework**: Flask 2.2.3
- **Database**: SQLite (users.db)
- **Deployment Path**: `/home/ubuntu/INFO2222-group/backend/`
- **Execution Command**: Gunicorn with 4 workers, bound to 0.0.0.0:8000
- **Python Dependencies**:
  ```
  bcrypt==4.0.1
  click==8.2.0
  Flask==2.2.3
  Flask-Cors==3.0.10
  gunicorn==21.2.0
  itsdangerous==2.2.0
  Jinja2==3.1.6
  MarkupSafe==3.0.2
  packaging==25.0
  PyJWT==2.6.0
  python-dotenv==1.0.0
  six==1.17.0
  Werkzeug==2.2.3
  ```

### Frontend

- **Framework**: React 18.2.0
- **Build Tool**: Vite 6.2.0
- **Deployment Paths**:
  - Source Code: `/home/ubuntu/INFO2222-group/frontend/`
  - Static Files: `/var/www/chat-frontend/`
- **Vite Configuration**:
  - Base Path: Set via `VITE_BASE_PATH` environment variable, defaults to `'/'`
  - Dev Server: Host `0.0.0.0`, Port `5173`
  - Build Optimizations:
    - Code splitting by React, UI components, editor, i18n, utilities
    - Source maps enabled
    - Terser used for minification
- **Key npm Dependencies**:
  - **UI Framework**:
    - react: ^18.2.0
    - react-dom: ^18.2.0
    - react-router-dom: ^6.30.0
    - antd: ^5.24.3
  - **Editor Components**:
    - @tiptap extensions: ^2.11.5
  - **Networking**:
    - axios: ^1.9.0
    - socket.io-client: ^4.8.1
  - **Internationalisation**:
    - i18next: ^24.2.2
    - react-i18next: ^15.4.1
  - **Encryption**:
    - tweetnacl: ^1.0.3
  - **Development Tools**:
    - typescript: ~5.7.2
    - eslint: ^9.21.0
    - vite: ^6.2.0

## Web Server Configuration

- **Domain**: kang-mi.com
- **SSL Certificate**: Configured with Let's Encrypt
- **HTTPS Redirect**: Enabled (HTTP requests are redirected to HTTPS)
- **Nginx Configuration**:
  - Frontend requests served from static file directory
  - API requests under `/api` are proxied to local port 8000 (backend)
  - Special path `/live2d/` is configured to disable caching

## Runtime Status

- **Nginx**: Actively running and set to start on system boot
- **Backend Application**: Running via Gunicorn with 5 processes (1 master + 4 workers)

## Notes

- The server is hosted on an AWS EC2 instance
- SSL certificates are managed via Let's Encrypt
- The system uses a decoupled front-end/back-end architecture with Nginx as the reverse proxy

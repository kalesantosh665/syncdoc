````markdown
# SyncDoc 📝

> A real-time collaborative document editor built with React, TypeScript, Node.js, WebSockets, Yjs, and MongoDB.

SyncDoc is a full-stack collaborative document editing application designed to allow multiple users to work on documents in real time.

The project focuses on real-time synchronization, collaborative editing, structured document storage, and a responsive document editing experience.

---

## 🚀 Features

### 📝 Document Editing

- Create and manage documents
- Block-based document structure
- Support for headings and paragraphs
- Support for lists and code blocks
- Structured document content

### 👥 Real-Time Collaboration

- Real-time multi-user document editing
- WebSocket-based communication
- Yjs-based synchronization
- CRDT-based conflict resolution
- Concurrent editing support

### 💾 Document Persistence

- MongoDB-based document storage
- Mongoose data models
- Document persistence through backend APIs

### 🔐 Authentication

- User authentication
- Protected application routes
- Secure API access
- User-specific document management

### 🛡️ Content Security

- Server-side HTML sanitization
- DOMPurify-based content sanitization
- Protection against malicious HTML content and XSS risks

### 📄 Export

- Document export functionality
- PDF generation using PDFKit

---

## 🛠️ Tech Stack

### Frontend

- React.js
- TypeScript
- HTML
- CSS
- Responsive UI

### Backend

- Node.js
- Express.js
- REST APIs
- WebSocket

### Real-Time Collaboration

- Yjs
- CRDT
- WebSockets

### Database

- MongoDB
- Mongoose

### Security & Export

- DOMPurify
- PDFKit

### Development Tools

- Git
- GitHub
- VS Code
- Postman

---

## 🏗️ Application Architecture

```text
                    ┌─────────────────────────┐
                    │       React Client      │
                    │                         │
                    │ Document Editor         │
                    │ Document Management     │
                    │ Collaboration UI        │
                    └────────────┬────────────┘
                                 │
                         REST API / WebSocket
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │      Node.js Server     │
                    │        Express.js       │
                    │                         │
                    │ Routes / Controllers    │
                    │ Services / WebSocket    │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │        MongoDB           │
                    │                         │
                    │ Users / Documents      │
                    │ Persistent Data         │
                    └─────────────────────────┘

                    Real-Time Synchronization

                         ┌───────────┐
                         │   Yjs    │
                         │   CRDT   │
                         └─────┬─────┘
                               │
                         WebSocket Sync
                               │
                    ┌──────────┴──────────┐
                    │                     │
              Client A              Client B
                    │                     │
                    └───────┬─────────────┘
                            │
                    Shared Document State
````

---

## 🔄 Real-Time Collaboration Flow

```text
User A edits document
        │
        ▼
     Yjs State
        │
        ▼
    WebSocket
        │
        ▼
Synchronization
        │
        ▼
Other Connected Clients
        │
        ▼
Updated Shared Document
```

Yjs provides CRDT-based synchronization so concurrent document changes can be merged while maintaining a consistent shared document state.

---

## 📁 Project Structure

```text
SyncDoc/
│
├── client/
│   ├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   └── ...
│
├── server/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── ...
│
└── README.md
```

---

## ⚙️ Getting Started

### Prerequisites

Make sure the following are installed:

* Node.js
* npm
* MongoDB

### 1. Clone the Repository

```bash
git clone https://github.com/kalesantosh665/syncdoc.git
cd syncdoc
```

### 2. Install Frontend Dependencies

```bash
cd client
npm install
```

### 3. Install Backend Dependencies

Open another terminal:

```bash
cd server
npm install
```

### 4. Configure Environment Variables

Create a `.env` file inside the `server` directory.

Example:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

> Never commit real credentials, API keys, or secrets to GitHub.

### 5. Start the Backend

```bash
cd server
npm run dev
```

### 6. Start the Frontend

Open another terminal:

```bash
cd client
npm run dev
```

The application will be available at the local development URL provided by the frontend development server.

---

## 🧠 Key Technical Concepts

### Yjs & CRDT

Yjs is used to maintain a shared document state between multiple clients.

CRDT-based synchronization allows concurrent changes from different users to be merged without relying on a traditional central locking mechanism.

### WebSockets

WebSockets provide persistent communication between connected clients and the backend for real-time document synchronization.

### MongoDB

MongoDB is used to persist user and document data.

### DOMPurify

DOMPurify is used for server-side sanitization of HTML content to reduce the risk of XSS vulnerabilities when handling user-generated content.

### PDFKit

PDFKit is used to generate PDF documents from application content.

---

## 🧪 Testing

The project includes testing focused on real-time collaboration and synchronization behavior.

Testing areas include:

* WebSocket communication
* Concurrent document editing
* Yjs synchronization
* Conflict-resolution scenarios
* Multi-client collaboration

---

## 🎯 Project Goals

SyncDoc is being developed to demonstrate practical implementation of:

* Modern React development
* TypeScript
* Full-stack application architecture
* Real-time communication
* Collaborative editing
* CRDT-based synchronization
* WebSocket architecture
* MongoDB persistence
* Authentication
* Content security
* Document export

---

## 🚧 Project Status

**In active development**

SyncDoc is currently under development, with additional features, UI improvements, testing, and refinements planned before the project is considered complete.

---

## 🔮 Future Improvements

Planned improvements may include:

* Improved collaborative presence indicators
* User avatars and online status
* Advanced document formatting
* Version history
* Document sharing and permissions
* Improved conflict-handling workflows
* More comprehensive automated testing
* Deployment and CI/CD
* Enhanced responsive design

---

## 👨‍💻 Author

**Santosh Kale**

Frontend / Full-Stack Developer

Pune, Maharashtra, India

* GitHub: https://github.com/kalesantosh665
* LinkedIn: https://www.linkedin.com/in/santosh-kale-233725321/
* Portfolio: https://kalesantosh665.github.io/portfolioo/

---

## ⭐ Project

If you find SyncDoc interesting, consider giving the repository a ⭐ on GitHub.

---

## 📄 License

This project is intended for learning, portfolio, and demonstration purposes.

```
```

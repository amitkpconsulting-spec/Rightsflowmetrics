# RightsFlow Metrics™
### Enterprise GDPR Data Subject Rights (DSR) & Regulatory Operations Control Center

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-amber.svg?style=flat-square)](LICENSE.md)
[![GDPR: EU 2016/679](https://img.shields.io/badge/Regulatory-GDPR%20(EU%202016%2F679)-emerald.svg?style=flat-square)](https://eur-lex.europa.eu/eli/reg/2016/679/oj)
[![Node.js](https://img.shields.io/badge/Node.js-v18%2B%20%7C%20v20%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Cryptographic Ledger](https://img.shields.io/badge/Audit%20Ledger-SHA--256%20Hash--Chain-0ea5e9?style=flat-square)](https://github.com/amitkpconsulting-spec/Rightsflowmetrics)

**Repository**: [https://github.com/amitkpconsulting-spec/Rightsflowmetrics](https://github.com/amitkpconsulting-spec/Rightsflowmetrics)  
**Advisory & Enterprise Support**: [https://www.technoscope.co.in](https://www.technoscope.co.in)

---

## Table of Contents
- [About Tool](#-about-tool)
- [What is RightsFlow Metrics?](#-what-is-rightsflow-metrics)
- [Why RightsFlow Metrics?](#-why-rightsflow-metrics)
  - [The Statutory Challenge](#the-statutory-challenge)
  - [Financial-Grade Regulatory Conflicts](#financial-grade-regulatory-conflicts)
  - [Key Operational Capabilities](#key-operational-capabilities)
- [New Feature Updates & Enhancements](#-new-feature-updates--enhancements)
- [How It Works (System Architecture)](#-how-it-works-system-architecture)
  - [Technical Stack](#technical-stack)
  - [Visual Statutory Countdown & Urgency Engine](#visual-statutory-countdown--urgency-engine)
  - [Self-Healing Embedded SQLite Architecture](#self-healing-embedded-sqlite-architecture)
  - [Cryptographic Audit Ledger (SHA-256)](#cryptographic-audit-ledger-sha-256)
  - [Statutory SLA Calculation Engine](#statutory-sla-calculation-engine)
- [Installation & Quickstart](#-installation--quickstart)
  - [Option A: Automated Self-Server (Windows via `Setup.bat` and `start.bat`)](#option-a-automated-self-server-windows)
  - [Option B: Containerized Docker Deployment](#option-b-containerized-docker-deployment)
  - [Option C: Manual CLI Setup (Linux / macOS / Windows)](#option-c-manual-cli-setup-linux--macos--windows)
- [Data Export & Regulatory Inspection](#-data-export--regulatory-inspection)
- [License & Change Tracking](#-license--change-tracking)
- [Advisory & Enterprise Support](#-advisory--enterprise-support)

---

## 📖 About Tool

**RightsFlow Metrics™** is a financial-grade, air-gappable **GDPR Individual Rights Operations Control Center** designed for Data Protection Officers (DPOs), compliance managers, and enterprise legal engineers. 

Built to handle the rigorous statutory demands of **Regulation (EU) 2016/679 (GDPR)** Articles 12 through 23, the platform provides automated deadline calculation, ID verification clock pauses, AML/KYC conflict resolution matrixes, live statutory countdown timers, and an **immutable SHA-256 cryptographic audit ledger** for regulatory inspection.

---

## 🔍 What is RightsFlow Metrics?

RightsFlow Metrics is an end-to-end management platform for processing, validating, executing, and sealing **Data Subject Requests (DSRs)** across financial and corporate infrastructures.

It covers all statutory rights under GDPR:
| GDPR Article | Statutory Right | Operational Capabilities |
| :--- | :--- | :--- |
| **Art. 15** | Right of Access | Extracts unified CIF banking dossiers, statement histories, and KYC metadata. |
| **Art. 16** | Right to Rectification | Updates corrupted/outdated data with dual-signoff and audit diff generation. |
| **Art. 17** | Right to Erasure | Verifies statutory retention mandates vs. non-essential marketing data purge. |
| **Art. 18** | Right to Restriction | Isolates contentious account records without destructive deletion. |
| **Art. 20** | Right to Data Portability | Generates interoperable, machine-readable JSON/CSV export packages. |
| **Art. 21** | Right to Object | Halts profiling, automated telemarketing, and third-party partner syndication. |
| **Art. 22** | Automated Decision Review | Handles algorithmic credit/lending re-evaluations with mandatory human intervention. |

---

## 💡 Why RightsFlow Metrics?

### The Statutory Challenge
Under GDPR Article 12(3), organizations must respond to Data Subject Requests **without undue delay and at the latest within one month (30 days)**. Failure to comply can result in administrative fines up to **€20 million or 4% of total worldwide annual turnover** under Article 83(5).

### Financial-Grade Regulatory Conflicts
In banking and high-security enterprises, DSR processing directly collides with anti-money laundering (AML), counter-terrorist financing (CTF), and banking secrecy obligations:
- **Erasure vs. AML Statutory Retention**: Article 17 requests must NOT purge transactional records subject to 5–10 year AML/KYC statutory retention rules (Directive (EU) 2015/849).
- **ID Verification Clock Pausing**: Article 12(6) permits the statutory clock to pause while awaiting identity verification, but audit proof must be irrefutable.
- **Article 12(5) Refusals**: Requests that are manifestly unfounded or excessive require detailed statutory justifications logged into supervisory-ready archives.

### Key Operational Capabilities
- ⏱️ **Visual Statutory Countdown Timers**: Real-time ticker displaying exact days, hours, minutes, and seconds remaining until statutory deadline breach.
- 🚦 **Dynamic Urgency Triage & Sorting**: Instant queue sorting and filtering for `<48h Critical`, `<5d Warning`, `Paused ID`, `Overdue`, and `Resolved` tickets.
- 🛡️ **Self-Healing SQLite Resilience**: Automated disk integrity checks and quarantine auto-recovery preventing server startup failures.
- 🔐 **Cryptographic Proof (SHA-256)**: Every status change, identity check, and remediation diff is hash-chained to prevent retrospective tampering.
- 📊 **Executive & Operations Views**: Interactive dashboards with real-time statutory KPIs, risk matrices, and queue drill-downs.
- 📥 **Regulatory Inspection Packages**: One-click batch export of machine-readable JSON packages compliant with GDPR Art. 5(2), 24, and 30 accountability standards.

---

## 🌟 New Feature Updates & Enhancements

### 1. Visual Statutory Countdown Timer (`StatutoryCountdownTimer`)
- **Real-Time Digital Ticker**: Ticking display showing days, hours, minutes, and seconds remaining before the statutory compliance deadline expires.
- **Urgency Multi-State Engine**:
  - 🔴 **Critical (< 48 Hours)**: High-urgency alert with pulsing indicator and priority queue escalation.
  - 🟡 **Warning (< 5 Days)**: Amber warning badge highlighting approaching one-month deadline.
  - ⏸️ **Clock Paused (Art. 12(6))**: Paused state reflecting KYC/identity proof waiting period without penalizing operational SLA.
  - 🟢 **Resolved / SLA Sealed**: Cryptographically verified completion status.
  - 🟣 **Art. 12(3) Extension Active**: Visual marker for approved 60-day complexity extensions (90-day total window).
- **Elapsed Statutory Progress Meter**: Progress bar illustrating the percentage of the statutory window consumed.

### 2. Operations Queue Urgency Filtering & Triage
- **Urgency Filter Chips**: One-click filter pills in `QueueManagement` to immediately isolate *Critical (<48h)*, *Warning (<5d)*, *Paused (ID)*, *Breached*, and *Resolved* tickets.
- **Smart Urgency Sorting**: Added dynamic sort dropdown ranking tickets by SLA urgency (critical impending deadlines bubble to the top).
- **Interactive KPI Cards**: Metric tiles now double as fast-action filters for critical tickets and clock-paused requests.

### 3. Self-Healing SQLite & Zero-Downtime Resilience
- **Automated Integrity Verification**: Integrated `PRAGMA integrity_check;` and payload verification during embedded SQLite initialization.
- **Corrupted File Auto-Quarantine**: Automatically quarantines malformed or damaged database files (`*.corrupted.<timestamp>`) and bootstraps a clean, fully-seeded SQLite instance with zero server downtime.
- **Strict WAL Persistence**: Ensures continuous, atomic disk commits with zero external database dependencies.

---

## ⚙️ How It Works (System Architecture)

```
┌────────────────────────────────────────────────────────────────────────┐
│                   RightsFlow Metrics Control Center                    │
├───────────────────────────────┬────────────────────────────────────────┤
│ Client Layer (React 18 + TS)  │  - Executive Dashboard & SLA Visuals   │
│ Tailwind CSS + Lucide Icons   │  - Operations Queue & DSR Workflows    │
│ Recharts + Framer Motion      │  - Cryptographic Audit Ledger Viewer   │
├───────────────────────────────┼────────────────────────────────────────┤
│ Server Layer (Express + TS)   │  - Regulatory SLA & Deadline Engine    │
│ REST API & WebSockets Proxy   │  - Legal Basis Assessment Evaluator    │
│ Vite Dev & Production CJS     │  - Batch Import/Export Engine (JSON)   │
├───────────────────────────────┼────────────────────────────────────────┤
│ Persistence & Cryptography    │  - SQLite3 (Strict Write-Ahead-Log)    │
│ Linear Block Hash Chain       │  - SHA-256 Merkle/Linear Block Hashes  │
│ Air-Gapped Ready              │  - Atomic Transactions & State Diffs   │
└───────────────────────────────┴────────────────────────────────────────┘
```

### Technical Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Recharts, Motion.
- **Backend**: Node.js, Express, TypeScript (executed via `tsx` in dev, bundled with `esbuild` for production).
- **Storage**: Embedded SQLite (Strict WAL mode) with zero external database dependencies.
- **Security**: SHA-256 block hash-chaining across all compliance actions.

### Visual Statutory Countdown & Urgency Engine
The countdown component (`StatutoryCountdownTimer`) continuously calculates the statutory remaining duration in real time:
- **Formula**:
  $$\text{Effective Deadline} = \text{Request Date} + 30\text{d} + \text{Paused Days} + (\text{Extension Applied} \times 60\text{d})$$
- **Urgency Thresholds**:
  - `Critical`: $\le 48\text{ hours remaining}$ (Pulsing emergency border & escalated badge)
  - `Warning`: $\le 5\text{ days remaining}$ (Amber SLA warning)
  - `Clock Paused`: Article 12(6) ID verification hold active
  - `Breached / Overdue`: Negative remaining balance with overdue counter

### Self-Healing Embedded SQLite Architecture
To ensure high availability in air-gapped financial nodes:
- **Startup Integrity Scan**: Executes `PRAGMA integrity_check;` before mounting SQLite tables.
- **Corrupted File Quarantine**: Automatically isolates damaged database files (`*.corrupted.<timestamp>`) and re-seeds statutory DSR registries with zero service interruption.
- **Safe Dynamic Migrations**: Auto-migrates database schema columns (`sector_profile`, `report_metadata`, indices) dynamically on launch.

### Cryptographic Audit Ledger (SHA-256)
Every compliance event computes a new cryptographic block:
$$\text{CurrentHash} = \text{SHA256}(\text{BlockID} + \text{Timestamp} + \text{EventType} + \text{OperatorID} + \text{PrevHash} + \text{StateDiff})$$

The ledger provides an instantaneous, one-click verification algorithm that audits the entire chain from Genesis block to terminal tip, immediately flagging any altered database rows.

### Statutory SLA Calculation Engine
The system accurately calculates elapsed time, active ID pause periods, and statutory deadlines:
- **Baseline**: 30 Calendar Days from initial receipt.
- **Clock Paused**: Excludes days awaiting data subject KYC/ID proof (Art. 12(6)).
- **Extension**: +60 Calendar Days when complex multi-system remediation is invoked (Art. 12(3)).

---

## 🚀 Installation & Quickstart

### Option A: Automated Self-Server (Windows)

This repository includes pre-built Windows batch scripts for automated setup and launch:

1. **Step 1: Automated Environment Setup**
   - Double-click **`Setup.bat`** (or run `.\Setup.bat` in Command Prompt).
   - The script will automatically:
     1. Detect and verify Node.js (v18+ recommended)
     2. Detect and verify npm
     3. Generate or configure `.env` from `.env.example`
     4. Install all npm dependencies
     5. Validate the production build pipeline

2. **Step 2: Launch the Control Center**
   - Double-click **`start.bat`** to open the interactive menu:
   ```text
   ===============================================================================
                         RightsFlow Metrics Control Center
   ===============================================================================

     [1] Run Local Server   (Live Telemetry, Integrations & Tools - Port 3000)
     [2] Run Docker Setup   (Docker Compose build & background run - Port 3000)
     [3] Stop Docker Setup  (docker compose down)
     [4] Re-run Setup       (Reinstall / verify npm dependencies)
     [5] Exit
   ===============================================================================
   ```
   - Press **`1`** to launch the local server. Your browser will automatically open to `http://localhost:3000`.

---

### Option B: Containerized Docker Deployment

To run RightsFlow Metrics inside a sandboxed, production-ready container:

```bash
# Clone the repository
git clone https://github.com/amitkpconsulting-spec/Rightsflowmetrics.git
cd Rightsflowmetrics

# Build and start container in the background
docker compose up -d --build
```
Access the application at `http://localhost:3000`.

To stop the container:
```bash
docker compose down
```

---

### Option C: Manual CLI Setup (Linux / macOS / Windows)

```bash
# 1. Clone the repository
git clone https://github.com/amitkpconsulting-spec/Rightsflowmetrics.git
cd Rightsflowmetrics

# 2. Copy environment file
cp .env.example .env

# 3. Install dependencies
npm install

# 4. Run development server (Port 3000)
npm run dev

# 5. Build for production (Optional)
npm run build
npm run start
```

---

## 📊 Data Export & Regulatory Inspection

RightsFlow Metrics offers automated export utilities directly through the web UI and REST API:

- **Executive Dashboard -> `Export All`**: Downloads the complete Data Subject Requests master database as a structured, machine-readable JSON document.
- **Executive Dashboard -> `Batch Export Audit Logs (JSON)`**: Exports the entire SHA-256 cryptographic audit ledger with block proofs, state diffs, and verification certificates for supervisory authorities.
- **REST Endpoints**:
  - `GET /api/tickets/export`: Master ticket records with compliance metadata.
  - `GET /api/audit/export`: Full SHA-256 audit ledger export.
  - `GET /api/audit/verify`: Cryptographic verification status of the hash-chain.

---

## 📜 License & Change Tracking

RightsFlow Metrics is released under a **Proprietary & Commercial License**.  
For full terms, see [LICENSE.md](LICENSE.md).

### License & Change-Tracking Guidelines:
- **Authorized Use**: This software is licensed for internal enterprise compliance management and evaluation.
- **Change Tracking**: Any modification to statutory SLA calculation routines, database schemas, or lawful basis assessment engines must be documented, attributed, and recorded in the cryptographic audit ledger.
- **No Unauthorized Distribution**: Sublicensing, reverse engineering, or public redistribution of this codebase is strictly prohibited without explicit written consent from Technoscope.

---

## 🤝 Advisory & Enterprise Support

For enterprise DPO advisory, custom core banking adapters (Finacle, Temenos, Mambu), regulatory inspection audits, or bespoke deployments:

- 🌐 **Website**: [https://www.technoscope.co.in](https://www.technoscope.co.in)
- 📂 **GitHub**: [https://github.com/amitkpconsulting-spec/Rightsflowmetrics](https://github.com/amitkpconsulting-spec/Rightsflowmetrics)
- 🏢 **Organization**: Technoscope Consulting & Solutions

---
*RightsFlow Metrics™ is a proprietary product of Technoscope. All rights reserved.*

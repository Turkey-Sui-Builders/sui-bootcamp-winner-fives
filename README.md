# 💼 Kariyer3 - Decentralized Job Board on Sui

> A privacy-focused, decentralized job platform leveraging Sui blockchain, Walrus storage, and zkLogin authentication.

**🌐 Live Demo:** [https://sui-bootcamp-winner-fives.vercel.app](https://sui-bootcamp-winner-fives.vercel.app)

---

## 👥 Team

- **Hüseyin İnanç** - Full Stack Blockchain Developer
- **Burak Yüce** - Frontend Blockchain Developer
- **Oğuz Kağan** - Frontend Blockchain Developer
- **Umutcan Özkan** - Move Developer
- **Ömer Arda Zorlu** - Move Developer

---

## 📋 Project Overview

Kariyer3 is a fully decentralized job board built on Sui blockchain that implements cutting-edge Web3 technologies:

- **🔐 Privacy-First Architecture**: Implements SEAL Pattern using Dynamic Object Fields for private job applications
- **💾 Decentralized Storage**: CV files stored on Walrus, ensuring data permanence and censorship resistance
- **🎫 Web2 UX with Web3 Backend**: Google OAuth via zkLogin (Enoki) for seamless onboarding
- **🤖 AI-Ready Infrastructure**: Pre-integrated data fields for future AI-powered candidate scoring
- **⛓️ On-Chain Everything**: Jobs, applications, and hiring decisions are all on Sui blockchain

---

## 🏆 Technical Highlights

### ✅ Core Requirements Met

| Requirement | Implementation | Status |
|------------|---------------|---------|
| **Vectors** | Job tags, salary ranges, application lists | ✅ |
| **Option<T>** | Hired candidate, AI score/analysis fields | ✅ |
| **Shared Objects** | JobBoard as global registry | ✅ |
| **Events** | JobPosted, ApplicationSubmitted, CandidateHired, AIReviewAdded | ✅ |
| **Access Control** | Employer capabilities, view permissions | ✅ |
| **Move Tests** | Comprehensive unit tests for all functions | ✅ |
| **Frontend Integration** | Post jobs, apply, hire candidates | ✅ |
| **On-Chain Data Display** | Job listings, applications, employer/candidate dashboards | ✅ |
| **Integration Tests** | Jest tests for components and flows | ✅ |

### 🏅 Bonus Features Implemented

| Feature | Implementation | Points |
|---------|---------------|--------|
| **Dynamic Fields** | SEAL Pattern for private applications | ⭐⭐⭐ |
| **Display Object** | NFT-style job representation | ⭐⭐ |
| **Clock Integration** | Timestamp tracking for jobs and applications | ⭐⭐ |
| **Walrus Storage** | Decentralized CV blob storage | ⭐⭐⭐ |
| **zkLogin (Enoki)** | Google OAuth blockchain authentication | ⭐⭐⭐ |
| **AI Infrastructure** | Pre-built fields for future AI agent integration | ⭐⭐ |
| **Rich Data Model** | Categories, tags, salary ranges for advanced filtering | ⭐⭐ |

---

## 🏗️ Architecture

### Smart Contract (Move)

**Module:** `kariyer3::job_board`

**Key Structs:**
```move
public struct JobBoard has key {
    id: UID,
    total_jobs: u64,
    total_applications: u64,
    ai_agent: address, // Authorized AI agent address
}

public struct Job has key, store {
    id: UID,
    employer: address,
    title: String,
    description: String,
    company: String,
    location: String,
    category: String,
    salary_range: vector<u64>, // [min, max]
    tags: vector<String>,      // Skills/keywords
    created_at: u64,
    hired_candidate: Option<address>,
    status: u8, // 0: Open, 1: Closed, 2: Hired
}

// SEAL Pattern: Applications stored as Dynamic Object Fields
public struct Application has key, store {
    id: UID,
    job_id: ID,
    applicant: address,
    cover_message: String,
    cv_blob_id: String,        // Walrus storage ID
    applied_at: u64,
    ai_score: Option<u8>,      // AI-ready field
    ai_analysis: Option<String>, // AI-ready field
}
```

**Privacy Implementation:**
- Applications are NOT stored in a public vector
- Each application is a **Dynamic Object Field** on the Job
- Only the employer and applicant can view application details
- Access control enforced at the smart contract level

### Frontend Stack

- **Framework:** React 18 + TypeScript + Vite
- **UI Library:** Tailwind CSS (Glass morphism design system)
- **State Management:** Redux Toolkit
- **Blockchain SDK:** @mysten/dapp-kit, @mysten/sui.js
- **Authentication:** @mysten/enoki (zkLogin)
- **Storage:** Walrus testnet
- **Deployment:** Vercel

---

## 🚀 Build Instructions

### Prerequisites

- Node.js 20+ and npm
- Sui CLI (for Move contract deployment)
- Git

### 1. Clone Repository

```bash
git clone <repository-url>
cd hackathon
```

### 2. Smart Contract Setup

```bash
cd move/kariyer3

# Build the Move package
sui move build

# Run Move tests
sui move test

# Deploy to Sui testnet (optional - already deployed)
sui client publish --gas-budget 100000000
```

**Note:** Contract is already deployed to Sui testnet. See `.env` for addresses.

### 3. Frontend Setup

```bash
cd ../../ui/kariyer3

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your configuration (or use existing testnet setup)

# Start development server
npm run dev

# Run tests
npm run test

# Build for production
npm run build
```

### 4. Access the Application

- **Development:** http://localhost:5173
- **Production:** https://sui-bootcamp-winner-fives.vercel.app

---

## 🔑 Environment Variables

Create a `.env` file in `ui/kariyer3/` with:

```bash
# Sui Network (testnet for hackathon)
VITE_NETWORK=testnet

# Deployed Contract Addresses (testnet)
VITE_PACKAGE_ID=0x6f82b0b9fd1b838d2bf2cfd8522b34bacb6c4eff7fb5c5e03501e5c630627861
VITE_JOB_BOARD_ID=0xc53b25f3376ca01bd7c2b20ab1591bec41f36909cb026553b22da3d1d414b750

# Enoki (zkLogin) - Public testnet key
VITE_ENOKI_API_KEY=enoki_public_e68a0cc55caa4ee21dd3016a79ad2a46

# Google OAuth Client ID
VITE_GOOGLE_CLIENT_ID=633428958358-eqh00pr72fkfa5novlficmfvgq9e1pl3.apps.googleusercontent.com

# Walrus Storage (testnet endpoints - public and free)
VITE_WALRUS_AGGREGATOR=https://aggregator.walrus-testnet.walrus.space
VITE_WALRUS_PUBLISHER=https://publisher.walrus-testnet.walrus.space
```

---

## 📱 User Flows

### For Employers

1. **Connect Wallet** - Use Google (zkLogin) or any Sui wallet
2. **Post a Job** - Fill in title, description, category, salary, tags
3. **View Applications** - See all candidates who applied (privacy-protected)
4. **Hire Candidate** - Select and hire one candidate per job
5. **Manage Jobs** - Track all your posted positions

### For Candidates

1. **Connect Wallet** - Authenticate via Google or wallet
2. **Browse Jobs** - Filter by category, salary, tags
3. **Apply** - Upload CV to Walrus, write cover message
4. **Track Applications** - Monitor status of all applications
5. **View AI Score** - See AI assessment (when available)

---

## 🎯 Key Features

### 1. SEAL Pattern Privacy
```move
// Applications stored as Dynamic Object Fields
dof::add(&mut job.id, app_id, application);

// Only employer or applicant can view
public fun view_application(
    job: &Job,
    application_id: ID,
    ctx: &TxContext,
): &Application {
    let app = dof::borrow<ID, Application>(&job.id, application_id);
    assert!(
        ctx.sender() == job.employer || ctx.sender() == app.applicant,
        ENotAuthorized
    );
    app
}
```

### 2. Walrus Storage Integration
```typescript
// Upload CV to Walrus
const response = await fetch(`${WALRUS_PUBLISHER}/v1/blobs?epochs=5`, {
  method: "PUT",
  body: cvFile,
});
const data = await response.json();
const blobId = data.newlyCreated.blobObject.blobId;

// Store blob ID on-chain
tx.moveCall({
  target: `${PACKAGE_ID}::job_board::apply`,
  arguments: [
    // ... other args
    tx.pure.string(blobId), // Walrus blob ID
  ],
});
```

### 3. zkLogin Authentication
```typescript
// Hybrid auth: zkLogin (primary) + WalletConnect (fallback)
const { address: zkLoginAddress } = useZkLogin();
const currentAccount = useCurrentAccount();
const address = zkLoginAddress || currentAccount?.address;

// Enoki-sponsored transactions for zkLogin users
await enokiFlow.sponsorAndExecuteTransaction({
  transaction: tx,
  network: "testnet",
});
```

### 4. AI-Ready Infrastructure
```move
// Pre-built for future AI integration
public fun add_ai_review(
    board: &JobBoard,
    job: &mut Job,
    application_id: ID,
    ai_score: u8,
    ai_analysis: String,
    clock: &Clock,
    ctx: &TxContext,
) {
    assert!(ctx.sender() == board.ai_agent, ENotAuthorized);
    let app = dof::borrow_mut<ID, Application>(&mut job.id, application_id);
    app.ai_score = option::some(ai_score);
    app.ai_analysis = option::some(ai_analysis);
}
```

---

## 🧪 Testing

### Move Tests
```bash
cd move/kariyer3
sui move test
```

**Test Coverage:**
- Job posting and validation
- Application submission with privacy
- Hiring flow and access control
- AI review functionality
- Event emissions

### Frontend Tests
```bash
cd ui/kariyer3
npm run test
```

**Test Coverage:**
- Component rendering
- User interactions
- Redux state management
- Form validations
- Wallet integration

---

## 📊 Project Structure

```
hackathon/
├── move/kariyer3/              # Smart Contracts
│   ├── sources/
│   │   └── job_board.move     # Main contract
│   ├── tests/
│   │   └── job_board_tests.move
│   └── Move.toml
├── ui/kariyer3/                # Frontend Application
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/             # Page components
│   │   ├── store/             # Redux store
│   │   ├── hooks/             # Custom hooks (Walrus, etc.)
│   │   ├── providers/         # Auth, Theme providers
│   │   └── config/            # Constants, network config
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
├── docs/                       # Technical documentation
│   ├── WALRUS.md
│   ├── ENOKI.md
│   └── SEAL.md
├── vercel.json                 # Deployment config
└── README.md                   # This file
```

---

## 🌟 Innovation & Differentiation

1. **Privacy by Design**: SEAL Pattern ensures applications remain private until employer reviews
2. **Web2 UX**: zkLogin eliminates seed phrases for mainstream adoption
3. **Decentralized Storage**: CVs stored on Walrus, not centralized servers
4. **Future-Proof**: AI scoring infrastructure ready for integration
5. **Rich Data Model**: Advanced filtering with categories, tags, salary ranges
6. **Professional UI**: Modern glass morphism design with Tailwind CSS
7. **Hybrid Authentication**: Both zkLogin and traditional wallets supported

---

## 🔐 Security Considerations

- ✅ Access control on all sensitive functions
- ✅ Employer capability pattern for job management
- ✅ Private applications via Dynamic Fields
- ✅ Input validation on all Move functions
- ✅ Rate limiting on CV uploads (10MB max)
- ✅ No secrets in frontend code (environment variables)

---

## 🚧 Future Roadmap

- [ ] AI agent integration for automated candidate scoring
- [ ] Multi-language support (i18n)
- [ ] Advanced search with Elasticsearch
- [ ] Reputation system for employers and candidates
- [ ] Video interview integration
- [ ] Salary negotiation tools
- [ ] Job recommendation algorithm
- [ ] Mobile app (React Native)

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🙏 Acknowledgments

- **Sui Foundation** - For the amazing blockchain infrastructure
- **Mysten Labs** - For Walrus and Enoki SDKs
- **Ankara Sui Bootcamp** - For the learning opportunity and challenge

---

## 📞 Contact

For questions or collaboration:
- **Email**: huseyin.innc3304@gmail.com
- **Deployment**: https://sui-bootcamp-winner-fives.vercel.app

---

**Built with ❤️ on Sui Blockchain**

# 💼 Sui Job Board — Decentralized Hiring on Sui (Ankara Turkey)

In this challenge, you’ll build **Sui Job Board**, a decentralized platform where:

- **Employers** can post jobs as on-chain objects.
- **Candidates** can submit on-chain applications with a short cover message.
- **Employers** can review applications and **hire one candidate** for each job.

Your goal is to design clean on-chain data models, safe access control, and a simple but effective frontend that showcases **Sui Move**, along with a React/TypeScript UI powered by the **Sui TypeScript SDK**.

**Deployment:** A functional frontend **must be deployed** and accessible publicly (e.g., using Vercel, Walrus, Netlify). 

## 🧠 Technical Requirements

Your submission should include:

✅ **Smart Contract (Move module)** demonstrating:

- **Working with vectors**
    
    e.g. collections of applications/job IDs.
    
- **Using the `Option<T>` type**
    
    e.g. to represent an optional hired candidate, or optional fields like salary.
    
- **At least one struct acting as a shared object**
    
    e.g. a global `JobBoard` shared object that tracks all jobs.
    
- **Events** to emit data on-chain
    
    e.g. `JobPosted` .
    
- **Access control** on at least one function
    - Eg. employers must only be able to **update/hire for their own jobs**.
    - Use a capability pattern (e.g. per-job “employer capability”) or publisher authority pattern.

✅ **Move Tests** verifying your smart contract logic.

- Your functions and flows should be tested with move tests.

✅ **Frontend (React/TS)** that includes:

- A **Connect Wallet** button using the Sui wallet adapter.
- At least one **on-chain interaction**, for example:
    - Posting a new job.
    - Submitting an application.
    - Hiring a candidate.
- Reading and displaying **on-chain data**, for example:
    - List of all open jobs with title, company, location, salary (if set), status.
    - Job detail page with all its applications.
    - “My Jobs” for the connected employer.
    - “My Applications” for the connected candidate.

✅ **Integration Tests with Jest**

- For example:
    - Basic end-to-end flow test (post → apply → hire) at the TypeScript level.

## 🏅 Bonus Points

Earn extra credit:

- **Dynamic fields**
    - https://docs.sui.io/concepts/dynamic-fields
- **Display Object**
    - https://docs.sui.io/standards/display
- **Contract Upgradeability**
    - Future-proof your contract by allowing controlled upgrades using a **versioned object** or admin capability.
    - https://github.com/MystenLabs/sui-move-bootcamp/tree/h1-solution/H1
- **Clock, or Random objects**
    - **Clock:**
        - https://docs.sui.io/guides/developer/sui-101/access-time
    - **Random**:
        - https://docs.sui.io/guides/developer/advanced/randomness-onchain
- **Another Bonus**🏅**: Working with the rest of the Sui Stack!**

**How you will be graded:**

| **Category** | **Points** |
| --- | --- |
| **Technical Design & Move Contracts & Tests** | 30 |
| **Completeness of Features** | 25 |
| **User Experience (UX)** | 15 |
| **Bonus Features & Innovation** | 20 |
| **Presentation** | 10 |

### 📝 Submission

Submit your project on GitHub under the designated organization. In the repo, include a `README` with team names, build instructions and the **public deployment link**. 

Good luck!
# LMS Full-Stack Project

Professional Learning Management System with API, Web, and Mobile components.

## 🚀 Getting Started

To start all services locally, run:
```bash
pnpm run dev:all
```

## 🛠 Project Structure
- `artifacts/api-server`: Express.js & MongoDB backend
- `artifacts/lms-web`: Vite & React web portal
- `artifacts/lms-mobile`: Expo/React Native mobile app
- `lib/`: Shared workspace packages (zod schemas, database models, etc.)

## 🌳 Git Branching Strategy (World-Class Workflow)

We follow a professional branching strategy to ensure code quality and stable releases:

### Branch Types:
1.  **`main`**: The stable branch. Contains production-ready code. No direct commits allowed.
2.  **`develop`**: The integration branch. Merges all finished features for testing.
3.  **`feature/*`**: New features/components. Created from `develop`.
    - Example: `feature/api-implementation`, `feature/auth-flow`
4.  **`hotfix/*`**: Critical bug fixes for production. Created from `main`.

### Professional Workflow:
1.  **Checkout** a new feature branch from `develop`:
    ```bash
    git checkout develop
    git pull origin develop
    git checkout -b feature/your-feature
    ```
2.  **Commit** your changes following [Conventional Commits](https://www.conventionalcommits.org/):
    - `feat: add user login support`
    - `fix: resolve mobile layout overflow`
    - `chore: update dependencies`
3.  **Push** to GitHub:
    ```bash
    git push origin feature/your-feature
    ```
4.  **Open a Pull Request (PR)** on GitHub targeting the `develop` branch.
5.  **Code Review**: Team members review and approve the PR.
6.  **Merge**: Once approved, merge into `develop`.
7.  **Release**: Periodically merge `develop` into `main` for production releases.

## 🔐 Environment Variables
Make sure to set up `.env` files in:
- `artifacts/api-server/.env` (Copy from `.env.example` if available)

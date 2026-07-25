# History YouTube Content — Production Ledger

React (Vite) frontend + Firebase (Auth + Firestore) backend, deployable to
GitHub Pages with your own domain.

## 1. Firebase project

1. https://console.firebase.google.com → Add project.
2. Build → Firestore Database → Create database → production mode → pick a region.
3. Build → Authentication → Get started → enable Email/Password sign-in.
4. Authentication → Users → Add user → create the one login you'll use on
   every device.
5. Project settings (gear icon) → Your apps → click `</>` → register a web
   app → copy the `firebaseConfig` values shown.
6. Firestore Database → Rules tab → paste and Publish:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId}/tracker/{docId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```

## 2. Local setup

```bash
npm install
cp .env.example .env
```

Fill in `.env` with the six values from step 1.5:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Run it locally:

```bash
npm run dev
```

Sign in with the email/password from step 1.4. First sign-in seeds your
starting topics automatically since Firestore is empty.

## 3. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

`.env` is gitignored — your Firebase keys never get committed.

## 4. Deploy to GitHub Pages (automatic, via GitHub Actions)

The included `.github/workflows/deploy.yml` builds and deploys on every
push to `main`. It needs your Firebase config as repo secrets since `.env`
isn't in the repo:

1. Repo → Settings → Secrets and variables → Actions → New repository secret
2. Add all six, using the exact names from `.env.example`:
   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
   `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`,
   `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`
3. Repo → Settings → Pages → Source: "GitHub Actions"
4. Push to `main` — the Actions tab shows the build/deploy running. When it
   finishes you'll get a `https://<you>.github.io/<repo>/` URL.

## 5. Point your domain at it

1. Repo → Settings → Pages → Custom domain → enter your domain/subdomain →
   Save (this creates a `CNAME` file in the repo automatically).
2. At your DNS provider, add either:
   - a **CNAME record**: subdomain (e.g. `tracker`) → `<you>.github.io`, or
   - four **A records** at the root pointing to:
     `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
3. Wait for DNS to propagate (minutes to a few hours), then tick
   "Enforce HTTPS" in the Pages settings.

If your site ends up at a path like `/repo-name/` instead of your domain
root, open `vite.config.js` and set `base: "/repo-name/"` before rebuilding.

## 6. Day to day

- Sign in with the same email/password on every device — data syncs live
  through Firestore.
- "Export JSON" in the header gives you a manual backup any time; "Restore"
  loads one back in if you ever need to roll back.

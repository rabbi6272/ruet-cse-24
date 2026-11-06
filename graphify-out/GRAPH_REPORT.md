# Graph Report - ruet-cse-24  (2026-11-02)

## Corpus Check
- Corpus is ~42,093 words - fits in a single context window. You may not need a graph.

## Summary
- 686 nodes · 1790 edges · 34 communities (21 shown, 13 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.84)
- Token cost: 86,016 input · 0 output

## Community Hubs (Navigation)
- Auth & Profile Forms UI
- Student Data Services
- Auth Server Actions
- Profile Directory & Mapping
- App Layout & SEO
- Shared UI Components
- Profile Schema & Series Backfill
- Admin Email Announcements
- Signed Tokens & Legacy Migration
- Avatar Upload API
- Build Tooling Deps
- TypeScript Config
- Seeded Account Activation
- Runtime Dependencies
- Documented Auth Endpoints
- Claim & Reset Flow Design
- Firestore Backup Script
- Multi-Series Rollout Plan
- Profile Photo Migration
- npm Scripts
- README Overview
- Next Config
- Image Compression Dep
- HeroUI React Dep
- HeroUI Styles Dep
- React DOM Dep
- Toast Dep
- Resend Email Dep
- Sharp Image Dep
- React Query Dep
- Zustand Dep

## God Nodes (most connected - your core abstractions)
1. `cn()` - 44 edges
2. `next` - 40 edges
3. `ProfileForm()` - 29 edges
4. `getSession` - 28 edges
5. `buttonClasses()` - 23 edges
6. `Alert()` - 22 edges
7. `seriesFromRoll()` - 22 edges
8. `ProfileDetail()` - 20 edges
9. `Button()` - 20 edges
10. `react` - 20 edges

## Surprising Connections (you probably didn't know these)
- `/api/auth/register and /api/auth/login (email/password)` --semantically_similar_to--> `students.server.ts Server Action Surface`  [AMBIGUOUS] [semantically similar]
  README.md → AUTH_FLOW.md
- `CreateProfileLayout()` --calls--> `getSession`  [EXTRACTED]
  app/profiles/create/layout.tsx → lib/auth/session.ts
- `UpdateProfileLayout()` --calls--> `getSession`  [EXTRACTED]
  app/profiles/update/layout.tsx → lib/auth/session.ts
- `GET()` --calls--> `completeGoogleSignIn()`  [EXTRACTED]
  app/api/auth/google/callback/route.ts → lib/auth/google.server.ts
- `GET()` --calls--> `startGoogleSignIn()`  [EXTRACTED]
  app/api/auth/google/start/route.ts → lib/auth/google.server.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Legacy profile claim pipeline** — auth_flow_claim_flow, auth_flow_activation_branch, auth_flow_oob_server, auth_flow_rate_limit_keys, auth_flow_reserve_roll, auth_flow_compensating_rollback, auth_flow_legacy_profiles [EXTRACTED 1.00]
- **Multi-series directory rollout (registry-driven)** — implementation_plan_series_registry, implementation_plan_series_from_roll, scripts_backfill_series, implementation_plan_firestore_rules, implementation_plan_series_routing, implementation_plan_series_aware_ui, implementation_plan_landing_series_picker [EXTRACTED 1.00]
- **Paths that mint the __session cookie** — auth_flow_auth_service, auth_flow_join_server, auth_flow_google_oauth, auth_flow_claim_flow, auth_flow_session_module [INFERRED 0.85]

## Communities (34 total, 13 thin omitted)

### Community 0 - "Auth & Profile Forms UI"
Cohesion: 0.05
Nodes (71): ClaimFlow(), fail(), onComplete(), onLinkSubmit(), onResend(), onStart(), Step, EmailSentPanel() (+63 more)

### Community 1 - "Student Data Services"
Cohesion: 0.07
Nodes (64): SignInResult, signOut(), ClaimLinkResult, completeClaim(), SignUpResult, getSession, requireSession(), hashKey() (+56 more)

### Community 2 - "Auth Server Actions"
Cohesion: 0.08
Nodes (54): GET(), changePassword(), deleteAccount(), PlainResult, requestPasswordReset(), Result, signIn(), adoptPhoto() (+46 more)

### Community 3 - "Profile Directory & Mapping"
Cohesion: 0.06
Nodes (46): DirectoryHeader(), DirectoryToolbar(), DirectoryToolbarProps, ProfileCardProps, ProfileDirectory(), ProfileDirectoryProps, syncUrl(), Values (+38 more)

### Community 4 - "App Layout & SEO"
Cohesion: 0.08
Nodes (30): Navbar(), metadata, metadata, RootLayout(), viewport, metadata, revalidate, SeriesPickerPage() (+22 more)

### Community 5 - "Shared UI Components"
Cohesion: 0.11
Nodes (38): ProfileCard(), DetailSkeleton(), ProfileDetail(), Row(), Avatar(), AvatarProps, AvatarSize, initialsFrom() (+30 more)

### Community 6 - "Profile Schema & Series Backfill"
Cohesion: 0.05
Nodes (40): onRollChange(), ProfilePage(), ProfilePageProps, firestore.rules validProfile (series field), Phase 6: Verification (tsc + next build, manual flows), legacyToProfile(), bioSchema, bloodGroupSchema (+32 more)

### Community 7 - "Admin Email Announcements"
Cohesion: 0.10
Nodes (26): AudienceInfo, getAudienceSizeAction(), isAdmin(), sendAnnouncementAction(), SendResult, body, button, callout (+18 more)

### Community 8 - "Signed Tokens & Legacy Migration"
Cohesion: 0.11
Nodes (19): CLAIM_TICKET_TTL_MS, getTokenSecret(), OTP_MAX_ATTEMPTS, OTP_RESEND_COOLDOWN_MS, OTP_TTL_MS, signToken(), timingSafeEqualHex(), verifyToken() (+11 more)

### Community 9 - "Avatar Upload API"
Cohesion: 0.24
Nodes (17): GET(), DELETE(), ALLOWED_TYPES, POST(), countProfilesWithPicture(), patchProfile(), avatarPublicId(), cleanPublicId() (+9 more)

### Community 10 - "Build Tooling Deps"
Cohesion: 0.13
Nodes (20): devDependencies, autoprefixer@latest, postcss@^8.5.6, tailwindcss@^4.1.18, @tailwindcss/postcss@^4.1.18, tsx@^4.21.0, @types/node@latest, @types/react@latest (+12 more)

### Community 11 - "TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, forceConsistentCasingInFileNames, incremental, isolatedModules, jsx, lib (+11 more)

### Community 12 - "Seeded Account Activation"
Cohesion: 0.18
Nodes (15): Activation Branch for Seeded Accounts, mustRotate / needsSection Custom Claims, APPLY, args, Candidate, initAdmin(), legacyIdForEmail(), main() (+7 more)

### Community 13 - "Runtime Dependencies"
Cohesion: 0.12
Nodes (17): dependencies, eslint-config-next@^16.3.8, firebase@^12.8.0, lucide-react@^0.563.0, next@^16.3.8, next-cloudinary@^6.17.5, react@^19.3.0, @react-email/components@^1.0.10 (+9 more)

### Community 14 - "Documented Auth Endpoints"
Cohesion: 0.19
Nodes (14): [auth] Masked Log Lines (maskEmail), auth.service.ts (signIn, reset, changePassword, delete, signOut), freshEmailVerified Live Gate, Server-side Google OAuth (state + PKCE, signInWithIdp), join.server.ts signUpWithPassword + isOldDirectoryEmail, oob.server.ts sendOobCode Email Choke Point, Resend Broadcast (app/email-services), resendVerification (custom token -> VERIFY_EMAIL) (+6 more)

### Community 15 - "Claim & Reset Flow Design"
Cohesion: 0.18
Nodes (11): Claim Magic-Link Flow (startClaim/openClaimLink/completeClaim), legacyProfiles Collection, Password Reset Flow (PASSWORD_RESET), profiles/{uid} Collection, rateLimits hashKey 60s Cooldown, reserveRoll / rollIndex Race-safe Reservation, Claim OTP -> Firebase Magic Link Redesign, createProfileAction emailVerified Gate (+3 more)

### Community 16 - "Firestore Backup Script"
Cohesion: 0.26
Nodes (9): assertOutputIsIgnored(), encode(), initFirestore(), Json, main(), readCollection(), ReadResult, selfTest() (+1 more)

### Community 17 - "Multi-Series Rollout Plan"
Cohesion: 0.29
Nodes (7): HomePageClient Legacy Hero (/s/24), Phase 5: Landing Series Picker + Branding, Roll Number Format (24 03 001, sections of 60), seriesMetadata / app/seo.ts Refactor, Phase 3: Series-aware UI (Navbar, DirectoryToolbar, DirectoryHeader), Series Registry (SeriesConfig, types/series.ts), Per-series Routing /s/[series]

### Community 18 - "Profile Photo Migration"
Cohesion: 0.29
Nodes (7): cloudinary@^2.9.0, firebase-admin@^13.10.0, cloudinary, firebase-admin, APPLY, init(), main()

### Community 19 - "npm Scripts"
Cohesion: 0.25
Nodes (8): scripts, backfill:series, backup:firestore, build, dev, lint, migrate:profiles, start

### Community 20 - "README Overview"
Cohesion: 0.29
Nodes (7): /api/auth/register and /api/auth/login (email/password), Next.js API Routes (posts, resources, users), Environment Variables (NEXT_PUBLIC_FIREBASE_*, FIREBASE_ADMIN_*), Firebase Setup (Firestore, Auth, Storage), Relationship to React Native Mobile App, RUET CSE Archive Web App, Tailwind CSS Styling

## Ambiguous Edges - Review These
- `students.server.ts Server Action Surface` → `/api/auth/register and /api/auth/login (email/password)`  [AMBIGUOUS]
  README.md · relation: semantically_similar_to

## Knowledge Gaps
- **13 isolated node(s):** `__session HttpOnly Session Cookie (5-day)`, `rateLimits hashKey 60s Cooldown`, `legacyProfiles Collection`, `[auth] Masked Log Lines (maskEmail)`, `Roll Number Format (24 03 001, sections of 60)` (+8 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 195 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `App Layout & SEO` to `Auth & Profile Forms UI`, `Auth Server Actions`, `Profile Directory & Mapping`, `Shared UI Components`, `Profile Schema & Series Backfill`, `Avatar Upload API`, `Build Tooling Deps`, `Runtime Dependencies`?**
  _High betweenness centrality (0.128) - this node is a cross-community bridge._
- **What connects `__session HttpOnly Session Cookie (5-day)`, `rateLimits hashKey 60s Cooldown`, `legacyProfiles Collection` to the rest of the system?**
  _13 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Auth & Profile Forms UI` be split into smaller, more focused modules?**
  _Cohesion score 0.05464725643896976 - nodes in this community are weakly interconnected._
- **Why does `firebase-admin` connect `Profile Photo Migration` to `Student Data Services`, `Auth Server Actions`, `Profile Schema & Series Backfill`, `Signed Tokens & Legacy Migration`, `Build Tooling Deps`, `Seeded Account Activation`, `Firestore Backup Script`?**
  _High betweenness centrality (0.106) - this node is a cross-community bridge._
- **Should `Student Data Services` be split into smaller, more focused modules?**
  _Cohesion score 0.07289002557544758 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Auth & Profile Forms UI` to `Auth Server Actions`, `Profile Directory & Mapping`, `App Layout & SEO`, `Shared UI Components`, `Admin Email Announcements`, `Build Tooling Deps`, `Runtime Dependencies`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `students.server.ts Server Action Surface` and `/api/auth/register and /api/auth/login (email/password)`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
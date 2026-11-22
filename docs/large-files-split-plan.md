# Splitting the two largest files

`src/pages/admin/AdminDashboard.jsx` (about 7,100 lines) and `src/pages/patient/PatientTrack.jsx` (about 1,900 lines) are hard to review.
A security change in one tab means reading thousands of unrelated lines. Split them in small, separate commits.
Each step only moves code, so the screens stay the same.

## AdminDashboard.jsx

### Step 0: delete dead code (about 550 lines, no behaviour change)
Nothing renders these, because newer versions replaced them:

| Unused | Replaced by |
|---|---|
| `AdminUsersTab` | `ScalableAdminUsersTab` |
| `CoursesTab` | `PaginatedCoursesTab` |
| `SimulationsTab` | `ScalableSimulationsTab` |

### Step 1: one file per tab
Create `src/pages/admin/tabs/` and move each tab with its private helpers:

| New file | Moves |
|---|---|
| `AdminsTab.jsx` | `ScalableAdminUsersTab` (role changes go through `admin_set_role`) |
| `CoursesTab.jsx` | `PaginatedCoursesTab`, `CourseEditorModal`, `ModuleEditor`, `SectionEditorModal` |
| `InstructorsTab.jsx` | `InstructorsTab` |
| `WorkshopsTab.jsx` | `WorkshopsTab` |
| `BlogTab.jsx` | `BlogTab`, `BlogRichTextEditor`, `BlogDraftPreview` |
| `CategoriesTab.jsx` | `BlogCategoriesTab`, `CourseCategoriesTab` |
| `TestimonialsTab.jsx` | `TestimonialsTab` |
| `LeaderboardTab.jsx` | `LeaderboardTab` |
| `TeamPlansTab.jsx` | `TeamPlansTab` |
| `CertificateSettingsTab.jsx` | `CertificateSettingsTab` |
| `HomepageTab.jsx` | `HomepageTab` |
| `SimulationsTab.jsx` | `ScalableSimulationsTab` |
| `QuizzesTab.jsx` | `QuizManagementTab` |
| `TipsTab.jsx` | `AdminTipsTab` |

Shared helpers (formatters, upload helpers, constants) go in `src/pages/admin/adminShared.js`. `AdminDashboard.jsx` keeps only the layout, the tab list and the access check, at about 300 lines.

### Step 2: load tabs on demand
Use `React.lazy` for each tab so the admin bundle loads only the open tab.

## PatientTrack.jsx

PatientTrack is one component with many sections. Split it into:

| New file | Contains |
|---|---|
| `patient/track/usePatientTrackData.js` | Loading, realtime refresh and the POS RPC calls |
| `patient/track/TrackSummary.jsx` | Header progress cards |
| `patient/track/TrackOrders.jsx` | Prescription and order timeline |
| `patient/track/TrackDeliveries.jsx` | Delivery status |
| `patient/track/TrackNotifications.jsx` | Notifications list |
| `patient/track/trackFormat.js` | Status labels and date helpers |

This also fixes the two existing `useMemo` dependency warnings, because each section gets only the data it uses.

## Rules for each step
- Moves only, no logic changes, one tab per commit.
- Run `npm run lint`, `npm run build` and the admin smoke test (open each tab) after each commit.
- Keep the admin access check (`AdminRoute` + `AdminMfaGate`) in the parent, never inside the tabs.

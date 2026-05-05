# NoteFlow — Rubric Checklist (503073 Final Project)

This checklist maps every of the 28 graded rubric items to a concrete demo flow,
the API endpoints involved, and the automated tests that already cover the item.

> **Demo accounts** (after `php artisan migrate:fresh --seed`):
> - alice@example.test / `Password123!`
> - bob@example.test  / `Password123!`

| #  | Rubric item | Demo path | Backend route(s) | Test coverage |
|----|-------------|-----------|------------------|---------------|
| 1  | Sign-up + auto-login + activation email | `/register` → fill form → auto-redirect to dashboard, banner shows "Verify email" | `POST /api/register` | `AuthTest::test_user_can_register_and_receives_token_and_verify_email_event` + e2e `auth.spec.js` |
| 2  | Email verification (signed URL, hash check) | Click link in email → `/email/verified` page | `GET /api/email/verify/{id}/{hash}` (signed) | `AuthTest::test_email_verification_link_marks_user_verified` + `…with_invalid_hash_is_rejected` |
| 3  | Login (token issuance) | `/login` → enter credentials → dashboard | `POST /api/login` | `AuthTest::test_user_can_login_and_receive_token` + `…wrong_password` |
| 4  | Password reset (link + OTP) | `/forgot-password` → choose Link or OTP → `/reset-password` or `/reset-password/otp` | `POST /api/forgot-password`, `POST /api/forgot-password-otp`, `POST /api/verify-otp`, `POST /api/reset-password{,-otp}` | `AuthTest::test_password_reset_otp_flow_full` + `…wrong_code_fails` |
| 5  | Edit profile (display name) | `/profile` → change name → Save | `PUT /api/user` | `ProfileTest::test_user_can_update_display_name` |
| 6  | Avatar upload / delete | `/profile` → upload avatar | `POST /api/user/avatar`, `DELETE /api/user/avatar` | `ProfileTest::test_user_can_upload_avatar`, `…delete_avatar`, `…rejects_non_image` |
| 7  | Change password (auth) | `/change-password` → enter current + new + confirm | `POST /api/user/password` | `ProfileTest::test_change_password_*` |
| 8  | User preferences (theme/font/colors/default-view) | `/preferences` → toggle dark, font, colors, default view | `GET/PUT/DELETE /api/preferences` | `PreferencesTest` (5 cases) |
| 9  | Auto-saved title | Create note, type title, refresh — title persists | `PUT /api/notes/{id}` (debounced) | `NoteCrudTest::test_partial_update_only_title_keeps_content` |
| 10 | Default sort by recency | Dashboard list ordered by `updated_at` desc | `GET /api/notes` | `NoteCrudTest::test_pinned_notes_appear_first` (covers ordering invariant) |
| 11 | Create note (title + content only) | "+ New" button → enter title + body | `POST /api/notes` | `NoteCrudTest::test_create_note_with_only_title_and_content`, `…rejects_extra_fields_like_password` |
| 12 | Edit / partial auto-save | Type → 300 ms later request fires with only changed field | `PUT /api/notes/{id}` | `NoteCrudTest::test_partial_update_only_title_keeps_content` |
| 13 | Delete note | Card → menu → Delete | `DELETE /api/notes/{id}` | `NoteCrudTest::test_user_can_delete_own_note`, `…cannot_delete_other_users_note` |
| 14 | View own notes only (privacy) | Login as Bob — Alice's notes hidden | `GET /api/notes` (scope by user) | `NoteCrudTest::test_user_only_sees_own_notes` |
| 15 | Image attachments | Editor → image button → pick file(s) | `POST /api/notes/{id}/attachments`, `DELETE /api/notes/{id}/attachments/{att}` | `AttachmentTest` (5 cases) |
| 16 | Pin sticky-top sort | Pin a note → it floats to the top | `PATCH /api/notes/{id}/pin` | `NoteCrudTest::test_pinned_notes_appear_first`, `…pin_toggle` |
| 17 | Search by title or content | Sidebar search → "shopping" returns 2 notes | `GET /api/notes/search?q=…` | `NoteCrudTest::test_search_finds_by_title_or_content` |
| 18 | Create / list labels | Sidebar → "+ Add label" → name + color | `POST /api/labels`, `GET /api/labels` | `LabelTest::test_user_can_create_label`, `…unique_per_user` |
| 19 | Rename / delete label without removing the note | Sidebar → label menu → Rename / Delete | `PUT /api/labels/{id}`, `DELETE /api/labels/{id}` | `LabelTest::test_user_can_rename_label_*`, `…deleting_label_does_not_delete_note` |
| 20 | Filter notes by label | Click label in sidebar (multi-select) | `GET /api/notes?label_ids=…` | `NoteCrudTest::test_filter_by_label_ids` |
| 21 | Password-protected notes (set / unlock) | Note menu → Lock → set password → reload requires unlock | `PATCH /api/notes/{id}/password`, `POST /api/notes/{id}/unlock` | `PasswordLockTest::test_owner_can_set_password_*`, `…unlock_returns_content_*`, `…locked_note_hides_content_in_index` |
| 22 | "Better" lock flow (set, change, disable) | Lock modal exposes 3 tabs requiring current password for change/disable | same endpoint, different `action` | `PasswordLockTest::test_change_*`, `…disable_*`, `…set_when_password_already_exists_*` |
| 23 | Sharing (read / edit) + recipient notification | Share modal → enter Bob's email → Bob sees in "Shared with me" + email + in-app notification | `POST /api/notes/{id}/share`, `PATCH /api/notes/{id}/share/{shareId}`, `DELETE /api/notes/{id}/share/{shareId}` | `ShareTest` (9 cases including privacy) |
| 24 | Real-time collaboration | Two browsers on the same shared note — edits propagate | `Reverb` private channel `note.{id}`, presence `presence-note.{id}` | `RealtimeTest::test_updating_a_shared_note_broadcasts_note_updated`, `…unshared_note_does_not_broadcast` + e2e `realtime-pwa.spec.js` |
| 25 | Status icons (locked / shared / pinned) | Dashboard cards show pin, lock, group icons | n/a (frontend) | covered in e2e flows |
| 26 | Dark / light theme & responsive | `/preferences` → switch theme; resize window | n/a (frontend) | manual demo |
| 27 | PWA / offline | Toggle Network → "Offline"; reload → app shell loads, queue badge counts pending mutations | Workbox + IndexedDB queue | e2e `realtime-pwa.spec.js::offline_reload_*` |
| 28 | Deployment readiness | `docker compose up -d` builds nginx + php-fpm + mysql + reverb | `docker-compose.yml`, `.env.docker.example` | manual demo (see Phase 9) |

## How to run the test suites

```bash
# Backend feature tests (PHPUnit, SQLite in-memory)
cd backend
php -d extension=pdo_sqlite -d extension=sqlite3 artisan test

# Frontend unit tests (Vitest)
cd frontend
npm test

# Frontend end-to-end tests (Playwright)
# 1. Start backend:   php artisan serve --port=8000
# 2. Start frontend:  npm run dev
# 3. In a third tab:  npm run test:e2e
```

## Demo dataset (after seeder)

| Note | State |
|------|-------|
| Welcome to NoteFlow | pinned, labelled "Work" |
| Locked diary | password = `openme`, labelled "Personal" |
| Project roadmap | shared with bob@example.test (edit) |
| Buy groceries | regular note, used for ordering checks |
| Bob's sandbox | only visible to Bob |

# localStorage keys

Keys recovered from the v6.9 dist. Prefixes seen: `oriex_`, `oritan_`,
`genron_`, plus a few `oriex-*` (hyphen) keys used by the mini-game.

## Per-user data (do NOT move back to Firestore)

| key | purpose |
|-----|---------|
| `oriex_review_{uid}` | spaced-repetition review items |
| `oriex_review_migrated_{uid}` | "1" once migrated off Firestore |
| `oriex_userVocab_{uid}` | personal vocabulary (マイワード) |
| `oriex_userVocab_migrated_{uid}` | "1" once migrated off Firestore |

Handled by `src/features/vocabulary/localReviewStore.js` and
`localUserVocabStore.js`.

## Other per-user / app state

| key | purpose (best guess) |
|-----|----------------------|
| `oriex_review_folders` | review folder structure |
| `oriex_review_assign` | review assignment |
| `oriex_profile_bg` | profile background selection |
| `oriex_goal` | study goal |
| `oriex_hamu` | hamster room state (incl. name?) |
| `oriex_timer` | timer state |
| `oriex_tasks_seen` | seen tasks |
| `oriex_friend_sig_{uid}` | friend signature/sync marker |
| `oriex_bgm_on1`, `oriex_speak_on1`, `oriex_tts_on` | audio toggles |
| `oriex_stage_time_on` | "add stage time to study record" toggle |
| `oriex_run_*` (best/plays/diff/collection/ach/dodged) | mini-game records |
| `oritan_book_logs`, `oritan_book_shelf` | local cache of books? |
| `oritan_notes`, `oritan_tweets`, `oritan_readTimelineLogs` | notes / posts / timeline cache |
| `oritan_palette_items`, `oritan_rev_autodel` | misc settings |
| `genron_theme`, `oriexDark` | theme / dark mode |
| `genron_anthropicApiKey` | (an embedded API-key field — review before reusing) |
| `genron_announcementDismissed`, `genron_readAnnouncements` | announcements state |
| `genron_lastCategory`, `genron_lastReadChat`, `genron_notifChatUnread`, `genron_notifVocabAdd` | misc UI state |

These are reference notes — confirm exact shapes against the real app before
depending on them.

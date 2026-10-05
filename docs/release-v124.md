# VitalCore v124: invite only, and your data stays yours

Until now anyone who found the app's address could open it, and with the right email could make an account. Now the app opens on a sign-in screen. Only people you invite can get past it. Each person sees only their own data, in the app and in the cloud. Your personal notes are also out of the public code.

## Before you use it
Do these in order. Steps 2 to 6 are in the Supabase dashboard.
1. **Push from GitHub Desktop, then open the app online on each phone** so the new version loads. Settings should show Version 124. A phone that is signed in carries on as before. A phone that is not signed in now shows the sign-in screen: sign in with your email.
2. **Turn off sign-ups.** Authentication > Sign In / Providers > turn off "Allow new users to sign up". Save.
3. **Check who has an account.** Authentication > Users. If you see an email you do not know, delete it there.
4. **Run the database script.** SQL Editor > New query. Paste all of `docs/supabase-v124.sql` and press Run. It changes no data and is safe to run again. In the result, each VitalCore table should show `rls_on` true, `own rows (authenticated)`, and `signed_out_can_read` false. If it stops with an error, send me the message.
5. **Limit where sign-in links go.** Authentication > URL Configuration. Set the Site URL to `https://pepperparker8.github.io/vitalcore/`. Under Redirect URLs, keep only that address.
6. **Invite people.** Authentication > Users > Add user > Send invitation. They tap the link in the email on their phone and the app opens signed in. Each person needs their own Intervals.icu and Anthropic keys in Settings. Polar stays yours only. If an invite email never arrives, Supabase's built-in email may only send to your own team: set your own email sender under Authentication > Emails > SMTP Settings.
7. **Update the backend** after the app is live: in Terminal, go to `~/vitalcore-backend` and run `vercel --prod`. Then open Settings > Polar and press Check connection.

## Added
- **A sign-in wall.** Until an invited account signs in on a phone, the app shows only the sign-in screen. It cannot be closed or tapped past. Once signed in, the app works offline as before.
- **No new accounts from the app.** An email that was not invited gets "This email is not on the invite list. Ask for an invite, then try again." Nothing is created.
- **Signing out locks the app.** Your changes upload first, then the sign-in screen comes back. Your data stays on the phone and in the cloud.
- **Each phone remembers whose data it holds.** If a different person signs in on your phone, the app warns first. If they go ahead, your data is cleared from that phone only, keys included. It stays safe in your account. If they cancel, nothing changes.
- **Rows belong to one person.** The database script makes every table answer only to its owner. Someone signed out sees nothing at all. Two people can both have a sleep night or check-in on the same date.
- **Polar login is safer.** The backend key is no longer put in a web address, where browser history and server logs keep it. Connect to Polar now asks the backend for Polar's sign-in page and only goes there if it really is Polar's.
- **Clearer link errors.** An expired sign-in link says so and asks for a new one.
- **Settings says it plainly:** "Only people you invite can sign in, and each person sees only their own data."
- **Personal notes moved out of the public code.** Your devices, sports, labs and other personal details are now in a private notes file on this Mac that is never uploaded.

## Removed
- From the backend: the open Intervals.icu relay, which anyone with the address could use, and the Polar login address that carried the key. Neither was used by the app any more.

## Kept
- All scores, charts, the briefing, the outline and sync work exactly as before.
- Your keys stay on each phone and are never uploaded.
- Backups work as before. A restore keeps the phone's account mark.
- The Polar connection, your nights and your other data are unchanged.

## Risks
- **Old phones stop uploading after step 4 until they update.** Their changes wait on the phone and upload once Version 124 loads. Nothing is lost. That is why step 1 comes first.
- **The first sign-in on a phone needs internet.** After that the app works offline.
- **The old personal notes are still in the public history** of earlier versions on GitHub. Removing them from the history means rewriting it, which I did not do. Ask if you want it.
- **The wall is not a lock on the phone itself.** Anyone holding your unlocked phone can open the app, as you chose. Your phone's own screen lock is what protects it.
- **Backend not yet live.** Until you run step 7, the old relay is still online. It reveals nothing of yours, but it should go.

## Checked
- 229 of 229 tests pass in `tests/index.html`. 19 are new: the wall stays up signed out and goes once signed in; sign-in never creates an account; the not-invited, too-many-emails and expired-link messages; a second person on the same phone, both cancelled and confirmed; a new phone never overwrites your cloud profile; uploads and deletes name the person; the Polar connect path; backups; and the database script.
- I ran the database script twice in a row on a test database, with tables set up in several different ways, including a too-open read policy and a table with security off. Two test people each saw only their own rows and could not write or delete the other's. Someone signed out saw nothing, and the Polar login table was closed to the app.
- I looked at the sign-in screen at 360px in light and dark, then at the app signed in with a made-up athlete held in memory only. The wall cannot be tapped away, signing out brings it back with the data kept, there is no sideways scroll and no console errors.
- Settings shows Version 124.
- Not tested on the S24 itself.

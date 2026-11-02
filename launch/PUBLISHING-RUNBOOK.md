# EvolveCI morning publishing runbook

Nothing in this runbook auto-publishes. Complete each readback before moving to the next public claim.

## 1. Freeze the release candidate

- Confirm `main` is clean and the release commit is the intended SHA.
- Run `npm run release:check` from a fresh checkout.
- Confirm all GitHub checks are green on the exact release SHA.
- Confirm `package.json`, lockfile, CLI version, changelog, and proposed tag agree.
- Run `npm run launch:production-check`; do not proceed if the checked-in video is still the provisional local-voice preview.

## 2. Publish the package and release

- Confirm the public registry still returns 404 for `@avee1234/evolveci`; this proves the package needs a one-time bootstrap publication.
- From the clean, tagged `v0.1.0` checkout, authenticate with npm account 2FA and run `npm publish --access public --provenance=false`. The explicit override is required because a local bootstrap publish cannot produce GitHub Actions provenance.
- Read `@avee1234/evolveci` directly from the public npm registry.
- Install the exact published version in a temporary directory and run `evolveci --version`.
- Configure npm trusted publishing for owner `abhid1234`, repository `evolveci`, workflow `release.yml`, and environment `npm` so later releases publish with OIDC provenance.
- Create the GitHub release from [`release-copy.md`](release-copy.md) only after npm readback succeeds. The idempotent workflow will detect the existing `0.1.0`, skip a duplicate publish, and verify registry readback.
- Verify the release page, assets, tag, and commit independently.

## 3. Establish public destinations

- Confirm the canonical repository and deterministic demo instructions.
- Confirm the canonical deterministic demo link resolves to the README instructions.
- Replace every `TBD`, pending link, and `{{SUBSTACK_URL}}` token in [`FACT-CHECK.md`](FACT-CHECK.md) and the social drafts. Use the exact versioned GitHub release URL and the final `abhid.substack.com/p/...` essay URL. After opening each required surface signed out, prefix its ledger state with the exact `LIVE_VERIFIED:` marker. The video and essay already use stable repository and npm destinations, so they do not need to be recaptured after publication.
- Run `npm run launch:check` after the replacements.
- Run `npm run launch:public-check`; it must remain red until every required row in the fact ledger is public.

## 4. Publish the essay

- Open [`blog-evolveci-substack.html`](blog-evolveci-substack.html).
- Copy the helper-box title and subtitle into Substack's native fields.
- Select the body below the blue divider and paste once.
- Confirm all three figures uploaded, headings survived, code is legible, and links resolve.
- Add the primary CTA as a native Substack button if desired.
- Publish, open the public URL in a signed-out view, and record it in `FACT-CHECK.md`.

## 5. Post in sequence

Recommended order:

1. Substack essay, so every later channel has a durable deep link.
2. LinkedIn with the launch video; put repository, essay, npm, and demo links in the first comment.
3. X with the one-versus-four proof image or video.
4. Show HN with the repository as the primary link and the technical body from [`launch-posts.md`](launch-posts.md).
5. Reddit only in communities where the technical experiment is on-topic.
6. Product Hunt only if the hosted surface and install path are stable enough for unfamiliar users.

Use [`ACCESSIBILITY.md`](ACCESSIBILITY.md) for alt text and captions.

## 6. Fifteen-minute readback

- Open each post signed out and confirm the media, first line, links, and previews.
- Confirm npm, release, repository, demo, and essay all point to one another.
- Correct broken copy or links once; do not duplicate posts to work around an unresolved issue.
- Capture the final public URLs in `FACT-CHECK.md` for future handoffs.

## Stop conditions

Do not claim “launched” if any required registry, release, demo, or essay URL cannot be read back publicly. A local artifact, open editor, successful upload request, or green build is not equivalent to a live public surface.

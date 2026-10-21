# Code signing with SignPath

Windows releases are meant to be signed with a free certificate from
[SignPath Foundation](https://signpath.org), so that SmartScreen stops warning and Smart App
Control lets BudsBridge run. The release workflow already does the signing; it switches on once
the project is set up in SignPath.

## One-time setup

1. **Apply** at [signpath.org/apply](https://signpath.org/apply.html) with this repository. The
   [conditions](https://signpath.org/terms) are met: MIT license, no closed-source parts, built
   from this repository by GitHub Actions on GitHub-hosted runners, released, and described in
   the README, which also has the required
   [code signing policy](../README.md#code-signing-policy). SignPath also looks for some public
   reputation, so stars, users and links help.
2. **Turn on two-factor authentication** on GitHub and on SignPath; it is a condition.
3. Once accepted, in SignPath:
   - make sure the project uses the trusted build system **GitHub.com**;
   - create two **artifact configurations**, `app` and `installer`, from the files in
     [`artifact-configurations/`](artifact-configurations). They sign only BudsBridge's own
     files and require the product name and version to match the release;
   - note the **organization ID**, the **project slug** and the **signing policy slug**
     (usually `release-signing`), and create an **API token** for a user who may submit
     signing requests.
4. In this repository, **Settings → Secrets and variables → Actions**:
   - variable `SIGNPATH_ORGANIZATION_ID`: the organization ID;
   - secret `SIGNPATH_API_TOKEN`: the API token;
   - variables `SIGNPATH_PROJECT_SLUG` and `SIGNPATH_POLICY_SLUG`, only if they aren't
     `BudsBridge` and `release-signing`.

## Every release

Run the release workflow as before. It stops twice and waits for you to **approve the signing
request in SignPath**, first for the program, then for the installer (each waits up to an hour).
SignPath checks that the files were built by this repository's workflow before it signs them.

The signature names **SignPath Foundation** as the signer; the files' own details still say
BudsBridge by Muhammad Shakaib Arsalan.

## Not covered yet

The installer writes an uninstaller at install time, and that file isn't signed, so where Smart
App Control is on, Windows may block uninstalling. Signing it too needs the installer build to call
SignPath while it runs, which is the next step. The portable `BudsBridge.exe` doesn't need an
uninstaller at all.

# Phase 00 — Toolchain inventory

Date: 2026-07-13 · Host: Windows 11 Pro 10.0.26200 (x64)

| Tool | Status | Version / location | Notes |
|---|---|---|---|
| Node.js | ✅ | v24.14.1 | satisfies `engines.node >= 22.14.0` |
| npm | ✅ | 10.7.0 | engines requires >= 11 → non-blocking warning; CI uses Node 22 image (bundled npm) |
| Git | ✅ | 2.53.0.windows.2 | |
| GitHub CLI | ✅ | gh 2.89.0, authenticated as ihabkhaled | release publishing available |
| Java JDK | ✅ (provisioned this session) | Temurin 21.0.11 LTS at `D:\android-toolchain\jdk\jdk-21.0.11+10` | required for AGP/Capacitor 8 |
| Android SDK | ✅ (provisioned this session) | `D:\android-toolchain\sdk` — platform-tools, platforms;android-36, build-tools;35.0.0, licenses accepted | non-interactive install via sdkmanager |
| Gradle | ✅ via wrapper | provided by generated Capacitor android project | |
| Xcode / macOS | ❌ not available | Windows host | iOS project can be generated + synced; compile/sign requires macOS — documented honestly (orchestrator rule) |
| Firebase CLI | ❌ not installed | — | rules/index deploy done via console or later CI; emulator tests documented as gap |
| Gitleaks | ❌ not installed | — | Trivy secret scan used instead |
| Trivy | ✅ | 0.71.0 | fs + secret scanning available locally |
| Playwright browsers | ✅ (project dependency) | @playwright/test 1.55 | installed via npm |

Blockers recorded: none critical for Android APK delivery. iOS compile/sign is environment-blocked (not a scope failure).

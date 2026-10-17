# Marketplace submission preparation plan

Status on **2026-10-18: plan only**. No product has been created, uploaded, submitted for review or published in Maker Console as part of this work. GitHub beta releases remain separate. The project will keep its original icon and MIT license; this plan does not request use of the Nanoleaf logo.

## Preparation sequence

### 1. Confirm the product and test environment

- Keep the existing plugin and action identifiers. Confirm the Marketplace product name and Maker organization before creating a listing; the organization should match the manifest author. Check name availability and clearly identify the integration as unofficial. See Elgato's [plugin guidelines](https://docs.elgato.com/guidelines/stream-deck/plugins/).
- Propose a free macOS listing for the USB PC Screen Mirror Lightstrip (NL82K2), with Stream Deck + required for dial/touch actions. State that Nanoleaf Desktop with local MCP enabled is required and that automatic launch is configured per control. Do not describe Wi-Fi/LAN lights or Windows as supported.
- Choose a separate test machine or obtain explicit approval for any local installation. The same plugin identifier can be used by several profiles; selecting a test profile alone does not isolate an installed plugin update from those profiles.
- Review Elgato's [AI usage policy](https://docs.elgato.com/guidelines/products/#ai-usage) before investing in submission assets. It requires disclosure of AI use for the product, description or media, and excludes products it considers entirely AI-created. This project used AI assistance; describe that accurately alongside the maintainer's requirements, design decisions and physical validation. Do not assume these activities guarantee eligibility. Confirm any uncertainty with Maker Relations after separate approval; no inquiry is sent by this plan.

### 2. Finish the listing materials

Prepare an English product name, a concise description, support/setup/privacy links and release notes. Use the USB-only scope and the distinction between declared minimums and tested versions from [Validation](VALIDATION.md). Do not publish actual device identifiers, personal scene names or profile exports.

Create an original 288 × 288 PNG app icon, a 1920 × 960 PNG thumbnail and three gallery items. Proposed gallery subjects are power/scene keys, brightness visualization and text sizes, and Scene Browser gestures/setup. Keep image text in English and use only artwork with the necessary rights. These dimensions and gallery requirements come from the [product guidelines](https://docs.elgato.com/guidelines/products/); the required upload fields are listed in [Submitting Products](https://docs.elgato.com/maker-console/submitting-products/).

Record a short hardware demonstration covering power/state feedback, scene keys, both dials, text-size changes, and cold-start launch with the option visibly enabled. Hardware-dependent products require a functional demonstration video, and submission materials must be in English. Elgato reviews new products and versions; its stated review window is 4–10 working days, not a guaranteed publication date. See the [review process](https://docs.elgato.com/maker-console/review-process/).

### 3. Freeze and verify the submission package

- Build from the intended release commit, run automated tests and official validation, then package and record the installer checksum and version. Verify the archive includes the original icon and privacy/security/license notices without private files.
- Confirm the package's version is newer than earlier public releases and the proposed stable version is newer than its betas. Do not change identifiers or reset saved settings to solve version ordering.
- Test the exact package with the six physical groups in [Validation](VALIDATION.md), plus fresh install and upgrade/settings retention in the approved test environment. Report app-version changes separately.
- Review DRM readiness: Node SDK v2 or later, SDKVersion 3 and minimum Stream Deck 6.9 or later are Elgato's stated prerequisites; distributed files must not be modified and the manifest must not be read at runtime. The embedded client version avoids needing a runtime manifest read. See [Distribution](https://docs.elgato.com/streamdeck/sdk/introduction/distribution/).

### 4. Request approval before uploading

Present the exact installer, version/checksum, listing text, original artwork, demonstration video and remaining test limits for approval. This approval is separate from publishing a GitHub beta. Do not create a Maker Console product, upload files or send a submission email while the task remains plan-only.

### 5. Test the processed package before publication

After approval, upload through Maker Console with **Publish after review disabled**. Elgato documents downloading the processed package from the product's Versions tab for DRM testing. Re-run installation, saved-settings, control and cold-start checks on that exact processed package; an ordinary GitHub installer does not prove DRM compatibility. See [Testing with DRM](https://docs.elgato.com/streamdeck/sdk/introduction/distribution/#testing-with-drm).

Resolve review feedback and obtain final publication approval. Keep the same identifiers and publish accurate release notes without promising support beyond the tested scope.

## Ready and outstanding

| Item | Current status |
| --- | --- |
| Original public icon, MIT license, support repository | Available |
| USB-only scope and privacy/security documentation | Available |
| Six physical regression groups on installed beta.3 | Passed by tester report; not a beta.4 or DRM package test |
| Version/build consistency safeguards | Included in beta.4 release preparation |
| Exact submission-package physical installation | Pending |
| Listing name/organization and free listing confirmation | Pending before product creation |
| AI assistance disclosure and Marketplace eligibility review | Required before submission; acceptance not assumed |
| Marketplace artwork and hardware demonstration video | Planned, not created by this preparation task |
| Maker Console upload, review and processed-package testing | Not started |
| Marketplace publication | Not authorized by this plan |

## 한국어 요약

진행 순서는 **상품명·테스트 환경 및 AI 활용 고지·제출 자격 검토 → 영문 소개와 이미지·실기기 영상 준비 → 제출할 설치 파일 검증 → 업로드 승인 → 자동 공개를 끈 상태로 심사·DRM 처리본 검증 → 최종 공개 승인**입니다. 이번에는 계획만 작성하며 기존 프로필·설치본을 변경하거나 Marketplace에 업로드하지 않습니다. Elgato는 AI 활용 고지를 요구하고 전적으로 AI로 제작되었다고 판단한 제품은 제외하므로, 승인 가능성을 미리 단정하지 않습니다.

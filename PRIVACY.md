# Privacy

This document describes the plugin's data use. Nanoleaf Desktop, Stream Deck, GitHub, and any profile synchronization or backup services have their own behavior and privacy terms.

## Local control

The plugin sends device discovery, scene discovery, state, and control requests to Nanoleaf Desktop on the same computer at `http://127.0.0.1:15765/mcp`. The destination is fixed. Control does not require a plugin account, API key, or paid AI service.

This local connection does not imply that Nanoleaf Desktop itself works entirely offline. Nanoleaf Desktop may independently communicate with cloud services or devices on the local network.

## Settings and device information

The plugin processes device identifiers, available scene names, and light state to populate button settings and perform the action you select. The selected device ID, scene name, power action, and app-launch preference are stored in Stream Deck's local button settings.

Device IDs and custom scene names can be identifying or personal. Exported Stream Deck profiles, backups, and synchronized copies may include them. Review a profile before sharing it. Plugin installation does not distribute the maintainer's personal profiles, device state files, or scene definitions.

## Reports and diagnostics

Information you choose to submit through GitHub is handled by GitHub and may become public. Review logs, screenshots, and profile exports before attaching them. Remove device IDs, custom scene names, local usernames and paths, tokens, and unrelated account information. Prefer a minimal reproduction with a synthetic device identifier over a complete profile export.

Report suspected security issues through the process in [SECURITY.md](SECURITY.md).

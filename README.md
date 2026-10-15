# al-status-line
AL Status for Claude Code mods

A Claude Code status line for Business Central AL projects:

```
☁️ sandbox · v1.0.0.0 · ✓ · Last publish ⬆ 15/10 17:21
```

- **Environment**: first `"request": "launch"` config in `.vscode/launch.json`
- **Version**: `version` in `app.json`
- **Compile**: `✓` or `✗ n errors` from the last `al_compile` / `al_build` / `alc` run, a newer `.app` built in VS Code, or live VS Code diagnostics (when `mcp__ide__getDiagnostics` is already allowed)
- **Last publish**: a successful `al_publish`, or `.vscode/rad.json` emptied by a VS Code publish

## Install

At the prompt of a terminal session:

```
/plugin install al-status --marketplace NathapolDev/al-status-line
```

Answer `y` to add the marketplace, then pick a scope (user scope loads it in every session).

From a shell:

```
claude plugin install al-status --marketplace NathapolDev/al-status-line
```

In the desktop app, where `/plugin` does not run: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `NathapolDev/al-status-line`, then **Add plugin**.

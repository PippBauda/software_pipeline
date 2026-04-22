---
name: pipeline-orchestrator-preflight
description: "R.0 Entry Preflight procedure. Validates environment (git, gh, runtimes) and installs LSP servers. Load and execute before B1, C-ADO1, R.5 re-entry, first dispatch after C1, and O8.V start."
---

# Pipeline Orchestrator — Entry Preflight (R.0)

Load this skill and execute R.0 before B1, C-ADO1, R.5 re-entry, first dispatch after C1, and O8.V start.

---

## R.0 — Entry Preflight (Mandatory)

**Steps:**

1. Verify `git` CLI available and repository writable
2. `git rev-parse --is-inside-work-tree` succeeds
3. `git status` succeeds
4. If O8.V is in path: verify `gh` CLI available, `gh auth status` valid, `origin` remote configured
5. If `docs/environment.md` exists (O1+): verify declared runtime/package manager CLIs are available
6. **LSP infrastructure setup** (every session): invoke **Builder** (`subagent_type: "builder"`) with this task:

   *"Set up all available OpenCode LSP language servers on this system. Steps:*
   *1. Fetch the LSP server table from `https://opencode.ai/docs/lsp` — extract the full list of supported servers with their file extensions, requirements, and whether they auto-install.*
   *2. If the URL is unreachable: search the web for 'OpenCode LSP servers documentation site:opencode.ai' to find the current URL and fetch that instead.*
   *3. If web search also fails: fall back to this built-in list — auto-install: astro, bash, clangd, lua-ls, kotlin-ls, php-intelephense, svelte, terraform, tinymist, vue, yaml-ls; tool-dependent: gopls (go), rust-analyzer (rustc), pyright (python3), typescript (node+npm), dart, sourcekit-lsp (swift), csharp (dotnet), jdtls (java), ruby-lsp (ruby), zls (zig), elixir-ls (elixir), gleam, clojure-lsp, hls (haskell-language-server-wrapper), ocaml-lsp (ocamllsp), nixd, deno.*
   *4. For each server in the list: check if its requirement is met on this system. If yes and the server needs installation, install it. If the requirement is not met, skip silently.*
   *5. Return a structured summary: installed (name + version), already present (name + version), skipped (name + reason: CLI not found), failed (name + error)."*

   Record the Builder's summary in `docs/runtime-preflight.md` under an `## LSP Servers` section. This runs once per session — do not repeat on subsequent stages.

**Outputs:** `docs/runtime-preflight.md` (snapshot), `logs/orchestrator-preflight-<N>.md` (detailed log)

**Decision:** PASS → continue | WARN → continue with warning in executive summary | BLOCKED → halt, request user intervention (not bypassable by automode)

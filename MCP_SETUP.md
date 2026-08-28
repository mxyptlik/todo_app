# UI MCP setup for the Todo App

## The short answer

Use two complementary MCP servers:

| MCP | Role in this project | Is it an app runtime dependency? |
| --- | --- | --- |
| **Figma remote MCP** | Creates/reads the editable visual source of truth: design tokens, desktop/mobile screens, and component states. | No |
| **21st MCP** | Supplies high-quality UI inspiration and implementation-ready component patterns for React/Tailwind projects. | No |

Figma is the visual design authority. 21st is the component-quality accelerator. The app must still build and run when neither is connected.

## Recommended one-time setup

### 1. Connect Figma remote MCP - preferred

This is the lowest-effort way to give Codex structured visual context and the ability to create an editable design. The remote connection is preferred over Figma Desktop because it has the broader capability set.

**In the Codex app**

1. Open **Plugins** in the upper-left corner.
2. Find **Figma**, click **+**, then select **Install Figma**.
3. Complete the Figma authorization and allow access.
4. Start a new Codex task in the target repository. The agent can now use the available Figma MCP tools.

**In Codex CLI**

```bash
codex mcp add figma --url https://mcp.figma.com/mcp
```

Complete the authentication prompt, then restart the Codex session if it does not immediately show the Figma tools.

Use this verification prompt in Codex:

> Confirm that the Figma MCP is connected. Create a new editable Figma file named "Todo App - Design System and Screens" with desktop and mobile task-list frames, reusable components, and tokens. Then use it as the visual source of truth while implementing the app.

Do not paste Figma credentials or exported access tokens into the project.

### 2. Connect 21st MCP - recommended UI component source

21st is the current successor to Magic MCP. It is especially useful when the agent needs to explore polished, non-generic UI patterns and retrieve focused Tailwind/React component building blocks.

1. Create a 21st API key at [21st.dev/settings/api-keys](https://21st.dev/settings/api-keys).
2. Keep the key in your own shell environment, not in the repository:

```bash
export API_KEY_21ST="your-key-here"
```

3. Add this to your user-level `~/.codex/config.toml`:

```toml
[mcp_servers.21st]
url = "https://21st.dev/api/mcp"
bearer_token_env_var = "API_KEY_21ST"
enabled = true
```

4. Restart Codex and confirm it can list/use the `21st` tools.

Alternatively, use the 21st Codex plugin flow:

```bash
codex plugin marketplace add 21st-dev/codex-plugin
```

Then open the Codex plugin browser and install **21st**. The plugin registers the same remote MCP and uses `API_KEY_21ST` for authentication.

Use this verification prompt in Codex:

> Use the 21st MCP to find or generate three refined task-manager component patterns. Choose one coherent visual direction and write the rationale, tokens, and chosen components to `docs/design-system.md` before implementing the React UI.

## How the build agent should use the servers

1. Ask 21st for relevant task/productivity UI references. Keep only pieces that improve the task composer, filter controls, progress indicator, task row, and empty/error states.
2. In Figma, create the small design system and two target frames. Avoid spending time on a broad design exploration.
3. Code the chosen design in React/Tailwind with accessible, responsive behavior.
4. Test the UI rather than assuming generated components work correctly.
5. Keep the MCP tools out of the deployed app. They are design/development assistants, not a customer-facing service.

## If you want only one MCP

Install **Figma remote MCP**. It gives Codex the strongest end-to-end design context and requires only the Codex/Figma plugin authorization, not a project change. The agent can then build the implementation from its own design file.

## Safety and troubleshooting

- Keep `API_KEY_21ST` in your shell or a password manager. Never add it to `.env.example`, compose files, GitHub, or a screenshot.
- If 21st returns a component that needs a package the project does not already use, inspect the dependency first and prefer an equivalent in the project's existing UI stack.
- If Figma MCP is unavailable, the agent should create `docs/design-system.md` from the stated design brief and continue. It should not block the app build.
- If the Codex app shows no Figma tools after authorization, ask the workspace administrator whether third-party plugins are permitted.

## Primary references

- [Figma: connect the remote MCP server to Codex](https://help.figma.com/hc/en-us/articles/39888629089175-Codex-and-Figma-Set-up-the-MCP-server)
- [Figma developer docs: remote Figma MCP server](https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/)
- [21st MCP installation guide](https://github.com/21st-dev/magic-mcp/blob/main/llms-install.md)
- [21st Codex plugin configuration](https://github.com/21st-dev/codex-plugin)

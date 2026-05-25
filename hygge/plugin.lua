-- quorum Hygge plugin
-- Registers quorum planning members as subagents and injects bootstrap guidance.
-- Config: <active Hygge profile dir>/quorum.json  (same schema as the OpenCode port)

-- ---------------------------------------------------------------------------
-- Defaults (mirrors src/config.ts DEFAULT_CONFIG)
-- ---------------------------------------------------------------------------

local DEFAULT_MEMBERS = {
	{ name = "quorum_sonnet", providerID = "openrouter", modelID = "anthropic/claude-sonnet-4.6", label = "sonnet" },
	{ name = "quorum_gpt5", providerID = "openrouter", modelID = "openai/gpt-5.4", label = "gpt5" },
	{ name = "quorum_gemini", providerID = "openrouter", modelID = "google/gemini-3.1-pro-preview", label = "gemini" },
}

local DEFAULT_TRIGGER_MODE = "auto"

-- ---------------------------------------------------------------------------
-- Minimal JSON parser — only what quorum.json needs.
-- Handles: string values, array of objects with string fields.
-- Does not need a general-purpose parser; quorum.json is shallow and regular.
-- ---------------------------------------------------------------------------

-- Strip JSON-style comments (not valid JSON but defensive) and return the raw string
local function strip_whitespace(s)
	return s:match("^%s*(.-)%s*$")
end

-- Extract a top-level string value: "key": "value"
local function json_string(src, key)
	local pattern = '"' .. key .. '"%s*:%s*"([^"]*)"'
	return src:match(pattern)
end

-- Parse the members array from quorum.json.
-- Returns a list of {name, providerID, modelID, label} tables, or nil plus a reason on failure.
local function parse_members(src)
	-- Find the members array bracket span
	local arr_start = src:find('"members"%s*:%s*%[')
	if not arr_start then
		return nil
	end

	-- Walk forward to find matching ]
	local depth = 0
	local arr_end = nil
	local inside = false
	for i = arr_start, #src do
		local ch = src:sub(i, i)
		if ch == "[" then
			depth = depth + 1
			inside = true
		elseif ch == "]" and inside then
			depth = depth - 1
			if depth == 0 then
				arr_end = i
				break
			end
		end
	end
	if not arr_end then
		return nil
	end

	local arr_src = src:sub(arr_start, arr_end)

	-- Extract each { … } object from the array
	local members = {}
	local pos = 1
	while true do
		local obj_s = arr_src:find("{", pos)
		if not obj_s then
			break
		end

		-- Find matching }
		local obj_depth = 0
		local obj_e = nil
		for i = obj_s, #arr_src do
			local ch = arr_src:sub(i, i)
			if ch == "{" then
				obj_depth = obj_depth + 1
			elseif ch == "}" then
				obj_depth = obj_depth - 1
				if obj_depth == 0 then
					obj_e = i
					break
				end
			end
		end
		if not obj_e then
			break
		end

		local obj = arr_src:sub(obj_s, obj_e)
		local name = json_string(obj, "name")
		local providerID = json_string(obj, "providerID")
		local modelID = json_string(obj, "modelID")
		local label = json_string(obj, "label")

		if
			name
			and providerID
			and modelID
			and label
			and #name > 0
			and #providerID > 0
			and #modelID > 0
			and #label > 0
		then
			members[#members + 1] = {
				name = name,
				providerID = providerID,
				modelID = modelID,
				label = label,
			}
		end

		pos = obj_e + 1
	end

	if #members < 2 then
		return nil, "has fewer than 2 valid entries"
	end

	-- Uniqueness check on name
	local seen = {}
	for _, m in ipairs(members) do
		if seen[m.name] then
			return nil, 'has duplicate member name "' .. m.name .. '"'
		end
		seen[m.name] = true
	end

	return members
end

-- Parse triggerMode from quorum.json source
local function parse_trigger_mode(src)
	local v = json_string(src, "triggerMode")
	if v == "auto" or v == "manual" or v == "off" then
		return v
	end
	return nil
end

-- ---------------------------------------------------------------------------
-- Load config from the active Hygge profile directory.
-- Falls back to defaults on any error.
-- ---------------------------------------------------------------------------

local function read_file(path)
	local file = io.open(path, "r")
	if not file then
		return nil
	end

	local contents = file:read("*a")
	file:close()
	return contents
end

local function resolve_config_path()
	local profile_dir = hygge.profile and hygge.profile.dir
	if profile_dir and #profile_dir > 0 then
		return profile_dir .. "/quorum.json"
	end

	local home = os.getenv("HOME") or "/tmp"
	return home .. "/.config/hygge/quorum.json"
end

local function load_config(config_path)
	local config = {
		members = DEFAULT_MEMBERS,
		triggerMode = DEFAULT_TRIGGER_MODE,
		issues = {},
	}

	-- Read file directly instead of shelling out.
	local ok, src = pcall(function()
		return read_file(config_path)
	end)

	if not ok or not src then
		-- File absent or unreadable — use defaults silently (same as OpenCode port)
		return config
	end

	if strip_whitespace(src) == "" then
		return config
	end

	local members, members_issue = parse_members(src)
	if members then
		config.members = members
	else
		local had_members = src:find('"members"')
		if had_members then
			config.issues[#config.issues + 1] = "quorum.json members array is invalid ("
				.. (members_issue or "could not parse members")
				.. "); using defaults"
		end
	end

	local trigger = parse_trigger_mode(src)
	if trigger then
		config.triggerMode = trigger
	else
		local had_trigger = src:find('"triggerMode"')
		if had_trigger then
			config.issues[#config.issues + 1] =
				'quorum.json triggerMode is invalid; expected "auto", "manual", or "off"; using default "auto"'
		end
	end

	return config
end

-- ---------------------------------------------------------------------------
-- Member system prompt (mirrors src/prompts.ts MEMBER_SYSTEM_PROMPT)
-- ---------------------------------------------------------------------------

local MEMBER_SYSTEM_PROMPT = [[You are one member of a quorum of planning consultants.

Read the planning question carefully and propose a practical approach with rationale.

Requirements:
- Address architecture, components, data flow, and tradeoffs.
- Surface assumptions and open questions that could change the design.
- Keep the response focused and concrete.
- Do not call tools.
- Do not write files.
- Do not claim consensus; provide your independent perspective.]]

-- ---------------------------------------------------------------------------
-- Bootstrap prompt (mirrors src/bootstrap.ts renderBootstrap)
-- ---------------------------------------------------------------------------

local function render_bootstrap(config)
	if config.triggerMode ~= "auto" then
		return nil
	end

	local names = {}
	for _, m in ipairs(config.members) do
		names[#names + 1] = m.name
	end
	local member_list = table.concat(names, ", ")

	return [[<quorum-bootstrap>
You have quorum planning members available as subagents: ]] .. member_list .. [[.

Trigger gate — run before dispatching any implementation subagent or writing code beyond a trivial edit. Answer each question:

1. Are there two or more meaningful design, product, or UX choices that the user has not already decided?
2. Is prior art in this codebase ambiguous, absent, or not an obvious match for the approach?
3. Will this ship user-facing behavior — UI, API surface, data model, auth, or persisted state?

If any answer is yes, load the quorum skill and run quorum first. The quorum's synthesis then becomes the basis for the next step.

If all three answers are no, quorum is not required. Typical skips: obvious bug fixes with a known root cause, typo or wording-only edits, dependency-only bumps, running an existing command, or factual questions. A small ticket with a clear blueprint from prior work and a mechanical implementation path also skips.

If you are unsure, treat the request as planning-class and run quorum.

Quorum is a fan-out and synthesize primitive. Load the quorum skill, dispatch parallel task calls to each member with the same planning prompt, then synthesize: Agreement, Key differences, Partial coverage, Unique insights, Blind spots, Open questions, Proposed design. Surface material open questions to the user via the question tool, then hand off. Quorum does not write spec files, update docs, or gate implementation — caller skills (such as adaptive-planning, to-prd, or to-issues) handle those concerns.

When you have open or clarification questions during a quorum workflow, ask them directly to the user — via the question tool or in prose. Never dispatch clarification questions to subagents via task calls.
</quorum-bootstrap>]]
end

-- ---------------------------------------------------------------------------
-- Main plugin setup
-- ---------------------------------------------------------------------------

local config_path = resolve_config_path()
local config = load_config(config_path)

-- Report config issues (best-effort; hygge does not have a structured log API)
if #config.issues > 0 then
	for _, issue in ipairs(config.issues) do
		io.stderr:write("[quorum] Config issue: " .. issue .. "\n")
	end
end

local register_agents = config.triggerMode ~= "off"

-- Register each member as a Hygge subagent when not in "off" mode
if register_agents then
	for _, member in ipairs(config.members) do
		hygge.register_subagent({
			name = member.name,
			description = "Quorum planning member (" .. member.label .. ")",
			model = member.providerID .. "/" .. member.modelID,
			system_prompt = MEMBER_SYSTEM_PROMPT,
		})
	end
end

-- Inject bootstrap guidance via pre_message hook when triggerMode == "auto"
local bootstrap = render_bootstrap(config)

if bootstrap ~= nil then
	-- Build issues prefix for injection (analogous to <quorum-config-issues> in OpenCode)
	local issues_block = ""
	if #config.issues > 0 then
		local lines = {}
		for _, issue in ipairs(config.issues) do
			lines[#lines + 1] = "- " .. issue
		end
		issues_block = "<quorum-config-issues>\n"
			.. "The following issues were detected in quorum.json. Fix your config and reload the plugin:\n"
			.. table.concat(lines, "\n")
			.. "\n</quorum-config-issues>\n\n"
	end

	local injection = issues_block .. bootstrap

	hygge.register_hook("pre_message", { name = "quorum_bootstrap", timeout = "10s" }, function(_event)
		-- Append quorum guidance as non-rendered one-turn system context.
		return { decision = "allow", system_prompt_append = injection }
	end)
end

-- ---------------------------------------------------------------------------
-- /quorum-status command — show current config in a readable form
-- ---------------------------------------------------------------------------

hygge.register_command({
	name = "quorum-status",
	description = "Show the current quorum configuration: members, trigger mode, and any config issues.",
	execute = function(_args)
		local lines = {}

		lines[#lines + 1] = "## Quorum status"
		lines[#lines + 1] = ""
		lines[#lines + 1] = "**Trigger mode:** " .. config.triggerMode
		lines[#lines + 1] = ""
		lines[#lines + 1] = "**Members (" .. #config.members .. "):**"
		for i, m in ipairs(config.members) do
			lines[#lines + 1] =
				string.format("  %d. `%s` — %s/%s (label: %s)", i, m.name, m.providerID, m.modelID, m.label)
		end

		if #config.issues > 0 then
			lines[#lines + 1] = ""
			lines[#lines + 1] = "**Config issues:**"
			for _, issue in ipairs(config.issues) do
				lines[#lines + 1] = "  - " .. issue
			end
		end

		lines[#lines + 1] = ""
		lines[#lines + 1] = "_Config file: " .. config_path .. "_"

		return table.concat(lines, "\n")
	end,
})

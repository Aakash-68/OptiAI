# Graph Report - OptiAI  (2026-09-22)

## Corpus Check
- Large corpus: 527 files · ~397,378 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 3201 nodes · 7530 edges · 164 communities (156 shown, 8 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 140 edges (avg confidence: 0.62)
- Token cost: 111,120 input · 0 output

## Community Hubs (Navigation)
- Kiro Thinking Constants
- RTK Output Filters
- Provider Capability Matrix
- Models & Skills Pages
- Provider Detail & Connect UI
- Chat Page & App Shell
- OAuth Provider Configs
- DB Repos & Helpers
- Provider Model Catalog
- Streaming Response Handler
- App Constants & Prompts
- Kiro Executor
- OAuth Session Server Utils
- Azure Executor
- Translator Concerns Core
- Frontend Package Deps
- Token Refresh Service
- Tool Call Translation
- DB Backup & Metastore
- OAuth Client Configs
- Usage & Analytics Charts
- Antigravity Weekly Usage
- Non-Streaming Handler
- OAuth Service Flow
- Chat Core Orchestration
- Zed Auth Signing
- Backend Package Deps
- Analytics & Connect Pages
- Default Executor & Auth
- Claude Usage Service
- Cursor Protobuf Codec
- Provider ID Normalization
- PxPipe Event Accounting
- Claude Format Translator
- Media & Image Config
- Qoder Constants
- API Key Repository
- Error Config & Backoff
- OpenCode Go Executor
- Misc
- Misc
- Misc
- Tsconfig
- Misc
- Misc
- Misc
- Misc
- Misc
- Hooks Usechatstore
- Misc
- Misc
- Misc
- Misc
- Misc
- Misc
- Misc
- Misc
- Misc
- Misc
- Providers
- Misc
- Misc
- Misc
- Misc
- Misc
- Misc
- Misc
- Providers Supported
- Misc
- Misc
- Misc
- Misc
- Api Index
- Misc
- Misc
- Misc
- Misc
- Misc
- Misc
- Misc
- Misc
- Misc
- Misc
- Misc
- Misc
- Misc
- Concurrently
- Misc
- Misc
- Misc
- Misc
- Misc
- Misc
- Misc
- Misc
- Misc
- Misc
- Misc
- Misc
- Misc
- Misc
- Docs Extraction Compact
- Misc
- Misc
- Misc
- Misc
- Misc
- Misc
- Misc
- Misc
- Misc
- Docs Extraction Excluded
- Misc
- Misc
- Misc
- Misc
- Misc
- Misc
- Docs Extraction Executors
- Docs Extraction Provider
- Misc
- Misc
- Misc
- Shared
- Services Usage
- Agents Generate Agent
- Misc
- Misc
- Misc
- Package Comment
- Ui
- Misc
- Shared
- Misc
- Misc
- Misc
- Server Hooks
- Docs Extraction Apikey
- Misc
- Misc
- Misc
- Misc
- Misc
- Shared
- Shared
- Postcss
- Next
- Next Env D

## God Nodes (most connected - your core abstractions)
1. `proxyAwareFetch()` - 93 edges
2. `getAdapter()` - 70 edges
3. `cx()` - 64 edges
4. `handleChatCore()` - 50 edges
5. `FORMATS` - 43 edges
6. `PROVIDERS` - 36 edges
7. `parseJson()` - 35 edges
8. `BaseExecutor` - 34 edges
9. `stringifyJson()` - 32 edges
10. `request()` - 31 edges

## Surprising Connections (you probably didn't know these)
- `Node Alias Resolver Hook (server/hooks.mjs)` --semantically_similar_to--> `nextjs-agent-rules Block`  [INFERRED] [semantically similar]
  README.md → frontend/AGENTS.md
- `backend/config/providers.js - 16-Provider Allowlist` --semantically_similar_to--> `Import-Graph Walk File Selection`  [INFERRED] [semantically similar]
  README.md → docs/9router-extraction.md
- `SQLite Driver Fallback Chain` --shares_data_with--> `usageRepo - Usage and Cost Persistence`  [INFERRED]
  docs/9router-extraction.md → README.md
- `Quota Readers Extracted But Unexposed` --references--> `Import-Graph Walk File Selection`  [INFERRED]
  README.md → docs/9router-extraction.md
- `compact.js Naming Note` --references--> `src/sse/handlers/chat.js - Pipeline Entry`  [EXTRACTED]
  docs/9router-extraction.md → README.md

## Import Cycles
- 3-file cycle: `backend/9router/open-sse/config/kiroConstants.js -> backend/9router/open-sse/translator/concerns/thinkingUnified.js -> backend/9router/open-sse/providers/thinkingLevels.js -> backend/9router/open-sse/config/kiroConstants.js`

## Hyperedges (group relationships)
- **OptiAI Chat Request Pipeline** — readme_optiai_api, readme_gateway_bridge, readme_chat_entry, readme_chatcore, readme_rtk_engine, readme_usagerepo, readme_pricing_single_source [EXTRACTED 1.00]
- **Byte-Identical Re-Sync Strategy** — readme_path_preservation, readme_alias_hooks, readme_gateway_bridge, docs_9router_extraction_nextresponse_shim, docs_9router_extraction_machineid_cjs_fix, docs_9router_extraction_registry_not_subsettable, docs_9router_extraction_package_json_version [INFERRED 0.85]
- **Honesty-Over-Illusion UI Principle** — readme_no_invented_numbers, readme_browser_held_state, readme_ai_search_keyword_fallback, readme_analytics_heuristic, readme_estimated_flag_fix, readme_test_models_serial_first [INFERRED 0.85]

## Communities (164 total, 8 thin omitted)

### Community 1 - "Kiro Thinking Constants"
Cohesion: 0.06
Nodes (75): applyKiroThinkingOverride(), buildKiroAdditionalModelRequestFields(), buildKiroAdditionalModelRequestFieldsForModel(), buildThinkingSystemPrefix(), containsTagInText(), containsThinkingModeTag(), extractKiroEffortLevel(), extractKiroGptEffortLevel() (+67 more)

### Community 2 - "RTK Output Filters"
Cohesion: 0.07
Nodes (50): safeApply(), autoDetectFilter(), countMatches(), isGrepLine(), isLineNumbered(), isMostlyPorcelain(), isPathLike(), DEDUP_LINE_MAX (+42 more)

### Community 3 - "Provider Capability Matrix"
Cohesion: 0.05
Nodes (43): CODEX_GPT_56_DEFAULT_CAPS, CODEX_GPT_56_SOL_CAPS, DEFAULT_CAPABILITIES, KIRO_GPT_5_6_CAPABILITIES, MODALITY_KEYS, MODEL_CAPABILITIES, PATTERN_CAPABILITIES, PROVIDER_CAPABILITIES (+35 more)

### Community 4 - "Models & Skills Pages"
Cohesion: 0.09
Nodes (41): AI_SUGGESTIONS, ModelsPage(), ProjectsPage(), AI_SUGGESTIONS, CategoryChip(), SkillsPage(), AddModelDialog(), Chip() (+33 more)

### Community 5 - "Provider Detail & Connect UI"
Cohesion: 0.09
Nodes (45): ProviderDetailPage(), ConnectDialog(), Mode, ModelGrid(), ModelState, shortError(), CatalogModel, calculateCost() (+37 more)

### Community 6 - "Chat Page & App Shell"
Cohesion: 0.08
Nodes (36): ChatPage(), STARTERS, inter, jakarta, jetbrains, metadata, viewport, ProvidersPage() (+28 more)

### Community 7 - "OAuth Provider Configs"
Cohesion: 0.06
Nodes (31): ANTIGRAVITY_CONFIG, AWS_REGION_PATTERN, CLAUDE_CONFIG, CLINE_CONFIG, CLINEPASS_CONFIG, CODEBUDDY_CONFIG, CURSOR_CONFIG, GEMINI_CONFIG (+23 more)

### Community 8 - "DB Repos & Helpers"
Cohesion: 0.12
Nodes (38): parseJson(), stringifyJson(), makeKv(), exportDb(), importDb(), addCustomModel(), aliasKv, customKey() (+30 more)

### Community 9 - "Provider Model Catalog"
Cohesion: 0.08
Nodes (33): DOT_VERSION_PROVIDERS, findModel(), findModelName(), getDefaultModel(), getModelQuotaFamily(), getModelsByProviderId(), getModelStrip(), getModelSupportedFormats() (+25 more)

### Community 10 - "Streaming Response Handler"
Cohesion: 0.10
Nodes (37): buildTransformStream(), CODEX_SOURCE_TO_TARGET, handleStreamingResponse(), needsTranslation(), buildAbortedResponsesTerminalBytes(), formatIncompleteOpenAIResponsesStreamFailure(), getOpenAIResponsesEventName(), isOpenAIResponsesTerminalEvent() (+29 more)

### Community 11 - "App Constants & Prompts"
Cohesion: 0.06
Nodes (27): AG_TOOL_SUFFIX, ANTIGRAVITY_DEFAULT_SYSTEM, ANTIGRAVITY_LOAD_CODE_ASSIST_HEADERS, ANTIGRAVITY_PROMPT_REWRITES, CLOUD_CODE_API, CODEX_CLI_VERSION, GEMINI_CLI_API_CLIENT, GEMINI_CLI_VERSION (+19 more)

### Community 12 - "Kiro Executor"
Cohesion: 0.09
Nodes (25): KIRO_CODEWHISPERER_TARGET, KIRO_ENDPOINT_FALLBACK_STATUSES, STREAM_FIRST_CHUNK_TIMEOUT_MS, appendRepairInstruction(), concatChunks(), crc32(), CRC32_TABLE, decoder (+17 more)

### Community 13 - "OAuth Session Server Utils"
Cohesion: 0.07
Nodes (20): escapeHtml(), isLoopbackOrigin(), pendingExchanges, renderCodexResultPage(), renderXaiResultPage(), renderXiaomiMimoResultPage(), startCodexProxy(), startTraeProxy() (+12 more)

### Community 14 - "Azure Executor"
Cohesion: 0.08
Nodes (9): resolveXiaomiTokenplanBaseUrl(), AzureExecutor, CodeBuddyExecutor, CodeBuddyIntlExecutor, DefaultExecutor, defaultCache, executors, XiaomiTokenplanExecutor (+1 more)

### Community 15 - "Translator Concerns Core"
Cohesion: 0.18
Nodes (25): buildChunk(), toOpenAIFinish(), reasoningDelta(), fallbackToolCallId(), toOpenAIUsage(), USAGE_EXTRACTORS, claudeToOpenAIResponse(), convertStopReason() (+17 more)

### Community 16 - "Frontend Package Deps"
Cohesion: 0.06
Nodes (35): dependencies, lucide-react, next, postcss, react, react-dom, tailwindcss, @tailwindcss/postcss (+27 more)

### Community 17 - "Token Refresh Service"
Cohesion: 0.13
Nodes (30): OAUTH_ENDPOINTS, dedupRefresh(), refreshDedupCache, getAccessToken(), _getAccessTokenInternal(), getAllAccessTokens(), buildRefreshBody(), classifyOAuthRefreshError() (+22 more)

### Community 18 - "Tool Call Translation"
Cohesion: 0.11
Nodes (27): captureThinking, ensureToolCallIds(), fixMissingToolResponses(), generateToolCallId(), getToolCallIds(), hasToolResults(), sanitizeToolId(), FORMATS (+19 more)

### Community 19 - "DB Backup & Metastore"
Cohesion: 0.13
Nodes (28): BACKUP_EXCLUDE_TABLES, backupDbLite(), backupFile(), makeBackupDir(), pruneOldBackups(), getMetaSync(), setMetaSync(), importLegacyDetails() (+20 more)

### Community 20 - "OAuth Client Configs"
Cohesion: 0.10
Nodes (25): assertValidAwsRegion(), CODEBUDDY_INTL_CONFIG, CODEX_CONFIG, GITLAB_CONFIG, GROK_CLI_CONFIG, KILOCODE_CONFIG, KIRO_CONFIG, decodeJwtPayload() (+17 more)

### Community 21 - "Usage & Analytics Charts"
Cohesion: 0.12
Nodes (27): AnalyticsPage(), PERIODS, UsagePage(), AreaChart(), SeriesPoint, BarList(), BarRow, RatioBar() (+19 more)

### Community 22 - "Antigravity Weekly Usage"
Cohesion: 0.14
Nodes (27): CLIENT_METADATA, ANTIGRAVITY_IDE_VERSION, cacheKey(), fetchAntigravityWeeklyQuota(), GROUP_MATCHERS, parseWeeklyQuotaSummary(), WEEKLY_CONFIG, weeklyCache (+19 more)

### Community 23 - "Non-Streaming Handler"
Cohesion: 0.14
Nodes (29): HTTP_STATUS, extractCustomToolInput(), handleNonStreamingResponse(), openAICompletionToClaudeMessage(), openAICompletionToResponses(), parseToolArguments(), translateNonStreamingResponse(), buildRequestDetail() (+21 more)

### Community 24 - "OAuth Service Flow"
Cohesion: 0.11
Nodes (12): OAuthService, decodeIdTokenEmail(), discoverEndpoints(), validateOAuthEndpoint(), XaiService, generateCodeChallenge(), generateCodeVerifier(), generatePKCE() (+4 more)

### Community 25 - "Chat Core Orchestration"
Cohesion: 0.12
Nodes (28): supportsGrokCliReasoningEffort(), getExecutor(), handleChatCore(), stripContinuityFields(), injectCaveman(), formatHeadroomLog(), formatHeadroomSizeLog(), isHeadroomPhantomSavings() (+20 more)

### Community 26 - "Zed Auth Signing"
Cohesion: 0.11
Nodes (30): b64url(), b64urlPadded(), buildZedUserAuthHeader(), createZedNativeAuthData(), decodeZedPrivateKeyVerifier(), decryptZedAccessToken(), encodeZedPrivateKeyVerifier(), fetchJson() (+22 more)

### Community 27 - "Backend Package Deps"
Cohesion: 0.06
Nodes (31): dependencies, chalk, cors, express, jose, node-machine-id, open, ora (+23 more)

### Community 28 - "Analytics & Connect Pages"
Cohesion: 0.14
Nodes (21): PERIODS, ConnectPage(), ConnectToolPage(), FILTERS, Gauge(), PageContainer(), ProviderCard(), Card() (+13 more)

### Community 29 - "Default Executor & Auth"
Cohesion: 0.11
Nodes (24): GITHUB_COPILOT, applyAuth(), AUTH_DESCRIPTORS, BEARER, HEADER_HOOKS, REFRESH_GRANTS, setAuth(), XAPIKEY (+16 more)

### Community 30 - "Claude Usage Service"
Cohesion: 0.12
Nodes (23): CLAUDE_CONFIG, fetchClaudeUsageRaw(), getClaudeUsage(), getClaudeUsageLegacy(), oauthCooldown, usageCache, getXiaomiMimoUsage(), getMimoAccountUsage() (+15 more)

### Community 31 - "Cursor Protobuf Codec"
Cohesion: 0.17
Nodes (30): buildChatRequest(), buildToolResultRequest(), CLIENT_SIDE_TOOL_V2, concatArrays(), encodeClientSideToolV2Call(), encodeClientSideToolV2Result(), encodeCursorSetting(), encodeField() (+22 more)

### Community 32 - "Provider ID Normalization"
Cohesion: 0.07
Nodes (21): AI_PROVIDERS, ALIAS_TO_ID, ANTHROPIC_COMPATIBLE_PREFIX, APIKEY_PROVIDERS, AUTH_METHODS, buildProviderEntry(), byCategory(), CUSTOM_EMBEDDING_PREFIX (+13 more)

### Community 33 - "PxPipe Event Accounting"
Cohesion: 0.11
Nodes (24): accumulate(), appendPxpipeEvent(), emptyTotals(), ensureDir(), EVENTS_FILE, finalize(), getPxpipeStats(), readPxpipeEvents() (+16 more)

### Community 34 - "Claude Format Translator"
Cohesion: 0.12
Nodes (27): CC_DEFAULT_TOOLS, CLAUDE_TOOL_SUFFIX, DEFAULT_THINKING_CLAUDE_SIGNATURE, anchorClaudeCache(), buildThinkingPlaceholder(), CACHE_CONTROL_1H, CACHE_CONTROL_5M, capCacheControlBlocks() (+19 more)

### Community 35 - "Media & Image Config"
Cohesion: 0.13
Nodes (24): CLAUDE_SYSTEM_PROMPT, BLOCKED_HOSTS, FETCH_TIMEOUT_MS, IMAGE_SIGNATURES, MAX_IMAGE_BYTES, detectImageMime(), fetchImageAsBase64(), isPrivateIp() (+16 more)

### Community 36 - "Qoder Constants"
Cohesion: 0.10
Nodes (28): QODER_CENTER_BASE, QODER_CHAT_BASE, QODER_CHAT_SIG_PATH, QODER_CHAT_URL, QODER_CHAT_URL_ENCODED, QODER_CLIENT_TYPE, QODER_CONTEXT_TIER_ENV, QODER_DATA_POLICY (+20 more)

### Community 37 - "API Key Repository"
Cohesion: 0.15
Nodes (25): getAdapter(), initDb(), createApiKey(), deleteApiKey(), getApiKeyById(), getApiKeys(), rowToKey(), updateApiKey() (+17 more)

### Community 38 - "Error Config & Backoff"
Cohesion: 0.10
Nodes (22): BACKOFF_CONFIG, COOLDOWN, COOLDOWN_MS, DEFAULT_ERROR_MESSAGES, ERROR_RULES, ERROR_TYPES, MAX_RATE_LIMIT_COOLDOWN_MS, TRANSIENT_COOLDOWN_MS (+14 more)

### Community 39 - "OpenCode Go Executor"
Cohesion: 0.15
Nodes (20): baseModelId(), isResponsesModel(), nativeSession(), normalizeResponsesTools(), normalizeSession(), OpenCodeGoExecutor, sanitizeResponsesItems(), translatedSession() (+12 more)

### Community 40 - "Misc"
Cohesion: 0.10
Nodes (14): AG_DEFAULT_TOOLS, ANTIGRAVITY_HEADERS, AG_DECOY_TOOLS, ANTIGRAVITY_REQUEST_BLACKLIST, ANTIGRAVITY_TRANSIENT_ERROR_PATTERNS, ANTIGRAVITY_TRANSIENT_STATUSES, AntigravityExecutor, buildIdeRequestId() (+6 more)

### Community 41 - "Misc"
Cohesion: 0.12
Nodes (23): isAnthropicBackedKimchiModel(), KimchiExecutor, mergeTopLevelSystem(), stripMessageArtifacts(), stripReasoningContent(), stripToolArtifacts(), systemToText(), TOP_LEVEL_OPENAI_GATEWAY_DROPS (+15 more)

### Community 42 - "Misc"
Cohesion: 0.14
Nodes (20): buildChatMessage(), buildGetChatMessageRequest(), buildMetadata(), buildModelOrAlias(), concatBytes(), decodeCompletionChunk(), decodeDoneChunk(), decodeStringField() (+12 more)

### Community 43 - "Tsconfig"
Cohesion: 0.07
Nodes (27): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+19 more)

### Community 44 - "Misc"
Cohesion: 0.11
Nodes (19): CACHE_TTL, DEFAULT_RETRY_CONFIG, FETCH_CONNECT_TIMEOUT_MS, GEMINI_NATIVE_TTS_FETCH_TIMEOUT_MS, RETRY_CONFIG, SEARXNG_URL, SKIP_PATTERNS, STREAM_STALL_TIMEOUT_MS (+11 more)

### Community 45 - "Misc"
Cohesion: 0.14
Nodes (20): buildQoderRequestBody(), extractText(), isBillingBlock(), lastUserText(), normalizeContent(), normalizeMessages(), peekFirstQoderFrame(), QoderExecutor (+12 more)

### Community 46 - "Misc"
Cohesion: 0.15
Nodes (25): getCapabilitiesForModel(), getThinkingLevels(), budgetToLevel(), EFFORT_LEVELS, effortToBudget(), effortToThinkingLevel(), LEVEL_TO_BUDGET, applyFormat() (+17 more)

### Community 47 - "Misc"
Cohesion: 0.14
Nodes (18): bareModel(), PREVIEW_MODELS, __test__, XiaomiMimoExecutor, absorbSetCookie(), acquireServiceCookie(), _cache, cookieHeader() (+10 more)

### Community 48 - "Misc"
Cohesion: 0.15
Nodes (22): log(), parseConnectRPCFrame(), checkAndRefreshToken(), formatProviderCredentials(), getAccessToken(), getAllAccessTokens(), needsProjectId(), normalizeExpiresAt() (+14 more)

### Community 49 - "Hooks Usechatstore"
Cohesion: 0.12
Nodes (19): Sidebar(), LogoMark(), Wordmark(), ChatContext, ChatStore, ChatStoreProvider(), groupThreadsByAge(), titleFromMessage() (+11 more)

### Community 50 - "Misc"
Cohesion: 0.13
Nodes (13): createSqlJsAdapter(), loadSql(), initAdapter(), tryBetterSqlite(), tryBunSqlite(), tryNodeSqlite(), trySqlJs(), BACKUPS_DIR (+5 more)

### Community 51 - "Misc"
Cohesion: 0.13
Nodes (22): getMeta(), setMeta(), addToCounter(), aggregateEntryToDay(), appendRequestLog(), calculateCost(), ensureRingInitialized(), formatLogDate() (+14 more)

### Community 52 - "Misc"
Cohesion: 0.19
Nodes (19): DEFAULT_MAX_TOKENS, DEFAULT_MIN_TOKENS, encodeDataUri(), collapseTextParts(), budgetToEffort(), adjustMaxTokens(), antigravityToOpenAIRequest(), convertContent() (+11 more)

### Community 53 - "Misc"
Cohesion: 0.13
Nodes (10): ANTHROPIC_BETA_BASE, ANTHROPIC_BETA_HEAVY_AGENT, ANTIGRAVITY_IDE_BASE_URL, ANTIGRAVITY_IDE_USER_AGENT, ANTIGRAVITY_OAUTH_CLIENT, CLAUDE_API_HEADERS, CLAUDE_CLI_SPOOF_HEADERS, CLAUDE_CLI_VERSION (+2 more)

### Community 54 - "Misc"
Cohesion: 0.18
Nodes (18): CAVEMAN_LEVELS, CAVEMAN_PROMPTS, PONYTAIL_LEVELS, PONYTAIL_PROMPTS, appendToChatMessage(), appendToResponsesMessage(), containsPromptInMessages(), containsPromptInResponsesInput() (+10 more)

### Community 55 - "Misc"
Cohesion: 0.15
Nodes (20): formatRetryAfter(), appendUserTurn(), buildJudgePrompt(), collectPanel(), comboRotationState, detectRequiredCapabilities(), extractPanelText(), flattenToolHistory() (+12 more)

### Community 56 - "Misc"
Cohesion: 0.14
Nodes (18): MEMORY_CONFIG, countGrokCliUserTurns(), EFFORT_LEVELS, GROK_CLI_FREEFORM_TOOL_PARAMETERS, HOSTED_TOOL_TYPES, isNativeGrokCliItemId(), normalizeGrokCliEffort(), normalizeGrokCliInput() (+10 more)

### Community 57 - "Misc"
Cohesion: 0.17
Nodes (10): createErrorResponse(), CursorExecutor, debugLog(), decodeAgentFrames(), decompressPayload(), extractAgentString(), isAgentTextRequest(), isComposerModel() (+2 more)

### Community 58 - "Misc"
Cohesion: 0.16
Nodes (16): baseModelId(), generateRequestId(), generateSessionId(), isResponsesModel(), normalizeOpencodeReasoning(), OpenCodeExecutor, resolveOpencodeSession(), RESPONSES_MODELS (+8 more)

### Community 59 - "Misc"
Cohesion: 0.16
Nodes (18): buildNonStreamingResponse(), buildPplxRequestBody(), buildQuery(), buildStreamingResponse(), cleanResponse(), extractContent(), formatToolsHint(), MODEL_MAP (+10 more)

### Community 60 - "Providers"
Cohesion: 0.18
Nodes (18): assertSupported(), BY_ID, getSupportedProvider(), isSupportedProvider(), SUPPORTED_PROVIDERS, authModesOf(), categoryOf(), completeOAuth() (+10 more)

### Community 61 - "Misc"
Cohesion: 0.19
Nodes (18): accumulateAssistantText(), assistantCleanup, assistantSessionStore, assistantTextSessionId(), cleanupInterval, continuationStore, deriveSessionId(), extractAntigravitySession() (+10 more)

### Community 62 - "Misc"
Cohesion: 0.16
Nodes (12): TRAE_CONFIG, WINDSURF_CONFIG, extractJsonPath(), fetchTraeExchangeToken(), fetchTraeLoginGuidance(), fetchTraeUserInfo(), trae, traeApiOrigins() (+4 more)

### Community 63 - "Misc"
Cohesion: 0.21
Nodes (16): handleChat(), handleSingleModelChat(), clearAntigravityStrikes(), getAntigravityQuotaCache(), clearAccountError(), extractApiKey(), getProviderCredentials(), githubMonthlyResetMs() (+8 more)

### Community 64 - "Misc"
Cohesion: 0.16
Nodes (15): CODEX_DEFAULT_INSTRUCTIONS, CODEX_HOSTED_TOOL_TYPES, CODEX_PASSTHROUGH_TOOL_TYPES, CODEX_SSE_ACCOUNT_FALLBACK_PATTERNS, CODEX_SSE_RETRY_PATTERNS, CODEX_SSE_USER_OUTPUT_PATTERNS, convertSystemToDeveloperRole(), normalizeCodexTools() (+7 more)

### Community 65 - "Misc"
Cohesion: 0.18
Nodes (15): CODEX_MAX_REFRESH_AGE_MS, getCredentialExpiryMs(), getCredentialLastRefreshMs(), getRefreshLockKey(), isCodexRefreshStale(), mergeProviderSpecificData(), mergeRefreshedCredentials(), parseTimeMs() (+7 more)

### Community 66 - "Misc"
Cohesion: 0.15
Nodes (10): buildClientToolsMcp(), buildPromptText(), CLIENT_TOOLS_MCP_SCRIPT, DevinCliExecutor, ensureClientToolsScript(), extractClientToolResults(), NOTE: this replaces the user's global devin MCP config for the subprocess., resolveDevinBin() (+2 more)

### Community 67 - "Misc"
Cohesion: 0.12
Nodes (17): XAI_API_BASE, XAI_AUTH_ENDPOINT_PATH, XAI_CALLBACK_PATH, XAI_CLIENT_ID, XAI_CONFIG, XAI_DISCOVERY_PATH, XAI_ISSUER, XAI_LOOPBACK_PORT (+9 more)

### Community 68 - "Providers Supported"
Cohesion: 0.16
Nodes (12): SUPPORTED_PROVIDER_IDS, addKey(), config(), ensureLocalKey(), keys(), allStaticModels(), CHAT_KINDS, pingModel() (+4 more)

### Community 69 - "Misc"
Cohesion: 0.14
Nodes (7): OLLAMA_LOCAL_DEFAULT_HOST, resolveOllamaLocalHost(), XIAOMI_TOKENPLAN_DEFAULT_REGION, XIAOMI_TOKENPLAN_REGIONS, IFlowExecutor, OllamaLocalExecutor, PROVIDER_OAUTH

### Community 70 - "Misc"
Cohesion: 0.18
Nodes (11): buildProviderRequest(), convertProviderEvent(), createErrorChunk(), enqueueSseObject(), initProviderState(), normalizeStatus(), normalizeZedProvider(), unwrapZedLine() (+3 more)

### Community 71 - "Misc"
Cohesion: 0.23
Nodes (16): buildMultipartFile(), decodedBytes(), defaultUploadImage(), extractUrlFromUploadResponse(), imageUrlBlock(), mimeExt(), payloadBytes(), rewriteBlock() (+8 more)

### Community 72 - "Misc"
Cohesion: 0.22
Nodes (15): debug(), error(), errorLine(), formatData(), formatTime(), info(), line(), LOG_LEVELS (+7 more)

### Community 73 - "Api Index"
Cohesion: 0.24
Nodes (13): createApiRouter(), createGatewayRouter(), wrap(), app, PORT, server, HOP_BY_HOP, routeChat() (+5 more)

### Community 74 - "Misc"
Cohesion: 0.21
Nodes (13): buildKimiHeaders(), getAppPackageVersion(), getDeepseekUsage(), parseBalanceInfos(), formatKimiUsageError(), getKimiPlanName(), getKimiUsage(), makeQuota() (+5 more)

### Community 76 - "Misc"
Cohesion: 0.20
Nodes (10): bootstrapJwt(), generateFingerprint(), generateSessionId(), injectSystemMarker(), MIMO_SYSTEM_MARKER, MimoFreeExecutor, parseJwtExp(), resetJwtCache() (+2 more)

### Community 77 - "Misc"
Cohesion: 0.27
Nodes (15): applyKiroHeadroomMessages(), buildCompressEndpoint(), callCompress(), captureSizeSnapshot(), collectKiroHeadroomMessages(), compressWithHeadroom(), describeFetchError(), hasUnsafeResponsesInputForCompression() (+7 more)

### Community 78 - "Misc"
Cohesion: 0.16
Nodes (13): cacheKey(), catalogCache, cosyCredsFromConnection(), exchangeJobToken(), fetchQoderCatalogRaw(), fetchUserIdForJobToken(), inflight, invalidateQoderCatalog() (+5 more)

### Community 79 - "Misc"
Cohesion: 0.22
Nodes (11): getGlmUsage(), GLM_QUOTA_URLS, buildRateLimitQuota(), getGroqUsage(), parseGroqDurationMs(), resetAtFromDuration(), getIflowUsage(), getOllamaUsage() (+3 more)

### Community 80 - "Misc"
Cohesion: 0.28
Nodes (15): buildUsage(), closeMessage(), closeReasoning(), closeToolCall(), computeFinishReason(), emitReasoningDelta(), emitTextContent(), emitToolCall() (+7 more)

### Community 81 - "Misc"
Cohesion: 0.29
Nodes (15): convertOpenAIContentToParts(), generateProjectId(), generateRequestId(), generateSessionId(), normalizeGeminiContents(), tryParseJSON(), generateUUID(), isClaudeModel() (+7 more)

### Community 82 - "Misc"
Cohesion: 0.27
Nodes (15): cleanupProviderConnections(), connToRow(), createProviderConnection(), deleteProviderConnection(), deleteProviderConnectionsByProvider(), deriveConnectionName(), getProviderConnectionById(), getProviderConnections() (+7 more)

### Community 83 - "Misc"
Cohesion: 0.18
Nodes (12): baseId(), build(), collectEntries(), MODALITY_BY_INPUT, PROVIDER_ALIASES, restoreEtag(), slim(), startModelCatalogSync() (+4 more)

### Community 84 - "Misc"
Cohesion: 0.24
Nodes (12): cacheKey(), catalogCache, fetchCursorCatalog(), firstString(), getCursorModelsUrl(), http2PostProto(), parseCursorUsableModels(), resolveCursorModels() (+4 more)

### Community 85 - "Misc"
Cohesion: 0.26
Nodes (8): CLAUDE_BLOCK, OPENAI_BLOCK, RESPONSES_ITEM, VALID_OPENAI_CONTENT_TYPES, VALID_OPENAI_MESSAGE_TYPES, MODEL_FALLBACK, GEMINI_FINISH, GEMINI_ROLE

### Community 86 - "Misc"
Cohesion: 0.21
Nodes (14): DEFAULT_HEADROOM_URL, EXTENDED_PATH, EXTRA_MARKERS, findHeadroomBinary(), findPython310(), getHeadroomStatus(), getInstalledHeadroomExtras(), HEADROOM_COMPRESSION_EXTRAS (+6 more)

### Community 87 - "Concurrently"
Cohesion: 0.13
Nodes (14): concurrently, description, devDependencies, concurrently, name, private, scripts, app (+6 more)

### Community 88 - "Misc"
Cohesion: 0.29
Nodes (11): agentBool(), agentMessage(), agentString(), buildAgentRunFrame(), COMPRESS_FLAG, concatBuffers(), createRequestContextResponse(), encodeHistoryMessage() (+3 more)

### Community 89 - "Misc"
Cohesion: 0.24
Nodes (4): flattenQuery(), STREAM_TIMEOUT_MS, TraeExecutor, PROVIDERS

### Community 90 - "Misc"
Cohesion: 0.34
Nodes (13): addMiniMaxQuota(), buildMiniMaxQuota(), formatMiniMaxQuotaName(), getMiniMaxField(), getMiniMaxModelName(), getMiniMaxProvidedPercent(), getMiniMaxResetAt(), getMiniMaxSessionTotal() (+5 more)

### Community 91 - "Misc"
Cohesion: 0.20
Nodes (7): QODER_DEVICE_TOKEN_URL, QODER_LOGIN_URL, QODER_USERINFO_URL, base64Url(), fetchWithTimeout(), QoderService, RFC-3339

### Community 92 - "Misc"
Cohesion: 0.25
Nodes (13): cleanJSONSchemaForAntigravity(), convertConstToEnum(), convertEnumValuesToStrings(), convertPrefixItems(), DEFAULT_SAFETY_SETTINGS, ensureArrayItems(), ensureObjectType(), flattenAnyOfOneOf() (+5 more)

### Community 93 - "Misc"
Cohesion: 0.26
Nodes (12): classifyOAuthProbeResult(), CLOUD_CODE_ASSIST_TEST_BODY, fetchWithConnectionProxy(), isTokenExpired(), OAUTH_TEST_CONFIG, parseProviderErrorMessage(), probeClineAccessToken(), probeCloudCodeAssistAccess() (+4 more)

### Community 94 - "Misc"
Cohesion: 0.23
Nodes (13): ensureShutdownHandler(), flushToDatabase(), generateDetailId(), getDistinctProviders(), getObservabilityConfig(), getRequestDetailById(), getRequestDetails(), sanitizeHeaders() (+5 more)

### Community 95 - "Misc"
Cohesion: 0.18
Nodes (5): resolveRetryEntry(), CodexExecutor, codexSseErrorResponse(), extractSseErrorMessage(), findNestedMessage()

### Community 96 - "Misc"
Cohesion: 0.26
Nodes (10): buildNonStreamingResponse(), buildStreamingResponse(), extractContent(), generateStatsigId(), GrokWebExecutor, MODEL_MAP, parseOpenAIMessages(), randomHex() (+2 more)

### Community 97 - "Misc"
Cohesion: 0.29
Nodes (7): parseVertexAdcJson(), projectIdCache, resolveProjectId(), VertexExecutor, parseVertexSaJson(), refreshVertexToken(), vertexRefreshHandler()

### Community 98 - "Misc"
Cohesion: 0.27
Nodes (12): appendCodexQuotaWindows(), CODEX_CONFIG, consumeCodexRateLimitResetCredit(), errorMessage(), formatCodexWindow(), getCodexAccountId(), getCodexRateLimitBody(), getCodexRateLimitResetCredits() (+4 more)

### Community 99 - "Misc"
Cohesion: 0.29
Nodes (12): buildGrokCliHeaders(), fetchGrokCliCreditsConfig(), getGrokCliUsage(), GRPC_WEB_EMPTY_REQUEST_FRAME, makeQuota(), parseGrokCliBilling(), planFromAccessToken(), quotasFromGrpcCredits() (+4 more)

### Community 100 - "Misc"
Cohesion: 0.31
Nodes (12): capForClaudeBlock(), capForMime(), capForOpenAIBlock(), filterBlocks(), ph(), PLACEHOLDER_CURRENT, PLACEHOLDER_PREV, stripClaude() (+4 more)

### Community 101 - "Misc"
Cohesion: 0.21
Nodes (5): createLogSession(), createNoOpLogger(), createRequestLogger(), ensureNodeModules(), formatTimestamp()

### Community 102 - "Docs Extraction Compact"
Cohesion: 0.18
Nodes (13): compact.js Naming Note, frontend/src/lib/analytics.ts - Score Derivation, frontend/src/lib/api.ts - Typed Backend Client, Browser-Held State Limitation, canonicalizeUsage Preserves estimated Flag, gateway.js Express-WHATWG Bridge, Screens Declare Unbacked Data In Place, OptiAI HTTP API (backend/api/index.js) (+5 more)

### Community 103 - "Misc"
Cohesion: 0.18
Nodes (8): GOOGLE_TTS_LANGUAGES, buildTtsProviderModels(), GEMINI_VOICES, MIMO_VOICES, TTS_MODELS_CONFIG, VOICES, VOICES_FULL, VOICES_STANDARD

### Community 104 - "Misc"
Cohesion: 0.36
Nodes (9): GROK_CLI_BASE_URL, GROK_CLI_CLIENT_IDENTIFIER, GROK_CLI_MODEL, GROK_CLI_USER_AGENT, GROK_CLI_VERSION, buildHeaders(), modelEntries(), parseGrokCliModels() (+1 more)

### Community 106 - "Misc"
Cohesion: 0.29
Nodes (10): buildKiroFingerprintHeaders(), buildVariants(), cacheKey(), catalogCache, fetchKiroCatalogRaw(), formatDisplayName(), invalidateKiroModelCache(), regionFromProfileArn() (+2 more)

### Community 107 - "Misc"
Cohesion: 0.38
Nodes (11): decodeFields(), decodeGrokCreditsFrame(), extractNestedMessage(), extractResetAt(), extractUsageRatio(), findDataFramePayload(), probeFrameHeader(), readField() (+3 more)

### Community 108 - "Misc"
Cohesion: 0.25
Nodes (5): CommandCodeExecutor, createReplayedStream(), inspectAndWrapCommandCodeResponse(), parseCommandCodeError(), wrapNdjsonAsOpenAISse()

### Community 109 - "Misc"
Cohesion: 0.33
Nodes (10): QODER_CONTEXT_TIER_HEADROOM, QODER_CONTEXT_TIER_MODES, estimateQoderPromptTokens(), findNamedTier(), getQoderContextTiers(), normalizeMode(), parseTierTokenCount(), resolveQoderContextTier() (+2 more)

### Community 110 - "Misc"
Cohesion: 0.24
Nodes (6): appendCodexReviewModels(), createOpenAIModelsConfig(), NextResponse, parseCodexModels(), parseOpenAIStyleModels(), PROVIDER_MODELS_CONFIG

### Community 111 - "Misc"
Cohesion: 0.25
Nodes (9): BACKGROUND_REFRESH_LEAD_MS, isNonServerRuntime(), isTruthyEnv(), loadActiveConnections(), refreshOne(), runBackgroundTokenRefreshTick(), selectConnectionsNeedingRefresh(), SENSITIVE_PROVIDERS (+1 more)

### Community 112 - "Docs Extraction Excluded"
Cohesion: 0.27
Nodes (11): Excluded Dashboard UI and Auth, Import-Graph Walk File Selection, 9Router to OptiAI Extraction Map, NextResponse to Response.json Shim, Added backend/9router/package.json Version Marker, Provider Registry Cannot Be Subset, 9Router v0.5.75 (upstream), Node Alias Resolver Hook (server/hooks.mjs) (+3 more)

### Community 113 - "Misc"
Cohesion: 0.22
Nodes (3): GrokCliExecutor, getConsistentMachineId(), loadRawMachineId()

### Community 114 - "Misc"
Cohesion: 0.36
Nodes (7): buildModelListHeaders(), fetchClineRawModels(), resolveClineModels(), resolveClinepassModels(), buildClineHeaders(), getClineAccessToken(), getClineAuthorizationHeader()

### Community 115 - "Misc"
Cohesion: 0.31
Nodes (9): ALIAS_TO_PROVIDER_ID, BUILTIN_MODEL_ALIASES, getModelInfoCore(), inferProviderFromModelName(), MEDIA_ONLY_ALIASES, MODEL_PREFIX_PROVIDERS, parseModel(), resolveModelAliasFromMap() (+1 more)

### Community 116 - "Misc"
Cohesion: 0.49
Nodes (9): detectFormat(), initState(), translateResponse(), createNonStreamingResponse(), createOpenAIResponse(), createOpenAIStreamingChunks(), createStreamingResponse(), handleBypassRequest() (+1 more)

### Community 117 - "Misc"
Cohesion: 0.38
Nodes (9): fromOpenAIFinish(), extractReasoningText(), convertFinishReason(), isValidPdfPagesArg(), openaiToClaudeResponse(), sanitizeReadArgs(), sanitizeToolArgs(), stopTextBlock() (+1 more)

### Community 118 - "Misc"
Cohesion: 0.27
Nodes (9): applyActiveStrikeBlocks(), _doRefresh(), handleAntigravityQuotaError(), inflightRefresh, lastRefreshAt, quotaCache, refreshAntigravityQuota(), strikeBlocks (+1 more)

### Community 119 - "Docs Extraction Executors"
Cohesion: 0.20
Nodes (10): Executors Retained for Binary Upstreams, Headroom / PXPIPE Kept Inert, requireApiKey Defaults True in Imported Settings, Chat / Ask Mode Switch, src/sse/handlers/chat.js - Pipeline Entry, open-sse/handlers/chatCore.js, frontend/src/lib/nav.ts - Sidebar Definition, /api/chat Auto-Attached Local API Key (+2 more)

### Community 120 - "Docs Extraction Provider"
Cohesion: 0.20
Nodes (10): 119 Catalog Entries vs 81 PROVIDERS, AI Search Falls Back to Keyword Filtering, Provider Connection Flow (API key / OAuth), Exclusion of Consumer-Subscription Providers, MCP Bridge Deferred, Pasted OAuth Callback URL, backend/config/providers.js - 16-Provider Allowlist, Curated Skill Library (static catalog) (+2 more)

### Community 121 - "Misc"
Cohesion: 0.31
Nodes (7): DEFAULT_THINKING_AG_SIGNATURE, DEFAULT_THINKING_GEMINI_CLI_SIGNATURE, DEFAULT_THINKING_TEXT, DEFAULT_THINKING_VERTEX_SIGNATURE, openaiToGeminiRequest(), openaiToVertexRequest(), postProcessForVertex()

### Community 122 - "Misc"
Cohesion: 0.42
Nodes (8): createProxyPool(), deleteProxyPool(), getProxyPoolById(), getProxyPools(), poolToRow(), rowToPool(), updateProxyPool(), upsert()

### Community 123 - "Misc"
Cohesion: 0.53
Nodes (8): buildExternalIdpRefreshParams(), decodeJwtPayload(), MICROSOFT_TOKEN_ENDPOINT_HOSTS, normalizeKiroExternalIdpAuth(), normalizeScope(), normalizeString(), resolveExpiresAt(), validateMicrosoftTokenEndpoint()

### Community 124 - "Shared"
Cohesion: 0.31
Nodes (7): AUTH_DIR, CLI_SECRET_FILE, getConsistentMachineId(), getRawMachineId(), loadCliSecret(), loadRawMachineId(), MACHINE_ID_FILE

### Community 125 - "Services Usage"
Cohesion: 0.28
Nodes (3): describeRecord(), latest(), recent()

### Community 126 - "Agents Generate Agent"
Cohesion: 0.22
Nodes (9): generate-agent-files.js Re-injection, nextjs-agent-rules Block, frontend/CLAUDE.md to AGENTS.md Pointer, Analytics as Deterministic Heuristic, frontend/src/app/globals.css - Design Tokens, Logo-Derived Colour System, Hand-Rolled SVG Charts (No Chart Library), Root-Only npm Workspaces Install (+1 more)

### Community 127 - "Misc"
Cohesion: 0.39
Nodes (7): getGeminiThoughtSignature(), getGeminiThoughtSignatureSync(), maybePrunePersisted(), memorySignatures, pruneMemoryExpired(), signatureKv, storeGeminiThoughtSignature()

### Community 128 - "Misc"
Cohesion: 0.54
Nodes (7): formatZedPlanLabel(), getZedUsage(), isZedTokenBillingModelRequestsLimit(), makeZedQuotaRow(), parseZedAuthenticatedUserUsage(), parseZedUsageLimit(), usageBucketLimit()

### Community 129 - "Misc"
Cohesion: 0.46
Nodes (7): buildToolResultBlock(), convertMessages(), escapeXml(), extractContent(), normalizeToolCallId(), openaiToCursorRequest(), sanitizeToolResultText()

### Community 130 - "Package Comment"
Cohesion: 0.25
Nodes (7): comment_resolution, comment_version, description, name, private, type, version

### Community 131 - "Ui"
Cohesion: 0.36
Nodes (6): hueFor(), monogram(), PINNED_HUES, ProviderAvatar(), SIZES, SIZES

### Community 132 - "Misc"
Cohesion: 0.52
Nodes (6): canonicalizeQoderUsage(), createQoderSseCoalescer(), finishReasonOf(), hasValuableDelta(), num(), parseInner()

### Community 133 - "Shared"
Cohesion: 0.52
Nodes (6): generateApiKeyWithMachine(), generateCrc(), generateKeyId(), isNewFormatKey(), parseApiKey(), verifyApiKeyCrc()

### Community 135 - "Misc"
Cohesion: 0.47
Nodes (6): decodeField(), decodeMessage(), decodeVarint(), extractTextAndThinking(), extractTextFromResponse(), extractToolCall()

### Community 136 - "Misc"
Cohesion: 0.53
Nodes (4): normalizeLegacyProxy(), normalizeString(), resolveConnectionProxyConfig(), rotateState

### Community 138 - "Server Hooks"
Cohesion: 0.47
Nodes (5): aliasBase(), CANDIDATE_SUFFIXES, CORE, firstExistingFile(), resolve()

### Community 139 - "Docs Extraction Apikey"
Cohesion: 0.33
Nodes (6): Gateway API Key Format sk-machine-id-crc, SQLite Driver Fallback Chain, node-machine-id CJS Import Fix, CLI Gateway Integration, DATA_DIR Isolation from 9Router Install, Backend Environment Variables

### Community 140 - "Misc"
Cohesion: 0.50
Nodes (3): GET(), getActiveModelLocks(), NextResponse

### Community 141 - "Misc"
Cohesion: 0.60
Nodes (4): NextResponse, POST(), probeMediaProvider(), probeWebProvider()

### Community 142 - "Misc"
Cohesion: 0.67
Nodes (3): DATA_DIR, defaultDir(), getDataDir()

### Community 143 - "Misc"
Cohesion: 0.83
Nodes (3): getErrorMessage(), normalizeString(), testProxyUrl()

### Community 146 - "Shared"
Cohesion: 0.67
Nodes (3): PROVIDER_DISPLAY, resolveDisplay(), RISK_NOTICE

## Ambiguous Edges - Review These
- `DATA_DIR Isolation from 9Router Install` → `SQLite Driver Fallback Chain`  [AMBIGUOUS]
  README.md · relation: shares_data_with
- `frontend/src/app/globals.css - Design Tokens` → `nextjs-agent-rules Block`  [AMBIGUOUS]
  frontend/AGENTS.md · relation: conceptually_related_to

## Knowledge Gaps
- **457 isolated node(s):** `GEMINI_CLI_VERSION`, `CODEX_CLI_VERSION`, `IDE_TYPE`, `PLATFORM`, `PLUGIN_TYPE` (+452 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `DATA_DIR Isolation from 9Router Install` and `SQLite Driver Fallback Chain`?**
  _Edge tagged AMBIGUOUS (relation: shares_data_with) - confidence is low._
- **What is the exact relationship between `frontend/src/app/globals.css - Design Tokens` and `nextjs-agent-rules Block`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `PROVIDERS` connect `Misc` to `Provider Model Catalog`, `Streaming Response Handler`, `App Constants & Prompts`, `Kiro Executor`, `Token Refresh Service`, `Tool Call Translation`, `Antigravity Weekly Usage`, `Non-Streaming Handler`, `Chat Core Orchestration`, `Default Executor & Auth`, `Claude Format Translator`, `Misc`, `Misc`, `Misc`, `Misc`, `Misc`, `Misc`, `Misc`, `Misc`, `Misc`, `Misc`, `Misc`, `Misc`, `Misc`, `Misc`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Why does `log()` connect `Misc` to `Misc`, `Misc`, `Misc`, `Cursor Protobuf Codec`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Why does `proxyAwareFetch()` connect `Claude Usage Service` to `Azure Executor`, `Token Refresh Service`, `Antigravity Weekly Usage`, `Zed Auth Signing`, `Default Executor & Auth`, `Misc`, `Misc`, `Misc`, `Misc`, `Misc`, `Misc`, `Misc`, `Misc`, `Misc`, `Misc`, `Misc`, `Misc`, `Misc`, `Misc`, `Misc`, `Misc`, `Misc`, `Misc`, `Misc`, `Misc`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **What connects `GEMINI_CLI_VERSION`, `CODEX_CLI_VERSION`, `IDE_TYPE` to the rest of the system?**
  _457 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Provider Registry Catalog` be split into smaller, more focused modules?**
  _Cohesion score 0.018867924528301886 - nodes in this community are weakly interconnected._
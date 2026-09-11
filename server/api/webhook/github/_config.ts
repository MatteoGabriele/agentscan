import * as v from 'valibot'
import { parse as parseYaml } from 'yaml'

export const SUPPORTED_CONFIG_VERSION = 1

/** GitHub rejects a label name longer than this. */
const MAX_LABEL_LENGTH = 50

/**
 * A custom message is posted as a comment under this app's name, so it is
 * capped rather than passed through at whatever length the file carries.
 */
export const MAX_MESSAGE_LENGTH = 2_000

const CLASSIFICATIONS = [
  'organic',
  'mixed',
  'automation',
  'insufficient-data',
] as const

const AUTHOR_ASSOCIATIONS = [
  'collaborator',
  'contributor',
  'first_timer',
  'first_time_contributor',
  'member',
  'owner',
] as const

const MODES = ['full', 'labels', 'comment', 'silent'] as const

export type ScanMode = (typeof MODES)[number]
export type AuthorAssociation = (typeof AUTHOR_ASSOCIATIONS)[number]

const flag = (value: boolean) => v.fallback(v.boolean(), value)

const message = () =>
  v.fallback(v.pipe(v.string(), v.maxLength(MAX_MESSAGE_LENGTH)), '')

const label = (name: string) =>
  v.fallback(
    v.pipe(v.string(), v.nonEmpty(), v.maxLength(MAX_LABEL_LENGTH)),
    name,
  )

function section<const TEntries extends v.ObjectEntries>(entries: TEntries) {
  const schema = v.object(entries)

  return v.fallback(schema, v.parse(schema, {}))
}

const RepoConfigSchema = v.object({
  version: v.fallback(
    v.pipe(v.number(), v.integer()),
    SUPPORTED_CONFIG_VERSION,
  ),
  'allowed-users': v.fallback(v.array(v.string()), []),
  'trusted-author-associations': v.fallback(
    v.array(v.picklist(AUTHOR_ASSOCIATIONS)),
    [],
  ),
  'auto-close': flag(false),
  'auto-close-classifications': v.fallback(
    v.array(v.picklist(CLASSIFICATIONS)),
    ['automation'],
  ),
  honeypot: flag(false),
  mode: v.fallback(v.picklist(MODES), 'full'),
  'comment-on-organic': flag(false),
  scan: section({
    'pull-requests': flag(true),
    issues: flag(false),
  }),
  labels: section({
    'community-flagged': label('agentscan:community-flagged'),
    mixed: label('agentscan:mixed-signals'),
    automation: label('agentscan:automation-signals'),
  }),
  messages: section({
    organic: message(),
    mixed: message(),
    automation: message(),
    'insufficient-data': message(),
    'community-flagged': message(),
    /**
     * Replaces the visible greeting of the honeypot comment. The hidden
     * verification block is always appended. It is what the trap is made of.
     * Supports `{username}` and `{type}` placeholders.
     */
    honeypot: message(),
    /**
     * Same, but for authors GitHub reports as opening their first PR/issue on
     * the repository. Falls back to `honeypot` when left blank, so a repo that
     * only customises the regular greeting keeps one voice.
     */
    'honeypot-first-time': message(),
  }),
})

export type RepoConfig = v.InferOutput<typeof RepoConfigSchema>

/** Every field falls back, so the schema's own output is the default config. */
export const DEFAULT_CONFIG: RepoConfig = v.parse(RepoConfigSchema, {})

export function parseRepoConfig(yamlContent: string): RepoConfig {
  let raw: unknown

  try {
    raw = parseYaml(yamlContent)
  } catch (err) {
    console.warn('[agentscan] agentscan.yml is not valid YAML:', err)
    return DEFAULT_CONFIG
  }

  if (raw == null) {
    return DEFAULT_CONFIG
  }

  // Read before validation: an unsupported version means the keys below may not
  // mean what this schema thinks they mean
  const version = v.parse(
    v.fallback(v.pipe(v.number(), v.integer()), SUPPORTED_CONFIG_VERSION),
    (raw as { version?: unknown })?.version,
  )

  if (version > SUPPORTED_CONFIG_VERSION) {
    console.warn(
      `[agentscan] agentscan.yml specifies version ${version}, but the installed app only supports up to version ${SUPPORTED_CONFIG_VERSION}. Falling back to defaults.`,
    )
    return DEFAULT_CONFIG
  }

  const result = v.safeParse(RepoConfigSchema, raw)

  if (!result.success) {
    console.warn(
      '[agentscan] agentscan.yml is not a mapping. Falling back to defaults.',
    )
    return DEFAULT_CONFIG
  }

  return result.output
}

import { identifyReplicant, IdentifyReplicantResult } from "voight-kampff-test";
import { Octokit } from "octokit";
import * as v from "valibot";
import { formatUsername } from "~~/server/utils/format-username";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { compactor } from "voight-kampff-compactor";

const MIN_PAGES = 1;
const MAX_PAGES = 1;

const QuerySchema = v.object({
  ai: v.optional(v.boolean(), false),
  created_at: v.pipe(
    v.string("created_at is required"),
    v.check(
      (value) => value.trim().length > 0 && !Number.isNaN(Date.parse(value)),
      "created_at must be a valid ISO 8601 date string",
    ),
  ),
  repos_count: v.pipe(
    v.number("repos_count must be a number"),
    v.integer("repos_count must be an integer"),
    v.minValue(0, "repos_count must be a non-negative integer"),
  ),
  pages: v.pipe(
    v.number("pages must be a number"),
    v.integer("pages must be an integer"),
    v.minValue(MIN_PAGES, "pages must be at least 1"),
    v.maxValue(MAX_PAGES, `pages must be equal or less than ${MAX_PAGES}`),
  ),
});

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const username = getRouterParam(event, "username");

  if (!username) {
    throw createError({
      statusCode: 400,
      message: "Missing username parameter",
    });
  }

  const query = getQuery(event);
  const parsedQuery = v.safeParse(QuerySchema, {
    ai: Boolean(query.ai),
    created_at: query.created_at,
    pages: query.pages ? parseInt(String(query.pages), 10) : 1,
    repos_count: query.repos_count
      ? parseInt(String(query.repos_count), 10)
      : 0,
  });

  if (!parsedQuery.success) {
    throw createError({
      statusCode: 400,
      message: "Invalid query parameters",
    });
  }

  try {
    const octokit = new Octokit({ auth: config.githubToken });
    const formattedUsername = formatUsername(username);

    const validatedPages = Math.min(parsedQuery.output.pages, MAX_PAGES);
    const pageRequests = Array.from({ length: validatedPages }, (_, index) => {
      return octokit.rest.activity.listPublicEventsForUser({
        username: formattedUsername,
        per_page: 100,
        page: index + 1,
      });
    });

    const responses = await Promise.all(pageRequests);
    const events = responses.flatMap((response) => response.data);

    if (parsedQuery.output.ai) {
      const compactedData = compactor(
        JSON.stringify({
          user: {
            login: formatUsername,
            created_at: parsedQuery.output.created_at,
            public_repos: parsedQuery.output.repos_count,
          },
          events,
        }),
      );

      const systemPrompt = `You are an expert AI system designed to analyze GitHub user accounts and classify them as human-operated ("organic"), bot/automated ("automation"), or mixed behavior patterns.

        ## Important Note
        This analysis identifies AUTOMATION PATTERNS, not intent or legitimacy. We do not judge whether automation is "good" or "bad". We detect bot-like behavioral signatures to identify automated account activity. This includes spam bots, CI/CD automation left unfiltered, automated contribution patterns, and any coordinated bot behavior - regardless of purpose. A well-intentioned legitimate bot would still be flagged as "automation" if it displays these patterns.

        ## Your Task
        Analyze a GitHub user's activity data (account metadata and event history) and return a classification indicating whether the account shows AUTOMATION SIGNATURES. Return a humanness score reflecting how automated vs organic the activity patterns appear.

        ## Input Data Structure
        - user.login: GitHub username
        - user.created_at: ISO 8601 date string (account creation time)
        - user.public_repos: number of public repositories owned
        - events: array of GitHub events with type, created_at, repo.name, payload (payload may contain text content: comments, PR descriptions, review text)

        ## Classification Categories
        - **organic**: Human-operated account (low bot-like signals, score ≥ 70)
        - **mixed**: Uncertain patterns (moderate bot-like signals, score 50-69)
        - **automation**: Likely bot-operated (strong bot-like signals, score < 50)

        ## Analysis Framework
        
        Evaluate each pattern independently. Assign a score per flag reflecting severity of the detected behavior (low, medium, high).

        ### 1. Account Age Context
        - New account (< 30 days): Apply stricter scrutiny for bot patterns
        - Young account (30-89 days): Moderate scrutiny, evaluate patterns carefully
        - Established account (≥ 90 days): Higher tolerance for activity volume

        ### 2. Repository Activity Baseline
        - Account has no personal repos but 20+ events: Suspicious pattern
        - 95%+ external activity with < 5 personal repos: No personal investment

        ### 3. Bot-Like Pattern Detection (12 patterns to evaluate)
        
        **NOTE: Text Content Analysis is Critical** - When event payloads contain text (comments, PR descriptions, reviews, commit messages), analyze for exact repetition, templates, or automated signatures. Repetition across multiple unrelated activities is a strong automation indicator.

        #### A. Rapid Repository Creation
        Detect CreateEvent (ref_type="repository") clustering in 24 hours.
        Pattern: Rapid-fire repo creation suggests automation.

        #### B. Fork Surge
        Detect ForkEvent clustering in 24-hour window.
        Pattern: Concentrated forking activity suggests bot behavior.

        #### C. Commit Burst
        Detect PushEvent clustering: 50+ commits in 1-hour window or 100+ commits in 1-hour window.
        Pattern: 50+ commits/hour is impossible for human developers. Do NOT assume busy developer - this represents technical limits.

        #### D. 24/7 Activity Pattern
        Analyze each calendar day: activity spanning 21+ unique hours with minimal rest suggests no sleep.
        Pattern: Sustained multi-day coding without realistic sleep windows.

        #### E. Event Type Diversity (Shannon's Entropy)
        Calculate normalized Shannon entropy of event types:
        - Entropy = Σ(p * log₂(p)) for each type's probability p
        - Normalized entropy = Entropy / log₂(number_of_types)
        - Low entropy (< 0.5): Bot-like concentrated profile
        - High entropy (> 0.8): Suspicious uniform distribution across types
        
        Pattern: Either narrow rigid focus (few types) OR artificial cycling through all types, combined with no human interactions (comments, reviews, watches).

        #### F. Issue Comment Spam
        Detect IssueCommentEvent clustering in 2-minute window: 10+ comments across 10+ different repos = high spam, 15+ repos = extreme spam.
        Pattern: Commenting across 10+ unrelated repos in 2 minutes is impossible for humans. Do NOT tolerate this as "active developer".

        #### G. Branch → Pull Request Correlation
        Detect pattern: branch created → PR opened within window, repeated consistently.
        Pattern: Mechanical CI/CD automation cycling (not typical human workflow).

        #### H. PR Volume
        Detect PR bursts to external repos (young accounts only, < 90 days).
        Pattern: High external PR volume without personal repo activity.

        #### I. Consecutive Days Activity
        Count calendar days with any activity.
        Pattern: 21+ consecutive days suggests either dedication or tireless bot.

        #### J. External Repo Spread
        Count unique external repos (young accounts only, < 90 days).
        Pattern: Contributing to many different external repos broadly suggests spray-and-pray behavior.

        #### K. Daily Coding Hour Distribution
        Analyze hour spread within each calendar day separately.
        Pattern: High entropy (>0.8) across 16+ hours in a day suggests automated activity cycling.

        #### L. Repetitive or Automated Text Content
        Analyze text from comments, PR descriptions, review comments, and commit messages for:
        - Identical or near-identical text repeated across multiple unrelated issues/PRs/repos
        - Automated comment signatures or templates (e.g., "Automated PR by bot", repeated footers, version strings)
        - Generic placeholder text (e.g., form-filled descriptions with minimal variation)
        - Templated responses with only variable substitution (same structure, different params)
        Pattern: Exact text repetition across many activities or templated/automated language signatures indicate bot behavior.

        ## Scoring Methodology
        Evaluate all detected patterns independently. For each flag present, assign a severity-based score (0-100 scale per flag).
        Calculate final humanness score as: average of severity assessments across all flags, weighted by pattern significance.
        
        - Extreme automated signals: 0-20 (strong bot indicators)
        - High bot-like behavior: 20-40 (multiple suspicious patterns)
        - Moderate concerns: 40-60 (mixed or ambiguous signals)
        - Low concerns: 60-80 (mostly human-like with isolated flags)
        - Confident human: 80-100 (organic patterns throughout)

        ## Behavioral Context: Activity Bursts
        Short, intense bursts of activity within very small time frames are NOT typical human behavior. Technical limits to consider:
        - 50+ commits in 1 hour = highly suspicious (human commit/push cycle is much slower)
        - 100+ commits in 1 hour = virtually impossible for human coding
        - 10+ comments across 10+ different repos in 2 minutes = impossible for humans
        - 15+ repos commented on in 2 minutes = automated commenting bot
        These represent realistic physical/cognitive limits. Not tolerant of "busy developer" excuses. Short bursts are strong automation indicators.

        ## Time Window Analysis Rules
        - 24-hour rolling windows: sliding analysis for clustering patterns
        - Per-day analysis: evaluate each calendar day independently (not globally)
        - All times treated as UTC

        ## Return JSON Format (MUST be valid JSON only)
        \`\`\`json
        {
          "score": number (0-100),
          "classification": "organic" | "mixed" | "automation",
          "flags": [
            {
              "label": "string (concise pattern name)",
              "points": number (severity score for this flag: 0-100),
              "detail": "string (specific evidence found: counts, timeframes, specifics)"
            }
          ],
          "profile": {
            "age": number (days since account creation),
            "repos": number (public repositories count)
          }
        }
        \`\`\`

        ## Output Requirements
        - Evaluate patterns independently without predetermined point mappings
        - Assign severity per flag based on strength of evidence
        - Recognize that short, intense bursts of activity (minutes to hours) are NOT typical human behavior - be realistic about technical limits
        - Do NOT excuse activity bursts as "very busy developer" - humans have cognitive and physical limits
        - Analyze text content (comments, PR descriptions, reviews) for repetition and automated language - ALWAYS flag exact text repetition across multiple activities
        - Provide specific evidence in details (actual counts, timeframes, observed behaviors, text samples if repetition found)
        - Return ONLY valid JSON - no markdown, no extra text
        - Include at least one flag per classification (if suspicious/mixed/automation)
        - If an unexpected pattern emerges requiring a new label, use human-readable format (e.g., "Unusual coordination pattern") instead of snake_case (e.g., "unusual_coordination_pattern")

        Be precise, realistic, and evidence-based. Short bursts = automation. Do not be lenient.`;
      const userPrompt = `Here is the data to analyze: ${compactedData}`;

      try {
        const genAI = new GoogleGenerativeAI(config.geminiApiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-3.1-flash-lite-preview",
          generationConfig: {
            responseMimeType: "application/json",
          },
          systemInstruction: systemPrompt,
        });

        const result = await model.generateContent(userPrompt);
        const textContent = result.response.text();

        return {
          analysis: JSON.parse(textContent) as IdentifyReplicantResult,
          eventsCount: events.length,
        };
      } catch (aiError: unknown) {
        console.error("Error during AI analysis:", aiError);
        throw aiError;
      }
    }

    return {
      analysis: identifyReplicant({
        accountName: formattedUsername,
        reposCount: parsedQuery.output.repos_count,
        createdAt: parsedQuery.output.created_at,
        events,
      }),
      eventsCount: events.length,
    };
  } catch (err: unknown) {
    const error = err as { status?: number; statusCode?: number };
    const status = error.status ?? error.statusCode;

    if (status === 403) {
      throw createError({
        statusCode: 429,
        message: "GitHub API rate limit reached. Please try again later.",
      });
    }

    if (status === 404) {
      throw createError({ statusCode: 404, message: "User not found" });
    }

    console.log("unknown error", JSON.stringify(error, null, 2));

    throw createError({
      statusCode: 500,
      message: "An error occurred while analyzing the user",
    });
  }
});

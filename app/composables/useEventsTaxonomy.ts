import type { IdentityClassification } from '@unveil/identity'

// GitHub events as listed on https://docs.github.com/en/rest/using-the-rest-api/github-event-types (2026-03-10 version of the API)
// Descriptions are taken from there
export function useEventsTaxonomy(
  colors: Ref<Record<string, string>>,
  classification: IdentityClassification = 'mixed',
) {
  const taxonomy = computed<EventTaxonomy>(() => ({
    CommitCommentEvent: {
      name: 'Commit comment event',
      description: 'A commit comment is created.',
    },
    CreateEvent: {
      name: 'Create event',
      description: 'A Git branch or tag is created.',
      color: {
        organic: colors.value.eventOrganicBranch,
        mixed: colors.value.eventMixedBranch,
        automation: colors.value.eventAutomationBranch,
      }[classification],
    },
    DeleteEvent: {
      name: 'Delete event',
      description: 'A Git branch or tag is deleted.',
    },
    DiscussionEvent: {
      name: 'Discussion event',
      description: 'A discussion is created in a repository.',
    },
    ForkEvent: {
      name: 'Fork event',
      description: 'A user forks a repository.',
      color: {
        organic: colors.value.eventOrganicFork,
        mixed: colors.value.eventMixedFork,
        automation: colors.value.eventAutomationFork,
      }[classification],
    },
    GollumEvent: {
      name: 'Gollum event',
      description: 'A wiki page is created or updated.',
    },
    IssueCommentEvent: {
      name: 'Issue comment event',
      description: 'Activity related to an issue or pull request comment.',
    },
    IssuesEvent: {
      name: 'Issues event',
      description: 'Activity related to an issue.',
    },
    MemberEvent: {
      name: 'Member event',
      description: 'Activity related to repository collaborators.',
    },
    PublicEvent: {
      name: 'Public event',
      description: 'When a private repository is made public.',
    },
    PullRequestEvent: {
      name: 'Pull request event',
      description: 'Activity related to pull requests.',
      color: {
        organic: colors.value.eventOrganicPr,
        mixed: colors.value.eventMixedPr,
        automation: colors.value.eventAutomationPr,
      }[classification],
    },
    PullRequestReviewEvent: {
      name: 'PR review event',
      description: 'Activity related to pull request reviews.',
    },
    PullRequestReviewCommentEvent: {
      name: 'PR review comment event',
      description:
        "Activity related to pull request review comments in the pull request's unified diff.",
    },
    PushEvent: {
      name: 'Push event',
      description:
        'One or more commits are pushed to a repository branch or tag.',
    },
    ReleaseEvent: {
      name: 'Release event',
      description: 'Activity related to a release.',
    },
    WatchEvent: {
      name: 'Watch event',
      description:
        'A user stars a repository (historically referred to as "watching").',
    },
  }))

  return {
    taxonomy,
  }
}

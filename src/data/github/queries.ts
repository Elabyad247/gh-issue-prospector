export const VIEWER_QUERY = `
  query Viewer {
    viewer { login }
  }
`;

export const ISSUES_PAGE_QUERY = `
  query IssuesPage($owner: String!, $name: String!, $cursor: String) {
    repository(owner: $owner, name: $name) {
      issues(first: 100, after: $cursor, states: OPEN, orderBy: { field: CREATED_AT, direction: DESC }) {
        pageInfo { hasNextPage endCursor }
        nodes {
          number
          title
          body
          state
          author { login }
          assignees(first: 10) { nodes { login } }
          labels(first: 20) { nodes { name } }
          createdAt
          updatedAt
          comments { totalCount }
          reactions { totalCount }
          closedByPullRequestsReferences(first: 10, includeClosedPrs: true) {
            nodes { ...LinkedPullRequest }
          }
          timelineItems(last: 100, itemTypes: [CROSS_REFERENCED_EVENT, ISSUE_COMMENT]) {
            nodes {
              __typename
              ... on CrossReferencedEvent {
                source {
                  __typename
                  ...LinkedPullRequest
                  ... on Issue {
                    number
                  }
                }
              }
              ... on IssueComment {
                author { login }
                createdAt
              }
            }
          }
          url
        }
      }
    }
    rateLimit { remaining resetAt cost }
  }

  fragment LinkedPullRequest on PullRequest {
    number
    title
    url
    state
    isDraft
    updatedAt
    author { login }
    repository { nameWithOwner }
  }
`;

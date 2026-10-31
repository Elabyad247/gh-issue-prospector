export type GraphQLPRState = 'OPEN' | 'CLOSED' | 'MERGED';
export type GraphQLIssueState = 'OPEN' | 'CLOSED';

export type RawPullRequest = {
  number: number;
  title: string;
  url: string;
  state: GraphQLPRState;
  isDraft: boolean;
  updatedAt: string;
  author: { login: string } | null;
  repository: { nameWithOwner: string };
};

export type CrossReferencedEvent = {
  __typename: 'CrossReferencedEvent';
  source:
    | ({ __typename: 'PullRequest' } & RawPullRequest)
    | {
        __typename: 'Issue';
        number: number;
      };
};

export type IssueComment = {
  __typename: 'IssueComment';
  author: { login: string } | null;
  createdAt: string;
};

export type TimelineItem = CrossReferencedEvent | IssueComment;

export type RawIssue = {
  number: number;
  title: string;
  body: string;
  state: GraphQLIssueState;
  author: { login: string } | null;
  assignees: { nodes: { login: string }[] };
  labels: { nodes: { name: string }[] };
  createdAt: string;
  updatedAt: string;
  comments: { totalCount: number };
  reactions: { totalCount: number };
  closedByPullRequestsReferences: { nodes: RawPullRequest[] };
  timelineItems: { nodes: TimelineItem[] };
  url: string;
};

export type RateLimitInfo = {
  remaining: number;
  resetAt: string;
  cost: number;
};

export type IssuePage = {
  repository: {
    issues: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      nodes: RawIssue[];
    };
  };
  rateLimit: RateLimitInfo;
};

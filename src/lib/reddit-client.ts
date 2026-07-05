interface RedditToken {
  access_token: string;
  expires_at: number;
}

interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  author: string;
  permalink: string;
  created_utc: number;
  score: number;
  num_comments: number;
  subreddit: string;
  link_flair_text?: string;
}

interface RedditComment {
  id: string;
  body: string;
  author: string;
  permalink: string;
  created_utc: number;
  score: number;
  parent_id: string;
}

export interface RedditContent {
  posts: RedditPost[];
  comments: RedditComment[];
  subreddit: string;
  fetchedAt: string;
}

const USER_AGENT = 'Problems4Us/1.0 (Data Collection Bot)';

let cachedToken: RedditToken | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires_at - 60_000) {
    return cachedToken.access_token;
  }

  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  const username = process.env.REDDIT_USERNAME;
  const password = process.env.REDDIT_PASSWORD;

  if (!clientId || !clientSecret) {
    throw new Error(
      'Reddit API credentials missing. Set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET.'
    );
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const body = new URLSearchParams();
  if (username && password) {
    body.set('grant_type', 'password');
    body.set('username', username);
    body.set('password', password);
  } else {
    body.set('grant_type', 'client_credentials');
  }

  const response = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'User-Agent': USER_AGENT,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Reddit auth failed: ${response.status} - ${text}`);
  }

  const data = await response.json();
  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.access_token;
}

async function redditGet<T>(path: string): Promise<T> {
  const token = await getAccessToken();

  const response = await fetch(`https://oauth.reddit.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': USER_AGENT,
    },
  });

  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('retry-after') ?? '5', 10);
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    return redditGet<T>(path);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Reddit API error: ${response.status} - ${text}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchSubredditPosts(
  subreddit: string,
  options: {
    sort?: 'hot' | 'new' | 'top' | 'rising';
    limit?: number;
    timeframe?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
    after?: string;
  } = {}
): Promise<RedditPost[]> {
  const { sort = 'new', limit = 100, timeframe = 'week', after } = options;

  let path = `/r/${subreddit}/${sort}?limit=${limit}`;
  if (sort === 'top') path += `&t=${timeframe}`;
  if (after) path += `&after=${after}`;

  const data = await redditGet<{
    data: { children: { data: RedditPost }[]; after: string | null };
  }>(path);

  return data.data.children.map((child) => child.data);
}

export async function fetchPostComments(
  subreddit: string,
  postId: string,
  limit = 50
): Promise<RedditComment[]> {
  const data = await redditGet<
    { data: { children: { kind: string; data: RedditComment }[] } }[]
  >(`/r/${subreddit}/comments/${postId}?limit=${limit}&sort=top&depth=2`);

  const comments: RedditComment[] = [];

  if (data.length > 1) {
    for (const child of data[1].data.children) {
      if (child.kind === 't1' && child.data.body) {
        comments.push(child.data);
      }
    }
  }

  return comments;
}

export async function searchSubreddit(
  subreddit: string,
  query: string,
  options: { limit?: number; sort?: 'relevance' | 'hot' | 'top' | 'new' | 'comments'; timeframe?: string } = {}
): Promise<RedditPost[]> {
  const { limit = 50, sort = 'relevance', timeframe = 'month' } = options;

  const path = `/r/${subreddit}/search?q=${encodeURIComponent(query)}&restrict_sr=on&sort=${sort}&t=${timeframe}&limit=${limit}`;

  const data = await redditGet<{
    data: { children: { data: RedditPost }[] };
  }>(path);

  return data.data.children.map((child) => child.data);
}

export async function fetchSubredditContent(
  subreddit: string,
  options: {
    postLimit?: number;
    commentLimit?: number;
    sort?: 'hot' | 'new' | 'top' | 'rising';
    timeframe?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
    includeComments?: boolean;
  } = {}
): Promise<RedditContent> {
  const {
    postLimit = 50,
    commentLimit = 20,
    sort = 'new',
    timeframe = 'week',
    includeComments = true,
  } = options;

  const posts = await fetchSubredditPosts(subreddit, {
    sort,
    limit: postLimit,
    timeframe,
  });

  const allComments: RedditComment[] = [];

  if (includeComments) {
    const complaintyPosts = posts
      .filter((p) => p.selftext.length > 50 || p.num_comments > 5)
      .slice(0, 10);

    for (const post of complaintyPosts) {
      await new Promise((r) => setTimeout(r, 1200));
      const comments = await fetchPostComments(subreddit, post.id, commentLimit);
      allComments.push(...comments);
    }
  }

  return {
    posts,
    comments: allComments,
    subreddit,
    fetchedAt: new Date().toISOString(),
  };
}

export const TARGET_SUBREDDITS = [
  { name: 'sysadmin', sourceId: 'src-reddit-sysadmin' },
  { name: 'azure', sourceId: 'src-reddit-azure' },
  { name: 'PowerShell', sourceId: 'src-reddit-powershell' },
  { name: 'msp', sourceId: 'src-reddit-msp' },
  { name: 'ITManagers', sourceId: 'src-reddit-itmanagers' },
  { name: 'devops', sourceId: 'src-reddit-devops' },
];

export const PAIN_KEYWORDS = [
  'frustrated', 'broken', 'terrible', 'nightmare', 'waste of time',
  'hate', 'worst', 'complaint', 'issue', 'problem', 'bug', 'annoying',
  'unreliable', 'overpriced', 'confusing', 'painful', 'struggling',
  'anyone else', 'am I the only one', 'can\'t believe', 'fed up',
  'looking for alternative', 'switching from', 'wish there was',
  'why is it so', 'impossible to', 'finally gave up', 'workaround',
];

import * as React from 'react';
import { Link, Outlet, createFileRoute } from '@tanstack/react-router';
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';

export type PostType = {
  id: string;
  title: string;
  body: string;
};

const postsQueryOptions = queryOptions({
  queryKey: ['posts'],
  queryFn: async () => {
    await new Promise((r) => setTimeout(r, 300 + Math.round(Math.random() * 300)));
    const res = await fetch('https://jsonplaceholder.typicode.com/posts');
    if (!res.ok) throw new Error('Failed to fetch posts');
    const data = (await res.json()) as Array<PostType>;
    return data.slice(0, 10);
  },
});

export const Route = createFileRoute('/posts')({
  loader: async ({ context }) => {
     context.queryClient.ensureQueryData(postsQueryOptions);
    return {};
  },
  component: PostsComponent,
  pendingComponent: () => <div>Loading posts...</div>,
});

function PostsComponent() {
  const { data: posts } = useSuspenseQuery(postsQueryOptions);

  return (
    <div className="p-2 flex gap-2">
      <ul className="list-disc pl-4">
        {posts.map((post) => {
          return (
            <li key={post.id} className="whitespace-nowrap">
              <Link
                to="/posts/$postId"
                params={{
                  postId: post.id,
                }}
                className="block py-1 text-blue-800 hover:text-blue-600"
                activeProps={{ className: 'text-black font-bold' }}
              >
                <div>{post.title.substring(0, 20)}</div>
              </Link>
            </li>
          );
        })}
        <li className="whitespace-nowrap">
          <Link
            to="/posts/$postId"
            params={{
              postId: 'does-not-exist',
            }}
            className="block py-1 text-blue-800 hover:text-blue-600"
            activeProps={{ className: 'text-black font-bold' }}
          >
            <div>This post does not exist</div>
          </Link>
        </li>
      </ul>
      <hr />
      <Outlet />
    </div>
  );
}

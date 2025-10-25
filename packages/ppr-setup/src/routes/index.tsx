import { createFileRoute } from '@tanstack/react-router';
import * as React from 'react';
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';

// Demo API endpoint
const API_URL = 'https://jsonplaceholder.typicode.com/todos/1';

const queryOption = queryOptions({
  queryKey: ['demo-todo'],
  queryFn: async () => {
    await new Promise((r) => setTimeout(r, 2000)); // Simulate network delay
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
  }
})

// Loader uses React Query context to prefetch
export const Route = createFileRoute('/')({
  loader: async ({ context }) => {
    // context.queryClient should be provided at the app root
    context.queryClient.ensureQueryData(queryOption);
    return {};
  },
  component: IndexComponent,
  pendingComponent: () => <div>Loading...</div>,
});

function IndexComponent() {
  // Use suspense query for data
  const { data } = useSuspenseQuery(queryOption);

  return (
    <div className="p-2">
      <React.Suspense fallback={<div>Loading...</div>}>
        <h3>React Query Suspense Demo</h3>
        <p><b>ID:</b> {data.id}</p>
        <p><b>Title:</b> {data.title}</p>
        <p><b>Completed:</b> {data.completed ? 'Yes' : 'No'}</p>
      </React.Suspense>
    </div>
  );
}

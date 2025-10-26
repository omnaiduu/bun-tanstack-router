import { createFileRoute } from '@tanstack/react-router';
import * as React from 'react';
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';

// In-file simulated endpoints for Suspense demo.
// These run the simulated delay inside the query function so they work during SSR and on the client
const fastQuery = queryOptions({
  queryKey: ['demo-fast'],
  queryFn: async () => {
    const delay = 300
    await new Promise((res) => setTimeout(res, delay))
    return { endpoint: 'fast', delay }
  },
})

const slowQuery = queryOptions({
  queryKey: ['demo-slow'],
  queryFn: async () => {
    const delay = 2000
    await new Promise((res) => setTimeout(res, delay))
    return { endpoint: 'slow', delay }
  },
})

// Loader uses React Query context to prefetch both queries so Suspense can suspend correctly during SSR
export const Route = createFileRoute('/')({
  loader: async ({ context }) => {
    // context.queryClient should be provided at the app root
    context.queryClient.ensureQueryData(fastQuery)
    context.queryClient.ensureQueryData(slowQuery)
    return {}
  },
  component: IndexComponent,
  pendingComponent: () => <div>Loading...</div>,
})

function FastPanel() {
  const { data } = useSuspenseQuery(fastQuery)
  return (
    <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 6 }}>
      <h4>Fast endpoint</h4>
      <p><b>Endpoint:</b> {data.endpoint}</p>
      <p><b>Delay (ms):</b> {data.delay}</p>
    </div>
  )
}

function SlowPanel() {
  const { data } = useSuspenseQuery(slowQuery)
  return (
    <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 6 }}>
      <h4>Slow endpoint</h4>
      <p><b>Endpoint:</b> {data.endpoint}</p>
      <p><b>Delay (ms):</b> {data.delay}</p>
    </div>
  )
}

function IndexComponent() {
  return (
    <div className="p-2">
      <h3>React Query Suspense Demo (fast vs slow)</h3>
      <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
        <React.Suspense fallback={<div>Fast loading...</div>}>
          <FastPanel />
        </React.Suspense>

        <React.Suspense fallback={<div>Slow loading...</div>}>
          <SlowPanel />
        </React.Suspense>
      </div>
    </div>
  )
}

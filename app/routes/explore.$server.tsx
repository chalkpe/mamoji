import { defer, json, LoaderFunctionArgs } from '@remix-run/node'
import { Await, useLoaderData } from '@remix-run/react'
import { Suspense } from 'react'
import { AppEmojiLibrary } from '~/components/app-emoji-library'
import { findEmojis } from '~/lib/api'

export async function loader({ params }: LoaderFunctionArgs) {
  const server = params.server
  if (!server) throw json('Parameter not found', { status: 400 })
  return defer({ server, emojis: findEmojis(server) })
}

export default function Explore() {
  const { emojis } = useLoaderData<typeof loader>()

  return (
    <Suspense>
      <Await resolve={emojis}>
        {(emojis) => (
          <AppEmojiLibrary
            emojis={emojis}
            search=""
            searchBy="shortcode"
            groupBy="category"
            selectedEmojis={[]}
            onSelectEmojis={() => {}}
            onUnselectEmojis={() => {}}
          />
        )}
      </Await>
    </Suspense>
  )
}

export const handle = {
  breadcrumb: '서버 열람',
}

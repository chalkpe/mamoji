import { json, LoaderFunctionArgs } from '@remix-run/node'
import { prisma } from '~/db.server'

export async function loader({ params }: LoaderFunctionArgs) {
  return json(
    await prisma.emoji.findMany({
      where: { serverUrl: params.server },
      orderBy: { shortcode: 'asc' },
      select: { shortcode: true, tags: true, sensitive: true, copyable: true, authorHandle: true },
    }),
  )
}

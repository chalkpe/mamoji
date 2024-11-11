import { json } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { prisma } from '~/db.server'

export const loader = async () => {
  return json(await prisma.server.findMany({ select: { url: true, name: true, emojis: true }}))
}

export default function Servers() {
  const servers = useLoaderData<typeof loader>()
  
  return (
    <>
      <h1 className="text-xl">서버 목록</h1>
      <ul>
        {servers.map(server => (
          <li key={server.url}>
            <Link to={`/servers/${server.url}`}>{server.name}</Link>
          </li>
        ))}
      </ul>
    </>
  )
}

export const handle = {
  breadcrumb: '서버',
}
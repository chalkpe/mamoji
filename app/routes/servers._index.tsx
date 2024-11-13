import { json, ActionFunctionArgs } from '@remix-run/node'
import { useLoaderData, Form, redirect, useActionData, useNavigation, NavLink } from '@remix-run/react'
import { AlertCircle, Loader2, LogIn } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { prisma } from '~/db.server'
import { isMastodon } from '~/lib/mastodon'

export const loader = async () => {
  return json(await prisma.server.findMany({ select: { url: true, name: true, emojis: true }, orderBy: { url: 'asc' } }))
}

export default function Servers() {
  const navigation = useNavigation()
  const servers = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()

  return (
    <section className="flex-1 flex flex-col gap-5">
      <section className="flex flex-col gap-5">
        <h1 className="text-xl">서버 접속</h1>
        <Form className="flex flex-row gap-2 self-stretch" method="post">
          <Input type="text" name="url" placeholder="서버 주소" required />

          {navigation.state === 'submitting' ? (
            <Button disabled>
              <Loader2 className="animate-spin" />
            </Button>
          ) : (
            <Button type="submit">
              <LogIn />
            </Button>
          )}
        </Form>
        {actionData?.error && (
          <Alert>
            <AlertCircle />
            <AlertTitle>오류</AlertTitle>
            <AlertDescription>{actionData.error}</AlertDescription>
          </Alert>
        )}
      </section>

      <h1 className="text-xl">서버 목록</h1>
      <ul>
        {servers.map((server) => (
          <NavLink to={`/servers/${server.url}`} key={server.url}>
            {({ isPending }) => (
              <li className="flex flex-row gap-2">
                <span>{server.url} ({server.name})</span>
                {isPending && <Loader2 className="animate-spin" />}
              </li>
            )}
          </NavLink>
        ))}
      </ul>
    </section>
  )
}

export async function action({ request }: ActionFunctionArgs) {
  const body = await request.formData()
  const url = body.get('url')

  if (typeof url !== 'string') {
    return json({ error: '서버 주소를 입력해주세요.' }, { status: 400 })
  }

  const { error, name } = await isMastodon(url)
  if (error || !name) {
    return json({ error }, { status: 400 })
  }

  await prisma.server.upsert({
    where: { url },
    create: { url, name },
    update: { name },
  })

  return redirect(`/servers/${url}`)
}

export const handle = {
  breadcrumb: '서버',
}

import { json, ActionFunctionArgs } from '@remix-run/node'
import { useLoaderData, Form, useActionData, useNavigation, NavLink, Link } from '@remix-run/react'
import { AlertCircle, Braces, Globe, Loader2, LogIn } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Separator } from '~/components/ui/separator'
import { prisma } from '~/db.server'
import { fetchServerType } from '~/lib/api'

export const loader = async () => {
  return json(
    await prisma.server.findMany({
      orderBy: { url: 'asc' },
      select: { url: true, name: true, emojis: { select: { category: true } } },
    }),
  )
}

export default function Servers() {
  const navigation = useNavigation()
  const servers = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()

  return (
    <section className="flex-1 flex flex-col gap-5">
      <h1 className="text-xl">서버 추가</h1>
      <article className="flex flex-col gap-5">
        <Form className="flex flex-row flex-wrap gap-2 self-stretch justify-end" method="post">
          <Input type="text" name="url" placeholder="서버 주소" required className="w-auto min-w-32 flex-1" />

          {navigation.state === 'submitting' ? (
            <Button disabled>
              <Loader2 className="animate-spin" />
            </Button>
          ) : (
            <Button type="submit">
              <LogIn /> 추가하기
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
      </article>

      <h1 className="text-xl">서버 목록</h1>
      <article className="grid gap-2 lg:grid-cols-2 pb-5">
        {servers.map((server) => (
          <Card key={server.url}>
            <CardHeader>
              <CardTitle className="flex flex-row items-center gap-2">
                <img src={`https://icon.horse/icon/${server.url}`} alt={`${server.name} 아이콘`} className="size-5 rounded-md" />
                <span className="flex-1 overflow-hidden text-ellipsis">{server.url}</span>
              </CardTitle>
              <CardDescription className="flex flex-row flex-wrap items-center gap-2">
                {server.emojis.length === 0 ? (
                  <span>아직 이모지를 불러오지 않았습니다.</span>
                ) : (
                  <>
                    <span>{server.emojis.length.toLocaleString()}개의 이모지</span>
                    <Separator orientation="vertical" className="h-4" />
                    <span>{new Set(server.emojis.map((emoji) => emoji.category)).size.toLocaleString()}개의 카테고리</span>
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex flex-row flex-wrap w-full justify-end gap-2">
              <Link to={`/api/${server.url}`} reloadDocument>
                <Button variant="outline">
                  <Braces /> API
                </Button>
              </Link>
              <a href={`https://${server.url}`} target="_blank" rel="noreferrer">
                <Button variant="outline">
                  <Globe /> 접속하기
                </Button>
              </a>
              <NavLink to={`/servers/${server.url}`}>
                {({ isPending }) => (
                  <Button disabled={isPending}>{isPending ? <Loader2 className="animate-spin" /> : <LogIn />} 관리하기</Button>
                )}
              </NavLink>
            </CardFooter>
          </Card>
        ))}
      </article>
    </section>
  )
}

export async function action({ request }: ActionFunctionArgs) {
  const body = await request.formData()
  const url = body.get('url')

  if (typeof url !== 'string') {
    return json({ error: '서버 주소를 입력해주세요.' }, { status: 400 })
  }

  const { error, data } = await fetchServerType(url)
  if (error || !data) {
    return json({ error }, { status: 400 })
  }

  await prisma.server.upsert({
    where: { url },
    create: { url, name: data.name, software: data.software },
    update: { name: data.name, software: data.software },
  })

  return json({ error: null }, { status: 201 })
}

export const handle = {
  breadcrumb: '서버',
}

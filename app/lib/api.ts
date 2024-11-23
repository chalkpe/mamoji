import { json } from '@remix-run/node'
import { z } from 'zod'
import { prisma } from '~/db.server'
import { ServerSoftware } from '@prisma/client'
import { getErrorCause } from './utils'

const wellKnownSchema = z.object({
  links: z.array(
    z.object({
      rel: z.string(),
      href: z.string().url(),
    }),
  ),
})

const targetRel = 'http://nodeinfo.diaspora.software/ns/schema/2.0'

const nodeinfoSchema = z.object({
  software: z.object({
    name: z.string(),
  }),
  metadata: z.object({
    nodeName: z.string(),
  }),
})

const allowedServerSoftwares = [
  { name: 'mastodon', value: ServerSoftware.MASTODON },
  { name: 'misskey', value: ServerSoftware.MISSKEY },
  { name: 'cherrypick', value: ServerSoftware.MISSKEY },
]

export async function fetchServerType(serverUrl: string) {
  try {
    // Fetch .well-known/nodeinfo
    const wellKnown = wellKnownSchema.parse(await fetch(`https://${serverUrl}/.well-known/nodeinfo`).then((res) => res.json()))

    const href = wellKnown.links.find((l) => l.rel === targetRel)?.href
    if (!href) {
      return { error: '서버 정보를 확인할 수 없습니다.' }
    }

    // Fetch nodeinfo
    const nodeinfo = nodeinfoSchema.parse(await fetch(href).then((res) => res.json()))

    const name = nodeinfo.metadata.nodeName
    if (!name) {
      return { error: '서버 이름을 확인할 수 없습니다.' }
    }

    const software = allowedServerSoftwares.find((allowed) => allowed.name === nodeinfo.software.name)?.value
    if (!software) {
      return { error: `지원하는 소프트웨어의 서버가 아닙니다. (${nodeinfo.software.name})` }
    }

    return { error: undefined, data: { name, software } }
  } catch (error) {
    const cause = getErrorCause(error)
    return { error: '서버에 연결할 수 없습니다.' + (cause ? `\n${cause}` : '') }
  }
}

const mastodonEndpoint = '/api/v1/custom_emojis'

const mastodonEmojisSchema = z.array(
  z.object({
    shortcode: z.string(),
    url: z.string().url(),
    category: z.string().optional(),
  }),
)

export async function findEmojis(serverUrl: string) {
  return await prisma.emoji.findMany({
    where: { serverUrl },
    orderBy: { shortcode: 'asc' },
    include: { author: true },
  })
}

export async function upsertEmojis(serverUrl: string) {
  const { error, data } = await fetchServerType(serverUrl)
  if (error || !data) throw json(error, { status: 400 })

  const server = await prisma.server.upsert({
    where: { url: serverUrl },
    create: { url: serverUrl, name: data.name, software: data.software },
    update: { name: data.name, software: data.software },
    select: { _count: { select: { emojis: true } }, emojiUpdatedAt: true },
  })

  if (server._count.emojis > 0 && Date.now() - server.emojiUpdatedAt.getTime() < 1000 * 60 * 60 * 24) {
    return await findEmojis(serverUrl)
  }

  try {
    switch (data.software) {
      case ServerSoftware.MASTODON:
        return upsertMastodonEmojis(serverUrl)
      case ServerSoftware.MISSKEY:
        return upsertMisskeyEmojis(serverUrl)
    }
  } catch (error) {
    return []
  }
}

async function checkDuplicates(serverUrl: string, names: string[]) {
  const duplicates = [...new Set(names.filter((name, index) => names.indexOf(name) !== index))]

  if (duplicates.length > 0) {
    await prisma.server.delete({ where: { url: serverUrl } })
    throw json(
      `${serverUrl} 이모지 등록 실패. 이모지 이름이 중복되었습니다.\n중복된 이모지: ${duplicates
        .sort((a, b) => a.localeCompare(b))
        .join(', ')}`,
    )
  }
}

async function upsertMastodonEmojis(serverUrl: string) {
  const res = await fetch(`https://${serverUrl}${mastodonEndpoint}`).then((res) => res.json())
  const data = mastodonEmojisSchema.parse(res)

  await checkDuplicates(
    serverUrl,
    data.map((emoji) => emoji.shortcode),
  )

  for (const { shortcode, url, category } of data) {
    await prisma.emoji.upsert({
      where: {
        serverUrl_shortcode: { serverUrl, shortcode },
      },
      create: {
        server: { connect: { url: serverUrl } },
        shortcode,
        url,
        category,
      },
      update: {
        url,
        category,
      },
    })
  }

  await prisma.server.update({
    where: { url: serverUrl },
    data: { emojiUpdatedAt: new Date() },
  })

  return await findEmojis(serverUrl)
}

const misskeyEndpoint = '/api/emojis'

const misskeyEmojisSchema = z.object({
  emojis: z.array(
    z.object({
      name: z.string(),
      url: z.string().url(),
      category: z.string().nullable(),
      aliases: z.array(z.string()),
      isSensitive: z.boolean().optional(),
    }),
  ),
})

async function upsertMisskeyEmojis(serverUrl: string) {
  const res = await fetch(`https://${serverUrl}${misskeyEndpoint}`).then((res) => res.json())
  const data = misskeyEmojisSchema.parse(res)

  await checkDuplicates(
    serverUrl,
    data.emojis.map((emoji) => emoji.name),
  )

  for (const { name: shortcode, url, category, aliases: tags, isSensitive: sensitive } of data.emojis) {
    await prisma.emoji.upsert({
      where: {
        serverUrl_shortcode: { serverUrl, shortcode },
      },
      create: {
        server: { connect: { url: serverUrl } },
        shortcode,
        url,
        category,
        tags,
        sensitive,
      },
      update: {
        url,
        category,
        tags,
        sensitive,
      },
    })
  }

  await prisma.server.update({
    where: { url: serverUrl },
    data: { emojiUpdatedAt: new Date() },
  })

  return await findEmojis(serverUrl)
}

const resourceSchema = z.object({
  links: z.array(
    z.object({
      rel: z.string(),
      type: z.string().optional(),
      href: z.string().url().optional(),
    }),
  ),
})

const userSchema = z.object({
  name: z.string(),
  icon: z.object({
    url: z.string().url(),
  }),
})

export async function upsertUserByHandle(handle: string) {
  const serverUrl = handle.split('@')[1]

  // Fetch .well-known/webfinger
  const resourceResponse = await fetch(`https://${serverUrl}/.well-known/webfinger?resource=acct:${handle}`)
  if (resourceResponse.status === 404) throw new Error('존재하지 않는 사용자입니다.')

  const resource = resourceSchema.parse(await resourceResponse.json())
  const href = resource.links.find((l) => l.rel === 'self')?.href
  if (!href) throw new Error('사용자 정보에 해당하는 링크가 없습니다.')

  // Fetch user
  const userResponse = await fetch(href, { headers: { Accept: 'application/activity+json' } })
  if (userResponse.status === 404) throw new Error('존재하지 않는 사용자 정보입니다.')
  if (userResponse.status === 401) throw new Error('사용자 정보에 접근할 수 없습니다.') // TODO: https://docs.joinmastodon.org/spec/security/#http

  const user = userSchema.parse(await userResponse.json())
  return await prisma.user.upsert({
    where: { handle },
    create: { handle, name: user.name, avatarUrl: user.icon.url },
    update: { name: user.name, avatarUrl: user.icon.url },
  })
}

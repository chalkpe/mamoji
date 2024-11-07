export async function isMastodon(server: string) {
  try {
    const nodeinfo = await fetch(`https://${server}/.well-known/nodeinfo`).then((res) => res.json())
    const href = nodeinfo?.links?.find?.(
      (l: unknown) =>
        typeof l === 'object' &&
        l !== null &&
        'rel' in l &&
        l.rel === 'http://nodeinfo.diaspora.software/ns/schema/2.0' &&
        'href' in l &&
        typeof l.href === 'string',
    )?.href

    if (!href) {
      return { error: '서버 정보를 확인할 수 없습니다.' }
    }

    const realNodeinfo = await fetch(href).then((res) => res.json())

    const software = realNodeinfo?.software?.name
    if (software !== 'mastodon') {
      return { error: `마스토돈 서버가 아닙니다. (${software})` }
    }

    const name = realNodeinfo?.metadata?.nodeName
    if (typeof name !== 'string') {
      return { error: '서버 이름을 확인할 수 없습니다.' }
    }

    return { error: undefined, name }
  } catch (error) {
    return { error: '서버에 연결할 수 없습니다.' }
  }
}

type Emoji = {
  shortcode: string
  url: string
  category?: string
}

export async function getEmoji(server: string) {
  try {
    const res = await fetch(`https://${server}/api/v1/custom_emojis`).then((res) => res.json())
    return Array.isArray(res) ? (res as Emoji[]) : []
  } catch (error) {
    return []
  }
}

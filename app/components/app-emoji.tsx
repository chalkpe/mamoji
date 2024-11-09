import { FC } from 'react'
import { Emoji } from '@prisma/client'
import { cn } from '~/lib/utils'

interface AppEmojiProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  emoji: Emoji
}

export const AppEmoji: FC<AppEmojiProps> = ({ emoji, className, ...props }) => {
  return (
    <button
      className={cn(
        'w-14 h-14',
        'relative',
        'cursor-pointer',
        'hover:before:absolute',
        'hover:before:top-0',
        'hover:before:left-0',
        'hover:before:z-0',
        'hover:before:w-full',
        'hover:before:h-full',
        emoji.copyable ? 'hover:before:bg-green-500' : 'hover:before:bg-red-500',
        'hover:before:opacity-50',
        "hover:before:content-['']",
        'hover:before:rounded-full',
        className,
      )}
      {...props}
    >
      <img
        src={emoji.url}
        alt={emoji.shortcode}
        title={`:${emoji.shortcode}:`}
        className={cn('absolute', 'top-2', 'left-2', 'z-10', 'w-10', 'h-10', 'object-contain')}
      />
    </button>
  )
}

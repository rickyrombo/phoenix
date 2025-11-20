import { 
  IconHome, 
  IconTrendingUp, 
  IconVinyl, 
  IconUsers, 
  IconMessage, 
  IconHexagon, 
  IconWallet 
} from '@tabler/icons-react'
import type { ReactElement } from 'react'

interface SidebarIconProps {
  name: string
  size?: number
}

export default function SidebarIcon({ name, size = 24 }: SidebarIconProps): ReactElement | null {
  const iconProps = { size, stroke: 2 }
  
  switch (name) {
    case 'home':
      return <IconHome {...iconProps} />
    case 'trending':
      return <IconTrendingUp {...iconProps} />
    case 'library':
      return <IconVinyl {...iconProps} />
    case 'groups':
      return <IconUsers {...iconProps} />
    case 'messaging':
      return <IconMessage {...iconProps} />
    case 'coins':
      return <IconHexagon {...iconProps} />
    case 'wallet':
      return <IconWallet {...iconProps} />
    default:
      return null
  }
}


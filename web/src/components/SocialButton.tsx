import styled from "styled-components"
import type { ReactNode } from "react"
import { Button } from "./core/Button"

const Icon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
`

const Label = styled.span<{ $expanded: boolean }>`
  display: ${(props) => (props.$expanded ? "inline" : "none")};
  line-height: 1;
`

const Count = styled.span`
  font-size: 0.75rem;
  opacity: 0.8;
  line-height: 1;
`

interface SocialButtonProps {
  icon: ReactNode
  label: string
  title: string
  expanded: boolean
  count?: number
  onClick?: () => void
}

export default function SocialButton({
  icon,
  label,
  title,
  expanded,
  count,
  onClick,
}: SocialButtonProps) {
  return (
    <Button
      size="xs"
      title={title}
      spacing={expanded ? "normal" : "compact"}
      onClick={onClick}
    >
      <Icon>{icon}</Icon>
      <Label $expanded={expanded}>{label}</Label>
      {count !== undefined && count > 0 && <Count>{count}</Count>}
    </Button>
  )
}

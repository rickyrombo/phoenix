import styled from 'styled-components'

const Button = styled.button<{ $expanded: boolean }>`
  background: transparent;
  border: 1px solid #333333;
  color: #808080;
  padding: ${props => props.$expanded ? '0rem 0.75rem' : '0 0.375rem'};
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: 'Kode Mono', monospace;
  font-size: 0.75rem;
  border-radius: 0;
  min-height: 0;

  &:hover {
    border-color: oklch(71.4% 0.203 305.504);
    color: oklch(71.4% 0.203 305.504);
  }
`

const Icon = styled.span`
  font-size: 1rem;
`

const Label = styled.span<{ $expanded: boolean }>`
  display: ${props => props.$expanded ? 'inline' : 'none'};
`

const Count = styled.span`
  font-size: 0.75rem;
  opacity: 0.8;
`

interface SocialButtonProps {
  icon: string
  label: string
  title: string
  expanded: boolean
  count?: number
  onClick?: () => void
}

export default function SocialButton({ icon, label, title, expanded, count, onClick }: SocialButtonProps) {
  return (
    <Button title={title} $expanded={expanded} onClick={onClick}>
      <Icon>{icon}</Icon>
      <Label $expanded={expanded}>{label}</Label>
      {count !== undefined && count > 0 && <Count>{count}</Count>}
    </Button>
  )
}

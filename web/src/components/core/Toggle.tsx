import { styled } from "styled-components"

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
}

const ToggleContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`

const ToggleSwitch = styled.button<{ $checked: boolean; $disabled: boolean }>`
  position: relative;
  width: 44px;
  height: 24px;
  background: ${(props) =>
    props.$checked ? "var(--accent-color)" : "#333333"};
  border-radius: 12px;
  border: none;
  cursor: ${(props) => (props.$disabled ? "not-allowed" : "pointer")};
  transition: background-color 0.2s ease;
  opacity: ${(props) => (props.$disabled ? 0.6 : 1)};

  &:hover:not(:disabled) {
    background: ${(props) =>
      props.$checked ? "var(--accent-color)" : "#404040"};
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2);
  }
`

const ToggleThumb = styled.div<{ $checked: boolean }>`
  position: absolute;
  top: 2px;
  left: ${(props) => (props.$checked ? "22px" : "2px")};
  width: 20px;
  height: 20px;
  background: #ffffff;
  border-radius: 50%;
  transition: left 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
`

const ToggleLabel = styled.span`
  color: #ffffff;
  font-size: 0.875rem;
  font-weight: 500;
  user-select: none;
`

export const Toggle = ({
  checked,
  onChange,
  label,
  disabled = false,
}: ToggleProps) => {
  const handleClick = () => {
    if (!disabled) {
      onChange(!checked)
    }
  }

  return (
    <ToggleContainer>
      <ToggleSwitch
        $checked={checked}
        $disabled={disabled}
        disabled={disabled}
        onClick={handleClick}
        aria-pressed={checked}
        aria-label={label || "Toggle"}
      >
        <ToggleThumb $checked={checked} />
      </ToggleSwitch>
      {label && <ToggleLabel>{label}</ToggleLabel>}
    </ToggleContainer>
  )
}

import styled, { css } from "styled-components"

export const GhostButton = styled.button`
  background: transparent;
  border: none;
  color: #888;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: #fff;
  }
`

type ButtonProps = {
  size?: "xs" | "s" | "m" | "l"
  variant?: "primary" | "common"
  spacing?: "normal" | "compact"
}

export const Button = styled.button<ButtonProps>`
  background: transparent;
  border: 1px solid #333333;
  color: #808080;
  padding: ${(props) =>
    props.spacing === "compact" ? "0.25em 0.375em" : "0.25em 0.75rem"};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: "Kode Mono", monospace;
  border-radius: 0;
  min-height: 0;

  ${(props) => {
    switch (props.size) {
      case "xs":
        return css`
          font-size: 0.75rem;
        `
      case "s":
        return css`
          font-size: 0.875rem;
        `
      case "m":
      case undefined:
        return css`
          font-size: 1rem;
        `
      case "l":
        return css`
          font-size: 1.25rem;
        `
    }
  }}

  &:hover:not(:disabled) {
    border-color: oklch(71.4% 0.203 305.504);
    color: oklch(71.4% 0.203 305.504);
  }

  &:active:not(:disabled) {
    background: oklch(51.4% 0.203 305.504);
    border-color: oklch(51.4% 0.203 305.504);
    color: #000000;
    transform: scale(0.95);
    transition: transform 50ms ease-in-out;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  ${(props) => {
    if (props.variant === "primary") {
      return css`
        border-color: oklch(71.4% 0.203 305.504);
        color: oklch(71.4% 0.203 305.504);

        &:hover:not(:disabled) {
          background: oklch(71.4% 0.203 305.504);
          color: #000000;
          border-color: oklch(71.4% 0.203 305.504);
        }

        &:active:not(:disabled) {
          background: oklch(51.4% 0.203 305.504);
          border-color: oklch(51.4% 0.203 305.504);
          color: #000000;
          transform: scale(0.95);
          transition: transform 50ms ease-in-out;
        }
      `
    }
  }}
`

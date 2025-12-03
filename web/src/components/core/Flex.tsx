import styled, { css } from "styled-components"

type Direction = "row" | "row-reverse" | "column" | "column-reverse"
type Align =
  | "flex-start"
  | "flex-end"
  | "center"
  | "stretch"
  | "baseline"
  | "start"
  | "end"
type Justify =
  | "flex-start"
  | "flex-end"
  | "center"
  | "space-between"
  | "space-around"
  | "space-evenly"
  | "start"
  | "end"

export type FlexProps = {
  direction?: Direction
  alignItems?: Align
  justifyContent?: Justify
  wrap?: "nowrap" | "wrap" | "wrap-reverse" | boolean
  gap?: number
  inline?: boolean
  fullWidth?: boolean
  fullHeight?: boolean
  noShrink?: boolean
}

export const Flex = styled.div<FlexProps>`
  display: ${(p) => (p.inline ? "inline-flex" : "flex")};
  flex-direction: ${(p) => p.direction || "row"};
  flex-wrap: ${(p) => (p.wrap ? "wrap" : "nowrap")};
  align-items: ${(p) => p.alignItems || "stretch"};
  justify-content: ${(p) => p.justifyContent || "flex-start"};
  gap: ${(p) => (p.gap ? p.gap + "px" : "0px")};
  ${(p) =>
    p.noShrink &&
    css`
      flex-shrink: 0;
    `}
  ${(p) =>
    p.fullWidth &&
    css`
      width: 100%;
    `}
    ${(p) =>
    p.fullHeight &&
    css`
      height: 100%;
    `}
`

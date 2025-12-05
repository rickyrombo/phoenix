import styled from "styled-components"

export const PopupMenu = styled.ul`
  display: flex;
  flex-direction: column;
  background: #0f0f0f;
  border: 1px solid #222;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
  z-index: 1200;
  min-width: 150px;
  border-radius: 6px;
`

export const PopupMenuItem = styled.button`
  display: block;
  width: 100%;
  background: transparent;
  border: none;
  padding: 0.6rem 0.75rem;
  color: #ffffff;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.03);
    color: #fff;
  }
`

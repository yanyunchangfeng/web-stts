import styled, { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  body { margin: 0; height: 100vh; }
  #root { height: 100%; }
`;

export const WrapContainer = styled.div`
  height: 100%;
  .container {
    height: 100%;
    &:hover {
      background-color: #f5f5f5;
    }
  }
`;

import React, { FC } from 'react';
import { GlobalStyle, WrapContainer } from 'src/index.style';
import SpeechButton from 'src/components/SpeechButton';

const App: FC = () => {
  return (
    <>
      <GlobalStyle />
      <WrapContainer>
        <div className="container">
          <SpeechButton />
        </div>
      </WrapContainer>
    </>
  );
};

export default App;

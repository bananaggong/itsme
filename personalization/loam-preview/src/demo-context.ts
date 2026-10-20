import { createContext } from 'react';

export const DemoContext = createContext({
  confirm: () => {},
  skip: () => {},
});

export const toggleState = (
  setFn: React.Dispatch<React.SetStateAction<boolean>>
) => {
  setFn((bool) => !bool);
};

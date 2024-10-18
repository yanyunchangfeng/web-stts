export const safeJsonParse = <T extends Record<keyof any, any>>(
  str: string | null | undefined,
  defaultValue = {}
): T => {
  if (str === null || str === undefined) {
    return defaultValue as T;
  }
  try {
    return JSON.parse(str || JSON.stringify(defaultValue));
  } catch (err) {
    return defaultValue as T;
  }
};

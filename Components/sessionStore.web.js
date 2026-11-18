export const getItem = async (key) => (
  typeof window === 'undefined' ? null : window.sessionStorage.getItem(key)
);

export const setItem = async (key, value) => {
  if (typeof window !== 'undefined') window.sessionStorage.setItem(key, value);
};

export const removeItem = async (key) => {
  if (typeof window !== 'undefined') window.sessionStorage.removeItem(key);
};
